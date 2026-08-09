import React, { createContext, useCallback, useContext, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

/**
 * A lightweight "unsaved changes" navigation guard.
 *
 * A page calls setGuard(message) while it has unsaved work (and setGuard(null)
 * when clean). While a message is set:
 *  - button-based navigation done via useGuardedNavigate() confirms first, and
 *  - clicks on any <a> link are intercepted app-wide (capture phase) to confirm.
 *
 * Browser-level leaving (refresh / close / external URL) is handled separately
 * by a beforeunload listener on the page that owns the unsaved state.
 */
const NavGuardContext = createContext(null);

export function NavGuardProvider({ children }) {
  const messageRef = useRef(null);

  const setGuard = useCallback((message) => {
    messageRef.current = message || null;
  }, []);

  const confirmNavigation = useCallback(() => {
    if (!messageRef.current) return true;
    return window.confirm(messageRef.current);
  }, []);

  // Intercept link clicks anywhere in the app while a guard is active, so
  // <Link>-based navigation (e.g. the top navbar) is covered without touching
  // every link. Capture phase runs before react-router's own click handler.
  useEffect(() => {
    const onClick = (event) => {
      if (!messageRef.current) return;
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target.closest?.("a[href]");
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return; // new tab / window
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return; // in-page anchor
      if (!confirmNavigation()) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [confirmNavigation]);

  return (
    <NavGuardContext.Provider value={{ setGuard, confirmNavigation }}>
      {children}
    </NavGuardContext.Provider>
  );
}

export function useNavGuard() {
  return useContext(NavGuardContext) || { setGuard: () => {}, confirmNavigation: () => true };
}

// Drop-in wrapper around useNavigate that runs the guard before navigating.
export function useGuardedNavigate() {
  const navigate = useNavigate();
  const { confirmNavigation } = useNavGuard();
  return useCallback(
    (to, opts) => {
      if (confirmNavigation()) navigate(to, opts);
    },
    [navigate, confirmNavigation],
  );
}
