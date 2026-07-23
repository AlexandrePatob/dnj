export type IsoDateTime = string;

export type ParticipationStatus = "active" | "completed" | "expired";
export type ModerationStatus = "pending" | "approved" | "rejected";
export type PublicationStatus = "private" | "public";

export interface EventSummary {
  id: string;
  name: string;
}

export interface ActivitySummary {
  id: string;
  name: string;
}

export interface PlaceSummary {
  id: string;
  name: string;
}

export interface Participation {
  id: string;
  event: EventSummary;
  activity: ActivitySummary;
  place: PlaceSummary;
  checkedInAt: IsoDateTime;
  cooldownEndsAt: IsoDateTime;
  status: ParticipationStatus;
  canShareMoment: boolean;
  checkInPoints: number;
}

export interface Moment {
  id: string;
  participationId: string;
  imageUrl: string;
  thumbnailUrl: string;
  shareImageUrl: string;
  placeName: string;
  capturedAt: IsoDateTime;
  moderationStatus: ModerationStatus;
  publicationStatus: PublicationStatus;
  pointsAwarded: number;
}

export interface GalleryPage {
  items: Moment[];
  nextCursor: string | null;
}

export type ExperienceErrorCode =
  | "UNAUTHENTICATED"
  | "QR_INVALID"
  | "QR_EXPIRED"
  | "QR_ALREADY_USED"
  | "COOLDOWN_ACTIVE"
  | "PARTICIPATION_REQUIRED"
  | "MOMENT_ALREADY_CREATED"
  | "IMAGE_INVALID"
  | "IMAGE_TOO_LARGE"
  | "CONSENT_REQUIRED"
  | "RATE_LIMITED"
  | "OFFLINE"
  | "TIMEOUT";

export interface ExperienceError {
  code: ExperienceErrorCode;
  message: string;
  details?: Record<string, unknown>;
}
