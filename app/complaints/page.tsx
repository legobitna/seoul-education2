import { prisma } from "@/lib/db";
import { getSetting, getGeminiApiKey } from "@/lib/settings";
import { ComplaintDashboard } from "@/components/complaints/ComplaintDashboard";

export const dynamic = "force-dynamic";

export default async function ComplaintsPage() {
  // 1. 로컬 DB에 저장된 민원 목록 조회
  const complaints = await prisma.complaint.findMany({
    orderBy: { id: "asc" },
  });

  // 2. 연동 설정 조회
  const googleSheetUrl = await getSetting("complaint_google_sheet_url");
  const hasCredentials = !!(await getSetting("complaint_google_credentials_json"));
  const localGeminiKey = await getSetting("geminiApiKey");
  const hasGeminiKey = !!(process.env.GEMINI_API_KEY || localGeminiKey);
  const lastSyncTime = await getSetting("complaint_last_sync_time");
  const lastSyncDuration = await getSetting("complaint_last_sync_duration");

  const serializedComplaints = complaints.map((c) => ({
    id: c.id,
    receivedAt: c.receivedAt,
    title: c.title,
    content: c.content,
    category: c.category,
    confidence: c.confidence,
    isUncertain: c.isUncertain,
    uncertainReason: c.uncertainReason,
    classifiedAt: c.classifiedAt.toISOString(),
  }));

  const initialSettings = {
    googleSheetUrl: googleSheetUrl || "",
    hasCredentials,
    hasGeminiKey,
    lastSyncTime: lastSyncTime || null,
    lastSyncDuration: lastSyncDuration || null,
  };

  return (
    <div className="py-2">
      <ComplaintDashboard
        initialComplaints={serializedComplaints}
        initialSettings={initialSettings}
      />
    </div>
  );
}
