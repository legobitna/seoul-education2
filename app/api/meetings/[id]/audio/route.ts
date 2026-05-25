import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { saveRecording, ensureDataDirs } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const meeting = await prisma.meeting.findUnique({ where: { id } });
  if (!meeting) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await ensureDataDirs();
  const formData = await req.formData();
  const file = formData.get("audio") as File | null;

  if (!file) {
    return NextResponse.json({ error: "오디오 파일이 없습니다." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name?.split(".").pop() ?? "webm";

  // Save to local filesystem (works locally, best-effort on Vercel /tmp)
  let audioPath = "";
  try {
    audioPath = await saveRecording(id, buffer, ext);
  } catch {
    audioPath = `recordings/${id}.${ext}`;
  }

  // Also store base64 in DB so process endpoint can always access it
  const audioBase64 = buffer.toString("base64");

  await prisma.meeting.update({
    where: { id },
    data: { audioPath, audioData: audioBase64, status: "recording" },
  });

  return NextResponse.json({ ok: true, audioPath });
}
