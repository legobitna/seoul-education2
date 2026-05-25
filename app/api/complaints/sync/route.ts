import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSetting, getGeminiApiKey } from "@/lib/settings";
import { fetchSheetCSV, updateGoogleSheet } from "@/lib/googleSheets";
import { classifyComplaintsBatch, ComplaintInput, CategoryInput } from "@/lib/geminiClassifier";

export const maxDuration = 60; // Next.js API 최대 실행 시간 (초) 설정

export async function POST() {
  const startTime = Date.now();

  try {
    // 1. 구글 스프레드시트 URL 및 자격증명 가져오기
    const googleSheetUrl = await getSetting("complaint_google_sheet_url");
    if (!googleSheetUrl) {
      return NextResponse.json(
        { success: false, error: "연동할 구글 스프레드시트 URL이 등록되지 않았습니다." },
        { status: 400 }
      );
    }

    const credentialsJson = await getSetting("complaint_google_credentials_json");
    const geminiApiKey = await getGeminiApiKey();

    if (!geminiApiKey) {
      return NextResponse.json(
        { success: false, error: "Gemini API Key가 등록되지 않았습니다. 설정 페이지나 .env에서 API 키를 지정해주세요." },
        { status: 400 }
      );
    }

    // 2. 분류기준 시트 파싱
    let categories: CategoryInput[] = [];
    try {
      const criteriaRows = await fetchSheetCSV(googleSheetUrl, "분류기준");
      if (criteriaRows.length <= 1) {
        throw new Error("분류기준 시트에 데이터가 없거나 형식이 올바르지 않습니다.");
      }

      // 첫 번째 행은 헤더이므로 제거
      const headers = criteriaRows[0].map(h => h.trim());
      const categoryCol = headers.indexOf("분류 카테고리");
      const descCol = headers.indexOf("설명");
      const keywordCol = headers.indexOf("예시 키워드");

      if (categoryCol === -1 || descCol === -1) {
        throw new Error("분류기준 시트 헤더가 올바르지 않습니다. ('분류 카테고리', '설명' 열이 필요합니다)");
      }

      categories = criteriaRows.slice(1).map((row) => ({
        name: row[categoryCol] || "",
        description: row[descCol] || "",
        keywords: row[keywordCol] || "",
      })).filter(c => c.name);
    } catch (err) {
      console.error("Fetch criteria error:", err);
      return NextResponse.json(
        { success: false, error: `분류기준 시트를 불러오지 못했습니다: ${(err as Error).message}` },
        { status: 400 }
      );
    }

    // 3. 민원 접수 목록 시트 파싱 (첫 번째 시트)
    let complaintRows: string[][] = [];
    try {
      complaintRows = await fetchSheetCSV(googleSheetUrl);
    } catch (err) {
      console.error("Fetch complaints spreadsheet error:", err);
      return NextResponse.json(
        { success: false, error: `민원 목록 시트를 불러오지 못했습니다. 스프레드시트 공유설정이 '링크가 있는 모든 사용자가 볼 수 있음'으로 설정되어 있는지 확인해주세요.` },
        { status: 400 }
      );
    }

    if (complaintRows.length <= 1) {
      return NextResponse.json({
        success: true,
        message: "동기화할 민원 데이터가 없습니다.",
        complaints: [],
      });
    }

    const headers = complaintRows[0].map(h => h.trim());
    const idIdx = headers.indexOf("민원번호");
    const dateIdx = headers.indexOf("접수일");
    const titleIdx = headers.indexOf("제목");
    const contentIdx = headers.indexOf("민원내용");
    const categoryIdx = headers.indexOf("분류");

    if (idIdx === -1 || dateIdx === -1 || titleIdx === -1 || contentIdx === -1 || categoryIdx === -1) {
      return NextResponse.json(
        { success: false, error: "민원 목록 시트의 헤더 형식이 맞지 않습니다. ('민원번호', '접수일', '제목', '민원내용', '분류' 열이 필요합니다)" },
        { status: 400 }
      );
    }

    const parsedComplaints = complaintRows.slice(1).map((row) => {
      return {
        id: row[idIdx] || "",
        receivedAt: row[dateIdx] || "",
        title: row[titleIdx] || "",
        content: row[contentIdx] || "",
        category: row[categoryIdx] || "",
      };
    }).filter(c => c.id);

    // 4. 분류 열이 비어있는 민원 데이터 필터링
    const needsClassification = parsedComplaints.filter((c) => !c.category);

    const newClassifications: { id: string; category: string; confidence: number; isUncertain: boolean; uncertainReason: string | null }[] = [];

    // 분류해야 할 민원이 있을 경우 배치(Batch)로 Gemini API 호출
    if (needsClassification.length > 0) {
      const BATCH_SIZE = 15; // Gemini API Rate Limit & Context에 맞춰 15개 단위 배치 처리
      for (let i = 0; i < needsClassification.length; i += BATCH_SIZE) {
        const batch = needsClassification.slice(i, i + BATCH_SIZE).map((c) => ({
          id: c.id,
          title: c.title,
          content: c.content,
        }));

        try {
          const results = await classifyComplaintsBatch(batch, categories, geminiApiKey);
          newClassifications.push(...results.map(r => ({
            id: r.id,
            category: r.category,
            confidence: r.confidence,
            isUncertain: r.isUncertain,
            uncertainReason: r.uncertainReason || null,
          })));
        } catch (apiErr) {
          console.error("Gemini batch API call error:", apiErr);
          return NextResponse.json(
            { success: false, error: `AI 분류 중 오류 발생: ${(apiErr as Error).message}` },
            { status: 500 }
          );
        }
      }

      // 5. 구글 서비스 계정이 등록되어 있다면 구글 시트에 AI 분류 결과를 Write(업데이트)
      if (credentialsJson && newClassifications.length > 0) {
        try {
          const sheetUpdates = newClassifications.map(c => ({
            id: c.id,
            category: c.category,
          }));
          await updateGoogleSheet(googleSheetUrl, credentialsJson, sheetUpdates);
        } catch (writeErr) {
          console.warn("Google Sheet Write Error (로컬 DB에는 반영되나 구글 시트 직접 쓰기에 실패함):", writeErr);
          // 구글 시트 쓰기에 실패하더라도 로컬 대시보드 렌더링을 위해 예외를 던지지 않고 넘어갑니다.
        }
      }
    }

    // 6. 전체 데이터를 취합하여 로컬 DB 리셋 후 재생성 (Sync 맞추기)
    // newClassifications에 담긴 신규 분류 데이터 맵 작성
    const classMap = new Map(newClassifications.map(c => [c.id, c]));

    const finalComplaintsToSave = parsedComplaints.map((c) => {
      const aiResult = classMap.get(c.id);
      if (aiResult) {
        return {
          id: c.id,
          receivedAt: c.receivedAt,
          title: c.title,
          content: c.content,
          category: aiResult.category,
          confidence: aiResult.confidence,
          isUncertain: aiResult.isUncertain,
          uncertainReason: aiResult.uncertainReason,
        };
      } else {
        // 이미 구글 시트에 분류가 채워져 있던 행
        return {
          id: c.id,
          receivedAt: c.receivedAt,
          title: c.title,
          content: c.content,
          category: c.category,
          confidence: 100, // 기존 수동 분류의 경우 신뢰도 100으로 설정
          isUncertain: false,
          uncertainReason: null,
        };
      }
    });

    // DB 트랜잭션으로 한꺼번에 리셋 후 삽입
    await prisma.$transaction([
      prisma.complaint.deleteMany(),
      prisma.complaint.createMany({
        data: finalComplaintsToSave,
      }),
    ]);

    const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(1);

    // 동기화 로그 기록
    await prisma.appSettings.upsert({
      where: { key: "complaint_last_sync_time" },
      create: { key: "complaint_last_sync_time", value: new Date().toISOString() },
      update: { value: new Date().toISOString() },
    });
    await prisma.appSettings.upsert({
      where: { key: "complaint_last_sync_duration" },
      create: { key: "complaint_last_sync_duration", value: durationSeconds },
      update: { value: durationSeconds },
    });

    const savedComplaints = await prisma.complaint.findMany({
      orderBy: { id: "asc" },
    });

    return NextResponse.json({
      success: true,
      message: `성공적으로 동기화되었습니다. (신규 분류: ${needsClassification.length}건, 소요시간: ${durationSeconds}초)`,
      complaints: savedComplaints,
      duration: durationSeconds,
    });
  } catch (error) {
    console.error("Sync API Error:", error);
    return NextResponse.json(
      { success: false, error: `동기화 진행 중 예외 발생: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
