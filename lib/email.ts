import nodemailer from "nodemailer";
import { getSmtpConfig } from "./settings";
import type { MeetingMinutes } from "./types";

export async function testSmtpConnection(
  user: string,
  pass: string,
  from: string,
  testTo: string
): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user, pass },
  });
  await transporter.verify();
  await transporter.sendMail({
    from: `"회의록 자동화" <${from}>`,
    to: testTo,
    subject: "[테스트] 회의록 자동화 메일 설정 확인",
    html: "<p>Gmail SMTP 설정이 정상적으로 완료되었습니다.</p>",
  });
}

function buildEmailHtml(
  minutes: MeetingMinutes,
  meetingUrl: string
): string {
  const decisions =
    minutes.decisions.length > 0
      ? `<ul>${minutes.decisions.map((d) => `<li>${escapeHtml(d)}</li>`).join("")}</ul>`
      : "<p>없음</p>";

  const actions =
    minutes.actionItems.length > 0
      ? `<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%">
        <tr><th>담당</th><th>할 일</th><th>기한</th></tr>
        ${minutes.actionItems
          .map(
            (a) =>
              `<tr><td>${escapeHtml(a.owner)}</td><td>${escapeHtml(a.task)}</td><td>${escapeHtml(a.dueDate ?? "미정")}</td></tr>`
          )
          .join("")}
      </table>`
      : "<p>없음</p>";

  return `
    <div style="font-family:sans-serif;max-width:640px;margin:0 auto">
      <h1 style="color:#1e40af">회의록: ${escapeHtml(minutes.title)}</h1>
      <p style="color:#64748b">${escapeHtml(minutes.date)}</p>
      <h2>요약</h2>
      <p>${escapeHtml(minutes.summary)}</p>
      <h2>결정 사항</h2>
      ${decisions}
      <h2>액션 아이템</h2>
      ${actions}
      <h2>다음 단계</h2>
      <p>${escapeHtml(minutes.nextSteps)}</p>
      <p style="margin-top:24px">
        <a href="${meetingUrl}" style="background:#2563eb;color:#fff;padding:10px 16px;text-decoration:none;border-radius:6px">
          전체 회의록 보기
        </a>
      </p>
    </div>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendMinutesEmail(
  to: string,
  minutes: MeetingMinutes,
  meetingUrl: string,
  attendeeName?: string
): Promise<void> {
  const smtp = await getSmtpConfig();
  if (!smtp) throw new Error("SMTP 설정이 완료되지 않았습니다.");

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user: smtp.user, pass: smtp.pass },
  });

  const greeting = attendeeName ? `${attendeeName}님,` : "안녕하세요,";

  await transporter.sendMail({
    from: `"회의록 자동화" <${smtp.from}>`,
    to,
    subject: `[회의록] ${minutes.title} - ${minutes.date}`,
    html: `<p>${greeting}</p>${buildEmailHtml(minutes, meetingUrl)}`,
  });
}
