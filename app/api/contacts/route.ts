import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const groups = await prisma.contactGroup.findMany({
    include: { contacts: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(groups);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action === "createGroup") {
    const group = await prisma.contactGroup.create({
      data: { name: body.name },
      include: { contacts: true },
    });
    return NextResponse.json(group);
  }

  if (body.action === "addContact") {
    const contact = await prisma.contact.create({
      data: {
        groupId: body.groupId,
        email: body.email,
        name: body.name ?? null,
      },
    });
    return NextResponse.json(contact);
  }

  if (body.action === "deleteGroup") {
    await prisma.contactGroup.delete({ where: { id: body.groupId } });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "deleteContact") {
    await prisma.contact.delete({ where: { id: body.contactId } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
