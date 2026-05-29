import axios from "axios";

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

export async function fetchMyAnalytics() {
  const { data } = await api.get("/api/analytics/me");
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
