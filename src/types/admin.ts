export interface AdminSession {
  email: string;
  name: string;
}

export type AdminPanel =
  | "Gestores"
  | "Atividades"
  | "Espaços"
  | "Moderação"
  | "Notificações";

export interface AdminMoment {
  id: string;
  captured_at: string;
  points_awarded: number;
  moderation_status: "pending" | "approved" | "rejected";
  reward_status: "pending" | "awarded" | "denied";
  photo_status: "available" | "deleted";
  imageUrl?: string;
  participation?: { participantName: string; experienceName: string; isChallenge: boolean };
}
