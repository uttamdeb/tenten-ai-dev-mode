// The student's answer photo screens, wired to TenTen's real answer image check.
// The student sees only what TenTen returns: its `message`, when `should_warn` is true.
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { tokenExpiresAt } from "@/utils/tentenAuth";
import {
  attachPhoto,
  callCheck,
  currentUserId,
  fitForTenTen,
  saveCheck,
  saveSubmission,
  saveToken,
  savedToken,
  signedUrls,
  storePhoto,
  tokenFor,
} from "./api";
import { CameraView } from "./CameraView";
import { CropView } from "./CropView";
import { bn, ORDER, QUESTIONS } from "./exam";
import { ConfirmSheet, Zoom, type ConfirmRequest, type ZoomFn } from "./parts";
import { useIsDesktop } from "./useIsDesktop";
import { slimCheck, type CameraState, type Check, type Photo, type SavedPhoto, type Settings, type UploadState, type View } from "./types";
import { DoneView, ExamView, QuestionView, ReviewView, SettingsSheet, SubmitView, TesterBar, UploadView } from "./views";
import "./photo-check.css";

const STATE_KEY = "photo-check-state-v1";
const SETTINGS_KEY = "photo-check-settings-v1";
const EXAM_MINUTES = 21;
const CONCURRENT_CHECKS = 3;

interface State {
  view: View;
  q: string | null;
  photos: Record<string, Photo>;
  drafts: Record<string, string[]>;
  answers: Record<string, SavedPhoto[]>;
  sessionId: string;
  timerEnd: number;
  camera: CameraState | null;
  cropLid: string | null;
  upload: UploadState | null;
  links: Record<string, string>;
}

type Action =
  | { type: "go"; view: View; patch?: Partial<State> }
  | { type: "add"; q: string; photos: Photo[] }
  | { type: "replace"; q: string; lid: string; photo: Photo }
  | { type: "remove"; q: string; lid: string }
  | { type: "reorder"; q: string; from: number; to: number }
  | { type: "photo"; lid: string; patch: Partial<Photo> }
  | { type: "draft"; q: string; lids: string[] }
  | { type: "answers"; q: string; saved: SavedPhoto[] }
  | { type: "upload"; upload: UploadState | null }
  | { type: "camera"; camera: CameraState | null }
  | { type: "links"; links: Record<string, string> }
  | { type: "reset"; sessionId: string; timerEnd: number };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "go":
      return { ...s, ...a.patch, view: a.view };
    case "add": {
      const photos = { ...s.photos };
      for (const p of a.photos) photos[p.lid] = p;
      return { ...s, photos, drafts: { ...s.drafts, [a.q]: [...(s.drafts[a.q] || []), ...a.photos.map((p) => p.lid)] } };
    }
    case "replace": {
      const lids = (s.drafts[a.q] || []).slice();
      const i = lids.indexOf(a.lid);
      if (i >= 0) lids[i] = a.photo.lid;
      else lids.push(a.photo.lid);
      return { ...s, photos: { ...s.photos, [a.photo.lid]: a.photo }, drafts: { ...s.drafts, [a.q]: lids } };
    }
    case "remove":
      return { ...s, drafts: { ...s.drafts, [a.q]: (s.drafts[a.q] || []).filter((l) => l !== a.lid) } };
    case "reorder": {
      const lids = (s.drafts[a.q] || []).slice();
      const [moved] = lids.splice(a.from, 1);
      lids.splice(a.to, 0, moved);
      return { ...s, drafts: { ...s.drafts, [a.q]: lids } };
    }
    case "photo": {
      const p = s.photos[a.lid];
      return p ? { ...s, photos: { ...s.photos, [a.lid]: { ...p, ...a.patch } } } : s;
    }
    case "draft":
      return { ...s, drafts: { ...s.drafts, [a.q]: a.lids } };
    case "answers":
      return { ...s, answers: { ...s.answers, [a.q]: a.saved } };
    case "upload":
      return { ...s, upload: a.upload };
    case "camera":
      return { ...s, camera: a.camera };
    case "links":
      return { ...s, links: { ...s.links, ...a.links } };
    case "reset":
      return { ...s, view: "exam", q: null, photos: {}, drafts: {}, answers: {}, upload: null, camera: null, cropLid: null, sessionId: a.sessionId, timerEnd: a.timerEnd };
  }
}

