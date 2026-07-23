export type Screen = "login" | "verify" | "group" | "register" | "register-verify" | "home" | "game" | "queue" | "gallery" | "account";
export type GameTab = "overview" | "ranking";
export type RankingTab = "individual" | "grupos";
export type QueueType = "confession" | "spiritual" | null;
export type AnimDir = "right" | "left" | "up";
export type Theme = "light" | "dark";

export interface UserData {
  name: string;
  cpf: string;
  email: string;
  group: string;
  points: number;
  rankPosition: number;
}

export interface RegistrationData {
  name: string;
  email: string;
  mobilePhone: string;
  group: string;
}
