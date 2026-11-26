import type { GitEndpoint } from "@/components/SettingsPanel";

// The shared test accounts the dev tools sign in with, per 10MS environment.
// Local TenTen runs against stage auth.
const LOGINS = {
  prod: {
    url: "https://api.10minuteschool.com/auth/v1/login",
    credentials: { username: "+8801521326202", loginType: "phone", password: "123456" },
  },
  stage: {
    url: "https://local-api.10minuteschool.net/auth/v1/login",
    credentials: { username: "admin@10ms.com", loginType: "email", password: "#11111111" },
  },
} as const;

interface LoginResponse {
  data?: { token?: { access_token?: string } };
}

/** Sign in with the shared test account of this environment and return its access token. */
export async function fetchTenTenToken(endpoint: GitEndpoint): Promise<string> {
  const login = endpoint === "prod" ? LOGINS.prod : LOGINS.stage;
  const response = await fetch(login.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json, text/plain, */*",
    },
    body: JSON.stringify(login.credentials),
  });
  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}`);
  }
  const data = (await response.json()) as LoginResponse;
  const token = data?.data?.token?.access_token;
  if (!token) {
    throw new Error("No access token found in response");
  }
  return token;
}

/** When a 10MS access token expires, in milliseconds since the epoch; null when it cannot be read. */
export function tokenExpiresAt(token: string): number | null {
  try {
    const part = token.replace(/^Bearer\s+/i, "").split(".")[1];
    if (!part) return null;
    const json = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.exp === "number" ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}
