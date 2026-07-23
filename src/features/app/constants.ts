import type { Screen } from "./types";

export const AUTH_ORDER: Screen[] = ["login", "register", "register-verify", "verify", "group"];

export const TOP3_BG: Record<number, string> = {
  1: "var(--primary-alpha-15)",
  2: "var(--teal-alpha-15)",
  3: "var(--accent-alpha-10)",
};

export const TOP3_MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
