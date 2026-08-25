import type { AuthSession, Theme } from "@/types/domain";
const themeKey = "dnj.theme.v1";
let sessionPresentation: AuthSession | null = null;
function read<T>(key: string): T | null { if (typeof window === "undefined") return null; try { const value = window.localStorage.getItem(key); return value ? JSON.parse(value) as T : null; } catch { return null; } }
export const storage = {
  getSession: () => sessionPresentation,
  setSession: (session: AuthSession) => { sessionPresentation = session; if (typeof window !== "undefined") { window.localStorage.removeItem("dnj.identity-token.v1"); window.localStorage.removeItem("dnj.user.v1"); } },
  clearSession: () => { sessionPresentation = null; if (typeof window !== "undefined") { window.localStorage.removeItem("dnj.identity-token.v1"); window.localStorage.removeItem("dnj.user.v1"); } },
  getTheme: () => read<Theme>(themeKey),
  setTheme: (theme: Theme) => window.localStorage.setItem(themeKey, JSON.stringify(theme)),
};
