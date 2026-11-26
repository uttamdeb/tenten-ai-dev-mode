// TenTen's answer image check, called from the browser, and the Supabase records of each check.
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { fetchTenTenToken, tokenExpiresAt } from "@/utils/tentenAuth";

export type Endpoint = "stage" | "prod" | "local";
export type Language = "bn" | "en";

export const CHECK_URLS: Record<Endpoint, string> = {
  stage: "https://local-api.10minuteschool.net/tenten-ai-service/api/v1/contents/answer-image-checks",
  prod: "https://api.10minuteschool.com/tenten-ai-service/api/v1/contents/answer-image-checks",
  local: "http://localhost:8000/api/v1/contents/answer-image-checks",
};

/** One photo's result, exactly as TenTen returns it. */
export interface CheckResult {
  index: number;
  status: "checked" | "unchecked";
  verdict: string | null;
  confidence: number | null;
  should_warn: boolean;
  message: string | null;
  probabilities: Record<string, number> | null;
  reason: string | null;
}

export interface CheckReply {
  results: CheckResult[];
  model: string;
  usage: { input_tokens: number };
  trace_id: string | null;
}

export interface SentPhoto {
  blob: Blob;
  resized: boolean;
  width?: number;
  height?: number;
  originalBytes: number;
}

export interface CallOutcome {
  httpStatus: number;
  latencyMs: number;
  reply: CheckReply | null;
  body: unknown;
  error: string | null;
}

// TenTen's front door (stage and prod) refuses a request body over about 1 MB with 413,
// and base64 grows a photo by a third. That 413 carries no CORS headers, so the browser
// only sees a failed request.
export const FIT_MAX_BYTES = 700 * 1024;
const FRONT_DOOR_BYTES = 1024 * 1024;

