"use client";

import { useState } from "react";

interface ComplaintSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSettings: {
    googleSheetUrl: string;
    hasCredentials: boolean;
    hasGeminiKey: boolean;
  };
  onSaveSuccess: () => void;
}

export function ComplaintSettingsModal({
  isOpen,
  onClose,
  initialSettings,
  onSaveSuccess,
}: ComplaintSettingsModalProps) {
  const [googleSheetUrl, setGoogleSheetUrl] = useState(initialSettings.googleSheetUrl);
  const [googleCredentialsJson, setGoogleCredentialsJson] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload: Record<string, string> = {
        googleSheetUrl,
      };

      if (googleCredentialsJson.trim() !== "") {
        // 간단한 JSON 형식 체크
        try {
          JSON.parse(googleCredentialsJson);
          payload.googleCredentialsJson = googleCredentialsJson;
        } catch {
          throw new Error("구글 서비스 계정 키(JSON)의 형식이 올바르지 않습니다. 유효한 JSON을 입력해주세요.");
        }
      }

      if (geminiApiKey.trim() !== "") {
        payload.geminiApiKey = geminiApiKey;
      }

      const response = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "설정 저장 중 오류가 발생했습니다.");
      }

      onSaveSuccess();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl animate-in fade-in-50 zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-5">
          <h2 className="text-xl font-semibold text-zinc-100 flex items-center gap-2">
            ⚙️ 구글 시트 및 AI 설정
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/50 border border-red-900 rounded-lg text-red-400 text-sm">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 구글 시트 주소 */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              구글 스프레드시트 URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              required
              value={googleSheetUrl}
              onChange={(e) => setGoogleSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/.../edit"
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
            />
            <p className="text-xs text-zinc-500 mt-1">
              ※ 시트 공유 설정을 <strong>&quot;링크가 있는 모든 사용자가 볼 수 있음&quot;</strong>으로 변경하셔야 정상 파싱됩니다.
            </p>
          </div>

          {/* Gemini API Key */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Gemini API Key
            </label>
            <input
              type="password"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              placeholder={initialSettings.hasGeminiKey ? "••••••••••••••••••••••••••••" : "AI API 키를 입력하세요"}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
            />
            <p className="text-xs text-zinc-500 mt-1">
              {initialSettings.hasGeminiKey 
                ? "이미 API 키가 서버나 환경설정에 등록되어 있습니다. 변경하려면 새로 입력하세요."
                : "Gemini API 키가 아직 등록되지 않았습니다. 입력해 주세요 (무료 플랜 사용 가능)."}
            </p>
          </div>

          {/* 구글 서비스 계정 키 JSON */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5 flex justify-between">
              <span>Google Service Account JSON Key (구글 시트 기록용)</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-normal ${
                initialSettings.hasCredentials 
                  ? "bg-emerald-950/50 text-emerald-400 border border-emerald-900" 
                  : "bg-amber-950/50 text-amber-400 border border-amber-900"
              }`}>
                {initialSettings.hasCredentials ? "설정 완료" : "미설정 (쓰기 미지원)"}
              </span>
            </label>
            <textarea
              value={googleCredentialsJson}
              onChange={(e) => setGoogleCredentialsJson(e.target.value)}
              placeholder='{ "type": "service_account", "project_id": ... }'
              rows={4}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors text-xs font-mono"
            />
            <p className="text-xs text-zinc-500 mt-1">
              ※ 분류 결과를 스프레드시트에 자동 업데이트하기 위한 서비스 계정의 비공개 키 JSON 내용 전체를 붙여넣으세요.
              해당 서비스 계정 이메일을 구글 스프레드시트 공유 멤버에 <strong>&quot;편집자&quot;</strong>로 추가해야 기록할 수 있습니다.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-zinc-800 pt-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 rounded-lg transition-colors text-sm font-medium"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  저장 중...
                </>
              ) : (
                "저장"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
