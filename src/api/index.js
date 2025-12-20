// src/api/index.js
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000", // backend base
  withCredentials: false,
});

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("token");
  if (token) cfg.headers = { ...(cfg.headers || {}), Authorization: `Bearer ${token}` };
  return cfg;
});

export default api;
