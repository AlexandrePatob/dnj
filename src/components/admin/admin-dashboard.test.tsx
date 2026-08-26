import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminDashboard } from "./admin-dashboard";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation((input: string, init?: RequestInit) => {
    if (input === "/api/v2/admin/moments/moderation")
      return Promise.resolve(new Response(JSON.stringify({ data: [{ momentId: "moment-1", imageUrl: "https://image.test/moment-1.jpg", capturedAt: "2026-10-18T17:35:00.000Z", participantName: "Alex", activity: { id: "activity-1", name: "Gincana" }, pointsAwarded: 30, photoStatus: "available", availableActions: ["deny_points"] }] })));
    if (input === "/api/v2/admin/moments/moment-1/moderation")
      return Promise.resolve(new Response(JSON.stringify({ ok: true })));
    if (input === "/api/v2/admin/notifications" && init?.method === "POST")
      return Promise.resolve(new Response(JSON.stringify({ recipientCount: "3" }), { status: 201 }));
    if (input === "/api/v2/admin/activities")
      return Promise.resolve(new Response(JSON.stringify({ data: [{ id: "activity-1", name: "Gincana", slug: "gincana", kind: "challenge", status: "draft", description: null, spaceId: null, startsAt: null, endsAt: null, checkInPoints: 10, momentPoints: 20, cooldownSeconds: 60, allowsMoment: true }] })));
    if (input === "/api/v2/admin/spaces")
      return Promise.resolve(new Response(JSON.stringify({ data: [{ id: "space-1", name: "Capela", slug: "capela", mapReference: null }] })));
    return Promise.resolve(new Response(JSON.stringify({ data: [{ id: "staff-1", name: "Ana Gestora", role: "EVENT_MANAGER", onboardingComplete: true }] })));
  });
  vi.stubGlobal("fetch", fetchMock);
});

describe("AdminDashboard V2", () => {
  it("loads the documented staff endpoint by default", async () => {
    render(<AdminDashboard session={{ email: "admin@dnj.test", name: "Admin DNJ" }} onExit={vi.fn()} />);
    expect(await screen.findByText("Ana Gestora")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/v2/admin/staff", expect.anything());
  });

  it("loads documented activities and spaces from the navigation", async () => {
    render(<AdminDashboard session={{ email: "admin@dnj.test", name: "Admin DNJ" }} onExit={vi.fn()} />);
    const navigation = within(screen.getByRole("navigation", { name: "Navegação administrativa" }));
    fireEvent.click(navigation.getByRole("button", { name: "Atividades" }));
    expect(await screen.findByText("Gincana")).toBeInTheDocument();
    fireEvent.click(navigation.getByRole("button", { name: "Espaços" }));
    expect(await screen.findByText("Capela")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/v2/admin/activities", expect.anything());
    expect(fetchMock).toHaveBeenCalledWith("/api/v2/admin/spaces", expect.anything());
  });

  it("uses the documented moderation action endpoint", async () => {
    render(<AdminDashboard session={{ email: "admin@dnj.test", name: "Admin DNJ" }} onExit={vi.fn()} />);
    fireEvent.click(within(screen.getByRole("navigation", { name: "Navegação administrativa" })).getByRole("button", { name: "Moderação" }));
    expect(await screen.findByText("Alex")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retirar pontos" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/v2/admin/moments/moment-1/moderation", expect.objectContaining({ method: "POST", body: JSON.stringify({ action: "deny_points" }) }));
  });

  it("sends notifications with the documented payload", async () => {
    render(<AdminDashboard session={{ email: "admin@dnj.test", name: "Admin DNJ" }} onExit={vi.fn()} />);
    fireEvent.click(within(screen.getByRole("navigation", { name: "Navegação administrativa" })).getByRole("button", { name: "Notificações" }));
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Aviso" } });
    fireEvent.change(screen.getByLabelText("Mensagem"), { target: { value: "Chegue cedo" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(await screen.findByText("Comunicado enviado para 3 destinatário(s).")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/v2/admin/notifications", expect.objectContaining({ method: "POST", body: JSON.stringify({ title: "Aviso", body: "Chegue cedo" }) }));
  });
});
