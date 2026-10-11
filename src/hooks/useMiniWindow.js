import { useCallback, useEffect, useRef, useState } from "react";

// A small always-on-top window (Document Picture-in-Picture) that keeps the
// room's timer and focus score in view while the user works in another tab or
// app. Chromium-only today; `supported` is false elsewhere and nothing renders.
//
// The user's choice is remembered per browser:
//   "allow" → opens by itself when they switch tabs (and via the header button)
//   "deny"  → never opens by itself; the header button still works
const PREF_KEY = "prepsy_mini_window";
const SIZE = { width: 260, height: 132 };

function readPref() {
  try {
    const v = localStorage.getItem(PREF_KEY);
    return v === "allow" || v === "deny" ? v : null;
  } catch {
    return null;
  }
}

export default function useMiniWindow() {
  const supported = typeof window !== "undefined" && "documentPictureInPicture" in window;

  const [preference, setPreferenceState] = useState(readPref);
  const [container, setContainer] = useState(null); // DOM node inside the mini window
  const winRef = useRef(null);
  const openingRef = useRef(false);

  const setPreference = useCallback((value) => {
    setPreferenceState(value);
    try {
      localStorage.setItem(PREF_KEY, value);
    } catch {
      /* private mode: the choice just won't persist */
    }
  }, []);

  const close = useCallback(() => {
    const w = winRef.current;
    winRef.current = null;
    setContainer(null);
    try {
      w?.close();
    } catch {
      /* already gone */
    }
  }, []);

  // Must run from a user gesture or the browser's own tab-switch trigger below.
  const open = useCallback(async () => {
    if (!supported || winRef.current || openingRef.current) return false;
    openingRef.current = true;
    try {
      const w = await window.documentPictureInPicture.requestWindow(SIZE);
      w.document.title = "PrepSy";
      w.document.documentElement.style.height = "100%";
      Object.assign(w.document.body.style, { margin: "0", height: "100%", background: "#14172a" });
      const root = w.document.createElement("div");
      root.style.height = "100%";
      w.document.body.appendChild(root);
      w.addEventListener("pagehide", () => {
        if (winRef.current === w) {
          winRef.current = null;
          setContainer(null);
        }
      });
      winRef.current = w;
      setContainer(root);
      return true;
    } catch {
      return false; // no gesture, blocked by the user, or closed mid-open
    } finally {
      openingRef.current = false;
    }
  }, [supported]);

  // Opt-in: let the browser open the mini window when the user leaves the tab.
  // Chrome only fires this while the page is using the camera or mic, and asks
  // the user once with its own prompt.
  useEffect(() => {
    if (!supported || preference !== "allow" || !navigator.mediaSession) return undefined;
    try {
      navigator.mediaSession.setActionHandler("enterpictureinpicture", () => {
        void open();
      });
    } catch {
      return undefined; // action not supported in this browser version
    }
    return () => {
      try {
        navigator.mediaSession.setActionHandler("enterpictureinpicture", null);
      } catch {
        /* ignore */
      }
    };
  }, [supported, preference, open]);

  // Back on the PrepSy tab: the full room is visible again, so tuck it away.
  useEffect(() => {
    if (!supported) return undefined;
    const onVisible = () => {
      if (document.visibilityState === "visible") close();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [supported, close]);

  useEffect(() => close, [close]);

  return { supported, preference, setPreference, container, isOpen: Boolean(container), open, close };
}
