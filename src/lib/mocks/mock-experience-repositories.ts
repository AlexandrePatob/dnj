import type { GalleryRepository, MomentRepository, ParticipationRepository } from "@/lib/repositories/experience-repositories";
import { mockMoments, mockParticipation } from "./experience-fixtures";
import { mockError, resolveMockScenario, type MockScenario } from "./mock-scenario";

export interface MockExperienceOptions {
  scenario?: MockScenario;
  latencyMs?: number;
}

export function createMockExperienceRepositories(options: MockExperienceOptions = {}) {
  const scenario = options.scenario ?? "success";
  const latencyMs = options.latencyMs ?? 250;
  const moments = mockMoments.map((moment) => ({ ...moment }));
  const createdByKey = new Map<string, string>();

  const participation: ParticipationRepository = {
    async validateQr({ qrToken, idempotencyKey }) {
      if (!qrToken.trim()) throw mockError("QR_INVALID");
      if (qrToken === "expired") throw mockError("QR_EXPIRED");
      if (createdByKey.has(idempotencyKey)) return mockParticipation;
      createdByKey.set(idempotencyKey, mockParticipation.id);
      return resolveMockScenario(scenario, mockParticipation, latencyMs);
    },
    getCurrent: () => resolveMockScenario(scenario, mockParticipation, latencyMs),
  };

  const moment: MomentRepository = {
    async create(input) {
      if (!input.publishConsent) throw mockError("CONSENT_REQUIRED");
      if (input.participationId !== mockParticipation.id) throw mockError("PARTICIPATION_REQUIRED");
      const existingId = createdByKey.get(input.idempotencyKey);
      if (existingId) return moments.find((item) => item.id === existingId) ?? moments[0];
      const created = {
        ...moments[0],
        id: `moment_mock_${moments.length + 1}`,
        participationId: input.participationId,
        capturedAt: new Date().toISOString(),
      };
      moments.unshift(created);
      createdByKey.set(input.idempotencyKey, created.id);
      return resolveMockScenario(scenario, created, latencyMs);
    },
    async remove(momentId) {
      const index = moments.findIndex((item) => item.id === momentId && item.participationId === mockParticipation.id);
      if (index < 0) throw mockError("PARTICIPATION_REQUIRED");
      moments.splice(index, 1);
      await resolveMockScenario(scenario, undefined, latencyMs);
    },
  };

  const gallery: GalleryRepository = {
    async list({ cursor, limit = 20 }) {
      const approved = moments.filter((item) => item.moderationStatus === "approved" && item.publicationStatus === "public");
      const offset = cursor ? Number(cursor) : 0;
      const items = approved.slice(offset, offset + limit);
      return resolveMockScenario(scenario, { items, nextCursor: offset + items.length < approved.length ? String(offset + items.length) : null }, latencyMs);
    },
    async listMine({ cursor, limit = 20 }) {
      const mine = moments.filter((item) => item.participationId === mockParticipation.id);
      const offset = cursor ? Number(cursor) : 0;
      const items = mine.slice(offset, offset + limit);
      return resolveMockScenario(scenario, { items, nextCursor: offset + items.length < mine.length ? String(offset + items.length) : null }, latencyMs);
    },
  };

  return { participation, moment, gallery };
}
