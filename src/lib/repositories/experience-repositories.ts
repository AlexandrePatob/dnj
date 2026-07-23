import type { GalleryPage, Moment, Participation } from "@/types/experience";

export interface ParticipationRepository {
  validateQr(input: { qrToken: string; idempotencyKey: string }): Promise<Participation>;
  getCurrent(): Promise<Participation | null>;
}

export interface MomentRepository {
  create(input: {
    participationId: string;
    image: Blob;
    publishConsent: boolean;
    idempotencyKey: string;
  }): Promise<Moment>;
  remove(momentId: string): Promise<void>;
}

export interface GalleryRepository {
  list(input: { cursor?: string; limit?: number; eventId: string; placeId?: string }): Promise<GalleryPage>;
  listMine(input: { cursor?: string; limit?: number }): Promise<GalleryPage>;
}
