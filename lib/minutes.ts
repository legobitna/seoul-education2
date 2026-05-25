import type { MeetingMinutes } from "./types";

export function minutesToMarkdown(minutes: MeetingMinutes): string {
  const lines: string[] = [
    `# ${minutes.title}`,
    ``,
    `**일시:** ${minutes.date}`,
    `**참석자:** ${minutes.attendees.join(", ") || "—"}`,
    ``,
    `## 요약`,
    minutes.summary,
    ``,
    `## 결정 사항`,
  ];

  if (minutes.decisions.length === 0) {
    lines.push("- 없음");
  } else {
    minutes.decisions.forEach((d) => lines.push(`- ${d}`));
  }

  lines.push(``, `## 액션 아이템`);
  if (minutes.actionItems.length === 0) {
    lines.push("- 없음");
  } else {
    lines.push(`| 담당 | 할 일 | 기한 |`);
    lines.push(`| --- | --- | --- |`);
    minutes.actionItems.forEach((a) => {
      lines.push(`| ${a.owner} | ${a.task} | ${a.dueDate ?? "미정"} |`);
    });
  }

  lines.push(``, `## 다음 단계`, minutes.nextSteps);

  if (minutes.fullTranscript) {
    lines.push(``, `## 전사 요약`, minutes.fullTranscript);
  }

  return lines.join("\n");
}

export function parseMinutesJson(stored: string | null): MeetingMinutes | null {
  if (!stored) return null;
  try {
    return JSON.parse(stored) as MeetingMinutes;
  } catch {
    return null;
  }
}