/** With "fit" on, a photo over FIT_MAX_BYTES is sent as a smaller upright JPEG (no EXIF). */
export async function fitForTenTen(blob: Blob, fit: boolean): Promise<SentPhoto> {
  const original = { blob, resized: false, originalBytes: blob.size };
  if (!fit || blob.size <= FIT_MAX_BYTES) return original;
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch {
    return original;
  }
  let side = Math.min(2048, Math.max(bmp.width, bmp.height));
  let quality = 0.85;
  try {
    for (let i = 0; i < 10; i++) {
      const scale = side / Math.max(bmp.width, bmp.height);
      const width = Math.round(bmp.width * scale);
      const height = Math.round(bmp.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")?.drawImage(bmp, 0, 0, width, height);
      const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (out && out.size <= FIT_MAX_BYTES) {
        return { blob: out, resized: true, width, height, originalBytes: blob.size };
      }
      if (quality > 0.8) quality -= 0.1;
      else side = Math.round(side * 0.85);
    }
  } finally {
    bmp.close();
  }
  return original;
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// ---------- TenTen login token ----------

const tokenKey = (endpoint: Endpoint) => `photo-check-token-${endpoint}`;

export function savedToken(endpoint: Endpoint): string {
  return localStorage.getItem(tokenKey(endpoint)) || "";
}

export function saveToken(endpoint: Endpoint, token: string) {
  if (token) localStorage.setItem(tokenKey(endpoint), token.replace(/^Bearer\s+/i, ""));
  else localStorage.removeItem(tokenKey(endpoint));
}

// One sign-in at a time per environment: parallel checks share it (the auth service
// answers 429 to a burst of logins).
const signingIn: Partial<Record<Endpoint, Promise<string>>> = {};

/** A token that is good for at least another minute; a new one from the shared test account otherwise. */
export async function tokenFor(endpoint: Endpoint, forceNew = false): Promise<string> {
  const current = savedToken(endpoint);
  const expires = current ? tokenExpiresAt(current) : null;
  if (!forceNew && current && (expires === null || expires > Date.now() + 60_000)) return current;
  if (!signingIn[endpoint]) {
    signingIn[endpoint] = fetchTenTenToken(endpoint)
      .then((fresh) => {
        saveToken(endpoint, fresh);
        return fresh;
      })
      .finally(() => {
        delete signingIn[endpoint];
      });
  }
  return signingIn[endpoint] as Promise<string>;
}

// ---------- the check ----------

export async function callCheck(opts: {
  endpoint: Endpoint;
  token: string;
  photo: Blob;
  language: Language;
  questionKey: string;
}): Promise<CallOutcome> {
  const data = await toBase64(opts.photo);
  const body = JSON.stringify({
    images: [{ data }],
    language: opts.language,
    context: { exam_id: "photo-check-tester", question_id: opts.questionKey },
  });
  const started = performance.now();
  try {
    const res = await fetch(CHECK_URLS[opts.endpoint], {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${opts.token}` },
      body,
    });
    const latencyMs = Math.round(performance.now() - started);
    const text = await res.text();
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      const title = text.match(/<title>([^<]{1,120})<\/title>/i);
      return {
        httpStatus: res.status,
        latencyMs,
        reply: null,
        body: null,
        error: `HTTP ${res.status} from the front door: ${title ? title[1].trim() : "not JSON"}`,
      };
    }
    // TenTen wraps its answers: {"status", "message", "data": {results, model, usage, trace_id}, "errors"}.
    const envelope = parsed as { data?: unknown };
    const payload = (envelope && typeof envelope === "object" && envelope.data && typeof envelope.data === "object" ? envelope.data : parsed) as CheckReply;
    if (res.ok && payload && Array.isArray(payload.results)) {
      return { httpStatus: res.status, latencyMs, reply: payload, body: parsed, error: null };
    }
    const message = (parsed as { message?: string; detail?: string })?.message || (parsed as { detail?: string })?.detail;
    return { httpStatus: res.status, latencyMs, reply: null, body: parsed, error: String(message || `HTTP ${res.status}`).slice(0, 300) };
  } catch (err) {
    const tooBig = body.length > FRONT_DOOR_BYTES;
    return {
      httpStatus: 0,
      latencyMs: Math.round(performance.now() - started),
      reply: null,
      body: null,
      error: tooBig
        ? `request failed: ${Math.round(body.length / 1024)} KB is over TenTen's ~1 MB front-door limit (413 without CORS)`
        : `request failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ---------- Supabase ----------

const BUCKET = "photo-checks";

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/heic": "heic" };

export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** Store the photo that was sent; returns its storage path, or null when the upload failed. */
export async function storePhoto(userId: string, id: string, blob: Blob): Promise<string | null> {
  const path = `${userId}/${id}.${EXT[blob.type] || "bin"}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type || "application/octet-stream",
    upsert: false,
  });
  if (error) {
    console.error("Photo upload failed:", error.message);
    return null;
  }
  return path;
}

export interface CheckRecord {
  id: string;
  endpoint: Endpoint;
  language: Language;
  sessionId: string;
  questionKey: string;
  source: string;
  edited: boolean;
  sent: SentPhoto;
  storagePath: string | null;
  outcome: CallOutcome;
}

export async function saveCheck(r: CheckRecord): Promise<string | null> {
  const result = r.outcome.reply?.results?.[0] ?? null;
  const { error } = await supabase.from("photo_checks").insert({
    id: r.id,
    endpoint: r.endpoint,
    language: r.language,
    session_id: r.sessionId,
    question_key: r.questionKey,
    source: r.source,
    edited: r.edited,
    mime: r.sent.blob.type || null,
    bytes: r.sent.blob.size,
    original_bytes: r.sent.originalBytes,
    resized: r.sent.resized,
    width: r.sent.width ?? null,
    height: r.sent.height ?? null,
    storage_path: r.storagePath,
    http_status: r.outcome.httpStatus,
    latency_ms: r.outcome.latencyMs,
    status: result?.status ?? null,
    verdict: result?.verdict ?? null,
    confidence: result?.confidence ?? null,
    should_warn: result ? result.should_warn : null,
    message: result?.message ?? null,
    reason: result?.reason ?? null,
    probabilities: (result?.probabilities ?? null) as Json,
    model: r.outcome.reply?.model ?? null,
    input_tokens: r.outcome.reply?.usage?.input_tokens ?? null,
    trace_id: r.outcome.reply?.trace_id ?? null,
    error: r.outcome.error,
    response: (r.outcome.body ?? null) as Json,
  });
  return error ? error.message : null;
}

export async function attachPhoto(id: string, order: number, questionKey: string): Promise<string | null> {
  const { error } = await supabase
    .from("photo_checks")
    .update({ uploaded_at: new Date().toISOString(), answer_order: order, question_key: questionKey })
    .eq("id", id);
  return error ? error.message : null;
}

export async function saveSubmission(sessionId: string, endpoint: Endpoint, answers: Record<string, string[]>): Promise<string | null> {
  const { error } = await supabase.from("photo_check_submissions").insert({ session_id: sessionId, endpoint, answers });
  return error ? error.message : null;
}

/** Signed links (1 hour) for stored photos, by storage path. */
export async function signedUrls(paths: string[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(paths.filter(Boolean)));
  if (!unique.length) return {};
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(unique, 3600);
  if (error || !data) return {};
  const out: Record<string, string> = {};
  for (const item of data) if (item.path && item.signedUrl) out[item.path] = item.signedUrl;
  return out;
}
