import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OperationFeedback } from "./operation-feedback";

describe("OperationFeedback", () => {
  it("announces a retryable loading error and retries it", () => {
    const onRetry = vi.fn();
    render(<OperationFeedback variant="error" title="Não foi possível carregar" description="Confira sua conexão e tente novamente." onRetry={onRetry} />);

    expect(screen.getByText("Não foi possível carregar")).toBeInTheDocument();
    expect(screen.getByText("Confira sua conexão e tente novamente.")).toBeInTheDocument();
    expect(screen.getByText("Não foi possível carregar").closest("section")).toHaveAttribute("aria-live", "assertive");
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("distinguishes an empty collection from a loading error", () => {
    render(<OperationFeedback variant="empty" title="Ainda não há momentos" description="Volte mais tarde para ver novos registros." />);

    expect(screen.getByText("Ainda não há momentos")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tentar novamente" })).not.toBeInTheDocument();
    expect(screen.getByText("Ainda não há momentos").closest("section")).toHaveAttribute("aria-live", "polite");
  });

  it("explains when an action is blocked offline", () => {
    render(<OperationFeedback variant="offline" title="Você está sem conexão" description="Conecte-se à internet para continuar." />);

    expect(screen.getByText("Você está sem conexão")).toBeInTheDocument();
    expect(screen.getByText("Conecte-se à internet para continuar.")).toBeInTheDocument();
  });
});
