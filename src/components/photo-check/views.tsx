import { useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  Check as CheckIcon,
  ChevronDown,
  ChevronLeft,
  CloudUpload,
  Crop,
  GripVertical,
  Image as ImageIcon,
  Info,
  Plus,
  Settings as SettingsIcon,
  Trash2,
  X,
} from "lucide-react";
import { bn, ORDER, PARTS, QUESTIONS, SECTIONS, SHORT_QUESTIONS, STEM, type Question } from "./exam";
import { DebugBlock, Header, Thumb, TimerText } from "./parts";
import { decision, isWarned, type Photo, type SavedPhoto, type Settings, type UploadState } from "./types";

type SrcOf = (p: Photo | SavedPhoto) => string;

export function QuestionBody({ q }: { q: Question }) {
  if (q.kind === "sq") return <div className="q-stem">{SHORT_QUESTIONS[q.n - 1]}</div>;
  return (
    <>
      <div className="q-stem">{STEM}</div>
      {PARTS.map((p) => (
        <div className="q-part" key={p}>
          {p}
        </div>
      ))}
    </>
  );
}

export function TesterBar(props: { endpoint: string; tokenNote: string | null; onSettings: () => void; onResults: () => void; onDevMode: () => void }) {
  return (
    <div className="tbar">
      <span className="pill">test</span>
      <span>{props.endpoint}</span>
      {props.tokenNote && <span className="bad">{props.tokenNote}</span>}
      <span className="sp" />
      <button onClick={props.onDevMode}>Dev Mode</button>
      <button onClick={props.onResults}>Results</button>
      <button onClick={props.onSettings}>
        <SettingsIcon className="ic xs" /> Settings
      </button>
    </div>
  );
}

// ---------- exam page ----------

export function ExamView(props: {
  answers: Record<string, SavedPhoto[]>;
  drafts: Record<string, Photo[]>;
  timerEnd: number;
  srcOf: SrcOf;
  bar: React.ReactNode;
  onExit: () => void;
  onSubmit: () => void;
  onOpen: (key: string) => void;
  onChange: (key: string) => void;
  onZoom: (src: string) => void;
}) {
  const [menu, setMenu] = useState(false);
  const answered = ORDER.filter((k) => (props.answers[k] || []).length).length;
  const jump = (key: string) => {
    setMenu(false);
    const el = document.getElementById(`pc-q-${key}`);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 70, behavior: "smooth" });
  };
  return (
    <>
      {props.bar}
      <header className="exam-hdr">
        <button className="icon-btn round" aria-label="বের হও" onClick={props.onExit}>
          <X className="ic" />
        </button>
        <TimerText end={props.timerEnd} className="big" />
        <button className="qcount" onClick={() => setMenu((m) => !m)}>
          প্রশ্ন {answered}/{ORDER.length} <ChevronDown className="ic" />
        </button>
        <button className="btn-submit" disabled={!answered} onClick={props.onSubmit}>
          সাবমিট করো
        </button>
      </header>
      {menu && (
        <div className="menu">
          {ORDER.map((k) => {
            const q = QUESTIONS[k];
            const n = (props.answers[k] || []).length;
            return (
              <button key={k} onClick={() => jump(k)}>
                <span>{q.kind === "cq" ? q.sub : `সংক্ষিপ্ত · ${q.label}`}</span>
                {n > 0 && <span className="ok">{bn(n)}টি ছবি</span>}
              </button>
            );
          })}
        </div>
      )}
      <main className="exam">
        {SECTIONS.map((sec) => (
          <section key={sec.title}>
            <div className="sec-head">
              <h2>{sec.title}</h2>
              <p>{sec.note}</p>
              {sec.hint && (
                <p className="hint">
                  <Info className="ic" /> {sec.hint}
                </p>
              )}
            </div>
            {sec.groups.map((g, gi) => (
              <div key={g.name ?? gi}>
                <div className="grp">{g.name}</div>
                {g.questions.map((q) => {
                  const saved = props.answers[q.key] || [];
                  const draft = props.drafts[q.key] || [];
                  return (
                    <article className="card qcard" id={`pc-q-${q.key}`} key={q.key}>
                      <div className="q-label">{q.label}</div>
                      <QuestionBody q={q} />
                      {saved.length ? (
                        <div className="answered">
                          <div className="answered-top">
                            <span className="ok-text">
                              <CheckIcon className="ic sm" /> {bn(saved.length)}টি ছবি আপলোড হয়েছে
                            </span>
                            <button className="link" onClick={() => props.onChange(q.key)}>
                              পরিবর্তন করো
                            </button>
                          </div>
                          <div className="thumbs">
                            {saved.map((s, i) => (
                              <Thumb key={s.recordId} src={props.srcOf(s)} warn={isWarned(s.check)} label={`ছবি ${i + 1}`} onZoom={props.onZoom} />
                            ))}
                          </div>
                        </div>
                      ) : (
                        <>
                          <button className="btn-dashed" onClick={() => props.onOpen(q.key)}>
                            <CloudUpload className="ic" /> উত্তর আপলোড করো
                          </button>
                          {draft.length ? (
                            <p className="draft-note">{bn(draft.length)}টি ছবি যোগ করা আছে, এখনও আপলোড হয়নি</p>
                          ) : (
                            <p className="hint center">
                              <Info className="ic" /> খাতায় লিখে ছবি তুলে ফাইল আপলোড করো
                            </p>
                          )}
                        </>
                      )}
                    </article>
                  );
                })}
              </div>
            ))}
          </section>
        ))}
      </main>
    </>
  );
}

