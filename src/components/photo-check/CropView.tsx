import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Check, RotateCcw, RotateCw, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  /** The photo on this device, or null when only its link is known. */
  blob: Blob | null;
  src: string;
  onCancel: () => void;
  onApply: (blob: Blob) => void;
}

type Box = { x: number; y: number; w: number; h: number };
type Grab = "move" | "nw" | "ne" | "sw" | "se";

const MIN_BOX = 40;
const MAX_OUT = 4096;

/** Turn the drawing context so the bitmap, drawn at 0,0, comes out turned by `rot` degrees clockwise. */
function turn(ctx: CanvasRenderingContext2D, rot: number, w: number, h: number) {
  if (rot === 90) {
    ctx.translate(h, 0);
    ctx.rotate(Math.PI / 2);
  } else if (rot === 180) {
    ctx.translate(w, h);
    ctx.rotate(Math.PI);
  } else if (rot === 270) {
    ctx.translate(0, w);
    ctx.rotate(-Math.PI / 2);
  }
}

/** Crop and turn a photo; the result is a new JPEG, upright as shown. */
export function CropView({ blob, src, onCancel, onApply }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bmp, setBmp] = useState<ImageBitmap | null>(null);
  const [rot, setRot] = useState(0);
  const [scale, setScale] = useState(1);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [box, setBox] = useState<Box>({ x: 0, y: 0, w: 0, h: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    let loaded: ImageBitmap | null = null;
    (async () => {
      try {
        const source = blob ?? (await (await fetch(src)).blob());
        loaded = await createImageBitmap(source, { imageOrientation: "from-image" });
        if (alive) setBmp(loaded);
        else loaded.close();
      } catch {
        if (alive) {
          toast.error("ছবিটি খোলা যায়নি।");
          onCancel();
        }
      }
    })();
    return () => {
      alive = false;
      loaded?.close();
    };
    // Loaded once per photo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!bmp || !stage || !canvas) return;
    const turned = rot % 180 !== 0;
    const rw = turned ? bmp.height : bmp.width;
    const rh = turned ? bmp.width : bmp.height;
    const s = Math.min((stage.clientWidth - 24) / rw, (stage.clientHeight - 24) / rh);
    const w = Math.round(rw * s);
    const h = Math.round(rh * s);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(s * dpr, s * dpr);
    turn(ctx, rot, bmp.width, bmp.height);
    ctx.drawImage(bmp, 0, 0);
    setScale(s);
    setSize({ w, h });
    setBox({ x: 0, y: 0, w, h });
  }, [bmp, rot]);

  const startDrag = (grab: Grab) => (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    const x0 = e.clientX;
    const y0 = e.clientY;
    const b0 = box;
    const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - x0;
      const dy = ev.clientY - y0;
      let { x, y, w, h } = b0;
      if (grab === "move") {
        x = clamp(b0.x + dx, 0, size.w - b0.w);
        y = clamp(b0.y + dy, 0, size.h - b0.h);
      } else {
        if (grab.includes("w")) {
          const nx = clamp(b0.x + dx, 0, b0.x + b0.w - MIN_BOX);
          w = b0.w + (b0.x - nx);
          x = nx;
        }
        if (grab.includes("e")) w = clamp(b0.w + dx, MIN_BOX, size.w - b0.x);
        if (grab.includes("n")) {
          const ny = clamp(b0.y + dy, 0, b0.y + b0.h - MIN_BOX);
          h = b0.h + (b0.y - ny);
          y = ny;
        }
        if (grab.includes("s")) h = clamp(b0.h + dy, MIN_BOX, size.h - b0.y);
      }
      setBox({ x, y, w, h });
    };
    const end = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", end);
      target.removeEventListener("pointercancel", end);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", end);
    target.addEventListener("pointercancel", end);
  };

  const apply = async () => {
    if (!bmp || saving) return;
    setSaving(true);
    const cx = box.x / scale;
    const cy = box.y / scale;
    const cw = box.w / scale;
    const ch = box.h / scale;
    const k = Math.min(1, MAX_OUT / Math.max(cw, ch));
    const out = document.createElement("canvas");
    out.width = Math.max(1, Math.round(cw * k));
    out.height = Math.max(1, Math.round(ch * k));
    const ctx = out.getContext("2d");
    if (!ctx) {
      setSaving(false);
      return;
    }
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.scale(k, k);
    ctx.translate(-cx, -cy);
    turn(ctx, rot, bmp.width, bmp.height);
    ctx.drawImage(bmp, 0, 0);
    const result = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, "image/jpeg", 0.92));
    setSaving(false);
    if (!result) {
      toast.error("ক্রপ করা যায়নি।");
      return;
    }
    onApply(result);
  };

  return (
    <div className="crop">
      <div className="crop-stage" ref={stageRef}>
        {!bmp && <span className="crop-loading">ছবি খোলা হচ্ছে…</span>}
        <div className="crop-wrap" style={{ display: bmp ? "block" : "none" }}>
          <canvas ref={canvasRef} />
          {size.w > 0 && (
            <div className="crop-box" style={{ left: box.x, top: box.y, width: box.w, height: box.h }} onPointerDown={startDrag("move")}>
              {(["nw", "ne", "sw", "se"] as const).map((g) => (
                <div key={g} className={`crop-h ${g}`} onPointerDown={startDrag(g)} />
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="crop-bar">
        <button className="icon-btn round dark" aria-label="বাতিল" onClick={onCancel}>
          <X className="ic" />
        </button>
        <div className="crop-rot">
          <button className="icon-btn" aria-label="বাঁয়ে ঘোরাও" onClick={() => setRot((r) => (r + 270) % 360)}>
            <RotateCcw className="ic" />
          </button>
          <button className="icon-btn" aria-label="ডানে ঘোরাও" onClick={() => setRot((r) => (r + 90) % 360)}>
            <RotateCw className="ic" />
          </button>
        </div>
        <button className="icon-btn round light" aria-label="ঠিক আছে" disabled={!bmp || saving} onClick={apply}>
          <Check className="ic" />
        </button>
      </div>
    </div>
  );
}
