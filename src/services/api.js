import axios from "axios";
import { track } from "./analytics";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

// 🔥 Automatically attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function fetchStats() {
  const { data } = await api.get("/api/stats");
  return data;
}

// Founder-only product analytics summary. Backend enforces the allowlist
// (ANALYTICS_ADMIN_EMAILS); non-admins receive 403.
export async function fetchEventsSummary() {
  const { data } = await api.get("/events/summary");
  return data;
}

// Founder-only per-tester activity table (September view).
export async function fetchEventsTesters() {
  const { data } = await api.get("/events/testers");
  return data;
}

export async function fetchMyAnalytics() {
  const { data } = await api.get("/api/analytics/me");
  return data;
}

export async function saveFocusSession(payload) {
  const { data } = await api.post("/focus-analytics", payload);
  // Choke point for a completed monitored study session — key core-loop event.
  track("session_completed", {
    roomId: payload?.roomId,
    durationMinutes: payload?.durationMinutes,
    focusScore: payload?.focusScore,
  });
  return data;
}

export async function fetchFocusSummary() {
  const { data } = await api.get("/focus-analytics/summary");
  return data;
}

// AI-written coaching from the user's focus history (numbers only, no video).
export async function fetchFocusInsight() {
  const { data } = await api.get("/focus-analytics/insight");
  return data;
}

export async function fetchFocusForRoom(roomId) {
  const { data } = await api.get(`/focus-analytics/room/${roomId}`);
  return data;
}

export async function fetchMyProfile() {
  const { data } = await api.get("/profiles/me");
  return data;
}

export async function updateMyProfile(profile) {
  const { data } = await api.put("/profiles/me", profile);
  return data;
}

export async function uploadAvatar(formData) {
  const { data } = await api.post("/profiles/avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function fetchVideoSummary(roomId) {
  const { data } = await api.get(`/rooms/${roomId}/video-summary`);
  return data;
}

// Persistent watch-party playback memory (resume where the video was left off).
export async function fetchRoomVideoState(roomId) {
  const { data } = await api.get(`/rooms/${roomId}/video-state`);
  return data; // null if none saved yet
}

export async function saveRoomVideoState(roomId, state) {
  const { data } = await api.post(`/rooms/${roomId}/video-state`, state);
  return data;
}

export default api;
