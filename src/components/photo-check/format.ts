export const kb = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`);

export const pct = (v: number | null | undefined) =>
  typeof v === "number" ? `${(v * 100).toFixed(v >= 0.995 || v < 0.01 ? 1 : 0)}%` : "–";
