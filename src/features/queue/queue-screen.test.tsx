import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { QueueScreen } from "./queue-screen";

describe("QueueScreen", () => {
  it("identifies the tracked position as demonstrative and confirms before leaving", async () => {
    const user = userEvent.setup();
    render(<QueueScreen animDir="up" />);
    await user.click(screen.getByRole("button", { name: "Entrar na fila de Confissão" }));
    await user.click(screen.getByRole("button", { name: "Acompanhar minha posição" }));
    expect(screen.getByText("Posição demonstrativa. Atualizado agora.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sair da fila" }));
    expect(screen.getByRole("dialog", { name: "Confirmar saída da fila" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Confissão" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirmar saída" }));
    expect(screen.getByRole("heading", { name: "Fila do Espaço Esperança" })).toBeInTheDocument();
  });
});
