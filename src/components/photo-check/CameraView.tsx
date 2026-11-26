import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check as CheckIcon, Image as ImageIcon, Zap, ZapOff } from "lucide-react";
import { toast } from "sonner";
import { bn, type Question } from "./exam";
import { Header, Thumb, type ZoomFn } from "./parts";
import { isWarned, type CameraState, type Photo } from "./types";

interface Props {
  q: Question;
  desktop: boolean;
  camera: CameraState;
  draft: Photo[];
  timerEnd: number;
  srcOf: (p: Photo) => string;
  onCapture: (blob: Blob) => void;
  onGallery: () => void;
  onReview: () => void;
  onBack: () => void;
  onZoom: ZoomFn;
}

interface ImageCaptureLike {
  takePhoto: () => Promise<Blob>;
}

/** The in-app camera: a full still when the browser offers one, else the preview frame. */
export function CameraView({ q, desktop, camera, draft, timerEnd, srcOf, onCapture, onGallery, onReview, onBack, onZoom }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureRef = useRef<ImageCaptureLike | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [torch, setTorch] = useState<{ available: boolean; on: boolean }>({ available: false, on: false });
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setFailed("এই ব্রাউজারে ক্যামেরা চালু করা যায়নি। গ্যালারি থেকে ছবি বাছাই করো।");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 3840 }, height: { ideal: 2160 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => undefined);
        }
        const track = stream.getVideoTracks()[0];
        const ImageCaptureCtor = (window as unknown as { ImageCapture?: new (t: MediaStreamTrack) => ImageCaptureLike }).ImageCapture;
        captureRef.current = ImageCaptureCtor ? new ImageCaptureCtor(track) : null;
        const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean };
        if (caps.torch) setTorch({ available: true, on: false });
      } catch {
        setFailed("ক্যামেরা চালু করা যায়নি। সেটিংসে অনুমতি দাও অথবা গ্যালারি থেকে ছবি বাছাই করো।");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const on = !torch.on;
    try {
      await track.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] });
      setTorch({ available: true, on });
    } catch {
      setTorch({ available: true, on: false });
    }
  };

  const shoot = async () => {
    const video = videoRef.current;
    if (busy || !streamRef.current || !video) return;
    setBusy(true);
    setFlash(true);
    window.setTimeout(() => setFlash(false), 120);
    let blob: Blob | null = null;
    if (captureRef.current) {
      try {
        blob = await Promise.race([
          captureRef.current.takePhoto(),
          new Promise<Blob>((_, reject) => window.setTimeout(() => reject(new Error("slow")), 5000)),
        ]);
        // Some phones return the still turned against the preview: then the preview frame is used.
        const bmp = await createImageBitmap(blob);
        const stillPortrait = bmp.height > bmp.width;
        bmp.close();
        if (video.videoWidth && stillPortrait !== video.videoHeight > video.videoWidth) blob = null;
      } catch {
        blob = null;
      }
    }
    if (!blob && video.videoWidth) {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")?.drawImage(video, 0, 0);
      blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    }
    setBusy(false);
    if (!blob) {
      toast.error("ছবি তোলা যায়নি, আবার চেষ্টা করো।");
      return;
    }
    onCapture(blob);
  };

  // Desktop: Space takes the photo.
  const shootRef = useRef(shoot);
  shootRef.current = shoot;
  useEffect(() => {
    if (!desktop) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat || (e.target as HTMLElement)?.closest("input, textarea, button")) return;
      e.preventDefault();
      shootRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [desktop]);

  const taken = draft.slice(camera.start);
  const replace = camera.mode === "replace";

  return (
    <div className="cam">
      <Header title="উত্তরের ছবি তোলো" sub={q.sub} dark onBack={onBack} timerEnd={timerEnd} />
      <div className="viewfinder">
        <video ref={videoRef} playsInline muted autoPlay />
        <div className="vf-frame" />
        {torch.available && (
          <button className={`icon-btn round vf-flash ${torch.on ? "on" : ""}`} aria-label="ফ্ল্যাশ" onClick={toggleTorch}>
            {torch.on ? <Zap className="ic" /> : <ZapOff className="ic" />}
          </button>
        )}
        <div className="vf-chip">{replace ? "আবার তোলো" : `পরের ছবি - ${draft.length + 1}`}</div>
        <div className="vf-tip">পুরো পৃষ্ঠা রাখো · আলো ও লেখা স্পষ্ট রাখো</div>
        {failed && <div className="vf-msg">{failed}</div>}
        <div className={`vf-fx ${flash ? "go" : ""}`} />
      </div>
      <div className="cam-info">
        <div className="cam-row">
          <b>{bn(taken.length)}টি ছবি তোলা হয়েছে</b>
          {camera.justAdded && (
            <span className="added">
              <CheckIcon className="ic sm" /> শেষ ছবি যোগ হয়েছে
            </span>
          )}
        </div>
        {taken.length ? (
          <div className="strip">
            {taken.map((p, i) => (
              <div key={p.lid} style={{ textAlign: "center" }}>
                <Thumb src={srcOf(p)} group={taken.map(srcOf)} warn={isWarned(p.check)} onZoom={onZoom} />
                <div style={{ fontSize: 11, color: "#a8afb8" }}>{camera.start + i + 1}</div>
              </div>
            ))}
            <span className="more">আরও ছবি তুলতে পারো</span>
          </div>
        ) : (
          <p className="cam-sub">একই প্রশ্নের সব পৃষ্ঠা একে একে তোলো।</p>
        )}
      </div>
      <div className="cam-controls">
        <button className="cam-side" onClick={onGallery}>
          <ImageIcon className="ic" />
          <span>{desktop ? "কম্পিউটার থেকে" : "গ্যালারি"}</span>
        </button>
        <button className="shutter" aria-label="ছবি তোলো" disabled={busy || !!failed} onClick={shoot}>
          <span />
        </button>
        <button className="cam-side" onClick={() => draft.length && onReview()}>
          <b>{draft.length}</b>
          <span>ছবি দেখো</span>
        </button>
      </div>
      <div className="shutter-label">{desktop ? "ছবি তোলো · Space" : "ছবি তোলো"}</div>
      <div className="cam-foot">
        {taken.length ? (
          <>
            <button className="btn primary" onClick={onReview}>
              <ArrowRight className="ic" /> {bn(draft.length)}টি ছবি দেখে নাও
            </button>
            <p>এখনও আপলোড হয়নি। ফিরে গেলে ছবি রাখা বা বাদ দেওয়ার আগে নিশ্চিত করা হবে।</p>
          </>
        ) : (
          <>
            <p>ক্যামেরার অনুমতি না দিলে: সেটিংসে অনুমতি দাও অথবা গ্যালারি থেকে ছবি বাছাই করো।</p>
            <p>ফিরে গেলে পরীক্ষা চলতে থাকবে।</p>
          </>
        )}
      </div>
    </div>
  );
}
