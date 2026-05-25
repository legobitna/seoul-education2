import { NextRequest, NextResponse } from "next/server";
import { testGeminiConnection } from "@/lib/gemini";
import { setSetting } from "@/lib/settings";

export async function POST(req: NextRequest) {
  try {
    const { apiKey } = await req.json();
    const ok = await testGeminiConnection(apiKey);
    if (apiKey) await setSetting("geminiApiKey", apiKey);
    return NextResponse.json({ ok });
  } catch (e) {
    const message = e instanceof Error ? e.message : "연결 실패";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
