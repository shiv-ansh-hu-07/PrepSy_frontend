// Lightweight, self-hosted product analytics client.
//
// Fires events to the backend /events endpoint so we can measure activation,
// WAU and retention before the September test cohort. Anonymous before login
// (stitched via a persistent anonId), attributed to the user once a token
// exists. Best-effort by design — it must never block or break the app.
const BASE = import.meta.env.VITE_API_BASE_URL || "";
const ANON_KEY = "prepsy_anon_id";
const FLUSH_MS = 4000;
const MAX_QUEUE = 20;

// Native UUID (as used elsewhere in the app), with a light fallback for older /
// non-secure contexts where crypto.randomUUID is unavailable.
function genId() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function anonId() {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = genId();
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return undefined; // private mode / storage blocked
  }
}

// One session id per tab load.
const sessionId = genId();

let queue = [];
let timer = null;

function authHeader() {
  try {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

function schedule() {
  if (timer) return;
  timer = setTimeout(() => flush(false), FLUSH_MS);
}

async function flush(useBeacon) {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (!queue.length || !BASE) return;
  const events = queue;
  queue = [];
  const url = `${BASE}/events/batch`;
  const payload = JSON.stringify({ events });

  // On unload, sendBeacon is the only reliable transport. It can't set the
  // Authorization header, so those land as anonymous — still stitched by anonId.
  if (useBeacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
    try {
      navigator.sendBeacon(url, new Blob([payload], { type: "application/json" }));
      return;
    } catch {
      /* fall through to fetch */
    }
  }

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: payload,
      keepalive: true,
    });
  } catch {
    // best-effort — drop on failure, never surface to the user
  }
}

/**
 * Record a product event.
 * @param {string} name  e.g. "room_joined", "signup_completed"
 * @param {object} props optional structured metadata
 */
export function track(name, props = {}) {
  if (!name) return;
  queue.push({
    name,
    anonId: anonId(),
    sessionId,
    path: typeof location !== "undefined" ? location.pathname : undefined,
    props,
    ts: Date.now(),
  });
  if (queue.length >= MAX_QUEUE) flush(false);
  else schedule();
}

// Flush on tab hide / unload so we don't lose the tail of a session.
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush(true);
  });
  window.addEventListener("pagehide", () => flush(true));
}

export default { track };
