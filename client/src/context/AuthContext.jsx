import { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as authApi from "@/api/authApi";

const AuthContext = createContext(null);
const STORAGE_KEY = "icc-token";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY) || "");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    authApi
      .me(token)
      .then((data) => {
        if (!cancelled) setUser(data.user);
      })
      .catch(() => {
        if (!cancelled) {
          localStorage.removeItem(STORAGE_KEY);
          setToken("");
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const value = useMemo(() => {
    async function login(email, password) {
      setError("");
      const data = await authApi.login(email, password);
      localStorage.setItem(STORAGE_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
    }

    async function register(payload) {
      setError("");
      const data = await authApi.register(payload);
      localStorage.setItem(STORAGE_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
    }

    function logout() {
      localStorage.removeItem(STORAGE_KEY);
      setToken("");
      setUser(null);
    }

    return { token, user, loading, error, setError, login, register, logout };
  }, [token, user, loading, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
