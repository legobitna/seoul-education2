import { GoogleGenerativeAI } from "@google/generative-ai";
import { getGeminiApiKey } from "./settings";
import { buildMinutesPrompt } from "./prompts";
import type { MeetingMinutes } from "./types";
import { getMimeType } from "./storage";

const MODEL = "gemini-2.5-flash";

export async function testGeminiConnection(apiKey?: string): Promise<boolean> {
  const key = apiKey || (await getGeminiApiKey());
  if (!key) throw new Error("Gemini API 키가 설정되지 않았습니다.");
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: MODEL });
  const result = await model.generateContent("Reply with only: OK");
  const text = result.response.text();
  return text.toLowerCase().includes("ok");
}

export async function generateMinutesFromAudio(
  audioBuffer: Buffer,
  audioPath: string,
  title: string,
  attendeeEmails: string[],
  templateHint?: string
): Promise<MeetingMinutes> {
  const key = await getGeminiApiKey();
  if (!key) throw new Error("Gemini API 키가 설정되지 않았습니다.");

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.3,
    },
  });

  const mimeType = getMimeType(audioPath);
  const prompt = buildMinutesPrompt(title, attendeeEmails, templateHint);

  const result = await model.generateContent([
    { text: prompt },
    {
      inlineData: {
        mimeType,
        data: audioBuffer.toString("base64"),
      },
    },
  ]);

  const raw = result.response.text();
  return parseMinutesJson(raw);
}

function parseMinutesJson(raw: string): MeetingMinutes {
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const parsed = JSON.parse(cleaned) as MeetingMinutes;
  if (!parsed.title || !parsed.summary) {
    throw new Error("회의록 JSON 형식이 올바르지 않습니다.");
  }
  parsed.decisions = parsed.decisions ?? [];
  parsed.actionItems = parsed.actionItems ?? [];
  parsed.attendees = parsed.attendees ?? [];
  return parsed;
}
