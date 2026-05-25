import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseMinutesJson } from "@/lib/minutes";
import { sendMinutesEmail } from "@/lib/email";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: { attendees: true },
  });

  if (!meeting) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const minutes = parseMinutesJson(meeting.minutesJson);
  if (!minutes) {
    return NextResponse.json(
      { error: "회의록이 아직 생성되지 않았습니다." },
      { status: 400 }
    );
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const meetingUrl = `${baseUrl}/meetings/${id}`;

  const results: { email: string; ok: boolean; error?: string }[] = [];

  for (const attendee of meeting.attendees) {
    try {
      await sendMinutesEmail(
        attendee.email,
        minutes,
        meetingUrl,
        attendee.name ?? undefined
      );
      await prisma.attendee.update({
        where: { id: attendee.id },
        data: { mailSent: true },
      });
      results.push({ email: attendee.email, ok: true });
    } catch (e) {
      results.push({
        email: attendee.email,
        ok: false,
        error: e instanceof Error ? e.message : "발송 실패",
      });
    }
  }

  await prisma.meeting.update({
    where: { id },
    data: { emailSentAt: new Date() },
  });

  return NextResponse.json({ results });
}
