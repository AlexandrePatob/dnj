export type IsoDateTime = string;

export type ParticipationStatus = "active" | "completed" | "expired";
export type ModerationStatus = "pending" | "approved" | "rejected";
export type PublicationStatus = "private" | "public";
export type MomentScope = "feed" | "mine" | "group";

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
  newTotalPoints?: number;
}

export interface Moment {
  id: string;
  participationId: string;
  imageUrl: string;
  thumbnailUrl: string;
  shareImageUrl: string;
  placeName: string;
  authorName: string;
  capturedAt: IsoDateTime;
  moderationStatus: ModerationStatus;
  publicationStatus: PublicationStatus;
  pointsAwarded: number;
  moderationMessage?: string;
  likesCount: number;
  likedByCurrentUser: boolean;
  comments: GalleryComment[];
  groupId?: string;
}

export interface GalleryComment {
  id: string;
  authorName: string;
  body: string;
  createdAt: IsoDateTime;
}

export interface GalleryPage {
  items: Moment[];
  nextCursor: string | null;
}

export interface MomentScopePage extends GalleryPage {
  scope: MomentScope;
}

export type ExperienceErrorCode =
  | "UNAUTHENTICATED"
  | "QR_INVALID"
  | "QR_EXPIRED"
  | "QR_ALREADY_USED"
  | "QR_OTHER_EVENT"
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
