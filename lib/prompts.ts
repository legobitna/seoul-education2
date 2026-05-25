export function buildMinutesPrompt(
  title: string,
  attendeeEmails: string[],
  templateHint?: string
): string {
  const hint = templateHint
    ? `\n회의 유형 참고: ${templateHint}`
    : "";

  return `당신은 한국어 업무 회의록 작성 전문가입니다.
첨부된 회의 녹음 오디오를 듣고 전사한 뒤, 아래 JSON 형식으로 구조화된 회의록을 작성하세요.

회의 제목: ${title}
참석자 이메일: ${attendeeEmails.join(", ")}${hint}

반드시 아래 JSON 스키마만 출력하세요 (마크다운 코드블록 없이 순수 JSON):
{
  "title": "회의 제목",
  "date": "YYYY-MM-DD",
  "attendees": ["참석자 이름 또는 이메일"],
  "summary": "3~5문장 요약",
  "decisions": ["결정 사항 1", "결정 사항 2"],
  "actionItems": [
    { "owner": "담당자", "task": "할 일", "dueDate": "YYYY-MM-DD 또는 미정" }
  ],
  "nextSteps": "다음 단계 및 일정",
  "fullTranscript": "주요 발언 요약 전사 (너무 길면 핵심만)"
}

규칙:
- 모든 내용은 한국어로 작성
- actionItems는 구체적이고 실행 가능하게
- 녹음에서 확인되지 않은 내용은 추측하지 말 것
- decisions가 없으면 빈 배열`;
}
