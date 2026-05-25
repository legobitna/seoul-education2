import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseMinutesJson } from "@/lib/minutes";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: { attendees: true, template: true },
  });
  if (!meeting) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    ...meeting,
    minutes: parseMinutesJson(meeting.minutesJson),
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const meeting = await prisma.meeting.update({
    where: { id },
    data: body,
    include: { attendees: true },
  });
  return NextResponse.json(meeting);
}
