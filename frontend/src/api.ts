const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

type Opts = { method?: string; body?: any; token?: string | null };

async function req(path: string, { method = "GET", body, token }: Opts = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data: any = {};
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) {
    throw { status: res.status, detail: data?.detail || "Request failed" };
  }
  return data;
}

export const api = {
  login: (code: string, pin: string) =>
    req("/auth/login", { method: "POST", body: { code, pin } }),
  config: (token: string) => req("/config", { token }),
  createAuction: (token: string) => req("/auctions", { method: "POST", token }),
  getAuction: (sid: string, token: string) => req(`/auctions/${sid}`, { token }),
  bid: (sid: string, teamId: number, amount: number, token: string) =>
    req(`/auctions/${sid}/bid`, { method: "POST", token, body: { teamId, amount } }),
  finalize: (sid: string, token: string) =>
    req(`/auctions/${sid}/finalize`, { method: "POST", token }),
  skip: (sid: string, token: string) =>
    req(`/auctions/${sid}/skip`, { method: "POST", token }),
  reset: (sid: string, token: string) =>
    req(`/auctions/${sid}/reset`, { method: "POST", token }),
};
