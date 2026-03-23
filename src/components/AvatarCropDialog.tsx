import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import "@/index.css";

interface AvatarCropDialogProps {
  open: boolean;
  imageSrc: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (file: File, previewUrl: string) => Promise<void> | void;
}

const CROP_SIZE = 240;

export function AvatarCropDialog({ open, imageSrc, onOpenChange, onConfirm }: AvatarCropDialogProps) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!open) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setDragging(false);
      setIsSaving(false);
    }
  }, [open]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.style.setProperty("--avatar-crop-x", `${position.x}px`);
    stage.style.setProperty("--avatar-crop-y", `${position.y}px`);
    stage.style.setProperty("--avatar-crop-scale", `${scale}`);
  }, [position.x, position.y, scale]);

  const minScale = useMemo(() => {
    if (!imageSize.width || !imageSize.height) return 1;
    return Math.max(CROP_SIZE / imageSize.width, CROP_SIZE / imageSize.height);
  }, [imageSize.height, imageSize.width]);

  useEffect(() => {
    if (minScale > 0) {
      setScale((current) => Math.max(current, minScale));
    }
  }, [minScale]);

  const clampPosition = (nextX: number, nextY: number, nextScale = scale) => {
    const scaledWidth = imageSize.width * nextScale;
    const scaledHeight = imageSize.height * nextScale;
    const maxOffsetX = Math.max(0, (scaledWidth - CROP_SIZE) / 2);
    const maxOffsetY = Math.max(0, (scaledHeight - CROP_SIZE) / 2);

    return {
      x: Math.min(maxOffsetX, Math.max(-maxOffsetX, nextX)),
      y: Math.min(maxOffsetY, Math.max(-maxOffsetY, nextY)),
    };
  };

  const handleImageLoad = () => {
    const image = imageRef.current;
    if (!image) return;

    const nextSize = {
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
    setImageSize(nextSize);

    const nextMinScale = Math.max(CROP_SIZE / nextSize.width, CROP_SIZE / nextSize.height);
    setScale(nextMinScale);
    setPosition({ x: 0, y: 0 });
  };

  const handlePointerDown = (clientX: number, clientY: number) => {
    setDragging(true);
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!dragging) return;
    const next = clampPosition(clientX - dragStart.x, clientY - dragStart.y);
    setPosition(next);
  };

  const handleScaleChange = (value: number[]) => {
    const nextScale = value[0] ?? minScale;
    setScale(nextScale);
    setPosition((current) => clampPosition(current.x, current.y, nextScale));
  };

  const createCroppedFile = async () => {
    if (!imageRef.current || !imageSrc) return null;

    const canvas = document.createElement("canvas");
    canvas.width = CROP_SIZE;
    canvas.height = CROP_SIZE;
    const context = canvas.getContext("2d");
    if (!context) return null;

    const image = imageRef.current;
    const scaledWidth = imageSize.width * scale;
    const scaledHeight = imageSize.height * scale;
    const drawX = (CROP_SIZE - scaledWidth) / 2 + position.x;
    const drawY = (CROP_SIZE - scaledHeight) / 2 + position.y;

    context.clearRect(0, 0, CROP_SIZE, CROP_SIZE);
    context.drawImage(image, drawX, drawY, scaledWidth, scaledHeight);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), "image/jpeg", 0.92);
    });

    if (!blob) return null;

    const file = new File([blob], `avatar-${Date.now()}.jpg`, { type: "image/jpeg" });
    const previewUrl = URL.createObjectURL(blob);
    return { file, previewUrl };
  };

  const handleConfirm = async () => {
    const cropped = await createCroppedFile();
    if (!cropped) return;

    setIsSaving(true);
    try {
      await onConfirm(cropped.file, cropped.previewUrl);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="nebula-glass max-w-xl border-0 rounded-[1.75rem] p-6">
        <DialogHeader>
          <DialogTitle>Crop Profile Picture</DialogTitle>
          <DialogDescription>
            Adjust the image so it fits well inside the circular avatar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div
            ref={stageRef}
              className="avatar-crop-stage relative mx-auto h-[240px] w-[240px] overflow-hidden rounded-full border border-white/10 bg-black/30 touch-none"
            onMouseMove={(event) => handlePointerMove(event.clientX, event.clientY)}
            onMouseUp={() => setDragging(false)}
            onMouseLeave={() => setDragging(false)}
            onTouchMove={(event) => {
              const touch = event.touches[0];
              if (touch) handlePointerMove(touch.clientX, touch.clientY);
            }}
            onTouchEnd={() => setDragging(false)}
          >
            {imageSrc && (
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Crop preview"
                onLoad={handleImageLoad}
                onMouseDown={(event) => handlePointerDown(event.clientX, event.clientY)}
                onTouchStart={(event) => {
                  const touch = event.touches[0];
                  if (touch) handlePointerDown(touch.clientX, touch.clientY);
                }}
                className={cn("avatar-crop-image absolute left-1/2 top-1/2 max-w-none cursor-grab select-none", dragging && "cursor-grabbing")}
                draggable={false}
              />
            )}
            <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-white/20 shadow-[inset_0_0_0_999px_rgba(0,0,0,0.18)]" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Zoom</span>
              <span>{Math.round(scale * 100)}%</span>
            </div>
            <Slider
              value={[scale]}
              min={minScale}
              max={Math.max(minScale + 1.5, minScale * 2.5)}
              step={0.01}
              onValueChange={handleScaleChange}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={isSaving || !imageSrc}>
            {isSaving ? "Saving..." : "Use This Image"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
