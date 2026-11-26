// Every photo the testers checked, newest first, with TenTen's decision as it came back.
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { signedUrls } from "./api";
import { kb, pct } from "./format";
import "./photo-check.css";

type Row = Tables<"photo_checks">;

const PAGE = 60;
const VERDICTS = ["ok", "typed_or_printed", "screen_photo", "rotated", "unreadable", "cut_off", "blank_page", "question_paper", "not_academic", "other"];

interface Filters {
  endpoint: string;
  verdict: string;
  status: string;
  warn: boolean;
  uploaded: boolean;
  errors: boolean;
}

const bd = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });

// The filter calls used here, on any photo_checks query.
interface FilterBuilder {
  eq(column: string, value: unknown): FilterBuilder;
  not(column: string, operator: string, value: unknown): FilterBuilder;
  or(filters: string): FilterBuilder;
}

function applyFilters<Q>(query: Q, f: Filters): Q {
  let q = query as unknown as FilterBuilder;
  if (f.endpoint) q = q.eq("endpoint", f.endpoint);
  if (f.verdict) q = q.eq("verdict", f.verdict);
  if (f.status) q = q.eq("status", f.status);
  if (f.warn) q = q.eq("should_warn", true);
  if (f.uploaded) q = q.not("uploaded_at", "is", null);
  if (f.errors) q = q.or("http_status.neq.200,error.not.is.null");
  return q as unknown as Q;
}

