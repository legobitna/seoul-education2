import Link from "next/link";

const STATUS_LABEL: Record<string, string> = {
  draft: "준비",
  recording: "녹음중",
  processing: "처리중",
  completed: "완료",
  failed: "실패",
};

const STATUS_CLASS: Record<string, string> = {
  draft: "badge-draft",
  recording: "badge-recording",
  processing: "badge-processing",
  completed: "badge-completed",
  failed: "badge-failed",
};

interface MeetingCardProps {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  actionItemCount: number;
}

export function MeetingCard({
  id,
  title,
  status,
  createdAt,
  actionItemCount,
}: MeetingCardProps) {
  const date = new Date(createdAt).toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Link href={`/meetings/${id}`} className="card block hover:border-blue-300 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500 mt-1">{date}</p>
        </div>
        <span className={`badge ${STATUS_CLASS[status] ?? "badge-draft"}`}>
          {STATUS_LABEL[status] ?? status}
        </span>
      </div>
      {status === "completed" && actionItemCount > 0 && (
        <p className="text-sm text-slate-600 mt-3">
          액션 아이템 {actionItemCount}건
        </p>
      )}
      {status === "failed" && (
        <p className="text-sm text-red-600 mt-3">다시 처리할 수 있습니다 →</p>
      )}
    </Link>
  );
}
