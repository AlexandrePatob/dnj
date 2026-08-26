import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminDashboard } from "./admin-dashboard";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation((input: string) => {
    if (input === "/admin/moderation?queue=challenge") return Promise.resolve(new Response(JSON.stringify({ moments: [{ id: "moment-1", captured_at: "2026-10-18T17:35:00.000Z", points_awarded: 30, moderation_status: "approved", reward_status: "awarded", photo_status: "available", imageUrl: "/api/v2/media/private/moment-1.jpg", participation: { participantName: "Alex", experienceName: "Foto com a galera", isChallenge: true } }] })));
    return Promise.resolve(new Response(JSON.stringify({ activeUsers: 1, pendingModeration: 1, pendingChallengeModeration: 0, activeManagers: 1, liveSpecialEvents: 0, openExperiences: 1, interactionsToday: 1, activity: [] })));
  });
  vi.stubGlobal("fetch", fetchMock);
});

describe("AdminDashboard moderation", () => {
  it("shows the challenge photo and only corrective decisions", async () => {
    render(<AdminDashboard session={{ email: "admin@dnj.test", name: "Admin DNJ" }} onExit={vi.fn()} />);
    fireEvent.click(within(screen.getByRole("navigation", { name: "Navegação administrativa" })).getByRole("button", { name: "Moderação de desafio" }));
    expect(await screen.findByRole("heading", { name: "Desafios de Momento" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Foto de Alex" })).toHaveAttribute("src", "/api/v2/media/private/moment-1.jpg");
    expect(screen.getByRole("link", { name: "Abrir foto de Alex em tamanho maior" })).toHaveAttribute("href", "/api/v2/media/private/moment-1.jpg");
    expect(screen.queryByRole("button", { name: "Aprovar" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retirar pontos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Excluir foto" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
