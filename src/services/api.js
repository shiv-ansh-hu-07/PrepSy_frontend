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

export async function fetchRooms() {
  return {
    rooms: [
      { id: 1, name: "JEE Room", participants: 6 },
      { id: 2, name: "UPSC Math", participants: 4 },
      { id: 3, name: "NEET Bio", participants: 3 },
    ],
  };
}

export default api;
