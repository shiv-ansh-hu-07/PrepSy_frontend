// src/services/api.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
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

// -----------------------------
// Mock Functions (Optional)
// -----------------------------

export async function fetchStats() {
  return {
    stats: {
      activeRooms: 12,
      activeUsers: 87,
      avgFocus: 74,
    },
  };
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