// ---------- add answer photos ----------

export function QuestionView(props: {
  q: Question;
  draft: Photo[];
  timerEnd: number;
  srcOf: SrcOf;
  onBack: () => void;
  onReview: () => void;
  onCamera: () => void;
  onGallery: () => void;
  onZoom: (src: string) => void;
}) {
  const { q, draft } = props;
  return (
    <>
      <Header title={q.title} sub={q.sub} onBack={props.onBack} timerEnd={props.timerEnd} />
      <main className="page">
        <article className="card">
          <div className="q-label">{q.label}</div>
          <QuestionBody q={q} />
          <hr className="divider" />
          <h3 className="h-add">উত্তরের ছবি যোগ করো</h3>
          <p className="muted">একই প্রশ্নের জন্য একাধিক ছবি একসাথে আপলোড করতে পারবে।</p>
          {draft.length ? (
            <>
              <div className="thumbs" style={{ marginTop: 10 }}>
                {draft.map((p, i) => (
                  <Thumb key={p.lid} src={props.srcOf(p)} warn={isWarned(p.check)} label={`ছবি ${i + 1}`} onZoom={props.onZoom} />
                ))}
              </div>
              <p className="muted small" style={{ marginTop: 6 }}>
                {bn(draft.length)}টি ছবি যোগ করা হয়েছে, এখনও আপলোড হয়নি
              </p>
            </>
          ) : (
            <p className="muted small" style={{ marginTop: 6 }}>
              এখনও কোনো ছবি যোগ করা হয়নি
            </p>
          )}
        </article>
        <div className="note-green">
          <Info className="ic" />
          <div>
            <b>সব পৃষ্ঠাই এই প্রশ্নের</b>
            <p>উত্তর পৃষ্ঠাগুলো ক্রমানুসারে তোলো। আপলোডের আগে সব ছবি দেখে নিতে পারবে।</p>
          </div>
        </div>
      </main>
      <footer className="foot">
        {draft.length > 0 && (
          <button className="btn primary" onClick={props.onReview}>
            <ArrowRight className="ic" /> {bn(draft.length)}টি ছবি দেখে নাও
          </button>
        )}
        <button className={`btn ${draft.length ? "outline" : "primary"}`} onClick={props.onCamera}>
          <Camera className="ic" /> ছবি তোলো
        </button>
        <button className="btn outline" onClick={props.onGallery}>
          <ImageIcon className="ic" /> গ্যালারি থেকে ছবি বাছাই করো
        </button>
        <p className="foot-note">ছবি যোগ করা মানে পরীক্ষা সাবমিট করা নয়।</p>
      </footer>
    </>
  );
}

