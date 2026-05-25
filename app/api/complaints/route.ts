import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSetting, setSetting } from "@/lib/settings";

export async function GET() {
  try {
    const complaints = await prisma.complaint.findMany({
      orderBy: { id: "asc" },
    });

    const googleSheetUrl = await getSetting("complaint_google_sheet_url");
    const hasCredentials = !!(await getSetting("complaint_google_credentials_json"));
    const localGeminiKey = await getSetting("geminiApiKey");
    const hasGeminiKey = !!(process.env.GEMINI_API_KEY || localGeminiKey);

    return NextResponse.json({
      success: true,
      complaints,
      settings: {
        googleSheetUrl: googleSheetUrl || "",
        hasCredentials,
        hasGeminiKey,
      },
    });
  } catch (error) {
    console.error("GET complaints error:", error);
    return NextResponse.json(
      { success: false, error: "민원 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { googleSheetUrl, googleCredentialsJson, geminiApiKey } = body;

    if (googleSheetUrl !== undefined) {
      await setSetting("complaint_google_sheet_url", googleSheetUrl.trim());
    }

    if (googleCredentialsJson !== undefined) {
      await setSetting("complaint_google_credentials_json", googleCredentialsJson.trim());
    }

    if (geminiApiKey !== undefined && geminiApiKey.trim() !== "") {
      await setSetting("geminiApiKey", geminiApiKey.trim());
    }

    return NextResponse.json({
      success: true,
      message: "설정이 성공적으로 저장되었습니다.",
    });
  } catch (error) {
    console.error("POST complaints config error:", error);
    return NextResponse.json(
      { success: false, error: "설정을 저장하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
