import React, { createContext, useContext, useEffect, useState } from "react";

import { storage } from "@/src/utils/storage";
import { api } from "@/src/api";

type User = { code: string; role: "admin" | "captain"; teamId: number | null; name: string };

type AuthCtx = {
  token: string | null;
  user: User | null;
  ready: boolean;
  login: (code: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const t = await storage.secureGet<string>(TOKEN_KEY, "");
      const u = await storage.getItem<User | null>(USER_KEY, null);
      if (t) setToken(t);
      if (u) setUser(u as User);
      setReady(true);
    })();
  }, []);

  const persist = async (t: string, u: User) => {
    setToken(t);
    setUser(u);
    await storage.secureSet(TOKEN_KEY, t);
    await storage.setItem(USER_KEY, u);
  };

  const login = async (code: string, pin: string) => {
    const res = await api.login(code, pin);
    await persist(res.token, res.user);
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    await storage.secureRemove(TOKEN_KEY);
    await storage.removeItem(USER_KEY);
  };

  return (
    <Ctx.Provider value={{ token, user, ready, login, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
