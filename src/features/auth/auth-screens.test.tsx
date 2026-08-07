import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { groupsApi } from "@/lib/api/groups";
import { storage } from "@/lib/storage";
import {
  GroupScreen,
  LoginScreen,
  RegisterScreen,
  VerifyScreen,
} from "./auth-screens";

afterEach(() => {
  vi.restoreAllMocks();
  storage.clearSession();
});

describe("RegisterScreen", () => {
  it("keeps personal data while moving between the two registration steps", () => {
    render(<RegisterScreen animDir="up" onBack={vi.fn()} onDone={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Nome completo"), {
      target: { value: "Ana Silva" },
    });
    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "ana@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Telefone WhatsApp"), {
      target: { value: "41999990000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText("Escolha seu grupo de jovens")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(screen.getByLabelText("Nome completo")).toHaveValue("Ana Silva");
    expect(screen.getByLabelText("E-mail")).toHaveValue("ana@example.com");
  });

  it("does not allow moving on until the first step is complete and identifies invalid fields", () => {
    render(<RegisterScreen animDir="up" onBack={vi.fn()} onDone={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "ana" },
    });
    fireEvent.change(screen.getByLabelText("Telefone WhatsApp"), {
      target: { value: "41" },
    });
    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled();
    expect(screen.getByText("Informe um e-mail válido.")).toBeInTheDocument();
    expect(screen.getByText("Informe um WhatsApp válido.")).toBeInTheDocument();
  });
});

describe("entry feedback", () => {
  it("shows field guidance for an incomplete CPF", () => {
    render(<LoginScreen animDir="up" onNext={vi.fn()} onRegister={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("CPF"), {
      target: { value: "123" },
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Informe os 11 dígitos do CPF.",
    );
  });

  it("shows field guidance for an invalid email", () => {
    render(<LoginScreen animDir="up" onNext={vi.fn()} onRegister={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "ana" },
    });
    expect(screen.getByText("Informe um e-mail válido.")).toBeInTheDocument();
  });

  it("distributes six pasted OTP digits, announces delivery, and keeps validation guidance visible", async () => {
    const onNext = vi
      .fn()
      .mockRejectedValue(new Error("Código inválido. Confira os 6 dígitos."));
    render(
      <VerifyScreen
        email="ana@example.com"
        animDir="up"
        onBack={vi.fn()}
        onNext={onNext}
      />,
    );
    fireEvent.paste(
      screen.getByLabelText("Dígito 1 do código de verificação"),
      { clipboardData: { getData: () => "123456" } },
    );
    expect(
      screen.getByLabelText("Dígito 6 do código de verificação"),
    ).toHaveValue("6");
    expect(
      screen.getByRole("button", { name: "Verificar código" }),
    ).toBeEnabled();
    expect(screen.getByText("a***@example.com")).toBeInTheDocument();
    expect(
      screen.getByText(/Enviamos um código de 6 dígitos/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Verificar código" }));
    expect(
      await screen.findByText("Código inválido. Confira os 6 dígitos."),
    ).toBeInTheDocument();
  });
});

describe("GroupScreen", () => {
  it("lists persisted groups immediately after verification", async () => {
    storage.setSession({
      identityToken: "participant-token",
      user: {
        id: "participant-1",
        name: "Ana Silva",
        email: "ana@example.com",
        document: "12345678901",
        group: null,
        points: 0,
        rankPosition: 0,
      },
    });
    const search = vi.spyOn(groupsApi, "search").mockResolvedValue([
      { id: "group-1", groupName: "Jovens da Luz" },
      { id: "group-2", groupName: "GJC Santa Teresinha" },
    ]);

    render(<GroupScreen animDir="up" onBack={vi.fn()} onNext={vi.fn()} />);

    expect(
      await screen.findByRole("button", { name: "Jovens da Luz" }),
    ).toBeInTheDocument();
    expect(search).toHaveBeenCalledWith("", "participant-token");
  });
});