// ---------- review ----------

const ROW_GAP = 10;

export function ReviewView(props: {
  q: Question;
  draft: Photo[];
  timerEnd: number;
  debug: boolean;
  srcOf: SrcOf;
  onBack: () => void;
  onRetake: (lid: string) => void;
  onRemove: (lid: string) => void;
  onCrop: (lid: string) => void;
  onReorder: (from: number, to: number) => void;
  onMore: () => void;
  onUpload: () => void;
  onZoom: (src: string) => void;
}) {
  const { q, draft } = props;
  const listRef = useRef<HTMLDivElement>(null);
  const pending = draft.some((p) => decision(p.check).kind === "pending");

  // Drag a row by its handle; the rows it passes make room, and the order changes on release.
  const startDrag = (index: number) => (e: React.PointerEvent<HTMLSpanElement>) => {
    const list = listRef.current;
    if (!list) return;
    e.preventDefault();
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    const rows = Array.from(list.querySelectorAll<HTMLElement>(".row"));
    const rects = rows.map((r) => r.getBoundingClientRect());
    const dragged = rows[index];
    const step = rects[index].height + ROW_GAP;
    const y0 = e.clientY;
    let target = index;
    dragged.classList.add("dragging");
    rows.forEach((r, i) => i !== index && r.classList.add("shift"));
    const move = (ev: PointerEvent) => {
      const dy = ev.clientY - y0;
      dragged.style.transform = `translateY(${dy}px)`;
      const centre = rects[index].top + rects[index].height / 2 + dy;
      target = rects.findIndex((r) => centre < r.bottom);
      if (target < 0) target = rects.length - 1;
      rows.forEach((r, i) => {
        if (i === index) return;
        let shift = 0;
        if (index < target && i > index && i <= target) shift = -step;
        if (index > target && i < index && i >= target) shift = step;
        r.style.transform = shift ? `translateY(${shift}px)` : "";
      });
    };
    const end = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", end);
      handle.removeEventListener("pointercancel", end);
      rows.forEach((r) => {
        r.style.transform = "";
        r.classList.remove("dragging", "shift");
      });
      if (target !== index) props.onReorder(index, target);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
  };

  return (
    <>
      <Header title="ছবি দেখে নাও" sub={q.sub} onBack={props.onBack} timerEnd={props.timerEnd} />
      <main className="page" style={{ paddingTop: 0 }}>
        <h2 className="rv-title">এক প্রশ্নের উত্তর · {bn(draft.length)}টি ছবি</h2>
        <p className="rv-sub">এই ক্রমেই ছবি যুক্ত হবে। পাশের ⠿ ধরে টেনে ক্রম বদলাও। লেখা স্পষ্ট আছে কি না দেখে নাও।</p>
        <div className="rows" ref={listRef}>
          {draft.map((p, i) => {
            const d = decision(p.check);
            return (
              <div className={`row ${d.kind === "warn" ? "warn" : ""}`} key={p.lid}>
                <div className="row-main">
                  <Thumb src={props.srcOf(p)} warn={d.kind === "warn"} label={`ছবি ${i + 1}`} onZoom={props.onZoom}>
                    <button className="crop-btn" aria-label="ক্রপ ও ঘোরাও" onClick={() => props.onCrop(p.lid)}>
                      <Crop className="ic" />
                    </button>
                  </Thumb>
                  <div className="row-body">
                    <div className="row-title">ছবি {i + 1}</div>
                    {d.kind === "pending" ? (
                      <div className="st pending">
                        <span className="spin" /> ছবি যাচাই হচ্ছে…
                      </div>
                    ) : d.kind === "warn" ? (
                      <div className="st">{q.short}</div>
                    ) : (
                      <div className="st">{q.short} · আপলোডের জন্য প্রস্তুত</div>
                    )}
                    <div className="row-actions">
                      <button className="act" onClick={() => props.onRetake(p.lid)}>
                        <Camera className="ic sm" /> আবার তোলো
                      </button>
                      <button className="act gray" onClick={() => props.onRemove(p.lid)}>
                        <Trash2 className="ic sm" /> বাদ দাও
                      </button>
                    </div>
                  </div>
                  <span className="grip" aria-label="ক্রম বদলাও" onPointerDown={startDrag(i)}>
                    <GripVertical className="ic" />
                  </span>
                </div>
                {d.kind === "warn" && d.message && (
                  <div className="warnbox">
                    <AlertTriangle className="ic" />
                    <span>{d.message}</span>
                  </div>
                )}
                {props.debug && <DebugBlock photo={p} />}
              </div>
            );
          })}
        </div>
        <button className="add-more" onClick={props.onMore}>
          <Plus className="ic" /> আরও ছবি যোগ করো
        </button>
      </main>
      <footer className="foot">
        <button className="btn primary" disabled={!draft.length || pending} onClick={props.onUpload}>
          {!draft.length ? (
            "কোনো ছবি নেই"
          ) : pending ? (
            <>
              <span className="spin" /> ছবি যাচাই হচ্ছে…
            </>
          ) : (
            <>
              <CloudUpload className="ic" /> {bn(draft.length)}টি ছবি একসাথে আপলোড করো
            </>
          )}
        </button>
        <p className="foot-note">
          এটি শুধু {q.short}-এর উত্তর যুক্ত করবে, পরীক্ষা সাবমিট করবে না।
          <br />
          ফিরে গেলে ছবি থাকবে; সব ছবি বাদ দিতে নিশ্চিত করতে হবে।
        </p>
      </footer>
    </>
  );
}

