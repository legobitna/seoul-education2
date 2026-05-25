import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const templates = await prisma.meetingTemplate.findMany({
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action === "create") {
    const t = await prisma.meetingTemplate.create({
      data: { name: body.name, promptHint: body.promptHint ?? "" },
    });
    return NextResponse.json(t);
  }

  if (body.action === "delete") {
    await prisma.meetingTemplate.delete({ where: { id: body.id } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
