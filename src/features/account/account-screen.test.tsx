import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AccountScreen } from "./account-screen";

vi.mock("@/lib/api/moments", () => ({
  momentsApi: { list: vi.fn().mockResolvedValue({ items: [{ id: "mine-1" }], nextCursor: null }) },
}));
vi.mock("@/lib/api/game", () => ({
  gameApi: { overview: vi.fn().mockResolvedValue({ current: { rankPosition: 7 } }) },
}));

const user = { name: "Ana", cpf: "", email: "ana@example.com", group: "Chama Viva", points: 10, rankPosition: 1 };

describe("AccountScreen", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [] }) }));
  });

  it("exposes the selected light theme as accessible text", () => {
    render(<AccountScreen user={user} onAvatarChange={vi.fn()} onLogout={vi.fn()} theme="light" onToggleTheme={vi.fn()} animDir="up" />);

    expect(screen.getByText("Tema atual: modo claro")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tema atual: modo claro/ })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByLabelText("Alterar foto de perfil")).toHaveAttribute("accept", "image/jpeg,image/png,image/webp");
    expect(screen.getByText("Momentos")).toBeInTheDocument();
    expect(screen.queryByText("Sua jornada continua")).not.toBeInTheDocument();
  });

  it("announces the selected dark theme and keeps its control actionable", async () => {
    const onToggleTheme = vi.fn();
    const interaction = userEvent.setup();
    render(<AccountScreen user={user} onAvatarChange={vi.fn()} onLogout={vi.fn()} theme="dark" onToggleTheme={onToggleTheme} animDir="up" />);

    expect(screen.getByText("Tema atual: modo escuro")).toBeInTheDocument();
    const control = screen.getByRole("button", { name: /Tema atual: modo escuro/ });
    expect(control).toHaveAttribute("aria-pressed", "true");
    await interaction.click(control);
    expect(onToggleTheme).toHaveBeenCalledOnce();
  });

  it("uses the shared DNJ level rules instead of a fixed account level", () => {
    render(<AccountScreen user={{ ...user, points: 350 }} onAvatarChange={vi.fn()} onLogout={vi.fn()} theme="light" onToggleTheme={vi.fn()} animDir="up" />);

    expect(screen.getByText("Nível Missionário")).toBeInTheDocument();
    expect(screen.getByText("200 pts para próximo")).toBeInTheDocument();
    expect(screen.getByText("350/550 pontos")).toBeInTheDocument();
    expect(screen.queryByText(/Nível Peregrino/)).not.toBeInTheDocument();
  });

  it("loads the ranking position from the same game overview used by DNJ Game", async () => {
    render(<AccountScreen user={{ ...user, rankPosition: 0 }} onAvatarChange={vi.fn()} onLogout={vi.fn()} theme="light" onToggleTheme={vi.fn()} animDir="up" />);

    expect(await screen.findByText("#7")).toBeInTheDocument();
  });
});