function initialState(): State {
  let saved: Partial<State> = {};
  try {
    saved = JSON.parse(localStorage.getItem(STATE_KEY) || "{}");
  } catch {
    saved = {};
  }
  return {
    view: "exam",
    q: null,
    photos: {},
    drafts: {},
    answers: saved.answers || {},
    sessionId: saved.sessionId || crypto.randomUUID(),
    timerEnd: saved.timerEnd || Date.now() + EXAM_MINUTES * 60_000,
    camera: null,
    cropLid: null,
    upload: null,
    links: {},
  };
}

function loadSettings(): Settings {
  const base: Settings = { endpoint: "stage", language: "bn", debug: true, fit: true, capture: "inapp" };
  try {
    return { ...base, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") };
  } catch {
    return base;
  }
}

let lidSeq = 0;
const nextLid = () => `p${Date.now().toString(36)}${++lidSeq}`;

function newPhoto(q: string, blob: Blob, source: Photo["source"], edited = false): Photo {
  return { lid: nextLid(), q, blob, url: URL.createObjectURL(blob), source, edited, check: { state: "queued" } };
}

function fromSaved(q: string, s: SavedPhoto): Photo {
  return { lid: nextLid(), q, blob: null, url: "", recordId: s.recordId, storagePath: s.storagePath, source: s.source, edited: s.edited, sent: s.sent, check: s.check };
}

export function PhotoCheckApp() {
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [zoom, setZoom] = useState<{ list: string[]; index: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const desktop = useIsDesktop();
  const [confirmReq, setConfirmReq] = useState<ConfirmRequest | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tokenTick, setTokenTick] = useState(0);
  const stateRef = useRef(state);
  stateRef.current = state;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const galleryRef = useRef<HTMLInputElement>(null);
  const nativeRef = useRef<HTMLInputElement>(null);
  const pickRef = useRef<(files: File[]) => void>(() => undefined);
  const queueRef = useRef<Photo[]>([]);
  const runningRef = useRef(0);
  const droppedRef = useRef(new Set<string>());

  // ---------- persistence ----------
  useEffect(() => {
    localStorage.setItem(STATE_KEY, JSON.stringify({ answers: state.answers, sessionId: state.sessionId, timerEnd: state.timerEnd }));
  }, [state.answers, state.sessionId, state.timerEnd]);
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  // Signed links for stored photos that have no local copy.
  useEffect(() => {
    const paths: string[] = [];
    for (const list of Object.values(state.answers)) for (const s of list) if (s.storagePath && !state.links[s.storagePath]) paths.push(s.storagePath);
    for (const p of Object.values(state.photos)) if (!p.url && p.storagePath && !state.links[p.storagePath]) paths.push(p.storagePath);
    if (!paths.length) return;
    let alive = true;
    signedUrls(paths).then((links) => alive && Object.keys(links).length && dispatch({ type: "links", links }));
    return () => {
      alive = false;
    };
  }, [state.answers, state.photos, state.links]);

  const srcOf = useCallback(
    (p: Photo | SavedPhoto) => {
      if ("url" in p && p.url) return p.url;
      // A photo taken on this page keeps its local copy after upload.
      const local = Object.values(state.photos).find((x) => x.recordId && x.recordId === p.recordId && x.url);
      if (local) return local.url;
      return (p.storagePath && state.links[p.storagePath]) || "";
    },
    [state.photos, state.links],
  );

  // ---------- navigation and the phone's back button ----------
  const go = (view: View, patch?: Partial<State>, keepScroll = false) => {
    dispatch({ type: "go", view, patch });
    setZoom(null);
    if (!keepScroll) window.scrollTo(0, 0);
  };
  const backRef = useRef<() => void>(() => undefined);
  useEffect(() => {
    window.history.pushState({ photoCheck: true }, "");
    const onPop = () => {
      window.history.pushState({ photoCheck: true }, "");
      backRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const openZoom: ZoomFn = (src, group) => {
    const list = group && group.includes(src) ? group.filter(Boolean) : [src];
    setZoom({ list, index: Math.max(0, list.indexOf(src)) });
  };

  const confirm = (req: Omit<ConfirmRequest, "resolve">) => new Promise<boolean>((resolve) => setConfirmReq({ ...req, resolve }));

  // ---------- the check ----------
  const runCheck = async (photo: Photo) => {
    const lid = photo.lid;
    const s = settingsRef.current;
    const endpoint = s.endpoint;
    dispatch({ type: "photo", lid, patch: { check: { state: "pending" } } });
    if (!photo.blob) return;
    const sent = await fitForTenTen(photo.blob, s.fit);
    const sentInfo = { bytes: sent.blob.size, mime: sent.blob.type, resized: sent.resized, width: sent.width, height: sent.height, original: sent.originalBytes };
    let token: string;
    try {
      token = await tokenFor(endpoint);
      setTokenTick((t) => t + 1);
    } catch (err) {
      dispatch({ type: "photo", lid, patch: { sent: sentInfo, check: { state: "error", error: `no TenTen token: ${err instanceof Error ? err.message : err}` } } });
      return;
    }
    const id = crypto.randomUUID();
    const userId = await currentUserId();
    const ask = (t: string) => callCheck({ endpoint, token: t, photo: sent.blob, language: s.language, questionKey: photo.q });
    const [storagePath, first] = await Promise.all([userId ? storePhoto(userId, id, sent.blob) : Promise.resolve(null), ask(token)]);
    let outcome = first;
    if (outcome.httpStatus === 401) {
      // The saved token was refused: sign in again once.
      try {
        token = await tokenFor(endpoint, true);
        setTokenTick((t) => t + 1);
        outcome = await ask(token);
      } catch {
        /* keep the 401 */
      }
    }
    const saveError = userId
      ? await saveCheck({ id, endpoint, language: s.language, sessionId: stateRef.current.sessionId, questionKey: photo.q, source: photo.source, edited: photo.edited, sent, storagePath, outcome })
      : "not signed in";
    if (saveError) toast.error(`Not saved to Supabase: ${saveError}`);
    const result = outcome.reply?.results?.[0] ?? null;
    const check: Check = {
      state: "done",
      httpStatus: outcome.httpStatus,
      latencyMs: outcome.latencyMs,
      result,
      body: outcome.body,
      error: outcome.error,
      model: outcome.reply?.model ?? null,
      traceId: outcome.reply?.trace_id ?? null,
      saveError,
    };
    dispatch({ type: "photo", lid, patch: { sent: sentInfo, recordId: saveError ? undefined : id, storagePath, check } });
  };

  const pump = () => {
    while (runningRef.current < CONCURRENT_CHECKS && queueRef.current.length) {
      const photo = queueRef.current.shift();
      if (!photo || droppedRef.current.has(photo.lid)) continue;
      runningRef.current++;
      runCheck(photo)
        .catch((err) => dispatch({ type: "photo", lid: photo.lid, patch: { check: { state: "error", error: String(err) } } }))
        .finally(() => {
          runningRef.current--;
          pump();
        });
    }
  };
  const queueCheck = (photos: Photo[]) => {
    queueRef.current.push(...photos);
    pump();
  };

  // ---------- photos ----------
  const draftOf = (q: string | null, s: State = state) => (q ? (s.drafts[q] || []).map((l) => s.photos[l]).filter(Boolean) : []);
  const drop = (p: Photo | undefined) => {
    if (!p) return;
    droppedRef.current.add(p.lid);
    if (p.blob && p.url.startsWith("blob:")) URL.revokeObjectURL(p.url);
  };

  const addFiles = (files: File[], source: Photo["source"]) => {
    const q = stateRef.current.q;
    if (!q || !files.length) return;
    const photos = files.map((f) => newPhoto(q, f, source));
    dispatch({ type: "add", q, photos });
    queueCheck(photos);
  };
  const addAndReview = (files: File[], source: Photo["source"]) => {
    addFiles(files, source);
    if (stateRef.current.view !== "review") go("review");
  };

  // Photos dropped anywhere on the add-photos or review page, or pasted there, join the answer.
  // A file dropped elsewhere must not make the browser open it instead of the app.
  useEffect(() => {
    const accepts = () => stateRef.current.view === "question" || stateRef.current.view === "review";
    const images = (list: FileList | null | undefined) => Array.from(list || []).filter((f) => f.type.startsWith("image/"));
    const onDragOver = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      e.preventDefault();
      if (accepts()) setDragging(true);
    };
    const onDragLeave = (e: DragEvent) => {
      if (!e.relatedTarget) setDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      e.preventDefault();
      setDragging(false);
      if (accepts()) addAndReview(images(e.dataTransfer.files), "drop");
    };
    const onPaste = (e: ClipboardEvent) => {
      if (!accepts()) return;
      const files = images(e.clipboardData?.files);
      if (!files.length) return;
      e.preventDefault();
      addAndReview(files, "paste");
    };
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("paste", onPaste);
    };
    // The handlers read the latest state through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const placeCapture = (blob: Blob, source: Photo["source"], cam: CameraState | null) => {
    const q = stateRef.current.q;
    if (!q) return;
    const photo = newPhoto(q, blob, source);
    if (cam?.mode === "replace" && cam.lid) {
      drop(stateRef.current.photos[cam.lid]);
      dispatch({ type: "replace", q, lid: cam.lid, photo });
      queueCheck([photo]);
      go("review");
      return;
    }
    dispatch({ type: "add", q, photos: [photo] });
    queueCheck([photo]);
    if (stateRef.current.view === "camera") dispatch({ type: "camera", camera: { ...(cam as CameraState), justAdded: true } });
    else go("review");
  };

  const pickGallery = (cb: (files: File[]) => void) => {
    pickRef.current = cb;
    if (galleryRef.current) {
      galleryRef.current.value = "";
      galleryRef.current.click();
    }
  };

  const openCamera = (cam: Omit<CameraState, "start" | "justAdded">) => {
    const camera: CameraState = { ...cam, start: draftOf(state.q).length, justAdded: false };
    if (settings.capture === "native") {
      pickRef.current = (files) => files[0] && placeCapture(files[0], "camera", camera);
      if (nativeRef.current) {
        nativeRef.current.value = "";
        nativeRef.current.click();
      }
      return;
    }
    go("camera", { camera });
  };

  // ---------- upload ----------
  const startUpload = async () => {
    const q = state.q;
    if (!q) return;
    const lids = state.drafts[q] || [];
    let upload: UploadState = { q, lids, state: lids.map(() => "waiting"), pct: lids.map(() => 0), done: false, failed: false };
    const set = (patch: Partial<UploadState>) => {
      upload = { ...upload, ...patch };
      dispatch({ type: "upload", upload });
    };
    go("upload", { upload });
    for (let i = 0; i < lids.length; i++) {
      const st = upload.state.slice();
      st[i] = "now";
      set({ state: st });
      let photo = stateRef.current.photos[lids[i]];
      try {
        if (!photo.recordId) {
          // Never saved (the check could not reach Supabase): check it again, which saves it.
          await runCheck(photo);
          photo = stateRef.current.photos[lids[i]];
          await new Promise((r) => setTimeout(r, 0));
          photo = stateRef.current.photos[lids[i]];
        }
        const pctNow = upload.pct.slice();
        pctNow[i] = 60;
        set({ pct: pctNow });
        if (!photo.recordId) throw new Error("not saved");
        const err = await attachPhoto(photo.recordId, i, q);
        if (err) throw new Error(err);
        const pctDone = upload.pct.slice();
        pctDone[i] = 100;
        const stDone = upload.state.slice();
        stDone[i] = "done";
        set({ pct: pctDone, state: stDone });
      } catch (err) {
        const stFail = upload.state.slice();
        stFail[i] = "fail";
        set({ state: stFail, failed: true });
        toast.error(`Upload failed: ${err instanceof Error ? err.message : err}`);
        return;
      }
    }
    const saved: SavedPhoto[] = lids.map((l) => {
      const p = stateRef.current.photos[l];
      return { recordId: p.recordId as string, storagePath: p.storagePath ?? null, source: p.source, edited: p.edited, sent: p.sent, check: slimCheck(p.check) };
    });
    dispatch({ type: "answers", q, saved });
    dispatch({ type: "draft", q, lids: [] });
    set({ done: true });
  };

  // ---------- token note for the tester bar and settings ----------
  const tokenInfo = (() => {
    void tokenTick;
    const t = savedToken(settings.endpoint);
    if (!t) return "No token yet: the first check signs in with the shared test account.";
    const exp = tokenExpiresAt(t);
    if (!exp) return "A token is saved (expiry unknown).";
    const when = new Date(exp).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
    return exp > Date.now() ? `Token valid until ${when} (BD).` : `Token expired ${when}: the next check signs in again.`;
  })();

  const resetSession = () => {
    for (const p of Object.values(state.photos)) drop(p);
    dispatch({ type: "reset", sessionId: crypto.randomUUID(), timerEnd: Date.now() + EXAM_MINUTES * 60_000 });
    window.scrollTo(0, 0);
  };

  // ---------- views ----------
  const q = state.q ? QUESTIONS[state.q] : null;
  const draft = draftOf(state.q);
  const bar = (
    <TesterBar
      endpoint={settings.endpoint}
      tokenNote={null}
      onSettings={() => setShowSettings(true)}
      onResults={() => window.open("/photo-check/results", "_blank", "noopener")}
      onDevMode={() => navigate("/")}
    />
  );

  let body: React.ReactNode = null;
  let back: () => void = () => undefined;
  switch (state.view) {
    case "exam":
      back = () => navigate("/");
      body = (
        <ExamView
          desktop={desktop}
          answers={state.answers}
          drafts={Object.fromEntries(ORDER.map((k) => [k, draftOf(k)]))}
          timerEnd={state.timerEnd}
          srcOf={srcOf}
          bar={bar}
          onExit={async () => {
            const ok = await confirm({
              title: "Start a new test session?",
              text: "The answers on this device are cleared. Every photo already checked stays on the Results page.",
              ok: "Start over",
              cancel: "Cancel",
              en: true,
            });
            if (ok) resetSession();
          }}
          onSubmit={() => go("submit")}
          onOpen={(key) => go("question", { q: key })}
          onChange={(key) => {
            if (!(state.drafts[key] || []).length) {
              const photos = (state.answers[key] || []).map((s) => fromSaved(key, s));
              dispatch({ type: "add", q: key, photos });
            }
            go("review", { q: key });
          }}
          onZoom={openZoom}
        />
      );
      break;
    case "question":
      if (!q) break;
      back = async () => {
        if (draft.length && !(state.answers[q.key] || []).length) {
          const keep = await confirm({ title: "ছবিগুলো রাখবে?", text: `${bn(draft.length)}টি ছবি এখনও আপলোড হয়নি।`, ok: "ছবি রাখো", cancel: "সব ছবি বাদ দাও" });
          if (!keep) {
            draft.forEach(drop);
            dispatch({ type: "draft", q: q.key, lids: [] });
          }
        }
        go("exam");
      };
      body = (
        <QuestionView
          q={q}
          draft={draft}
          timerEnd={state.timerEnd}
          srcOf={srcOf}
          onBack={back}
          onReview={() => go("review")}
          onCamera={() => openCamera({ mode: "add" })}
          desktop={desktop}
          onGallery={() => pickGallery((files) => addAndReview(files, "gallery"))}
          onFiles={(files) => addAndReview(files, "drop")}
          onZoom={openZoom}
        />
      );
      break;
    case "camera":
      if (!q || !state.camera) break;
      back = async () => {
        const cam = state.camera as CameraState;
        const taken = draft.slice(cam.start);
        if (cam.mode !== "replace" && taken.length) {
          const keep = await confirm({ title: "তোলা ছবিগুলো রাখবে?", text: `${bn(taken.length)}টি ছবি এখনও আপলোড হয়নি।`, ok: "ছবি রাখো", cancel: "ছবিগুলো বাদ দাও" });
          if (!keep) {
            taken.forEach(drop);
            dispatch({ type: "draft", q: q.key, lids: (state.drafts[q.key] || []).slice(0, cam.start) });
            go("question");
            return;
          }
          go("review");
          return;
        }
        go(cam.mode === "replace" ? "review" : "question");
      };
      body = (
        <CameraView
          q={q}
          desktop={desktop}
          camera={state.camera}
          draft={draft}
          timerEnd={state.timerEnd}
          srcOf={srcOf}
          onCapture={(blob) => placeCapture(blob, "camera", stateRef.current.camera)}
          onGallery={() =>
            pickGallery((files) => {
              const cam = stateRef.current.camera;
              if (cam?.mode === "replace") placeCapture(files[0], "gallery", cam);
              else {
                addFiles(files, "gallery");
                go("review");
              }
            })
          }
          onReview={() => go("review")}
          onBack={back}
          onZoom={openZoom}
        />
      );
      break;
    case "review":
      if (!q) break;
      back = () => go("question");
      body = (
        <ReviewView
          q={q}
          draft={draft}
          timerEnd={state.timerEnd}
          debug={settings.debug}
          srcOf={srcOf}
          onBack={back}
          desktop={desktop}
          onRetake={(lid) =>
            desktop
              ? pickGallery((files) => placeCapture(files[0], "gallery", { mode: "replace", lid, start: 0, justAdded: false }))
              : openCamera({ mode: "replace", lid })
          }
          onRemove={(lid) => {
            drop(state.photos[lid]);
            dispatch({ type: "remove", q: q.key, lid });
          }}
          onCrop={(lid) => go("crop", { cropLid: lid })}
          onReorder={(from, to) => dispatch({ type: "reorder", q: q.key, from, to })}
          onMore={() => (desktop ? pickGallery((files) => addFiles(files, "gallery")) : openCamera({ mode: "add" }))}
          onCamera={() => openCamera({ mode: "add" })}
          onFiles={(files) => addFiles(files, "drop")}
          onUpload={startUpload}
          onZoom={openZoom}
        />
      );
      break;
    case "crop": {
      const photo = state.cropLid ? state.photos[state.cropLid] : null;
      if (!q || !photo) break;
      back = () => go("review");
      body = (
        <CropView
          blob={photo.blob}
          src={srcOf(photo)}
          onCancel={back}
          onApply={(blob) => {
            const next = newPhoto(q.key, blob, photo.source, true);
            drop(photo);
            dispatch({ type: "replace", q: q.key, lid: photo.lid, photo: next });
            queueCheck([next]);
            go("review");
          }}
        />
      );
      break;
    }
    case "upload":
      if (!state.upload) break;
      back = () => {
        const u = stateRef.current.upload;
        if (u?.done) go("exam");
        else if (u?.failed) go("review", { q: u.q });
      };
      body = (
        <UploadView
          upload={state.upload}
          photos={state.upload.lids.map((l) => state.photos[l]).filter(Boolean)}
          timerEnd={state.timerEnd}
          srcOf={srcOf}
          onBack={back}
          onDone={() => {
            const key = state.upload?.q;
            go("exam");
            window.setTimeout(() => document.getElementById(`pc-q-${key}`)?.scrollIntoView({ block: "center" }), 50);
          }}
          onRetry={() => {
            dispatch({ type: "upload", upload: null });
            go("review", { q: state.upload?.q ?? state.q });
          }}
          onZoom={openZoom}
        />
      );
      break;
    case "submit":
      back = () => go("exam");
      body = (
        <SubmitView
          answers={state.answers}
          timerEnd={state.timerEnd}
          debug={settings.debug}
          busy={submitting}
          srcOf={srcOf}
          onBack={back}
          onChange={(key) => {
            if (!(state.drafts[key] || []).length) dispatch({ type: "add", q: key, photos: (state.answers[key] || []).map((s) => fromSaved(key, s)) });
            go("review", { q: key });
          }}
          onFinal={async () => {
            setSubmitting(true);
            const answers: Record<string, string[]> = {};
            for (const k of ORDER) if ((state.answers[k] || []).length) answers[k] = state.answers[k].map((a) => a.recordId);
            const err = await saveSubmission(state.sessionId, settings.endpoint, answers);
            setSubmitting(false);
            if (err) {
              toast.error(`সাবমিট করা যায়নি: ${err}`);
              return;
            }
            go("done");
          }}
          onZoom={openZoom}
        />
      );
      break;
    case "done":
      body = <DoneView onResults={() => navigate("/photo-check/results")} onNew={resetSession} />;
      break;
  }
  backRef.current = () => {
    if (zoom) setZoom(null);
    else if (showSettings) setShowSettings(false);
    else back();
  };

  return (
    <div className={`pc-root ${desktop ? "desk" : ""}`}>
      <div className="pc-app">{body}</div>
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length) pickRef.current(files);
        }}
      />
      <input
        ref={nativeRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length) pickRef.current(files);
        }}
      />
      {zoom && <Zoom list={zoom.list} index={zoom.index} onIndex={(index) => setZoom({ ...zoom, index })} onClose={() => setZoom(null)} />}
      {dragging && (
        <div className="drop-overlay">
          <div>ছবি এখানে ছেড়ে দাও</div>
        </div>
      )}
      {confirmReq && <ConfirmSheet req={confirmReq} onDone={() => setConfirmReq(null)} />}
      {showSettings && (
        <SettingsSheet
          desktop={desktop}
          settings={settings}
          tokenInfo={tokenInfo}
          onChange={(patch) => setSettings((s) => ({ ...s, ...patch }))}
          onSaveToken={(t) => {
            if (!t) {
              toast.error("Paste a token first.");
              return;
            }
            saveToken(settings.endpoint, t);
            setTokenTick((n) => n + 1);
            toast.success(`Token saved for ${settings.endpoint}.`);
          }}
          onNewToken={async () => {
            try {
              await tokenFor(settings.endpoint, true);
              setTokenTick((n) => n + 1);
              toast.success(`Signed in to ${settings.endpoint} with the test account.`);
            } catch (err) {
              toast.error(`Sign-in failed: ${err instanceof Error ? err.message : err}`);
            }
          }}
          onForgetToken={() => {
            saveToken(settings.endpoint, "");
            setTokenTick((n) => n + 1);
          }}
          onNewSession={() => {
            setShowSettings(false);
            resetSession();
          }}
          onResults={() => window.open("/photo-check/results", "_blank", "noopener")}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
