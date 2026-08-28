// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { storage } from "@/lib/storage";
import type { AuthSession } from "@/types/domain";
import { AppShell, BottomNav } from "./layout/dnj-layout";
import { DnjApp } from "./dnj-app";

const session: AuthSession = {
  identityToken: "test-token",
  user: {
    id: "user-1",
    name: "Ana Souza",
    email: "ana@example.com",
    document: "12345678901",
    group: { id: "group-1", groupName: "Grupo Esperanca" },
    points: 230,
    rankPosition: 4,
  },
};

describe("DnjApp session restoration", () => {
  beforeEach(() => {
    localStorage.clear();
    class IntersectionObserverMock {
      disconnect = vi.fn();
      observe = vi.fn();
      takeRecords = vi.fn(() => []);
      unobserve = vi.fn();
    }
    vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({
        addEventListener: vi.fn(),
        matches: false,
        removeEventListener: vi.fn(),
      }),
    });
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = input instanceof Request ? input.url : String(input);
      const headers = new Headers({ "content-type": "application/json" });
      if (url.includes("/auth/session")) return { ok: true, headers, json: async () => ({ user: { id: "user-1", email: "ana@example.com", name: "Ana Souza", mobilePhone: "", documentMasked: "***", role: "DEFAULT", group: { id: "group-1", name: "Grupo Esperanca" }, onboardingComplete: true }, onboardingRequired: false }) } as Response;
      if (url.includes("/groups")) return { ok: true, headers, json: async () => [{ id: "group-1", groupName: "Grupo Chama Viva — Bairro Alto" }] } as Response;
      if (url.includes("/auth/register")) return { ok: true, headers, json: async () => ({ id: "user-maria", email: "maria@example.com", name: "Maria Lima", mobilePhone: "41999990000", document: "", role: "DEFAULT", group: { id: "group-1", groupName: "Grupo Chama Viva — Bairro Alto" }, points: 0, rankPosition: 0, createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z", identityToken: "session-maria" }) } as Response;
      if (url.includes("/schedule")) return { ok: true, headers, json: async () => ({ items: [], generatedAt: "2026-10-01T00:00:00.000Z" }) } as Response;
      return { ok: true, status: 204, headers, json: async () => null } as Response;
    }));
  });

  it("restores a complete persisted session directly into the authenticated home", async () => {
    storage.setSession(session);

    render(<DnjApp />);

    expect(await screen.findByText(/Ana!/)).toBeInTheDocument();
    expect(screen.getByText("Dia Nacional da Juventude")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Entrar" })).not.toBeInTheDocument();
  });

  it("uses the server onboarding state instead of persisted identity", async () => {
    storage.setSession({
      ...session,
      user: { ...session.user, group: null },
    });

    render(<DnjApp />);

    expect(await screen.findByText(/Ana!/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Entrar" })).not.toBeInTheDocument();
  });

  it("opens the map screen from the Home shortcut", async () => {
    const user = userEvent.setup();
    storage.setSession(session);

    render(<DnjApp />);

    await user.click(await screen.findByRole("button", { name: "Abrir" }));
    expect(await screen.findByRole("heading", { name: "Mapa do evento" })).toBeInTheDocument();
  });

  it("bootstraps identity from the V2 session endpoint", async () => {
    render(<DnjApp />);
    expect(await screen.findByText(/Ana!/)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/v2/auth/session", expect.anything());
    expect(localStorage.getItem("dnj.identity-token.v1")).toBeNull();
  });

  it("resumes incomplete onboarding from the V2 session instead of opening verification", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = input instanceof Request ? input.url : String(input);
      const headers = new Headers({ "content-type": "application/json" });
      if (url.includes("/auth/session")) return { ok: true, headers, json: async () => ({ user: { id: "user-1", email: "ana@example.com", name: "Ana Souza", mobilePhone: "", documentMasked: "", role: "DEFAULT", group: null, onboardingComplete: false }, onboardingRequired: true }) } as Response;
      if (url.includes("/groups")) return { ok: true, headers, json: async () => [] } as Response;
      return { ok: true, status: 204, headers, json: async () => null } as Response;
    }));

    render(<DnjApp />);

    expect(await screen.findByRole("heading", { name: "Seu grupo jovem" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Verificar código" })).not.toBeInTheDocument();
  });
});

describe("BottomNav", () => {
  it("uses the approved navigation order and moments label", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();

    render(<BottomNav active="home" onNavigate={onNavigate} />);

    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual([
      "Home",
      "Momentos",
      "DNJ Game",
      "Fila",
      "Conta",
    ]);

    await user.click(screen.getByRole("button", { name: "Momentos" }));
    expect(onNavigate).toHaveBeenCalledWith("gallery");
  });
});

describe("AppShell", () => {
  it("inherits the semantic foreground color in dark mode", () => {
    const { container } = render(<AppShell theme="dark"><p>Conteúdo</p></AppShell>);
    expect(container.firstElementChild).toHaveStyle({ color: "var(--foreground)" });
  });
});
