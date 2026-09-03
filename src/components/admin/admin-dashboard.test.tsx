import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminDashboard } from "./admin-dashboard";

vi.mock("@/lib/pastoral-queue/firebase", () => ({ pastoralFirestore: {} }));
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  onSnapshot: vi.fn((_query, onChange) => {
    onChange({
      docs: [
        { data: () => ({ type: "confession", status: "queued", participantName: "Ana", createdAt: "2026-10-18T10:00:00Z" }) },
        { data: () => ({ type: "confession", status: "called", participantName: "Bia", createdAt: "2026-10-18T09:00:00Z" }) },
        { data: () => ({ type: "spiritual", status: "queued", participantName: "Caio", createdAt: "2026-10-18T11:00:00Z" }) },
      ],
    });
    return () => undefined;
  }),
}));
vi.mock("@/lib/pastoral-queue/realtime-service", () => ({
  subscribeQueue: vi.fn((type, onChange) => {
    onChange(type === "confession"
      ? { queued: [{ participantName: "Ana", type: "confession", status: "queued", createdAt: "2026-10-18T10:00:00Z" }], calledEntries: [{ participantName: "Bia", type: "confession", status: "called", createdAt: "2026-10-18T09:00:00Z", calledAt: "2026-10-18T09:00:00Z" }, { participantName: "Davi", type: "confession", status: "called", createdAt: "2026-10-18T09:05:00Z", calledAt: "2026-10-18T09:05:00Z" }] }
      : { queued: [{ participantName: "Caio", type: "spiritual", status: "queued", createdAt: "2026-10-18T11:00:00Z" }], calledEntries: [] });
    return () => undefined;
  }),
}));
const queueConfig = vi.hoisted(() => ({
  getQueueConfig: vi.fn(),
  subscribeToQueueConfig: vi.fn((onChange) => { onChange({ isQueueOpen: true, pushEnabled: true, notificationDelay: 30, whatsAppEnabled: true, almostTherePosition: 10 }); return () => undefined; }),
  updateQueueConfig: vi.fn(async (patch) => ({ isQueueOpen: patch.isQueueOpen, pushEnabled: true, notificationDelay: 30, whatsAppEnabled: true, almostTherePosition: 10 })),
}));
vi.mock("@/lib/pastoral-queue/config-service", () => queueConfig);

const fetchMock = vi.fn();
const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
let persistedCheckpointQr: { runId: string; qrToken: string } | null;