// ---------- upload ----------

export function UploadView(props: { upload: UploadState; photos: Photo[]; timerEnd: number; srcOf: SrcOf; onBack: () => void; onDone: () => void; onRetry: () => void; onZoom: (src: string) => void }) {
  const u = props.upload;
  const q = QUESTIONS[u.q];
  const n = u.lids.length;
  const done = u.state.filter((s) => s === "done").length;
  const nowIdx = u.state.indexOf("now");
  const total = u.pct.reduce((a, b) => a + b, 0) / Math.max(1, n);
  return (
    <>
      <Header title="ছবি আপলোড" sub={q.sub} backDisabled={!(u.done || u.failed)} onBack={props.onBack} timerEnd={props.timerEnd} />
      <main className="page">
        <h2 className="rv-title" style={{ paddingTop: 4 }}>
          {u.done ? "সব ছবি আপলোড হয়েছে" : u.failed ? "আপলোড থেমে গেছে" : "ছবি আপলোড হচ্ছে"}
        </h2>
        <p className="rv-sub">
          {bn(n)}টি ছবিই {q.label}-এর উত্তর হিসেবে যুক্ত হবে।
        </p>
        <div className="up-card">
          <div className="up-count">
            {bn(n)}টির মধ্যে {bn(done)}টি আপলোড হয়েছে
          </div>
          <div className="bar">
            <i style={{ width: `${u.done ? 100 : Math.round(total)}%` }} />
          </div>
          <div className="up-st">{nowIdx >= 0 ? `ছবি ${nowIdx + 1} আপলোড হচ্ছে · ${bn(u.pct[nowIdx])}%` : ""}</div>
        </div>
        <div className="up-card">
          {props.photos.map((p, i) => {
            const st = u.state[i];
            return (
              <div className="up-row" key={p.lid}>
                <Thumb src={props.srcOf(p)} warn={isWarned(p.check)} onZoom={props.onZoom} />
                <div>
                  <b>
                    ছবি {i + 1} · {q.short}
                  </b>
                  <div className={`up-st ${st}`}>
                    {st === "done" ? (
                      <>
                        <CheckIcon className="ic xs" /> আপলোড হয়েছে
                      </>
                    ) : st === "now" ? (
                      `আপলোড হচ্ছে · ${bn(u.pct[i])}%`
                    ) : st === "fail" ? (
                      "আপলোড হয়নি"
                    ) : (
                      "অপেক্ষায় আছে"
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {!u.done && (
          <div className="alert">
            <AlertTriangle className="ic" />
            <div>
              <b>এখনই পরীক্ষা সাবমিট করো না</b>
              <p>সব ছবি আপলোড শেষ হওয়া পর্যন্ত ইন্টারনেট সংযোগ চালু রাখো।</p>
            </div>
          </div>
        )}
      </main>
      <footer className="foot">
        <button className="btn primary" disabled={!(u.done || u.failed)} onClick={u.done ? props.onDone : props.onRetry}>
          {u.done ? (
            "পরীক্ষায় ফিরে যাও"
          ) : u.failed ? (
            "আবার চেষ্টা করো"
          ) : (
            <>
              <span className="spin" /> আপলোড শেষ হলে ফিরে যেতে পারবে
            </>
          )}
        </button>
        {!u.done && <p className="foot-note">আপলোড চলাকালে ফিরে যাওয়া যাবে না।</p>}
      </footer>
    </>
  );
}

// ---------- submission review ----------

export function SubmitView(props: {
  answers: Record<string, SavedPhoto[]>;
  timerEnd: number;
  debug: boolean;
  busy: boolean;
  srcOf: SrcOf;
  onBack: () => void;
  onChange: (key: string) => void;
  onFinal: () => void;
  onZoom: (src: string) => void;
}) {
  const answered = ORDER.filter((k) => (props.answers[k] || []).length);
  const photos = answered.reduce((n, k) => n + props.answers[k].length, 0);
  const warned = answered.reduce((n, k) => n + props.answers[k].filter((a) => isWarned(a.check)).length, 0);
  return (
    <>
      <header className="hdr">
        <button className="icon-btn round" aria-label="ফিরে যাও" onClick={props.onBack}>
          <ChevronLeft className="ic" />
        </button>
        <div className="hdr-text">
          <div className="hdr-title">সাবমিশন রিভিউ</div>
        </div>
        <TimerText end={props.timerEnd} />
      </header>
      <div className="sb-intro">
        <h2>জমা দেওয়ার আগে দেখে নাও</h2>
        <p>সব উত্তরের ছবি স্পষ্ট ও সঠিক ক্রমে আছে কি না যাচাই করো। ছবি বড় করে দেখতে ট্যাপ করো।</p>
        <div className="sb-meta">
          <b>
            {bn(answered.length)}টি উত্তর • {bn(photos)}টি ছবি
          </b>
          <span className="badge">সব ছবি আপলোড হয়েছে</span>
        </div>
        {props.debug && warned > 0 && (
          <div className="sb-meta">
            <span />
            <span className="badge warn">test: {warned} photo(s) warned</span>
          </div>
        )}
      </div>
      <main className="page">
        {SECTIONS.map((sec) => {
          const keys = sec.groups.flatMap((g) => g.questions.map((q) => q.key)).filter((k) => (props.answers[k] || []).length);
          return (
            <div key={sec.title}>
              <div className="sb-sec">
                <h3>{sec.title}</h3>
                <span>
                  {bn(keys.length)}টি উত্তর • পূর্ণমান: {sec.fullMarks}
                </span>
              </div>
              {keys.length ? (
                keys.map((k) => {
                  const q = QUESTIONS[k];
                  const list = props.answers[k];
                  return (
                    <div className="sb-q" key={k}>
                      <div className="sb-q-top">
                        <b>{q.reviewName}</b>
                        <span className="cnt">{bn(list.length)}টি ছবি</span>
                        <button className="link" onClick={() => props.onChange(k)}>
                          পরিবর্তন করো
                        </button>
                      </div>
                      <div className="grid3">
                        {list.map((s, i) => (
                          <figure key={s.recordId}>
                            <Thumb src={props.srcOf(s)} warn={isWarned(s.check)} onZoom={props.onZoom} />
                            <figcaption>পৃষ্ঠা {bn(i + 1)}</figcaption>
                          </figure>
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="sb-q">
                  <p className="sb-empty">এখনও কোনো উত্তর যোগ করা হয়নি</p>
                </div>
              )}
            </div>
          );
        })}
      </main>
      <footer className="foot">
        <p className="info-line">
          <Info className="ic" /> চূড়ান্ত সাবমিটের পর উত্তর পরিবর্তন করা যাবে না। শিক্ষক মূল্যায়ন করার পর ফলাফল জানানো হবে।
        </p>
        <button className="btn primary" disabled={props.busy} onClick={props.onFinal}>
          চূড়ান্ত সাবমিট করো
        </button>
        <button className="btn outline" onClick={props.onBack}>
          পরীক্ষায় ফিরে যাও
        </button>
      </footer>
    </>
  );
}

export function DoneView(props: { onResults: () => void; onNew: () => void }) {
  return (
    <div className="center-page">
      <div className="panel">
        <h1>সাবমিট হয়েছে</h1>
        <p>This was a test: no answer is checked. Every photo and its TenTen decision is on the Results page.</p>
        <div className="btns">
          <button className="btn primary" onClick={props.onResults}>
            Results
          </button>
          <button className="btn outline" onClick={props.onNew}>
            নতুন টেস্ট শুরু করো
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- tester settings ----------

export function SettingsSheet(props: {
  settings: Settings;
  tokenInfo: string;
  onChange: (patch: Partial<Settings>) => void;
  onSaveToken: (token: string) => void;
  onNewToken: () => void;
  onForgetToken: () => void;
  onNewSession: () => void;
  onResults: () => void;
  onClose: () => void;
}) {
  const [tok, setTok] = useState("");
  const s = props.settings;
  const seg = <T extends string>(value: T, options: [T, string][], key: keyof Settings) => (
    <div className="seg">
      {options.map(([v, label]) => (
        <button key={v} className={value === v ? "on" : ""} onClick={() => props.onChange({ [key]: v } as Partial<Settings>)}>
          {label}
        </button>
      ))}
    </div>
  );
  return (
    <div className="scrim">
      <div className="sheet en">
        <h3>Test settings</h3>
        <p>Only for testers. Students never see this.</p>
        <div className="field">
          <span className="lbl">TenTen environment</span>
          {seg(s.endpoint, [
            ["stage", "stage"],
            ["prod", "prod"],
            ["local", "local :8000"],
          ], "endpoint")}
          <small>Photos are judged by this TenTen. Local uses stage sign-in.</small>
        </div>
        <div className="field">
          <span className="lbl">10MS login token for {s.endpoint}</span>
          <small>{props.tokenInfo}</small>
          <input className="input" type="password" autoComplete="off" placeholder="paste a token (optional)" value={tok} onChange={(e) => setTok(e.target.value)} style={{ marginTop: 6 }} />
          <div className="seg" style={{ marginTop: 6 }}>
            <button
              onClick={() => {
                props.onSaveToken(tok.trim());
                setTok("");
              }}
            >
              Use pasted token
            </button>
            <button onClick={props.onNewToken}>Sign in again (test account)</button>
            <button onClick={props.onForgetToken}>Forget token</button>
          </div>
        </div>
        <div className="field">
          <span className="lbl">Student message language</span>
          {seg(s.language, [
            ["bn", "bn"],
            ["en", "en"],
          ], "language")}
        </div>
        <div className="field">
          <span className="lbl">Take photos with</span>
          {seg(s.capture, [
            ["inapp", "In-app camera"],
            ["native", "Phone camera app"],
          ], "capture")}
        </div>
        <div className="field">
          <label className="check">
            <input type="checkbox" checked={s.fit} onChange={(e) => props.onChange({ fit: e.target.checked })} /> Shrink photos over 700 KB before the check
          </label>
          <small>TenTen's front door (stage and prod) refuses requests over about 1 MB, so a full-size phone photo never reaches the check. Turn off to see that.</small>
        </div>
        <div className="field">
          <label className="check">
            <input type="checkbox" checked={s.debug} onChange={(e) => props.onChange({ debug: e.target.checked })} /> Show TenTen's raw decision under each photo
          </label>
        </div>
        <div className="btns">
          <button className="btn outline" onClick={props.onResults}>
            Results page
          </button>
          <button className="btn outline" onClick={props.onNewSession}>
            Start a new test session
          </button>
          <button className="btn primary" onClick={props.onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
