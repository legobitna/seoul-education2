import { NextRequest, NextResponse } from "next/server";
import {
  getSettingsMap,
  saveSettings,
  markSetupComplete,
  isSetupComplete,
} from "@/lib/settings";

export async function GET() {
  const settings = await getSettingsMap();
  const complete = await isSetupComplete();
  return NextResponse.json({
    geminiApiKey: settings.geminiApiKey ? "••••••••" : "",
    smtpUser: settings.smtpUser ?? "",
    smtpFrom: settings.smtpFrom ?? "",
    smtpPass: settings.smtpPass ? "••••••••" : "",
    setupComplete: complete,
    hasGeminiKey: Boolean(settings.geminiApiKey || process.env.GEMINI_API_KEY),
    hasSmtp: Boolean(settings.smtpUser && settings.smtpPass),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const data: {
    geminiApiKey?: string;
    smtpUser?: string;
    smtpPass?: string;
    smtpFrom?: string;
    markComplete?: boolean;
  } = {};

  if (body.geminiApiKey && !body.geminiApiKey.includes("••••"))
    data.geminiApiKey = body.geminiApiKey;
  if (body.smtpUser) data.smtpUser = body.smtpUser;
  if (body.smtpPass && !body.smtpPass.includes("••••"))
    data.smtpPass = body.smtpPass;
  if (body.smtpFrom) data.smtpFrom = body.smtpFrom;

  await saveSettings(data);
  if (body.markComplete) await markSetupComplete();

  return NextResponse.json({ ok: true });
}