export function PhotoCheckResults() {
  const [filters, setFilters] = useState<Filters>({ endpoint: "", verdict: "", status: "", warn: false, uploaded: false, errors: false });
  const [rows, setRows] = useState<Row[]>([]);
  const [links, setLinks] = useState<Record<string, string>>({});
  const [counts, setCounts] = useState<{ k: string; n: number; warned: number }[]>([]);
  const [more, setMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (before?: string) => {
      setLoading(true);
      setError(null);
      let query = applyFilters(supabase.from("photo_checks").select("*").order("created_at", { ascending: false }).limit(PAGE), filters);
      if (before) query = query.lt("created_at", before);
      const { data, error: err } = await query;
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
      const page = data || [];
      setRows((prev) => (before ? [...prev, ...page] : page));
      setMore(page.length === PAGE);
      const paths = page.map((r) => r.storage_path).filter((p): p is string => !!p);
      const fresh = await signedUrls(paths);
      setLinks((prev) => ({ ...prev, ...fresh }));
      if (!before) {
        const { data: all } = await applyFilters(supabase.from("photo_checks").select("verdict,status,reason,should_warn").limit(5000), filters);
        const tally = new Map<string, { n: number; warned: number }>();
        for (const r of all || []) {
          const k = r.verdict ?? (r.status === "unchecked" ? `unchecked:${r.reason ?? "?"}` : "error");
          const t = tally.get(k) ?? { n: 0, warned: 0 };
          t.n += 1;
          if (r.should_warn) t.warned += 1;
          tally.set(k, t);
        }
        setCounts(Array.from(tally, ([k, v]) => ({ k, ...v })).sort((a, b) => b.n - a.n));
      }
      setLoading(false);
    },
    [filters],
  );

  useEffect(() => {
    load();
  }, [load]);

  const set = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));

  return (
    <div className="pc-root pc-results">
      <div className="r-head">
        <h1>Photo check results</h1>
        <label>
          Env
          <select value={filters.endpoint} onChange={(e) => set({ endpoint: e.target.value })}>
            <option value="">all</option>
            <option>stage</option>
            <option>prod</option>
            <option>local</option>
          </select>
        </label>
        <label>
          Verdict
          <select value={filters.verdict} onChange={(e) => set({ verdict: e.target.value })}>
            <option value="">all</option>
            {VERDICTS.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select value={filters.status} onChange={(e) => set({ status: e.target.value })}>
            <option value="">all</option>
            <option>checked</option>
            <option>unchecked</option>
          </select>
        </label>
        <label>
          <input type="checkbox" checked={filters.warn} onChange={(e) => set({ warn: e.target.checked })} /> warned only
        </label>
        <label>
          <input type="checkbox" checked={filters.uploaded} onChange={(e) => set({ uploaded: e.target.checked })} /> uploaded only
        </label>
        <label>
          <input type="checkbox" checked={filters.errors} onChange={(e) => set({ errors: e.target.checked })} /> errors only
        </label>
        <button className="r-btn" onClick={() => load()}>
          {loading ? "Loading…" : "Refresh"}
        </button>
        <Link to="/photo-check" style={{ marginLeft: "auto", color: "#2563eb" }}>
          Tester app
        </Link>
      </div>
      {error && <div className="r-empty">Could not load: {error}</div>}
      <div className="r-counts">
        {counts.map((c) => (
          <span
            key={c.k}
            className="chip"
            onClick={() => VERDICTS.includes(c.k) && set({ verdict: c.k, status: "" })}
          >
            <b>{c.k}</b> {c.n}
            {c.warned ? ` (warned ${c.warned})` : ""}
          </span>
        ))}
      </div>
      {rows.length ? (
        <div className="r-grid">
          {rows.map((r) => {
            const failed = r.http_status !== 200 || !!r.error;
            const kind = failed ? "err" : r.should_warn ? "warn" : r.status === "unchecked" ? "" : "ok";
            const head = failed
              ? `TenTen ${r.http_status || "no reply"}${r.error ? ` · ${r.error}` : ""}`
              : r.status === "unchecked"
                ? `unchecked · ${r.reason}`
                : `${r.verdict} · ${pct(r.confidence)}${r.should_warn ? " · warned" : ""}${r.reason ? ` · ${r.reason}` : ""}`;
            const probs = r.probabilities && typeof r.probabilities === "object" ? Object.entries(r.probabilities as Record<string, number>).sort((a, b) => b[1] - a[1]).slice(0, 4) : [];
            const src = r.storage_path ? links[r.storage_path] : "";
            return (
              <div className={`r-card ${kind}`} key={r.id}>
                <a className="r-img" href={src || undefined} target="_blank" rel="noreferrer">
                  {src && <img src={src} loading="lazy" alt="" />}
                </a>
                <div className="r-body">
                  <div className={`r-verdict ${kind}`}>{head}</div>
                  {r.should_warn && r.message && <div className="r-msg">{r.message}</div>}
                  {probs.length > 0 && (
                    <div className="probs" style={{ font: "11.5px/1.4 ui-monospace, Menlo, monospace" }}>
                      {probs.map(([k, v]) => (
                        <div className="pb" key={k}>
                          <span>{k}</span>
                          <i style={{ width: `${Math.max(1, Math.round(v * 100))}%` }} />
                          <b>{pct(v)}</b>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="r-meta">
                    {bd(r.created_at)} · {r.endpoint} · {r.language} · {r.latency_ms} ms
                  </div>
                  <div className="r-meta">
                    sent {kb(r.bytes || 0)} {(r.mime || "").replace("image/", "")}
                    {r.resized ? ` ${r.width}×${r.height}, shrunk from ${kb(r.original_bytes || 0)}` : " as taken"}
                  </div>
                  <div className="r-meta">
                    {r.question_key || "?"} · {r.source}
                    {r.edited ? " · cropped" : ""}
                    {r.uploaded_at ? ` · uploaded as page ${(r.answer_order ?? 0) + 1}` : " · not uploaded"}
                  </div>
                  {r.trace_id && <div className="r-trace">trace {r.trace_id}</div>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        !loading && !error && <div className="r-empty">No photos checked yet.</div>
      )}
      {more && (
        <div style={{ textAlign: "center", paddingBottom: 30 }}>
          <button className="r-btn" onClick={() => load(rows[rows.length - 1]?.created_at)}>
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
