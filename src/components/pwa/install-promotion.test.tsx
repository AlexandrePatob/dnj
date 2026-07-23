// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { InstallPromotion } from "./install-promotion";

const defaultProps = {
  hasBottomNavigation: true,
  isIosSafari: false,
  isOnline: true,
  onDismiss: vi.fn(),
  onInstall: vi.fn().mockResolvedValue(undefined),
  pwaStatus: "ready" as const,
  status: "available" as const,
};

describe("InstallPromotion", () => {
  it("stays hidden when installation has no applicable action", () => {
    const { container } = render(<InstallPromotion {...defaultProps} status="unavailable" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("hides while offline or while an app update is available", () => {
    const offline = render(<InstallPromotion {...defaultProps} isOnline={false} />);
    expect(offline.container).toBeEmptyDOMElement();
    offline.unmount();

    const update = render(<InstallPromotion {...defaultProps} pwaStatus="update-available" />);
    expect(update.container).toBeEmptyDOMElement();
  });

  it("presents an accessible install action and invokes the native flow", async () => {
    const onInstall = vi.fn().mockResolvedValue(undefined);
    render(<InstallPromotion {...defaultProps} onInstall={onInstall} />);

    const promotion = screen.getByRole("region", { name: "Instalar DNJ Game" });
    expect(promotion).toHaveTextContent("DNJ Game no seu celular");
    expect(promotion).toHaveTextContent("Acesse mais rápido e use o que já carregou mesmo sem sinal.");
    await userEvent.click(screen.getByRole("button", { name: "Instalar app" }));
    expect(onInstall).toHaveBeenCalledTimes(1);
  });

  it("shows the exact Safari installation instruction on demand", async () => {
    render(<InstallPromotion {...defaultProps} isIosSafari status="manual" />);
    const action = screen.getByRole("button", { name: "Como instalar" });
    expect(action).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(action);
    expect(action).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Toque em Compartilhar e depois em Adicionar à Tela de Início.")).toBeVisible();
    expect(screen.queryByText("Abra esta página no Safari.")).not.toBeInTheDocument();
  });

  it("asks users of other iOS browsers to open the page in Safari", async () => {
    render(<InstallPromotion {...defaultProps} status="manual" />);
    await userEvent.click(screen.getByRole("button", { name: "Como instalar" }));
    expect(screen.getByText("Abra esta página no Safari.")).toBeVisible();
    expect(screen.getByText("Toque em Compartilhar e depois em Adicionar à Tela de Início.")).toBeVisible();
  });

  it("respects dismissal, loading, safe areas and keyboard focus styling", async () => {
    const onDismiss = vi.fn();
    const view = render(<InstallPromotion {...defaultProps} onDismiss={onDismiss} />);
    const promotion = screen.getByRole("region", { name: "Instalar DNJ Game" });
    const dismiss = screen.getByRole("button", { name: "Agora não" });
    expect(promotion.className).toContain("bottom-[calc(var(--bottom-nav-total-height)+1.25rem)]");
    expect(promotion.className).toContain("motion-reduce:transition-none");
    expect(dismiss.className).toContain("focus-visible:outline");
    await userEvent.click(dismiss);
    expect(onDismiss).toHaveBeenCalledTimes(1);

    view.rerender(<InstallPromotion {...defaultProps} hasBottomNavigation={false} status="installing" />);
    expect(screen.getByRole("region", { name: "Instalar DNJ Game" }).className).toContain(
      "bottom-[calc(var(--safe-area-bottom)+1rem)]",
    );
    expect(screen.getByRole("button", { name: "Abrindo instalação" })).toBeDisabled();
  });
});
