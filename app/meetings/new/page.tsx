import { Suspense } from "react";
import { redirect } from "next/navigation";
import { isSetupComplete } from "@/lib/settings";
import { MeetingWizard } from "@/components/wizard/MeetingWizard";

export const dynamic = "force-dynamic";

export default async function NewMeetingPage() {
  const setup = await isSetupComplete();
  if (!setup) redirect("/settings");

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2 text-center">회의록 · 새 회의</h1>
      <p className="text-center text-slate-500 text-sm mb-8">
        3단계로 녹음부터 회의록 메일 발송까지 자동 처리됩니다.
      </p>
      <Suspense fallback={<p className="text-center">로딩...</p>}>
        <MeetingWizard />
      </Suspense>
    </div>
  );
}
