import { createSseStream } from "@/lib/sse";
import { processMeeting } from "@/lib/process-meeting";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const meeting = await prisma.meeting.findUnique({ where: { id } });
  if (!meeting?.audioPath) {
    return new Response(JSON.stringify({ error: "녹음 파일 없음" }), {
      status: 400,
    });
  }

  const { send, close, response } = createSseStream();

  (async () => {
    try {
      await processMeeting(id, send);
    } catch {
      // handled in processMeeting
    } finally {
      close();
    }
  })();

  return response();
}
