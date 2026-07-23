// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { storage } from "@/lib/storage";
import type { AuthSession } from "@/types/domain";
import { BottomNav } from "./layout/dnj-layout";
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
  });

  it("restores a complete persisted session directly into the authenticated home", async () => {
    storage.setSession(session);

    render(<DnjApp />);

    expect(await screen.findByText(/Ana!/)).toBeInTheDocument();
    expect(screen.getByText("Dia Nacional da Juventude")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Entrar" })).not.toBeInTheDocument();
  });

  it("returns an incomplete persisted session to group selection", async () => {
    storage.setSession({
      ...session,
      user: { ...session.user, group: null },
    });

    render(<DnjApp />);

    expect(await screen.findByRole("heading", { name: "Seu grupo jovem" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Entrar" })).not.toBeInTheDocument();
  });

  it("persists a newly created mock account across an app remount", async () => {
    const user = userEvent.setup();
    const view = render(<DnjApp />);

    await user.click(await screen.findByRole("button", { name: "Crie uma conta" }));
    await screen.findByRole("heading", { name: "Criar conta" });
    await user.type(screen.getByPlaceholderText("Seu nome"), "Maria Lima");
    await user.type(screen.getByPlaceholderText("seu@email.com"), "maria@example.com");
    await user.type(screen.getByPlaceholderText("(41) 99999-0000"), "41999990000");
    await user.click(screen.getByRole("button", { name: /Grupo Chama Viva/ }));
    await user.click(screen.getByRole("button", { name: "Criar conta" }));

    await screen.findByRole("heading", { name: "Verifique seu e-mail" });
    for (const [index, input] of screen.getAllByRole("textbox").entries()) {
      await user.type(input, String(index + 1));
    }
    await user.click(screen.getByRole("button", { name: "Verificar código" }));

    expect(await screen.findByText(/Maria!/)).toBeInTheDocument();
    expect(storage.getSession()?.user.email).toBe("maria@example.com");

    view.unmount();
    render(<DnjApp />);
    expect(await screen.findByText(/Maria!/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Entrar" })).not.toBeInTheDocument();
  }, 15_000);
});

describe("BottomNav", () => {
  it("uses the approved navigation order and gallery label", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();

    render(<BottomNav active="home" onNavigate={onNavigate} />);

    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual([
      "Home",
      "Galeria DNJ",
      "DNJ Game",
      "Fila",
      "Conta",
    ]);

    await user.click(screen.getByRole("button", { name: "Galeria DNJ" }));
    expect(onNavigate).toHaveBeenCalledWith("gallery");
  });
});
