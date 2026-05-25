"use client";

import { useState } from "react";
import { MeetingCard } from "./MeetingCard";

interface MeetingItem {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  actionItemCount: number;
}

export function DashboardClient({
  initialMeetings,
}: {
  initialMeetings: MeetingItem[];
}) {
  const [filter, setFilter] = useState("all");
  const [meetings, setMeetings] = useState(initialMeetings);

  const refresh = async (status: string) => {
    const res = await fetch(
      `/api/meetings?status=${status === "all" ? "all" : status}`
    );
    const data = await res.json();
    setMeetings(data);
  };

  const onFilter = (f: string) => {
    setFilter(f);
    refresh(f);
  };

  const filtered =
    filter === "all"
      ? meetings
      : meetings.filter((m) => m.status === filter);

  const filters = [
    { key: "all", label: "전체" },
    { key: "processing", label: "처리중" },
    { key: "completed", label: "완료" },
    { key: "failed", label: "실패" },
  ];

  return (
    <>
      <div className="flex gap-2 mb-6 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => onFilter(f.key)}
            className={`btn text-sm ${
              filter === f.key ? "btn-primary" : "btn-secondary"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-12 text-slate-500">
          <p className="text-lg mb-2">아직 회의가 없습니다</p>
          <p className="text-sm">「새 회의」버튼으로 첫 회의를 시작하세요.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((m) => (
            <MeetingCard key={m.id} {...m} />
          ))}
        </div>
      )}
    </>
  );
}
