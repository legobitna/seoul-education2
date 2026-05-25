"use client";

import { useCallback, useRef, useState } from "react";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

interface MeetingRecorderProps {
  onEnd: (blob: Blob) => void;
  disabled?: boolean;
}

export function MeetingRecorder({ onEnd, disabled }: MeetingRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startTimer = () => {
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        onEnd(blob);
      };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setPaused(false);
      setElapsed(0);
      startTimer();
    } catch {
      alert("마이크 권한이 필요합니다. Chrome 또는 Edge를 사용해 주세요.");
    }
  }, [onEnd]);

  const pauseRecording = () => {
    const rec = mediaRecorderRef.current;
    if (!rec) return;
    if (paused) {
      rec.resume();
      startTimer();
    } else {
      rec.pause();
      stopTimer();
    }
    setPaused(!paused);
  };

  const stopRecording = () => {
    stopTimer();
    setRecording(false);
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
  };

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      <div className="text-center">
        {recording && (
          <span className="inline-flex items-center gap-2 text-red-600 font-medium mb-2">
            <span className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
            REC
          </span>
        )}
        <p className="text-5xl font-mono font-bold text-slate-800 tabular-nums">
          {formatTime(elapsed)}
        </p>
        <p className="text-sm text-slate-500 mt-2">
          권장 최대 녹음 시간: 90분
        </p>
      </div>

      <div className="flex flex-wrap gap-4 justify-center">
        {!recording ? (
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={startRecording}
            disabled={disabled}
          >
            ● 녹음 시작
          </button>
        ) : (
          <>
            <button
              type="button"
              className="btn btn-secondary btn-lg"
              onClick={pauseRecording}
            >
              {paused ? "▶ 재개" : "⏸ 일시정지"}
            </button>
            <button
              type="button"
              className="btn btn-danger btn-lg"
              onClick={stopRecording}
            >
              ■ 회의 종료
            </button>
          </>
        )}
      </div>
    </div>
  );
}
