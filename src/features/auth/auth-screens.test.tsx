import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoginScreen, RegisterScreen, VerifyScreen } from "./auth-screens";

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

describe("entry feedback", () => {
  it("shows field guidance for an incomplete CPF", () => {
    render(<LoginScreen animDir="up" onNext={vi.fn()} onRegister={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("CPF"), { target: { value: "123" } });
    expect(screen.getByRole("alert")).toHaveTextContent("Informe os 11 dígitos do CPF.");
  });

  it("distributes six pasted OTP digits and enables verification", () => {
    render(<VerifyScreen email="ana@example.com" animDir="up" onBack={vi.fn()} onNext={vi.fn()} />);
    fireEvent.paste(screen.getByLabelText("Dígito 1 do código de verificação"), { clipboardData: { getData: () => "123456" } });
    expect(screen.getByLabelText("Dígito 6 do código de verificação")).toHaveValue("6");
    expect(screen.getByRole("button", { name: "Verificar código" })).toBeEnabled();
    expect(screen.getByText("a***@example.com")).toBeInTheDocument();
  });
});
