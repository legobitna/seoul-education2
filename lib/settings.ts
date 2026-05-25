import { prisma } from "./db";

const KEYS = {
  GEMINI_API_KEY: "geminiApiKey",
  SMTP_USER: "smtpUser",
  SMTP_PASS: "smtpPass",
  SMTP_FROM: "smtpFrom",
  SETUP_COMPLETE: "setupComplete",
} as const;

export async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.appSettings.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.appSettings.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

export async function getSettingsMap(): Promise<Record<string, string>> {
  const rows = await prisma.appSettings.findMany();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function saveSettings(data: {
  geminiApiKey?: string;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
}): Promise<void> {
  if (data.geminiApiKey !== undefined)
    await setSetting(KEYS.GEMINI_API_KEY, data.geminiApiKey);
  if (data.smtpUser !== undefined) await setSetting(KEYS.SMTP_USER, data.smtpUser);
  if (data.smtpPass !== undefined) await setSetting(KEYS.SMTP_PASS, data.smtpPass);
  if (data.smtpFrom !== undefined)
    await setSetting(KEYS.SMTP_FROM, data.smtpFrom);
}

export async function getGeminiApiKey(): Promise<string | null> {
  return (
    process.env.GEMINI_API_KEY ||
    (await getSetting(KEYS.GEMINI_API_KEY)) ||
    null
  );
}

export async function getSmtpConfig(): Promise<{
  user: string;
  pass: string;
  from: string;
} | null> {
  const user = process.env.SMTP_USER || (await getSetting(KEYS.SMTP_USER));
  const pass = process.env.SMTP_PASS || (await getSetting(KEYS.SMTP_PASS));
  const from =
    process.env.SMTP_FROM ||
    (await getSetting(KEYS.SMTP_FROM)) ||
    user;
  if (!user || !pass) return null;
  return { user, pass, from: from || user };
}

export async function isSetupComplete(): Promise<boolean> {
  const flag = await getSetting(KEYS.SETUP_COMPLETE);
  if (flag === "true") return true;
  const gemini = await getGeminiApiKey();
  const smtp = await getSmtpConfig();
  return Boolean(gemini && smtp);
}

export async function markSetupComplete(): Promise<void> {
  await setSetting(KEYS.SETUP_COMPLETE, "true");
}

export { KEYS };
