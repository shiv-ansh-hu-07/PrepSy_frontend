// src/hooks/useBreakpoint.js
//
// One shared, throttled window-width listener + standardized breakpoints.
//
// Why this exists:
//   Almost every page re-implemented its own `useState(window.innerWidth)` +
//   `resize` listener, and they disagreed on thresholds (isMobile was <640 on
//   one page, <600 on another; isTablet was <960 vs <900). That inconsistency
//   is exactly why alignment used to break at different widths on different
//   pages. Everything responsive should derive from here instead.
//
// Usage:
//   const { width, isPhone, isMobile, isTablet, isDesktop } = useBreakpoint();
//   // or just the raw number when a page needs a custom threshold:
//   const width = useWindowWidth();
import { useState, useEffect } from "react";

// Standardized breakpoints (px). Keep these in sync with any CSS media queries.
export const BREAKPOINTS = {
  phone: 640, // < 640  → small phones
  mobile: 768, // < 768  → phones / large phones (stack everything)
  tablet: 1024, // < 1024 → tablets (side nav collapses)
};

/**
 * Raw viewport width in px, updated on resize (throttled to one update per
 * animation frame so fast drags don't thrash React). SSR-safe default of 1200.
 */
export function useWindowWidth() {
  const [width, setWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1200
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    let frame = null;
    const handleResize = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        setWidth(window.innerWidth);
      });
    };

    handleResize(); // sync once on mount (covers first paint after hydration)
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  return width;
}

/**
 * Convenience wrapper returning the raw width plus the standardized flags most
 * pages need. `isMobile` is the workhorse (stack layouts, hide decoration);
 * `isTablet` is where the app side nav collapses.
 */
export function useBreakpoint() {
  const width = useWindowWidth();
  return {
    width,
    isPhone: width < BREAKPOINTS.phone,
    isMobile: width < BREAKPOINTS.mobile,
    isTablet: width < BREAKPOINTS.tablet,
    isDesktop: width >= BREAKPOINTS.tablet,
  };
}

export default useBreakpoint;
