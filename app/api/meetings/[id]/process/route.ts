import { NextRequest } from "next/server";
import { createSseStream } from "@/lib/sse";
import { processMeeting } from "@/lib/process-meeting";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const meeting = await prisma.meeting.findUnique({ where: { id } });
  if (!meeting) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
    });
  }

  const { send, close, response } = createSseStream();

  (async () => {
    try {
      send({
        step: "upload",
        message: "녹음 파일 확인 완료",
        progress: 20,
      });
      await processMeeting(id, send);
    } catch {
      // error already sent via SSE
    } finally {
      close();
    }
  })();

  return response();
}
