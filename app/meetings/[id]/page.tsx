"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { MinutesPreview } from "@/components/MinutesPreview";
import { ProcessingProgress } from "@/components/ProcessingProgress";
import type { MeetingMinutes, SseEvent } from "@/lib/types";
import { minutesToMarkdown } from "@/lib/minutes";

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [meeting, setMeeting] = useState<{
    title: string;
    status: string;
    errorMessage: string | null;
    minutes: MeetingMinutes | null;
    attendees: { email: string; name: string | null; mailSent: boolean }[];
  } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [sseEvent, setSseEvent] = useState<SseEvent | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    const res = await fetch(`/api/meetings/${id}`);
    const data = await res.json();
    setMeeting(data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const retryProcess = async () => {
    setProcessing(true);
    setSseEvent({ step: "transcribe", message: "재처리 중...", progress: 20 });
    const res = await fetch(`/api/meetings/${id}/retry`, { method: "POST" });
    if (!res.ok || !res.body) return;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          setSseEvent(JSON.parse(line.slice(6)));
        }
      }
    }
    setProcessing(false);
    load();
  };

  const resendEmail = async () => {
    const res = await fetch(`/api/meetings/${id}/resend-email`, { method: "POST" });
    const data = await res.json();
    alert(
      data.results
        ?.map((r: { email: string; ok: boolean }) => `${r.email}: ${r.ok ? "성공" : "실패"}`)
        .join("\n") ?? "발송 완료"
    );
    load();
  };

  if (loading) return <p className="text-center text-slate-500">로딩...</p>;
  if (!meeting) return <p className="text-center text-red-500">회의를 찾을 수 없습니다.</p>;

  if (processing) {
    return <ProcessingProgress event={sseEvent} />;
  }

  const minutes = meeting.minutes;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            ← 대시보드
          </Link>
          <h1 className="text-2xl font-bold mt-2">{meeting.title}</h1>
          <span className={`badge mt-2 badge-${meeting.status}`}>
            {meeting.status}
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {meeting.status === "failed" && (
            <button type="button" className="btn btn-primary" onClick={retryProcess}>
              다시 처리
            </button>
          )}
          {minutes && (
            <>
              <button type="button" className="btn btn-secondary" onClick={resendEmail}>
                메일 재발송
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  navigator.clipboard.writeText(minutesToMarkdown(minutes));
                  alert("복사됨");
                }}
              >
                Markdown 복사
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => router.push(`/meetings/new?prefill=${id}`)}
              >
                같은 참석자로 새 회의
              </button>
            </>
          )}
        </div>
      </div>

      {meeting.errorMessage && (
        <div className="card bg-red-50 border-red-200 text-red-700 text-sm">
          {meeting.errorMessage}
        </div>
      )}

      {minutes ? (
        <>
          <div className="card">
            <MinutesPreview minutes={minutes} />
          </div>
          {minutes.actionItems.length > 0 && (
            <div className="card">
              <h3 className="font-semibold mb-3">액션 아이템 체크리스트</h3>
              <ul className="space-y-2">
                {minutes.actionItems.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checkedItems.has(i)}
                      onChange={() => {
                        const next = new Set(checkedItems);
                        if (next.has(i)) next.delete(i);
                        else next.add(i);
                        setCheckedItems(next);
                      }}
                    />
                    <span className={checkedItems.has(i) ? "line-through text-slate-400" : ""}>
                      [{a.owner}] {a.task} ({a.dueDate ?? "미정"})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <div className="card text-slate-500 text-center py-8">
          회의록이 아직 생성되지 않았습니다.
        </div>
      )}
    </div>
  );
}
