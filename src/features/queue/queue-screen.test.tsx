import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { QueueScreen } from "./queue-screen";

describe("QueueScreen", () => {
  it("reports a recoverable error when Firestore is not configured", async () => {
    const user = userEvent.setup();
    render(<QueueScreen animDir="up" />);
    await user.click(screen.getByRole("button", { name: "Preparar para Confissão" }));
    await user.click(screen.getByRole("checkbox", { name: "Li a preparação e quero entrar nesta fila." }));
    await user.click(screen.getByRole("button", { name: "Entrar na fila de Confissão" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Fila indisponível");
  });

  it("uses distinct preparation gates for confession and spiritual direction", async () => {
    const user = userEvent.setup();
    render(<QueueScreen animDir="up" />);

    await user.click(screen.getByRole("button", { name: "Preparar para Confissão" }));
    expect(screen.getByText("Faça seu exame de consciência, recordando os pecados desde a última confissão.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entrar na fila de Confissão" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /Voltar às filas/ }));
    await user.click(screen.getByRole("button", { name: "Preparar para Direção Espiritual" }));
    expect(screen.getByText("Direção espiritual não substitui a Confissão. Se perceber que precisa se confessar, procure a fila de Confissão.")).toBeInTheDocument();
  });
});
