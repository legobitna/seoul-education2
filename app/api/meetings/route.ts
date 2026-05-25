import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseMinutesJson } from "@/lib/minutes";

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");
  const meetings = await prisma.meeting.findMany({
    where: status && status !== "all" ? { status } : undefined,
    include: { attendees: true, template: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const enriched = meetings.map((m) => {
    const minutes = parseMinutesJson(m.minutesJson);
    return {
      ...m,
      actionItemCount: minutes?.actionItems?.length ?? 0,
    };
  });

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, templateId, attendees, sendEmail } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "회의 제목이 필요합니다." }, { status: 400 });
  }

  const emails: { email: string; name?: string }[] = attendees ?? [];
  if (emails.length === 0) {
    return NextResponse.json(
      { error: "참석자 이메일을 1명 이상 추가하세요." },
      { status: 400 }
    );
  }

  const meeting = await prisma.meeting.create({
    data: {
      title: title.trim(),
      templateId: templateId || null,
      status: "draft",
      sendEmail: sendEmail !== false,
      attendees: {
        create: emails.map((a: { email: string; name?: string }) => ({
          email: a.email.trim(),
          name: a.name?.trim() || null,
        })),
      },
    },
    include: { attendees: true, template: true },
  });

  return NextResponse.json(meeting);
}
