import { NextRequest, NextResponse } from "next/server";
import { testSmtpConnection } from "@/lib/email";
import { saveSettings } from "@/lib/settings";

export async function POST(req: NextRequest) {
  try {
    const { smtpUser, smtpPass, smtpFrom, testTo } = await req.json();
    if (!smtpUser || !smtpPass || !testTo) {
      return NextResponse.json(
        { ok: false, error: "이메일, 앱 비밀번호, 테스트 수신 주소가 필요합니다." },
        { status: 400 }
      );
    }
    await testSmtpConnection(
      smtpUser,
      smtpPass,
      smtpFrom || smtpUser,
      testTo
    );
    await saveSettings({
      smtpUser,
      smtpPass,
      smtpFrom: smtpFrom || smtpUser,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "메일 발송 실패";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
