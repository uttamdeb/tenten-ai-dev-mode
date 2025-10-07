import { useEffect, useState } from "react";

/**
 * useKeyboardInsets
 * - Tracks on-screen keyboard height using VisualViewport API
 * - Sets a CSS variable --kb so components can use var(--kb)
 * - Returns the current bottom inset in pixels
 */
export function useKeyboardInsets() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vp = (window as any).visualViewport as VisualViewport | undefined;
    if (!vp) return;

    const update = () => {
      const bottom = Math.max(0, window.innerHeight - vp.height - vp.offsetTop);
      document.documentElement.style.setProperty("--kb", `${bottom}px`);
      setInset(bottom);
    };

    vp.addEventListener("resize", update);
    vp.addEventListener("scroll", update);
    update();

    return () => {
      vp.removeEventListener("resize", update);
      vp.removeEventListener("scroll", update);
    };
  }, []);

  return inset;
}
