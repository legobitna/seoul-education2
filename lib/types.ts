export type MeetingStatus =
  | "draft"
  | "recording"
  | "processing"
  | "completed"
  | "failed";

export interface ActionItem {
  owner: string;
  task: string;
  dueDate?: string;
}

export interface MeetingMinutes {
  title: string;
  date: string;
  attendees: string[];
  summary: string;
  decisions: string[];
  actionItems: ActionItem[];
  nextSteps: string;
  fullTranscript?: string;
}

export type ProcessStep =
  | "upload"
  | "transcribe"
  | "summarize"
  | "email"
  | "done"
  | "error";

export interface SseEvent {
  step: ProcessStep;
  message: string;
  progress: number;
  error?: string;
}
