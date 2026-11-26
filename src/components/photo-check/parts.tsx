import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, ChevronLeft, Timer, X } from "lucide-react";
import { kb, pct } from "./format";
import type { Check, Photo, SentInfo } from "./types";


function formatLeft(end: number) {
  const s = Math.max(0, Math.round((end - Date.now()) / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function TimerText({ end, className = "small", light = false }: { end: number; className?: string; light?: boolean }) {
  const [text, setText] = useState(() => formatLeft(end));
  useEffect(() => {
    setText(formatLeft(end));
    const id = window.setInterval(() => setText(formatLeft(end)), 1000);
    return () => window.clearInterval(id);
  }, [end]);
  return (
    <div className={`timer ${className} ${light ? "light" : ""}`}>
      <Timer className="ic" />
      <span>{text}</span>
    </div>
  );
}

export function Header(props: { title: string; sub?: string; dark?: boolean; backDisabled?: boolean; onBack: () => void; timerEnd: number }) {
  return (
    <header className={`hdr ${props.dark ? "dark" : ""}`}>
      <button
        className={`icon-btn round ${props.dark ? "dark" : ""}`}
        aria-label="ফিরে যাও"
        disabled={props.backDisabled}
        onClick={props.onBack}
      >
        <ChevronLeft className="ic" />
      </button>
      <div className="hdr-text">
        <div className="hdr-title">{props.title}</div>
        {props.sub && <div className="hdr-sub">{props.sub}</div>}
      </div>
      <TimerText end={props.timerEnd} light={props.dark} />
    </header>
  );
}

export function Thumb({ src, warn, label, onZoom, children }: { src: string; warn?: boolean; label?: string; onZoom: (src: string) => void; children?: ReactNode }) {
  return (
    <div style={{ position: "relative", flex: "none" }}>
      <button type="button" className="thumb" aria-label={label} onClick={() => src && onZoom(src)}>
        {src ? <img src={src} alt="" loading="lazy" /> : null}
        {warn && (
          <span className="dot-warn">
            <AlertTriangle className="ic" />
          </span>
        )}
      </button>
      {children}
    </div>
  );
}


function sentLine(sent: SentInfo | undefined, check: Check) {
  if (sent?.resized) return `sent ${kb(sent.bytes)} ${sent.width}×${sent.height} (from ${kb(sent.original)})`;
  if (sent) return `sent ${kb(sent.bytes)} as taken`;
  return null;
}

/** TenTen's raw answer, for testers only. */
export function DebugBlock({ photo }: { photo: Pick<Photo, "check" | "sent" | "source" | "edited"> }) {
  const c = photo.check;
  if (c.state === "queued" || c.state === "pending") return null;
  let line: string;
  let bad = false;
  if (c.state === "error") {
    line = `tester error · ${c.error ?? ""}`;
    bad = true;
  } else if (c.httpStatus !== 200) {
    line = `TenTen ${c.httpStatus ? `HTTP ${c.httpStatus}` : "no reply"} · ${c.error ?? ""}`;
    bad = true;
  } else if (!c.result) {
    line = "TenTen gave no result";
    bad = true;
  } else if (c.result.status === "unchecked") {
    line = `unchecked · reason=${c.result.reason}`;
  } else {
    line = `${c.result.verdict} · ${pct(c.result.confidence)} · should_warn=${c.result.should_warn}${c.result.reason ? ` · reason=${c.result.reason}` : ""}`;
  }
  const meta = [c.latencyMs != null ? `${c.latencyMs} ms` : null, sentLine(photo.sent, c), photo.source, photo.edited ? "cropped" : null, c.model]
    .filter(Boolean)
    .join(" · ");
  const probs = c.result?.probabilities ? Object.entries(c.result.probabilities).sort((a, b) => b[1] - a[1]).slice(0, 4) : [];
  return (
    <div className="dbg">
      <div className={`dbg-line ${bad ? "e" : ""}`}>{line}</div>
      <div className="dbg-meta">{meta}</div>
      {c.saveError && <div className="dbg-line e">not saved to Supabase · {c.saveError}</div>}
      {probs.length > 0 && (
        <div className="probs">
          {probs.map(([k, v]) => (
            <div className="pb" key={k}>
              <span>{k}</span>
              <i style={{ width: `${Math.max(1, Math.round(v * 100))}%` }} />
              <b>{pct(v)}</b>
            </div>
          ))}
        </div>
      )}
      {c.body != null && (
        <details>
          <summary>full reply</summary>
          <pre>{JSON.stringify(c.body, null, 1)}</pre>
        </details>
      )}
    </div>
  );
}

export function Zoom({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="zoom" onClick={onClose}>
      <img src={src} alt="" />
      <button className="icon-btn round light" aria-label="বন্ধ করো">
        <X className="ic" />
      </button>
    </div>
  );
}

export interface ConfirmRequest {
  title: string;
  text: string;
  ok: string;
  cancel: string;
  en?: boolean;
  resolve: (ok: boolean) => void;
}

export function ConfirmSheet({ req, onDone }: { req: ConfirmRequest; onDone: () => void }) {
  const answer = (ok: boolean) => {
    onDone();
    req.resolve(ok);
  };
  return (
    <div className="scrim">
      <div className={`sheet ${req.en ? "en" : ""}`}>
        <h3>{req.title}</h3>
        <p>{req.text}</p>
        <div className="btns">
          <button className="btn primary" onClick={() => answer(true)}>
            {req.ok}
          </button>
          <button className="btn outline" onClick={() => answer(false)}>
            {req.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
