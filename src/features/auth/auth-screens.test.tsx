import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RegisterScreen } from "./auth-screens";

describe("RegisterScreen", () => {
  it("keeps personal data while moving between the two registration steps", () => {
    render(<RegisterScreen animDir="up" onBack={vi.fn()} onDone={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Nome completo"), { target: { value: "Ana Silva" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "ana@example.com" } });
    fireEvent.change(screen.getByLabelText("Telefone WhatsApp"), { target: { value: "41999990000" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText("Escolha seu grupo de jovens")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(screen.getByLabelText("Nome completo")).toHaveValue("Ana Silva");
    expect(screen.getByLabelText("E-mail")).toHaveValue("ana@example.com");
  });

  it("does not allow moving on until the first step is complete", () => {
    render(<RegisterScreen animDir="up" onBack={vi.fn()} onDone={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled();
  });
});
