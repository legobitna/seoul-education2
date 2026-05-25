import Link from "next/link";
import { redirect } from "next/navigation";
import { isSetupComplete } from "@/lib/settings";
import { prisma } from "@/lib/db";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const setup = await isSetupComplete();
  if (!setup) redirect("/settings");

  const meetings = await prisma.meeting.findMany({
    include: { attendees: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const enriched = meetings.map((m) => {
    let actionItemCount = 0;
    if (m.minutesJson) {
      try {
        const minutes = JSON.parse(m.minutesJson);
        actionItemCount = minutes.actionItems?.length ?? 0;
      } catch {
        /* ignore */
      }
    }
    return {
      id: m.id,
      title: m.title,
      status: m.status,
      createdAt: m.createdAt.toISOString(),
      actionItemCount,
    };
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">회의록</h1>
          <p className="text-slate-500 text-sm mt-1">
            회의를 녹음하고 종료하면 AI가 회의록을 작성하고 참석자에게 메일을 보냅니다.
          </p>
        </div>
        <Link href="/meetings/new" className="btn btn-primary btn-lg">
          + 새 회의
        </Link>
      </div>
      <DashboardClient initialMeetings={enriched} />
    </div>
  );
}
