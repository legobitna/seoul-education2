"use client";

import type { SseEvent } from "@/lib/types";

const STEP_LABELS: Record<string, string> = {
  upload: "업로드",
  transcribe: "전사",
  summarize: "회의록 작성",
  email: "메일 발송",
  done: "완료",
  error: "오류",
};

export function ProcessingProgress({
  event,
}: {
  event: SseEvent | null;
}) {
  const steps = ["upload", "transcribe", "summarize", "email", "done"];
  const currentStep = event?.step ?? "upload";
  const isError = currentStep === "error";

  return (
    <div className="card max-w-lg mx-auto text-center">
      {isError ? (
        <div className="text-red-600 mb-4">
          <p className="text-lg font-medium">처리 실패</p>
          <p className="text-sm mt-2">{event?.error ?? event?.message}</p>
        </div>
      ) : (
        <>
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium text-slate-800 mb-1">
            {event?.message ?? "처리 중..."}
          </p>
          <div className="w-full bg-slate-100 rounded-full h-2 mb-6">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${event?.progress ?? 10}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            {steps.slice(0, -1).map((s) => {
              const idx = steps.indexOf(s);
              const curIdx = Math.max(0, steps.indexOf(currentStep));
              const done = idx < curIdx;
              const active = s === currentStep;
              return (
                <span
                  key={s}
                  className={
                    active
                      ? "text-blue-600 font-medium"
                      : done
                        ? "text-green-600"
                        : ""
                  }
                >
                  {STEP_LABELS[s]}
                  {done ? " ✓" : ""}
                </span>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
