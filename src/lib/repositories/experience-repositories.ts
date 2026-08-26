import type { GalleryComment, Moment, MomentScope, MomentScopePage, Participation } from "@/types/experience";

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
  list(input: { scope: MomentScope; cursor?: string; limit?: number; eventId: string; placeId?: string }): Promise<MomentScopePage>;
  toggleLike(momentId: string): Promise<Moment>;
  addComment(momentId: string, body: string): Promise<GalleryComment>;
}
