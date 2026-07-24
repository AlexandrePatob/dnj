import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AccountScreen } from "./account-screen";

const user = { name: "Ana", cpf: "", email: "ana@example.com", group: "Chama Viva", points: 10, rankPosition: 1 };

describe("AccountScreen", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [] }) }));
  });

  it("exposes the selected light theme as accessible text", () => {
    render(<AccountScreen user={user} onLogout={vi.fn()} theme="light" onToggleTheme={vi.fn()} animDir="up" />);

    expect(screen.getByText("Tema atual: modo claro")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tema atual: modo claro/ })).toHaveAttribute("aria-pressed", "false");
  });

  it("announces the selected dark theme and keeps its control actionable", async () => {
    const onToggleTheme = vi.fn();
    const interaction = userEvent.setup();
    render(<AccountScreen user={user} onLogout={vi.fn()} theme="dark" onToggleTheme={onToggleTheme} animDir="up" />);

    expect(screen.getByText("Tema atual: modo escuro")).toBeInTheDocument();
    const control = screen.getByRole("button", { name: /Tema atual: modo escuro/ });
    expect(control).toHaveAttribute("aria-pressed", "true");
    await interaction.click(control);
    expect(onToggleTheme).toHaveBeenCalledOnce();
  });
});
