import type { AuthSession, Theme } from "@/types/domain";
const themeKey = "dnj.theme.v1";
const avatarKey = (userId: string) => `dnj.avatar.v1.${encodeURIComponent(userId)}`;
let sessionPresentation: AuthSession | null = null;
function read<T>(key: string): T | null { if (typeof window === "undefined") return null; try { const value = window.localStorage.getItem(key); return value ? JSON.parse(value) as T : null; } catch { return null; } }
export const storage = {
  getSession: () => sessionPresentation,
  setSession: (session: AuthSession) => { sessionPresentation = session; if (typeof window !== "undefined") { window.localStorage.removeItem("dnj.identity-token.v1"); window.localStorage.removeItem("dnj.user.v1"); } },
  clearSession: () => { sessionPresentation = null; if (typeof window !== "undefined") { window.localStorage.removeItem("dnj.identity-token.v1"); window.localStorage.removeItem("dnj.user.v1"); } },
  getTheme: () => read<Theme>(themeKey),
  setTheme: (theme: Theme) => window.localStorage.setItem(themeKey, JSON.stringify(theme)),
  getAvatar: (userId?: string) => {
    const avatar = userId ? read<unknown>(avatarKey(userId)) : null;
    return typeof avatar === "string" ? avatar : null;
  },
  setAvatar: (userId: string, url: string) => {
    if (typeof window === "undefined") return;
    try { window.localStorage.setItem(avatarKey(userId), JSON.stringify(url)); } catch { /* Photo still remains visible for this session. */ }
  },
};
