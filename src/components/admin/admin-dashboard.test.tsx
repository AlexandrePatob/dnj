import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminDashboard } from "./admin-dashboard";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation((input: string, init?: RequestInit) => {
    if (input === "/api/v2/admin/moments/moderation?queue=challenge&page=1" || input === "/api/v2/admin/moments/moderation?queue=general&page=1")
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

  it("keeps session logout outside the V2 proxy and hides unsupported panels", async () => {
    const onExit = vi.fn();
    render(<AdminDashboard session={{ email: "admin@dnj.test", name: "Admin DNJ" }} onExit={onExit} />);
    expect(screen.queryByRole("button", { name: "Visão geral" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Eventos especiais" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Participantes" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sair" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/session", { method: "DELETE", credentials: "include" });
    await waitFor(() => expect(onExit).toHaveBeenCalledOnce());
  });

  it("creates spaces and activities with documented V2 payloads", async () => {
    render(<AdminDashboard session={{ email: "admin@dnj.test", name: "Admin DNJ" }} onExit={vi.fn()} />);
    const navigation = within(screen.getByRole("navigation", { name: "Navegação administrativa" }));
    fireEvent.click(navigation.getByRole("button", { name: "Espaços" }));
    await screen.findByText("Capela");
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Quadra" } });
    fireEvent.change(screen.getByLabelText("Slug"), { target: { value: "quadra" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar espaço" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/v2/admin/spaces", expect.objectContaining({ method: "POST", body: JSON.stringify({ name: "Quadra", slug: "quadra" }) }));

    fireEvent.click(navigation.getByRole("button", { name: "Atividades" }));
    await screen.findByText("Gincana");
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Corrida" } });
    fireEvent.change(screen.getByLabelText("Slug"), { target: { value: "corrida" } });
    fireEvent.change(screen.getByLabelText("Início"), { target: { value: "2026-08-24T18:00" } });
    fireEvent.change(screen.getByLabelText("Duração"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar atividade" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/v2/admin/activities", expect.objectContaining({ method: "POST", headers: expect.objectContaining({ "Idempotency-Key": expect.stringMatching(/^[0-9a-f-]{36}$/i) }), body: JSON.stringify({ name: "Corrida", slug: "corrida", kind: "challenge", checkInPoints: 0, momentPoints: 0, cooldownSeconds: 0, allowsMoment: true, startsAt: new Date("2026-08-24T18:00").toISOString(), endsAt: new Date(new Date("2026-08-24T18:00").getTime() + 5 * 60_000).toISOString() }) }));
  });

  it("uses the documented moderation action endpoint", async () => {
    render(<AdminDashboard session={{ email: "admin@dnj.test", name: "Admin DNJ" }} onExit={vi.fn()} />);
    fireEvent.click(within(screen.getByRole("navigation", { name: "Navegação administrativa" })).getByRole("button", { name: "Moderação" }));
    expect(await screen.findByText("Alex")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retirar pontos" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/v2/admin/moments/moment-1/moderation", expect.objectContaining({ method: "POST", body: JSON.stringify({ action: "deny_points" }) }));
  });

  it("sends the required moderation queue and reloads it when changed", async () => {
    render(<AdminDashboard session={{ email: "admin@dnj.test", name: "Admin DNJ" }} onExit={vi.fn()} />);
    fireEvent.click(within(screen.getByRole("navigation", { name: "Navegação administrativa" })).getByRole("button", { name: "Moderação" }));
    await screen.findByText("Alex");
    expect(fetchMock).toHaveBeenCalledWith("/api/v2/admin/moments/moderation?queue=challenge&page=1", expect.anything());
    fireEvent.change(screen.getByLabelText("Fila"), { target: { value: "general" } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v2/admin/moments/moderation?queue=general&page=1", expect.anything()));
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
