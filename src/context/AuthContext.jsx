/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import api from "../api";

const AuthContext = createContext();
const USER_CACHE_KEY = "auth_user_cache";

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

  // Email / password login
  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    localStorage.setItem("token", res.data.token);
    await loadUser();
  };

  // Register (no auto-login)
  const register = async (name, email, password) => {
    await api.post("/auth/register", { name, email, password });
  };

  // ✅ ADD THIS (Google / OAuth login)
  const loginWithToken = async (token) => {
    localStorage.setItem("token", token);
    await loadUser();
  };

  const logout = () => {
    localStorage.removeItem("token");
    persistUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        loginWithToken, 
        logout,
        loading,
        refreshUser: loadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
