import { useEffect, useState } from "react";

const QUERY = "(min-width: 1024px)";

/** True on a desktop-wide window: the screens switch to their two-pane desktop layout. */
export function useIsDesktop() {
  const [desktop, setDesktop] = useState(() => typeof window !== "undefined" && window.matchMedia(QUERY).matches);
  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = () => setDesktop(mql.matches);
    mql.addEventListener("change", onChange);
    onChange();
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return desktop;
}