beforeEach(() => {
  persistedCheckpointQr = null;
  fetchMock.mockReset();
  fetchMock.mockImplementation((input: string, init?: RequestInit) => {
    if (input === "/api/v2/admin/moments/moderation?queue=challenge&page=1" || input === "/api/v2/admin/moments/moderation?queue=general&page=1")
      return Promise.resolve(jsonResponse({ data: [{ momentId: "moment-1", imageUrl: "https://image.test/moment-1.jpg", capturedAt: "2026-10-18T17:35:00.000Z", participantName: "Alex", activity: { id: "activity-1", name: "Gincana" }, pointsAwarded: 30, photoStatus: "available", availableActions: ["approve", "deny_points", "delete_photo"] }] }));
    if (input === "/api/v2/admin/moments/moment-1/moderation")
      return Promise.resolve(jsonResponse({ ok: true }));
    if (input === "/api/v2/admin/notifications" && init?.method === "POST")
      return Promise.resolve(jsonResponse({ recipientCount: "3" }, 201));
    if (input === "/api/v2/admin/activities")
      return Promise.resolve(jsonResponse({ data: [
        { id: "activity-1", name: "Gincana", slug: "gincana", kind: "challenge", status: "draft", description: null, spaceId: null, startsAt: null, endsAt: null, checkInPoints: 10, momentPoints: 20, cooldownSeconds: 60, allowsMoment: true },
        { id: "checkpoint-1", name: "Ponto de presença", slug: "ponto-de-presenca", kind: "checkpoint", status: "active", description: null, spaceId: "space-1", startsAt: null, endsAt: null, checkInPoints: 15, momentPoints: 0, cooldownSeconds: 60, allowsMoment: false },
      ] }));
    if (input === "/api/v2/admin/activities/checkpoint-1/qr")
      return Promise.resolve(persistedCheckpointQr ? jsonResponse(persistedCheckpointQr) : new Response(null, { status: 204 }));
    if (input === "/api/v2/manager/runs" && init?.method === "POST")
      return Promise.resolve(jsonResponse({ id: "run-checkpoint" }, 201));
    if (input === "/api/v2/manager/runs/run-checkpoint/qr" && init?.method === "POST")
      return Promise.resolve(jsonResponse({ qrToken: "checkpoint-token" }, 201));
    if (input === "/api/v2/admin/spaces")
      return Promise.resolve(jsonResponse({ data: [{ id: "space-1", name: "Capela", slug: "capela", mapReference: null }] }));
    return Promise.resolve(jsonResponse({ data: [{ id: "staff-1", name: "Ana Gestora", email: "ana.gestora@example.com", role: "EVENT_MANAGER", onboardingComplete: true }] }));
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => vi.useRealTimers());

describe("AdminDashboard V2", () => {
  it("navigates through paginated admin results", async () => {
    fetchMock.mockImplementation((input: string) => {
      if (input === "/api/v2/admin/staff?role=EVENT_MANAGER&page=2")
        return Promise.resolve(jsonResponse({
          data: [{ id: "staff-2", name: "Bia Gestora", email: "bia.gestora@example.com", role: "EVENT_MANAGER", onboardingComplete: true }],
          pagination: { currentPage: "2", hasNextPage: false, limit: 20 },
        }));
      if (input === "/api/v2/admin/staff?role=EVENT_MANAGER")
        return Promise.resolve(jsonResponse({
          data: [{ id: "staff-1", name: "Ana Gestora", email: "ana.gestora@example.com", role: "EVENT_MANAGER", onboardingComplete: true }],
          pagination: { currentPage: "1", hasNextPage: true, limit: 20 },
        }));
      if (input === "/api/v2/admin/spaces?page=2")
        return Promise.resolve(jsonResponse({ data: [{ id: "space-2", name: "Pátio", slug: "patio", mapReference: null }], pagination: { currentPage: "2", hasNextPage: false, limit: 20 } }));
      if (input === "/api/v2/admin/spaces")
        return Promise.resolve(jsonResponse({ data: [{ id: "space-1", name: "Capela", slug: "capela", mapReference: null }], pagination: { currentPage: "1", hasNextPage: true, limit: 20 } }));
      if (input === "/api/v2/admin/activities?page=2")
        return Promise.resolve(jsonResponse({ data: [{ id: "activity-2", name: "Gincana 2", slug: "gincana-2", kind: "challenge", status: "draft", description: null, spaceId: null, startsAt: null, endsAt: null, checkInPoints: 0, momentPoints: 20, cooldownSeconds: 0, allowsMoment: true }], pagination: { currentPage: "2", hasNextPage: false, limit: 20 } }));
      if (input === "/api/v2/admin/activities")
        return Promise.resolve(jsonResponse({ data: [{ id: "activity-1", name: "Gincana", slug: "gincana", kind: "challenge", status: "draft", description: null, spaceId: null, startsAt: null, endsAt: null, checkInPoints: 0, momentPoints: 20, cooldownSeconds: 0, allowsMoment: true }], pagination: { currentPage: "1", hasNextPage: true, limit: 20 } }));
      if (input === "/api/v2/admin/moments/moderation?queue=challenge&page=2")
        return Promise.resolve(jsonResponse({ data: [{ momentId: "moment-2", imageUrl: "", capturedAt: "2026-10-18T17:35:00.000Z", participantName: "Beto", activity: null, pointsAwarded: 0, photoStatus: "unavailable", availableActions: ["approve"] }], pagination: { currentPage: "2", hasNextPage: false, limit: 20 } }));
      if (input === "/api/v2/admin/moments/moderation?queue=challenge&page=1")
        return Promise.resolve(jsonResponse({ data: [{ momentId: "moment-1", imageUrl: "", capturedAt: "2026-10-18T17:35:00.000Z", participantName: "Alex", activity: null, pointsAwarded: 0, photoStatus: "unavailable", availableActions: ["approve"] }], pagination: { currentPage: "1", hasNextPage: true, limit: 20 } }));
      if (input.includes("/managers"))
        return Promise.resolve(jsonResponse({ data: [], pagination: { currentPage: "1", hasNextPage: false, limit: 20 } }));
      return Promise.resolve(jsonResponse({ data: [] }));
    });

    render(<AdminDashboard session={{ email: "admin@dnj.test", name: "Admin DNJ" }} onExit={vi.fn()} />);
    expect(await screen.findByText("Ana Gestora")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Próxima página" }));

    expect(await screen.findByText("Bia Gestora")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/v2/admin/staff?role=EVENT_MANAGER&page=2", expect.anything());
    expect(screen.getByText("Página 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Página anterior" }));
    expect(await screen.findByText("Ana Gestora")).toBeInTheDocument();

    const navigation = within(screen.getByRole("navigation", { name: "Navegação administrativa" }));
    fireEvent.click(navigation.getByRole("button", { name: "Atividades" }));
    expect(await screen.findByText("Gincana")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Próxima página" }));
    expect(await screen.findByText("Gincana 2")).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/v2/admin/spaces?page=2", expect.anything());
      expect(fetchMock).toHaveBeenCalledWith("/api/v2/admin/staff?role=EVENT_MANAGER&page=2", expect.anything());
    });

    fireEvent.click(navigation.getByRole("button", { name: "Espaços" }));
    expect(await screen.findByText("Capela")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Próxima página" }));
    expect(await screen.findByText("Pátio")).toBeInTheDocument();

    fireEvent.click(navigation.getByRole("button", { name: "Moderação" }));
    expect(await screen.findByText("Alex")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Próxima página" }));
    expect(await screen.findByText("Beto")).toBeInTheDocument();
  });

  it("starts the teaser and releases the special-event QR automatically", async () => {
    let status: "draft" | "teaser" | "active" = "draft";
    fetchMock.mockImplementation((input: string, init?: RequestInit) => {
      if (input === "/api/v2/manager/special-events" && !init?.method)
        return Promise.resolve(jsonResponse({ events: [{ id: "special-1", title: "Desafio surpresa", points: 100, status, qrAvailableAt: "2026-09-03T15:00:00.000Z" }] }));
      if (input === "/api/v2/manager/special-events/teaser") {
        status = "teaser";
        return Promise.resolve(jsonResponse({ id: "special-1", status, qrAvailableAt: "2026-09-03T15:00:00.000Z" }));
      }
      if (input === "/api/v2/manager/special-events/qr") {
        status = "active";
        return Promise.resolve(jsonResponse({ qrToken: "special-token", expiresAt: "2026-09-03T15:05:00.000Z" }));
      }
      return Promise.resolve(jsonResponse({ data: [] }));
    });
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-03T15:00:00.000Z"));

    render(<AdminDashboard session={{ email: "admin@dnj.test", name: "Admin DNJ" }} onExit={vi.fn()} />);
    fireEvent.click(within(screen.getByRole("navigation", { name: "Navegação administrativa" })).getByRole("button", { name: "Abrir Eventos especiais" }));
    await act(async () => vi.advanceTimersByTimeAsync(0));
    fireEvent.click(screen.getByRole("button", { name: "Iniciar" }));
    await act(async () => vi.advanceTimersByTimeAsync(0));

    expect(screen.getByRole("status")).toHaveTextContent("Teaser em exibição");
    expect(screen.queryByRole("button", { name: "Liberar QR" })).not.toBeInTheDocument();
    await act(async () => vi.advanceTimersByTimeAsync(15_000));

    expect(fetchMock).toHaveBeenCalledWith("/api/v2/manager/special-events/qr", expect.objectContaining({ method: "POST", body: JSON.stringify({ eventId: "special-1" }) }));
    vi.useRealTimers();
    expect(await screen.findByRole("img", { name: "QR Code do evento Desafio surpresa" })).toBeInTheDocument();
  });

  it("renews and closes an active special event", async () => {
    fetchMock.mockImplementation((input: string, init?: RequestInit) => {
      if (input === "/api/v2/manager/special-events" && !init?.method)
        return Promise.resolve(jsonResponse({ events: [{ id: "special-1", title: "Desafio surpresa", status: "active" }] }));
      if (input === "/api/v2/manager/special-events/qr")
        return Promise.resolve(jsonResponse({ qrToken: "renewed-token" }));
      if (input === "/api/v2/manager/special-events/close")
        return Promise.resolve(jsonResponse({ ok: true }));
      return Promise.resolve(jsonResponse({ data: [] }));
    });

    render(<AdminDashboard session={{ email: "admin@dnj.test", name: "Admin DNJ" }} onExit={vi.fn()} />);
    fireEvent.click(within(screen.getByRole("navigation", { name: "Navegação administrativa" })).getByRole("button", { name: "Abrir Eventos especiais" }));
    expect(await screen.findByRole("button", { name: "Gerar novo QR" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Gerar novo QR" }));
    expect(await screen.findByRole("img", { name: "QR Code do evento Desafio surpresa" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Encerrar" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/v2/manager/special-events/qr", expect.objectContaining({ method: "POST" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/v2/manager/special-events/close", expect.objectContaining({ method: "POST", body: JSON.stringify({ eventId: "special-1" }) }));
  });

  it("loads the documented staff endpoint by default", async () => {
    render(<AdminDashboard session={{ email: "admin@dnj.test", name: "Admin DNJ" }} onExit={vi.fn()} />);
    expect(await screen.findByText("Ana Gestora")).toBeInTheDocument();
    expect(screen.getByText("ana.gestora@example.com")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/v2/admin/staff?role=EVENT_MANAGER", expect.anything());
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

  it("creates a run and requests its QR for a checkpoint activity", async () => {
    render(<AdminDashboard session={{ email: "admin@dnj.test", name: "Admin DNJ" }} onExit={vi.fn()} />);
    const navigation = within(screen.getByRole("navigation", { name: "Navegação administrativa" }));
    fireEvent.click(navigation.getByRole("button", { name: "Estáticos" }));
    expect(await screen.findByText("Ponto de presença")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Gerar QR Code" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v2/manager/runs", expect.objectContaining({ method: "POST", body: JSON.stringify({ gameId: "checkpoint-1" }) })));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v2/manager/runs/run-checkpoint/qr", expect.objectContaining({ method: "POST" })));
    expect(await screen.findByRole("img", { name: "QR Code de Ponto de presença" })).toBeInTheDocument();
  });

  it("restores a persisted checkpoint QR after reopening the admin", async () => {
    persistedCheckpointQr = { runId: "run-checkpoint", qrToken: "checkpoint-token" };
    render(<AdminDashboard session={{ email: "admin@dnj.test", name: "Admin DNJ" }} onExit={vi.fn()} />);
    fireEvent.click(within(screen.getByRole("navigation", { name: "Navegação administrativa" })).getByRole("button", { name: "Estáticos" }));

    expect(await screen.findByRole("img", { name: "QR Code de Ponto de presença" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/v2/admin/activities/checkpoint-1/qr", expect.anything());
    expect(screen.getByRole("button", { name: "Baixar PNG" })).toBeInTheDocument();
  });

  it("shows both pastoral queues as a read-only live overview", async () => {
    render(<AdminDashboard session={{ email: "admin@dnj.test", name: "Admin DNJ" }} onExit={vi.fn()} />);
    fireEvent.click(within(screen.getByRole("navigation", { name: "Navegação administrativa" })).getByRole("button", { name: "Filas pastorais" }));
    expect(await screen.findByRole("heading", { name: "Confissão" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Direção espiritual" })).toBeInTheDocument();
    expect(screen.getAllByText("1 aguardando")).toHaveLength(2);
    expect(screen.getByText("2 chamados para encaminhar.")).toBeInTheDocument();
    expect(screen.getByText("Bia")).toBeInTheDocument();
    expect(screen.getByText("Davi")).toBeInTheDocument();
    expect(screen.getByText("Encaminhar para Confissão · chamado às 06:00")).toBeInTheDocument();
    expect(screen.getByText(/Ana/)).toBeInTheDocument();
    expect(screen.getByText(/Caio/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /chamar|concluir|ausência/i })).not.toBeInTheDocument();
  });

  it("allows the admin to open or close the pastoral queues", async () => {
    render(<AdminDashboard session={{ email: "admin@dnj.test", name: "Admin DNJ" }} onExit={vi.fn()} />);
    fireEvent.click(within(screen.getByRole("navigation", { name: "Navegação administrativa" })).getByRole("button", { name: "Filas pastorais" }));
    await screen.findByRole("heading", { name: "Filas abertas" });
    fireEvent.click(screen.getByRole("button", { name: "Fechar filas" }));
    await waitFor(() => expect(queueConfig.updateQueueConfig).toHaveBeenCalledWith({ isQueueOpen: false }));
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
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Quadra São José" } });
    expect(screen.getByLabelText("Slug")).toHaveValue("quadra-sao-jose");
    fireEvent.click(screen.getByRole("button", { name: "Criar espaço" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/v2/admin/spaces", expect.objectContaining({ method: "POST", headers: expect.objectContaining({ "Idempotency-Key": expect.stringMatching(/^[0-9a-f-]{36}$/i) }), body: JSON.stringify({ name: "Quadra São José", slug: "quadra-sao-jose" }) }));

    fireEvent.click(navigation.getByRole("button", { name: "Atividades" }));
    await screen.findByText("Gincana");
    fireEvent.click(screen.getByRole("button", { name: "Nova atividade" }));
    expect(screen.getByRole("dialog", { name: "Nova atividade" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Desafio da Cobra" } });
    expect(screen.getByLabelText("Slug")).toHaveValue("desafio-da-cobra");
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Corrida" } });
    fireEvent.change(screen.getByLabelText("Slug"), { target: { value: "corrida" } });
    fireEvent.change(screen.getByLabelText("Descrição"), { target: { value: "Registre um momento no local." } });
    fireEvent.change(screen.getByLabelText("Pontos por momento"), { target: { value: "20" } });
    fireEvent.change(screen.getByLabelText("Início"), { target: { value: "2026-08-24T18:00" } });
    fireEvent.change(screen.getByLabelText("Duração (minutos)"), { target: { value: "60" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar atividade" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/v2/admin/activities", expect.objectContaining({ method: "POST", headers: expect.objectContaining({ "Idempotency-Key": expect.stringMatching(/^[0-9a-f-]{36}$/i) }), body: JSON.stringify({ name: "Corrida", slug: "corrida", description: "Registre um momento no local.", kind: "challenge", spaceId: null, checkInPoints: 0, momentPoints: 20, cooldownSeconds: 0, allowsMoment: true, startsAt: new Date("2026-08-24T18:00").toISOString(), endsAt: new Date("2026-08-24T19:00").toISOString() }) }));
  });

  it("disables moments when creating a schedule activity", async () => {
    render(<AdminDashboard session={{ email: "admin@dnj.test", name: "Admin DNJ" }} onExit={vi.fn()} />);
    const navigation = within(screen.getByRole("navigation", { name: "Navegação administrativa" }));
    fireEvent.click(navigation.getByRole("button", { name: "Programação" }));
    await screen.findByRole("heading", { name: "Programação", level: 2 });
    fireEvent.click(screen.getByRole("button", { name: "Nova" }));
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Agenda 3/09" } });
    fireEvent.change(screen.getByLabelText("Descrição"), { target: { value: "Agenda teste" } });
    fireEvent.change(screen.getByLabelText("Espaço"), { target: { value: "space-1" } });
    fireEvent.change(screen.getByLabelText("Início"), { target: { value: "2026-09-03T11:43" } });
    fireEvent.change(screen.getByLabelText("Fim / duração"), { target: { value: "2026-09-03T12:43" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar atividade" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/v2/admin/activities", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ name: "Agenda 3/09", slug: "agenda-3-09", description: "Agenda teste", kind: "schedule", spaceId: "space-1", checkInPoints: 10, momentPoints: 0, cooldownSeconds: 60, allowsMoment: false, startsAt: new Date("2026-09-03T11:43").toISOString(), endsAt: new Date("2026-09-03T12:43").toISOString() }),
    }));
  });

  it("activates, pauses, edits and archives an activity through its operation endpoint", async () => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    render(<AdminDashboard session={{ email: "admin@dnj.test", name: "Admin DNJ" }} onExit={vi.fn()} />);
    fireEvent.click(within(screen.getByRole("navigation", { name: "Navegação administrativa" })).getByRole("button", { name: "Atividades" }));
    await screen.findByText("Gincana");
    fireEvent.click(screen.getByRole("button", { name: "Ativar" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v2/admin/activities/activity-1", expect.objectContaining({ method: "PATCH", body: JSON.stringify({ status: "active" }) })));
    expect(await screen.findByRole("status")).toHaveTextContent("Atividade ativada.");
    fireEvent.click(screen.getByRole("button", { name: "Pausar" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v2/admin/activities/activity-1", expect.objectContaining({ method: "PATCH", body: JSON.stringify({ status: "paused" }) })));
    expect(await screen.findByRole("status")).toHaveTextContent("Atividade pausada.");
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    expect(screen.getByRole("dialog", { name: "Editar Gincana" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Fim (opcional)"), { target: { value: "2026-08-24T19:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v2/admin/activities/activity-1", expect.objectContaining({ method: "PATCH", body: expect.stringContaining('"endsAt":"2026-08-24T22:00:00.000Z"') })));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v2/admin/activities/activity-1", expect.objectContaining({ method: "PATCH", body: JSON.stringify({ status: "archived" }) })));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Atividade arquivada."));
    expect(screen.queryByText("Gincana")).not.toBeInTheDocument();
  });

  it("opens a full moderation view with the three decisions", async () => {
    render(<AdminDashboard session={{ email: "admin@dnj.test", name: "Admin DNJ" }} onExit={vi.fn()} />);
    fireEvent.click(within(screen.getByRole("navigation", { name: "Navegação administrativa" })).getByRole("button", { name: "Moderação" }));
    expect(await screen.findByText("Alex")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Foto enviada por Alex" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aceitar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retirar pontos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Excluir foto" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ampliar foto enviada por Alex" }));
    const dialog = screen.getByRole("dialog", { name: "Moderar foto de Alex" });
    expect(within(dialog).getByRole("img", { name: "Foto enviada por Alex" })).toHaveAttribute("src", "https://image.test/moment-1.jpg");
    expect(within(dialog).getByRole("button", { name: "Aceitar" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Excluir foto" })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Aceitar" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/v2/admin/moments/moment-1/moderation", expect.objectContaining({ method: "POST", body: JSON.stringify({ action: "approve" }) }));
    expect(within(dialog).getByRole("button", { name: "Retirar pontos" })).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("button", { name: "Enviar para inscritos" }));
    expect(await screen.findByText("Notificação enfileirada para 3 destinatário(s). Confirme o recebimento em um dispositivo inscrito.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/v2/admin/notifications", expect.objectContaining({ method: "POST", body: JSON.stringify({ title: "Aviso", body: "Chegue cedo" }) }));
  });
});
