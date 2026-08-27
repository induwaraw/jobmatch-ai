/**
 * Who is signed in, and the calls that change that.
 *
 * On first load, if a token is already in localStorage we ask /api/auth/me
 * whether it is still valid, so an expired token does not leave the interface
 * showing a logged in state that does not work.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { api, getToken, setToken } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    api
      .get("/api/auth/me")
      .then((response) => {
        if (!cancelled) setUser(response.data);
      })
      .catch(() => {
        // The stored token is expired or invalid, so clear it
        setToken(null);
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/api/auth/login", { email, password });
    setToken(data.access_token);
    const me = await api.get("/api/auth/me");
    setUser(me.data);
    return me.data;
  }, []);

  const register = useCallback(
    async (fullName, email, password) => {
      await api.post("/api/auth/register", {
        full_name: fullName,
        email,
        password,
      });
      // Registration does not return a token, so sign in straight after
      return login(email, password);
    },
    [login]
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, isAuthenticated: Boolean(user) }),
    [user, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return context;
}
