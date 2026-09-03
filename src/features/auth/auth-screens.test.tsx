import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { groupsApi } from "@/lib/api/groups";
import { storage } from "@/lib/storage";
import {
  CreateAccountScreen,
  GroupScreen,
  LoginScreen,
  RegisterScreen,
  VerifyScreen,
} from "./auth-screens";

vi.mock("@/lib/env", () => ({ env: { googleClientId: "test-google-client-id" } }));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
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

describe("CreateAccountScreen", () => {
  it("collects name and email before verification, leaving group selection for authenticated onboarding", () => {
    const onDone = vi.fn();
    render(<CreateAccountScreen animDir="up" onBack={vi.fn()} onDone={onDone} />);

    fireEvent.change(screen.getByLabelText("Nome completo"), { target: { value: "Ana Silva" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "ana@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar código" }));

    expect(onDone).toHaveBeenCalledWith({ name: "Ana Silva", email: "ana@example.com", mobilePhone: "", group: "" });
    expect(screen.queryByText("Grupo de Jovens")).not.toBeInTheDocument();
  });
});

describe("entry feedback", () => {
  it("does not re-render the Google button for the same width", () => {
    let notifyResize: (() => void) | undefined;
    class ResizeObserverMock {
      constructor(callback: ResizeObserverCallback) {
        notifyResize = () => callback([], this as unknown as ResizeObserver);
      }

      observe() {}
      disconnect() {}
    }
    const initialize = vi.fn();
    const renderButton = vi.fn((parent: HTMLElement) => {
      parent.appendChild(document.createElement("iframe"));
    });
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    vi.stubGlobal("google", { accounts: { id: { initialize, renderButton } } });

    render(<LoginScreen animDir="up" onNext={vi.fn()} onGoogleLogin={vi.fn()} onRegister={vi.fn()} />);

    const google = screen.getByLabelText("Entrar com Google");
    vi.spyOn(google, "getBoundingClientRect").mockReturnValue({ width: 320 } as DOMRect);
    notifyResize?.();
    expect(initialize).toHaveBeenCalledTimes(1);
    expect(renderButton).toHaveBeenCalledTimes(1);

    notifyResize?.();
    expect(renderButton).toHaveBeenCalledTimes(1);

    vi.mocked(google.getBoundingClientRect).mockReturnValue({ width: 360 } as DOMRect);
    notifyResize?.();
    expect(renderButton).toHaveBeenCalledTimes(2);
    expect(initialize).toHaveBeenCalledTimes(1);
  });

  it("puts Google before the email flow with a visible separator", () => {
    render(<LoginScreen animDir="up" onNext={vi.fn()} onGoogleLogin={vi.fn()} onRegister={vi.fn()} />);

    const google = screen.getByLabelText("Entrar com Google");
    const email = screen.getByLabelText("E-mail");
    expect(screen.getByText("OU")).toBeInTheDocument();
    expect(google.compareDocumentPosition(email) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
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

  it("shows the API-provided code only for local homologation", () => {
    render(<VerifyScreen email="ana@example.com" animDir="up" onBack={vi.fn()} onNext={vi.fn()} homologationCode="123456" />);

    expect(screen.getByRole("heading", { name: "Código de homologação" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("123456");
  });
});

describe("GroupScreen", () => {
  it("creates and selects a real group when the search has no match", async () => {
    storage.setSession({
      identityToken: "participant-token",
      user: { id: "participant-1", name: "Ana Silva", email: "ana@example.com", document: "", group: null, points: 0, rankPosition: 0 },
    });
    vi.spyOn(groupsApi, "search").mockResolvedValue([]);
    const create = vi.spyOn(groupsApi, "create").mockResolvedValue({ id: "group-new", groupName: "Jovens da Serra" });
    render(<GroupScreen animDir="up" onBack={vi.fn()} onNext={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Não encontrei meu grupo" }));
    fireEvent.change(screen.getByPlaceholderText("Nome do seu grupo"), { target: { value: "Jovens da Serra" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar grupo" }));

    expect(await screen.findByText("Jovens da Serra")).toBeInTheDocument();
    expect(create).toHaveBeenCalledWith({ name: "Jovens da Serra" }, "participant-token");
    expect(screen.queryByText(/seis grupos cadastrados/i)).not.toBeInTheDocument();
  });

  it("collects name, formats CPF and WhatsApp, and sends only digits for onboarding", async () => {
    storage.setSession({
      identityToken: "participant-token",
      user: { id: "participant-1", name: "Ana Silva", email: "ana@example.com", document: "", group: null, points: 0, rankPosition: 0 },
    });
    vi.spyOn(groupsApi, "search").mockResolvedValue([{ id: "group-1", groupName: "Jovens da Luz" }]);
    const onNext = vi.fn().mockResolvedValue(undefined);
    render(<GroupScreen animDir="up" onBack={vi.fn()} onNext={onNext} initialName="Ana Silva" />);

    fireEvent.change(screen.getByLabelText("CPF"), { target: { value: "08621231948" } });
    fireEvent.change(screen.getByLabelText("Telefone WhatsApp"), { target: { value: "41999786268" } });
    expect(screen.getByLabelText("CPF")).toHaveValue("086.212.319-48");
    expect(screen.getByLabelText("Telefone WhatsApp")).toHaveValue("(41) 99978-6268");

    fireEvent.change(screen.getByPlaceholderText("Buscar grupo..."), { target: { value: "Jovens" } });
    fireEvent.click(await screen.findByRole("button", { name: "Jovens da Luz" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(onNext).toHaveBeenCalledWith("Ana Silva", "08621231948", "41999786268", "Jovens da Luz", "group-1");
  });

  it("searches groups only after the participant types a name", async () => {
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

    expect(search).not.toHaveBeenCalled();
    expect(screen.getByText("Digite parte do nome para encontrar seu grupo.")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Buscar grupo..."), { target: { value: "Luz" } });
    expect(
      await screen.findByRole("button", { name: "Jovens da Luz" }),
    ).toBeInTheDocument();
    expect(search).toHaveBeenCalledWith("Luz", "participant-token");
    expect(screen.getByRole("button", { name: "Continuar" })).toBeInTheDocument();
  });
});
