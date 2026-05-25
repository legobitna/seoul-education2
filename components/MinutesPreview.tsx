"use client";

import type { MeetingMinutes } from "@/lib/types";

export function MinutesPreview({ minutes }: { minutes: MeetingMinutes }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{minutes.title}</h2>
        <p className="text-sm text-slate-500 mt-1">{minutes.date}</p>
        {minutes.attendees.length > 0 && (
          <p className="text-sm text-slate-600 mt-1">
            참석: {minutes.attendees.join(", ")}
          </p>
        )}
      </div>

      <section>
        <h3 className="font-semibold text-slate-800 mb-2">요약</h3>
        <p className="text-slate-700 leading-relaxed">{minutes.summary}</p>
      </section>

      <section>
        <h3 className="font-semibold text-slate-800 mb-2">결정 사항</h3>
        {minutes.decisions.length === 0 ? (
          <p className="text-slate-500 text-sm">없음</p>
        ) : (
          <ul className="list-disc list-inside space-y-1 text-slate-700">
            {minutes.decisions.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="font-semibold text-slate-800 mb-2">액션 아이템</h3>
        {minutes.actionItems.length === 0 ? (
          <p className="text-slate-500 text-sm">없음</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-2 border-b">담당</th>
                  <th className="text-left p-2 border-b">할 일</th>
                  <th className="text-left p-2 border-b">기한</th>
                </tr>
              </thead>
              <tbody>
                {minutes.actionItems.map((a, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0">
                    <td className="p-2">{a.owner}</td>
                    <td className="p-2">{a.task}</td>
                    <td className="p-2">{a.dueDate ?? "미정"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h3 className="font-semibold text-slate-800 mb-2">다음 단계</h3>
        <p className="text-slate-700">{minutes.nextSteps}</p>
      </section>

      {minutes.fullTranscript && (
        <section>
          <h3 className="font-semibold text-slate-800 mb-2">전사 요약</h3>
          <p className="text-slate-600 text-sm whitespace-pre-wrap">
            {minutes.fullTranscript}
          </p>
        </section>
      )}
    </div>
  );
}
