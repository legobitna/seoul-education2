"use client";

import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { ComplaintSettingsModal } from "./ComplaintSettingsModal";

export interface ComplaintData {
  id: string;
  receivedAt: string;
  title: string;
  content: string;
  category: string;
  confidence: number;
  isUncertain: boolean;
  uncertainReason: string | null;
  classifiedAt: string;
}

interface Settings {
  googleSheetUrl: string;
  hasCredentials: boolean;
  hasGeminiKey: boolean;
  lastSyncTime: string | null;
  lastSyncDuration: string | null;
}

interface ComplaintDashboardProps {
  initialComplaints: ComplaintData[];
  initialSettings: Settings;
}

export function ComplaintDashboard({
  initialComplaints,
  initialSettings,
}: ComplaintDashboardProps) {
  const [complaints, setComplaints] = useState<ComplaintData[]>(initialComplaints);
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);

  // 필터 상태
  const [selectedCategory, setSelectedCategory] = useState<string>("전체");
  const [showUncertainOnly, setShowUncertainOnly] = useState<boolean>(false);

  // 검색 상태
  const [searchQuery, setSearchQuery] = useState("");

  // 10가지 기본 분류 카테고리에 대한 스타일 정의
  const getCategoryStyle = (category: string) => {
    switch (category) {
      case "학교시설":
        return "bg-blue-950/40 text-blue-400 border-blue-900/50";
      case "교원민원":
        return "bg-purple-950/40 text-purple-400 border-purple-900/50";
      case "학교폭력":
        return "bg-red-950/40 text-red-400 border-red-900/50";
      case "급식":
        return "bg-amber-950/40 text-amber-400 border-amber-900/50";
      case "학사운영":
        return "bg-emerald-950/40 text-emerald-400 border-emerald-900/50";
      case "입학전학":
        return "bg-pink-950/40 text-pink-400 border-pink-900/50";
      case "통학안전":
        return "bg-teal-950/40 text-teal-400 border-teal-900/50";
      case "방과후":
        return "bg-cyan-950/40 text-cyan-400 border-cyan-900/50";
      case "교육행정":
        return "bg-indigo-950/40 text-indigo-400 border-indigo-900/50";
      case "기타":
      default:
        return "bg-zinc-800/60 text-zinc-400 border-zinc-700/50";
    }
  };

  // 구글 시트 주소에서 간략한 파일 명 추출
  const fileName = useMemo(() => {
    if (!settings.googleSheetUrl) return "구글 시트 연동 대기 중";
    // 시트 ID나 쿼리가 들어가 있을 텐데, 일반적으로 구글 시트 주소가 들어옵니다.
    // 임시로 보기 좋게 도메인 주소나 시트 명을 제공합니다.
    return "실시간 민원 스프레드시트";
  }, [settings.googleSheetUrl]);

  // 카테고리별 건수 계산
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { 전체: complaints.length };
    complaints.forEach((c) => {
      if (c.category) {
        counts[c.category] = (counts[c.category] || 0) + 1;
      }
    });
    return counts;
  }, [complaints]);

  // 불확실(Uncertain) 민원 수
  const uncertainCount = useMemo(() => {
    return complaints.filter((c) => c.isUncertain).length;
  }, [complaints]);

  // 최다 분류 카테고리 구하기
  const topCategoryInfo = useMemo(() => {
    let topCat = "-";
    let maxVal = 0;
    Object.entries(categoryCounts).forEach(([cat, count]) => {
      if (cat !== "전체" && count > maxVal) {
        maxVal = count;
        topCat = cat;
      }
    });
    return { name: topCat, count: maxVal };
  }, [categoryCounts]);

  // 동기화 실행 API 호출
  const handleSync = async () => {
    if (!settings.googleSheetUrl) {
      setSyncError("구글 스프레드시트 URL이 등록되지 않았습니다. 우측 상단의 설정을 먼저 완료해 주세요.");
      return;
    }
    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccessMessage(null);

    try {
      const response = await fetch("/api/complaints/sync", {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "동기화 진행 중 알 수 없는 오류가 발생했습니다.");
      }

      setComplaints(data.complaints);
      setSyncSuccessMessage(data.message);

      // 설정에 기록된 시간값 등 동기화 정보 갱신
      setSettings((prev) => ({
        ...prev,
        lastSyncTime: new Date().toISOString(),
        lastSyncDuration: data.duration,
      }));
    } catch (err) {
      setSyncError((err as Error).message);
    } finally {
      setIsSyncing(false);
    }
  };

  // 대시보드 저장 완료 후 상태 갱신을 위해 데이터 조회
  const refreshSettings = async () => {
    try {
      const response = await fetch("/api/complaints");
      const data = await response.json();
      if (data.success) {
        setComplaints(data.complaints);
        setSettings(data.settings);
      }
    } catch (err) {
      console.error("Refresh settings error:", err);
    }
  };

  // 필터링 및 검색된 민원 목록
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      const matchesCategory =
        selectedCategory === "전체" || c.category === selectedCategory;
      const matchesUncertain = !showUncertainOnly || c.isUncertain;
      const matchesSearch =
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.id.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesUncertain && matchesSearch;
    });
  }, [complaints, selectedCategory, showUncertainOnly, searchQuery]);

  // 분류별로 시트 탭을 쪼개서 엑셀 다운로드 받기
  const downloadExcel = () => {
    if (complaints.length === 0) {
      alert("다운로드할 데이터가 존재하지 않습니다. 먼저 동기화를 진행해 주세요.");
      return;
    }

    const wb = XLSX.utils.book_new();

    // 1. 전체 데이터를 담은 메인 시트 추가
    const allData = complaints.map((c) => ({
      민원번호: c.id,
      접수일: c.receivedAt,
      제목: c.title,
      민원내용: c.content,
      AI분류: c.category || "미분류",
      신뢰도: `${c.confidence}%`,
      분류불확실: c.isUncertain ? "예" : "아니오",
      불확실사유: c.uncertainReason || "",
    }));
    const wsAll = XLSX.utils.json_to_sheet(allData);
    XLSX.utils.book_append_sheet(wb, wsAll, "전체 민원");

    // 2. 카테고리별로 탭 분할 생성
    const categoriesList = [...new Set(complaints.map((c) => c.category).filter(Boolean))];

    categoriesList.forEach((cat) => {
      const catComplaints = complaints.filter((c) => c.category === cat);
      const catData = catComplaints.map((c) => ({
        민원번호: c.id,
        접수일: c.receivedAt,
        제목: c.title,
        민원내용: c.content,
        신뢰도: `${c.confidence}%`,
        분류불확실: c.isUncertain ? "예" : "아니오",
        불확실사유: c.uncertainReason || "",
      }));

      const wsCat = XLSX.utils.json_to_sheet(catData);
      // 시트명 글자 제한(최대 31자) 준수
      const sheetName = cat.substring(0, 31);
      XLSX.utils.book_append_sheet(wb, wsCat, sheetName);
    });

    // 파일 내보내기 실행
    XLSX.writeFile(
      wb,
      `교육청_민원분류결과_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  return (
    <div className="bg-zinc-950 text-zinc-100 min-h-screen p-6 rounded-2xl border border-zinc-900 font-sans">
      {/* 1. 상단 타이틀 & 연동 헤더 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-6 mb-6">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
            📂 AI 민원 자동 분류 대시보드
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            구글 스프레드시트와 연동하여 신규 민원을 실시간 분류하고 시각화합니다.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-sm text-zinc-300 font-medium transition-colors"
          >
            ⚙️ 연동 설정
          </button>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 text-white rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-lg shadow-indigo-950/20"
          >
            {isSyncing ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                분류 중...
              </>
            ) : (
              <>
                다시 분류하기 <span className="text-indigo-300">↗</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. 구글 시트 연동 파일 정보 영역 */}
      <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-950/40 text-indigo-400 border border-indigo-900/50 rounded-lg text-xl">
            📊
          </div>
          <div>
            <h4 className="font-semibold text-sm text-zinc-200">{fileName}</h4>
            <p className="text-xs text-zinc-500 mt-0.5">
              {settings.googleSheetUrl 
                ? `${complaints.length}건 로드됨 · ${settings.lastSyncTime ? `마지막 동기화: ${new Date(settings.lastSyncTime).toLocaleString("ko-KR")}` : "동기화 이력 없음"}` 
                : "시트 URL을 먼저 등록해 주세요."}
            </p>
          </div>
        </div>
        {settings.googleSheetUrl && (
          <a
            href={settings.googleSheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-400 hover:underline flex items-center gap-1.5 self-start sm:self-center"
          >
            구글 시트 바로가기 ↗
          </a>
        )}
      </div>

      {/* API 성공/실패 토스트 형태 메세지 */}
      {syncError && (
        <div className="mb-6 p-4 bg-red-950/50 border border-red-900 rounded-xl text-red-400 text-sm flex items-center justify-between">
          <span>⚠️ {syncError}</span>
          <button onClick={() => setSyncError(null)} className="text-red-400 hover:text-red-200">✕</button>
        </div>
      )}
      {syncSuccessMessage && (
        <div className="mb-6 p-4 bg-emerald-950/50 border border-emerald-900 rounded-xl text-emerald-400 text-sm flex items-center justify-between">
          <span>✅ {syncSuccessMessage}</span>
          <button onClick={() => setSyncSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-200">✕</button>
        </div>
      )}

      {/* 3. 모호한 민원 알림 배너 (주의사항) */}
      {uncertainCount > 0 && (
        <div className="bg-amber-950/30 border border-amber-900/60 rounded-xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="text-lg">⚠️</span>
            <div>
              <h5 className="font-semibold text-sm text-amber-300">검토 필요 알림</h5>
              <p className="text-xs text-amber-500/90 mt-1">
                AI 분류 신뢰도가 너무 낮거나 분류 조건에 맞지 않아 **판단이 모호한 민원이 {uncertainCount}건** 발견되었습니다. 
                대시보드 목록에서 원인을 확인하고 수동 분류를 고려해 주세요.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowUncertainOnly(!showUncertainOnly);
              setSelectedCategory("전체");
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors shrink-0 ${
              showUncertainOnly
                ? "bg-amber-500 text-zinc-950 border-amber-500 hover:bg-amber-400"
                : "bg-amber-950/40 text-amber-400 border-amber-900 hover:bg-amber-900/40"
            }`}
          >
            {showUncertainOnly ? "전체 보기" : "검토 대상만 보기"}
          </button>
        </div>
      )}

      {/* 4. 주요 지표 카드 영역 (4개) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* 카드 1 */}
        <div className="bg-zinc-900/50 border border-zinc-900 rounded-xl p-5">
          <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">전체 민원</p>
          <p className="text-3xl font-bold mt-2 text-zinc-100">{complaints.length}</p>
        </div>

        {/* 카드 2 */}
        <div className="bg-zinc-900/50 border border-zinc-900 rounded-xl p-5">
          <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">분류 완료</p>
          <p className="text-3xl font-bold mt-2 text-emerald-400">
            {complaints.filter((c) => c.category).length}
          </p>
        </div>

        {/* 카드 3 */}
        <div className="bg-zinc-900/50 border border-zinc-900 rounded-xl p-5">
          <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">최다 분류</p>
          <p className="text-3xl font-bold mt-2 text-indigo-400">
            {topCategoryInfo.name !== "-" ? (
              <span className="text-lg sm:text-2xl font-bold">
                {topCategoryInfo.name}{" "}
                <span className="text-sm font-normal text-indigo-300">({topCategoryInfo.count}건)</span>
              </span>
            ) : (
              "-"
            )}
          </p>
        </div>

        {/* 카드 4 */}
        <div className="bg-zinc-900/50 border border-zinc-900 rounded-xl p-5">
          <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">처리 시간</p>
          <p className="text-3xl font-bold mt-2 text-zinc-100">
            {settings.lastSyncDuration ? `${settings.lastSyncDuration}초` : "-"}
          </p>
        </div>
      </div>

      {/* 5. 필터 및 검색 컨트롤 */}
      <div className="space-y-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* 검색창 */}
          <div className="relative w-full md:max-w-xs">
            <span className="absolute left-3 top-2.5 text-zinc-500 text-sm">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="민원번호, 제목, 내용 검색..."
              className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-900 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            {showUncertainOnly && (
              <span className="text-xs text-amber-500 bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-900/50 flex items-center gap-1">
                ⚠️ 검토 대상 필터 켜짐
                <button
                  onClick={() => setShowUncertainOnly(false)}
                  className="hover:text-amber-300 font-bold ml-1"
                >
                  ✕
                </button>
              </span>
            )}
            <button
              onClick={downloadExcel}
              className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-sm text-zinc-300 font-medium flex items-center gap-2 transition-colors"
            >
              📥 결과 엑셀 다운로드
            </button>
          </div>
        </div>

        {/* 카테고리 필터 칩 리스트 */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-900">
          {Object.entries(categoryCounts).map(([cat, count]) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  // 카테고리 명시 선택 시 불확실 필터는 일단 해제 (사용자가 원하면 다시 켤 수 있게)
                  if (cat !== "전체") setShowUncertainOnly(false);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                  isActive
                    ? "bg-zinc-100 text-zinc-950 border-zinc-100 font-bold"
                    : "bg-zinc-900/40 text-zinc-400 border-zinc-900 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                {cat} <span className="text-[10px] opacity-75">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. 데이터 표 (Table) */}
      <div className="border border-zinc-900 rounded-xl overflow-hidden bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-900/50 border-b border-zinc-900 text-zinc-500 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4 w-28">민원번호</th>
                <th className="py-3.5 px-4 w-32">접수일</th>
                <th className="py-3.5 px-4">제목</th>
                <th className="py-3.5 px-4 w-36">AI 분류</th>
                <th className="py-3.5 px-4 w-28 text-right">신뢰도</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 text-sm text-zinc-300">
              {filteredComplaints.length > 0 ? (
                filteredComplaints.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-zinc-900/30 transition-colors group relative"
                  >
                    {/* 민원번호 */}
                    <td className="py-4 px-4 font-mono text-xs text-zinc-500 group-hover:text-zinc-400">
                      {c.id}
                    </td>
                    {/* 접수일 */}
                    <td className="py-4 px-4 text-xs text-zinc-500">
                      {c.receivedAt}
                    </td>
                    {/* 제목 (상세 내용 포함 툴팁처럼 호버시 민원내용 노출 설계 가능) */}
                    <td className="py-4 px-4 font-medium text-zinc-200">
                      <div className="font-semibold text-zinc-200">{c.title}</div>
                      <div className="text-xs text-zinc-500 mt-1 line-clamp-1 group-hover:line-clamp-none transition-all duration-300">
                        {c.content}
                      </div>
                    </td>
                    {/* AI 분류 배지 */}
                    <td className="py-4 px-4">
                      {c.category ? (
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getCategoryStyle(
                            c.category
                          )}`}
                        >
                          {c.category}
                        </span>
                      ) : (
                        <span className="text-zinc-600 text-xs italic">미분류</span>
                      )}
                    </td>
                    {/* 신뢰도 및 알림 */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {c.isUncertain && (
                          <div className="relative group/tooltip">
                            <span className="cursor-help text-amber-500 text-xs">⚠️</span>
                            <div className="absolute right-0 bottom-full mb-2 w-64 bg-zinc-900 text-zinc-200 text-xs p-2.5 rounded-lg border border-zinc-800 shadow-2xl opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity z-20 text-left font-sans normal-case whitespace-normal">
                              <p className="font-bold text-amber-400 mb-1">분류 보완 검토 사유</p>
                              {c.uncertainReason || "신뢰도 지수가 기준치보다 낮거나 불확실합니다."}
                            </div>
                          </div>
                        )}
                        <span
                          className={`font-semibold font-mono text-xs ${
                            c.isUncertain ? "text-amber-500" : "text-zinc-400"
                          }`}
                        >
                          {c.confidence}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-600">
                    {searchQuery || selectedCategory !== "전체" || showUncertainOnly ? (
                      <p>필터링 조건에 부합하는 민원 데이터가 없습니다.</p>
                    ) : (
                      <div>
                        <p className="mb-2">연동된 민원 데이터가 존재하지 않습니다.</p>
                        <p className="text-xs text-zinc-700">
                          구글 시트 URL을 연동 설정한 뒤 [다시 분류하기] 버튼을 눌러 동기화해 주세요.
                        </p>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 하단 페이지 정보 */}
        <div className="bg-zinc-900/20 border-t border-zinc-900 px-4 py-3 flex items-center justify-between text-xs text-zinc-500">
          <div>
            Showing {filteredComplaints.length} of {complaints.length} complaints
          </div>
          <div>
            AI Classifier Engine v1.0
          </div>
        </div>
      </div>

      {/* 7. 연동 설정 모달 */}
      <ComplaintSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialSettings={{
          googleSheetUrl: settings.googleSheetUrl,
          hasCredentials: settings.hasCredentials,
          hasGeminiKey: settings.hasGeminiKey,
        }}
        onSaveSuccess={refreshSettings}
      />
    </div>
  );
}
