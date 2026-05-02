/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import api from "../services/api";

const AuthContext = createContext();
const USER_CACHE_KEY = "auth_user_cache";
const GUEST_SESSION_KEY = "guest_session_active";

function readCachedUser() {
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => readCachedUser());
  const [guestSessionActive, setGuestSessionActive] = useState(
    () => localStorage.getItem(GUEST_SESSION_KEY) === "true"
  );
  const [loading, setLoading] = useState(() => {
    const token = localStorage.getItem("token");
    return token ? readCachedUser() === null : false;
  });

  const persistUser = useCallback((nextUser) => {
    setUser(nextUser);

    if (nextUser) {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(nextUser));
      return;
    }

    localStorage.removeItem(USER_CACHE_KEY);
  }, []);

  const persistGuestSession = useCallback((active) => {
    setGuestSessionActive(active);

    if (active) {
      localStorage.setItem(GUEST_SESSION_KEY, "true");
      return;
    }

    localStorage.removeItem(GUEST_SESSION_KEY);
  }, []);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      persistUser(null);
      return;
    }

    try {
      const res = await api.get("/auth/me");
      persistUser(res.data);
    } catch {
      localStorage.removeItem("token");
      persistUser(null);
    } finally {
      setLoading(false);
    }
  }, [persistUser]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!user?.id) {
      return undefined;
    }

    let cancelled = false;

    const sendPresence = async () => {
      try {
        await api.post("/auth/presence");
      } catch {
        if (!cancelled) {
          return;
        }
      }
    };

    void sendPresence();

    const intervalId = window.setInterval(() => {
      void sendPresence();
    }, 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void sendPresence();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user?.id]);

  // Email / password login
  const login = async (email, password) => {
    const res = await api.post("/auth/login", {
      email,
      password,
      disableStreak: guestSessionActive,
    });
    localStorage.setItem("token", res.data.token);
    persistUser(res.data.user);
    setLoading(false);
    persistGuestSession(false);
    return res.data.user;
  };

  // Register (no auto-login)
  const register = async (name, email, password) => {
    await api.post("/auth/register", { name, email, password });
  };

  // ✅ ADD THIS (Google / OAuth login)
  const loginWithToken = async (token, nextUser = null) => {
    localStorage.setItem("token", token);
    if (nextUser) {
      persistUser(nextUser);
      setLoading(false);
    } else {
      await loadUser();
    }
    persistGuestSession(false);
  };

  const logout = () => {
    localStorage.removeItem("token");
    persistUser(null);
    persistGuestSession(false);
  };

  const markGuestSessionActive = useCallback(() => {
    persistGuestSession(true);
  }, [persistGuestSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        loginWithToken, 
        logout,
        loading,
        guestSessionActive,
        markGuestSessionActive,
        refreshUser: loadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
