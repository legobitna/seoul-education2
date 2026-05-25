"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Stepper } from "./Stepper";
import { MeetingRecorder } from "../MeetingRecorder";
import { ProcessingProgress } from "../ProcessingProgress";
import { MinutesPreview } from "../MinutesPreview";
import type { MeetingMinutes, SseEvent } from "@/lib/types";
import { minutesToMarkdown } from "@/lib/minutes";

interface Template {
  id: string;
  name: string;
  promptHint: string;
}

interface ContactGroup {
  id: string;
  name: string;
  contacts: { id: string; email: string; name: string | null }[];
}

interface AttendeeInput {
  email: string;
  name?: string;
}

export function MeetingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [contactGroups, setContactGroups] = useState<ContactGroup[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [manualEmail, setManualEmail] = useState("");
  const [manualName, setManualName] = useState("");
  const [attendees, setAttendees] = useState<AttendeeInput[]>([]);
  const [sendEmail, setSendEmail] = useState(true);
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [sseEvent, setSseEvent] = useState<SseEvent | null>(null);
  const [minutes, setMinutes] = useState<MeetingMinutes | null>(null);
  const [mailResults, setMailResults] = useState<{ email: string; mailSent: boolean }[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const prefill = searchParams.get("prefill");
    if (prefill) {
      fetch(`/api/meetings/${prefill}`)
        .then((r) => r.json())
        .then((m) => {
          if (m.attendees) {
            setAttendees(
              m.attendees.map((a: { email: string; name?: string }) => ({
                email: a.email,
                name: a.name,
              }))
            );
          }
        })
        .catch(() => {});
    }
    Promise.all([
      fetch("/api/templates").then((r) => r.json()),
      fetch("/api/contacts").then((r) => r.json()),
    ]).then(([t, c]) => {
      setTemplates(t);
      setContactGroups(c);
      if (t.length > 0 && !templateId) setTemplateId(t[0].id);
    });
  }, [searchParams, templateId]);

  const toggleContact = (id: string, email: string, name: string | null) => {
    const next = new Set(selectedContactIds);
    if (next.has(id)) {
      next.delete(id);
      setAttendees((prev) => prev.filter((a) => a.email !== email));
    } else {
      next.add(id);
      setAttendees((prev) => {
        if (prev.some((a) => a.email === email)) return prev;
        return [...prev, { email, name: name ?? undefined }];
      });
    }
    setSelectedContactIds(next);
  };

  const addManualAttendee = () => {
    const email = manualEmail.trim();
    if (!email || !email.includes("@")) return;
    if (attendees.some((a) => a.email === email)) return;
    setAttendees([...attendees, { email, name: manualName.trim() || undefined }]);
    setManualEmail("");
    setManualName("");
  };

  const removeAttendee = (email: string) => {
    setAttendees(attendees.filter((a) => a.email !== email));
  };

  const createMeeting = async () => {
    const res = await fetch("/api/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        templateId: templateId || null,
        attendees,
        sendEmail,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "회의 생성 실패");
    return data.id as string;
  };

  const handleStep1Next = async () => {
    setError("");
    try {
      const id = await createMeeting();
      setMeetingId(id);
      await fetch(`/api/meetings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "recording" }),
      });
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    }
  };

  const runProcessPipeline = useCallback(
    async (id: string, blob: Blob) => {
      setStep(3);
      setProcessing(true);
      setSseEvent({ step: "upload", message: "녹음 업로드 중...", progress: 10 });

      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      const uploadRes = await fetch(`/api/meetings/${id}/audio`, {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || "업로드 실패");
      }

      const res = await fetch(`/api/meetings/${id}/process`, { method: "POST" });
      if (!res.ok || !res.body) throw new Error("처리 시작 실패");

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
            const event = JSON.parse(line.slice(6)) as SseEvent;
            setSseEvent(event);
            if (event.step === "error") throw new Error(event.error ?? event.message);
          }
        }
      }

      const meetingRes = await fetch(`/api/meetings/${id}`);
      const meeting = await meetingRes.json();
      setMinutes(meeting.minutes);
      setMailResults(
        meeting.attendees.map((a: { email: string; mailSent: boolean }) => ({
          email: a.email,
          mailSent: a.mailSent,
        }))
      );
      setProcessing(false);
    },
    []
  );

  const handleRecordingEnd = async (blob: Blob) => {
    if (!meetingId) return;
    setError("");
    try {
      await runProcessPipeline(meetingId, blob);
    } catch (e) {
      setProcessing(false);
      setSseEvent({
        step: "error",
        message: e instanceof Error ? e.message : "처리 실패",
        progress: 0,
        error: e instanceof Error ? e.message : "처리 실패",
      });
    }
  };

  const copyMarkdown = () => {
    if (!minutes) return;
    navigator.clipboard.writeText(minutesToMarkdown(minutes));
    alert("클립보드에 복사되었습니다.");
  };

  const downloadMarkdown = () => {
    if (!minutes) return;
    const md = minutesToMarkdown(minutes);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${minutes.title}-회의록.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <Stepper current={step} />

      {step === 1 && (
        <div className="card max-w-xl mx-auto space-y-5">
          <h2 className="text-lg font-semibold">① 회의 준비</h2>
          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div>
            <label className="label">회의 제목 *</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 5월 주간 팀 회의"
            />
          </div>

          <div>
            <label className="label">회의 템플릿</label>
            <select
              className="input"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">자주 쓰는 참석자</label>
            <div className="space-y-3 max-h-40 overflow-y-auto border border-slate-100 rounded-lg p-3">
              {contactGroups.length === 0 ? (
                <p className="text-sm text-slate-500">
                  설정에서 참석자 그룹을 추가할 수 있습니다.
                </p>
              ) : (
                contactGroups.map((g) => (
                  <div key={g.id}>
                    <p className="text-xs font-medium text-slate-500 mb-1">{g.name}</p>
                    {g.contacts.map((c) => (
                      <label
                        key={c.id}
                        className="flex items-center gap-2 py-1 text-sm cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedContactIds.has(c.id)}
                          onChange={() => toggleContact(c.id, c.email, c.name)}
                        />
                        {c.name ? `${c.name} (${c.email})` : c.email}
                      </label>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <label className="label">참석자 직접 추가</label>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="이메일"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
              />
              <input
                className="input w-28"
                placeholder="이름"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
              />
              <button type="button" className="btn btn-secondary" onClick={addManualAttendee}>
                추가
              </button>
            </div>
          </div>

          {attendees.length > 0 && (
            <ul className="text-sm space-y-1">
              {attendees.map((a) => (
                <li key={a.email} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded">
                  <span>{a.name ? `${a.name} <${a.email}>` : a.email}</span>
                  <button
                    type="button"
                    className="text-red-500 text-xs"
                    onClick={() => removeAttendee(a.email)}
                  >
                    삭제
                  </button>
                </li>
              ))}
            </ul>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
            />
            회의 종료 후 참석자에게 회의록 메일 자동 발송
          </label>

          <button
            type="button"
            className="btn btn-primary w-full"
            disabled={!title.trim() || attendees.length === 0}
            onClick={handleStep1Next}
          >
            다음: 녹음 시작 →
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="card max-w-xl mx-auto">
          <h2 className="text-lg font-semibold text-center mb-2">② 녹음</h2>
          <p className="text-center text-slate-500 text-sm mb-4">{title}</p>
          <MeetingRecorder onEnd={handleRecordingEnd} />
        </div>
      )}

      {step === 3 && (
        <div className="max-w-2xl mx-auto space-y-6">
          {processing || sseEvent?.step === "error" ? (
            <ProcessingProgress event={sseEvent} />
          ) : minutes ? (
            <>
              <div className="card">
                <h2 className="text-lg font-semibold mb-4">③ 완료</h2>
                <MinutesPreview minutes={minutes} />
              </div>

              {mailResults.length > 0 && (
                <div className="card text-sm">
                  <h3 className="font-medium mb-2">메일 발송</h3>
                  <ul className="space-y-1">
                    {mailResults.map((m) => (
                      <li key={m.email} className="flex items-center gap-2">
                        {m.mailSent ? "✅" : "⚠️"} {m.email}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap gap-3 justify-center">
                <button type="button" className="btn btn-secondary" onClick={copyMarkdown}>
                  클립보드 복사
                </button>
                <button type="button" className="btn btn-secondary" onClick={downloadMarkdown}>
                  .md 다운로드
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => router.push("/")}
                >
                  대시보드로
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() =>
                    router.push(`/meetings/new?prefill=${meetingId}`)
                  }
                >
                  같은 참석자로 새 회의
                </button>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
