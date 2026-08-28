import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

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
      return login(email, password);
    },
    [login]
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (fullName) => {
    const { data } = await api.patch("/api/auth/me", { full_name: fullName });
    setUser(data);
    return data;
  }, []);

  const deleteAccount = useCallback(async () => {
    const { data } = await api.delete("/api/auth/me");
    setToken(null);
    setUser(null);
    return data;
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      updateProfile,
      deleteAccount,
      isAuthenticated: Boolean(user),
    }),
    [user, loading, login, register, logout, updateProfile, deleteAccount]
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
