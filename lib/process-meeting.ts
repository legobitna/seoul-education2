import { prisma } from "./db";
import { generateMinutesFromAudio } from "./gemini";
import { sendMinutesEmail } from "./email";
import { readRecording } from "./storage";
import type { SseEvent } from "./types";

type SendFn = (event: SseEvent) => void;

export async function processMeeting(
  meetingId: string,
  send: SendFn
): Promise<void> {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { attendees: true, template: true },
  });

  if (!meeting) throw new Error("회의를 찾을 수 없습니다.");
  if (!meeting.audioPath) throw new Error("녹음 파일이 없습니다.");

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const meetingUrl = `${baseUrl}/meetings/${meetingId}`;

  try {
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: "processing", errorMessage: null },
    });

    send({
      step: "transcribe",
      message: "오디오 전사 및 회의록 작성 중...",
      progress: 40,
    });

    const audioBuffer = await readRecording(meeting.audioPath);
    const attendeeEmails = meeting.attendees.map((a) => a.email);

    const minutes = await generateMinutesFromAudio(
      audioBuffer,
      meeting.audioPath,
      meeting.title,
      attendeeEmails,
      meeting.template?.promptHint
    );

    send({
      step: "summarize",
      message: "회의록 정리 완료",
      progress: 70,
    });

    await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        minutesJson: JSON.stringify(minutes),
        endedAt: new Date(),
      },
    });

    if (meeting.sendEmail) {
      send({
        step: "email",
        message: "참석자에게 메일 발송 중...",
        progress: 85,
      });

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
        } catch (err) {
          console.error(`Failed to email ${attendee.email}:`, err);
        }
      }

      await prisma.meeting.update({
        where: { id: meetingId },
        data: { emailSentAt: new Date() },
      });
    }

    await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: "completed" },
    });

    send({
      step: "done",
      message: "모든 처리가 완료되었습니다.",
      progress: 100,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "처리 실패";
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: "failed", errorMessage: message },
    });
    send({ step: "error", message, progress: 0, error: message });
    throw err;
  }
}
