import type { EventSummary, Moment, Participation, PlaceSummary } from "@/types/experience";

export const mockEvent: EventSummary = {
  id: "event_dnj_curitiba_2026",
  name: "DNJ Curitiba 2026",
};

export const mockPlace: PlaceSummary = {
  id: "place_espaco_juventude",
  name: "Espaço Juventude",
};

export const mockParticipation: Participation = {
  id: "part_mock_001",
  event: mockEvent,
  activity: { id: "activity_roda_conversa", name: "Roda de conversa" },
  place: mockPlace,
  checkedInAt: "2026-10-18T17:32:00.000Z",
  cooldownEndsAt: "2026-10-18T17:47:00.000Z",
  status: "active",
  canShareMoment: true,
  checkInPoints: 20,
};

export const mockMoments: Moment[] = [
  {
    id: "moment_mock_pending",
    participationId: mockParticipation.id,
    imageUrl: "/mock/moments/dnj-feed-01.png",
    thumbnailUrl: "/mock/moments/dnj-feed-01.png",
    shareImageUrl: "/mock/moments/dnj-feed-01.png",
    placeName: mockPlace.name,
    authorName: "Mariana",
    capturedAt: "2026-10-18T17:35:00.000Z",
    moderationStatus: "pending",
    publicationStatus: "private",
    pointsAwarded: 30,
    likesCount: 8,
    likedByCurrentUser: false,
    comments: [{ id: "comment_mock_001", authorName: "Mariana", body: "Que momento lindo!", createdAt: "2026-10-18T17:40:00.000Z" }],
    groupId: "mock-group",
  },
  {
    id: "moment_mock_approved",
    participationId: "part_mock_002",
    imageUrl: "/mock/moments/dnj-feed-02.png",
    thumbnailUrl: "/mock/moments/dnj-feed-02.png",
    shareImageUrl: "/mock/moments/dnj-feed-02.png",
    placeName: "Palco principal",
    authorName: "Rafael",
    capturedAt: "2026-10-18T18:10:00.000Z",
    moderationStatus: "approved",
    publicationStatus: "public",
    pointsAwarded: 30,
    likesCount: 13,
    likedByCurrentUser: false,
    comments: [],
    groupId: "mock-group",
  },
];
