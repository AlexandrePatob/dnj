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
    capturedAt: "2026-10-18T17:35:00.000Z",
    moderationStatus: "pending",
    publicationStatus: "private",
    pointsAwarded: 30,
  },
  {
    id: "moment_mock_approved",
    participationId: "part_mock_002",
    imageUrl: "/mock/moments/dnj-feed-02.png",
    thumbnailUrl: "/mock/moments/dnj-feed-02.png",
    shareImageUrl: "/mock/moments/dnj-feed-02.png",
    placeName: "Palco principal",
    capturedAt: "2026-10-18T18:10:00.000Z",
    moderationStatus: "approved",
    publicationStatus: "public",
    pointsAwarded: 30,
  },
];
