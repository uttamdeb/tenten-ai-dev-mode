import type { CheckResult, Endpoint, Language } from "./api";

export type View = "exam" | "question" | "camera" | "review" | "crop" | "upload" | "submit" | "done";

export interface Check {
  /** queued/pending: not answered yet; done: TenTen answered (any status); error: the tester could not ask. */
  state: "queued" | "pending" | "done" | "error";
  httpStatus?: number;
  latencyMs?: number;
  result?: CheckResult | null;
  body?: unknown;
  error?: string | null;
  model?: string | null;
  traceId?: string | null;
  saveError?: string | null;
}

export interface SentInfo {
  bytes: number;
  mime: string;
  resized: boolean;
  width?: number;
  height?: number;
  original: number;
}

export interface Photo {
  lid: string;
  q: string;
  /** The photo as taken or cropped, while it is on this device. */
  blob: Blob | null;
  /** A local blob link; empty for a stored photo until its signed link is known. */
  url: string;
  recordId?: string;
  storagePath?: string | null;
  source: "camera" | "gallery";
  edited: boolean;
  sent?: SentInfo;
  check: Check;
}

/** An uploaded answer photo, kept in this browser across reloads. */
export interface SavedPhoto {
  recordId: string;
  storagePath: string | null;
  source: "camera" | "gallery";
  edited: boolean;
  sent?: SentInfo;
  check: Check;
}

export interface Settings {
  endpoint: Endpoint;
  language: Language;
  debug: boolean;
  fit: boolean;
  capture: "inapp" | "native";
}

export interface CameraState {
  mode: "add" | "replace";
  lid?: string;
  /** Draft length when the camera opened: later photos are this visit's. */
  start: number;
  justAdded: boolean;
}

export interface UploadState {
  q: string;
  lids: string[];
  state: ("waiting" | "now" | "done" | "fail")[];
  pct: number[];
  done: boolean;
  failed: boolean;
}

export type DecisionKind = "pending" | "warn" | "ok" | "unchecked" | "error";

/** What the student is shown: only TenTen's own message, and only when it says to warn. */
export function decision(check: Check): { kind: DecisionKind; message?: string } {
  if (check.state === "queued" || check.state === "pending") return { kind: "pending" };
  if (check.state === "error" || check.httpStatus !== 200 || !check.result) return { kind: "error" };
  if (check.result.should_warn) return { kind: "warn", message: check.result.message ?? undefined };
  if (check.result.status === "unchecked") return { kind: "unchecked" };
  return { kind: "ok" };
}

export const isWarned = (check: Check) => decision(check).kind === "warn";

export const slimCheck = (c: Check): Check => ({
  state: c.state,
  httpStatus: c.httpStatus,
  latencyMs: c.latencyMs,
  result: c.result,
  error: c.error,
  model: c.model,
  traceId: c.traceId,
});
