// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ConnectivityStatus } from "./connectivity-status";

describe("ConnectivityStatus", () => {
  it("communicates offline state with text and an accessible status icon", () => {
    render(<ConnectivityStatus isOnline={false} pwaStatus="ready" />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Sem conexão");
    expect(screen.getByLabelText("Offline")).toBeInTheDocument();
  });

  it("stays hidden during an uninterrupted online session", () => {
    const { container } = render(<ConnectivityStatus isOnline pwaStatus="ready" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders idle content only when no operational message has priority", () => {
    const idleContent = <div>Instalação disponível</div>;
    const view = render(<ConnectivityStatus idleContent={idleContent} isOnline pwaStatus="ready" />);
    expect(screen.getByText("Instalação disponível")).toBeVisible();

    view.rerender(<ConnectivityStatus idleContent={idleContent} isOnline={false} pwaStatus="ready" />);
    expect(screen.getByRole("status")).toHaveTextContent("Sem conexão");
    expect(screen.queryByText("Instalação disponível")).not.toBeInTheDocument();

    view.rerender(<ConnectivityStatus idleContent={idleContent} isOnline pwaStatus="update-available" />);
    expect(screen.getByRole("status")).toHaveTextContent("Nova versão disponível");
    expect(screen.queryByText("Instalação disponível")).not.toBeInTheDocument();
  });

  it("offers retry after connectivity returns", async () => {
    const onRetry = vi.fn();
    const view = render(<ConnectivityStatus isOnline={false} pwaStatus="ready" onRetry={onRetry} />);
    view.rerender(<ConnectivityStatus isOnline pwaStatus="ready" onRetry={onRetry} />);
    expect(screen.getByRole("status")).toHaveTextContent("Conexão restabelecida");
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("offers explicit activation for a waiting update", async () => {
    const onApplyUpdate = vi.fn();
    render(<ConnectivityStatus isOnline pwaStatus="update-available" onApplyUpdate={onApplyUpdate} />);
    expect(screen.getByRole("status")).toHaveTextContent("Nova versão disponível");
    await userEvent.click(screen.getByRole("button", { name: "Atualizar agora" }));
    expect(onApplyUpdate).toHaveBeenCalledTimes(1);
  });

  it("uses existing theme tokens and stays above the bottom navigation safe area", () => {
    render(<ConnectivityStatus isOnline={false} pwaStatus="ready" />);
    const status = screen.getByRole("status");
    expect(status).toHaveStyle({ background: "var(--card)", color: "var(--card-foreground)" });
    expect(status.className).toContain("bottom-[calc(var(--bottom-nav-total-height)+1.25rem)]");
  });

  it("disables its transition when reduced motion is requested", () => {
    render(<ConnectivityStatus isOnline={false} pwaStatus="ready" />);
    expect(screen.getByRole("status").className).toContain("motion-reduce:transition-none");
  });
});
