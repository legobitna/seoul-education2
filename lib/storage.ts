import fs from "fs/promises";
import path from "path";
import os from "os";

const DATA_DIR =
  process.env.VERCEL === "1"
    ? os.tmpdir()
    : path.join(process.cwd(), "data");
const RECORDINGS_DIR = path.join(DATA_DIR, "recordings");

export async function ensureDataDirs(): Promise<void> {
  await fs.mkdir(RECORDINGS_DIR, { recursive: true });
}

export function getRecordingPath(meetingId: string, ext = "webm"): string {
  return path.join(RECORDINGS_DIR, `${meetingId}.${ext}`);
}

export async function saveRecording(
  meetingId: string,
  buffer: Buffer,
  ext = "webm"
): Promise<string> {
  await ensureDataDirs();
  const filePath = getRecordingPath(meetingId, ext);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

export async function readRecording(filePath: string): Promise<Buffer> {
  return fs.readFile(filePath);
}

export function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    ".webm": "audio/webm",
    ".wav": "audio/wav",
    ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4",
    ".ogg": "audio/ogg",
  };
  return map[ext] ?? "audio/webm";
}
