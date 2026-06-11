import React, { createContext, useContext, useEffect, useState } from "react";

import { storage } from "@/src/utils/storage";
import { api } from "@/src/api";

type User = { email: string; name: string };

type AuthCtx = {
  token: string | null;
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
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

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    await persist(res.token, res.user);
  };

  const register = async (email: string, password: string, name: string) => {
    const res = await api.register(email, password, name);
    await persist(res.token, res.user);
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    await storage.secureRemove(TOKEN_KEY);
    await storage.removeItem(USER_KEY);
  };

  return (
    <Ctx.Provider value={{ token, user, ready, login, register, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
