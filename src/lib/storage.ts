import type { AuthSession, Theme } from "@/types/domain";

const keys = {
  user: "dnj.user.v1",
  token: "dnj.identity-token.v1",
  theme: "dnj.theme.v1",
} as const;

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

export const storage = {
  getSession: (): AuthSession | null => {
    const user = read<AuthSession["user"]>(keys.user);
    const identityToken = read<string>(keys.token);
    return user && identityToken ? { user, identityToken } : null;
  },
  setSession: (session: AuthSession) => {
    window.localStorage.setItem(keys.user, JSON.stringify(session.user));
    window.localStorage.setItem(keys.token, JSON.stringify(session.identityToken));
  },
  clearSession: () => {
    window.localStorage.removeItem(keys.user);
    window.localStorage.removeItem(keys.token);
  },
  getTheme: () => read<Theme>(keys.theme),
  setTheme: (theme: Theme) => window.localStorage.setItem(keys.theme, JSON.stringify(theme)),
};
