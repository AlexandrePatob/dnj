// @vitest-environment jsdom

import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PwaRegistrar, usePwa } from "./pwa-registrar";

type Listener = (event?: Event | MessageEvent) => void;

function createWorker() {
  const messages: unknown[] = [];
  return {
    messages,
    postMessage: vi.fn((message: unknown) => messages.push(message)),
  };
}

function createRegistration(options: { waiting?: ReturnType<typeof createWorker> | null } = {}) {
  const listeners = new Map<string, Listener>();
  const active = createWorker();
  return {
    active,
    waiting: options.waiting ?? null,
    installing: null,
    addEventListener: vi.fn((type: string, listener: Listener) => listeners.set(type, listener)),
    removeEventListener: vi.fn((type: string) => listeners.delete(type)),
    dispatch(type: string, event?: Event | MessageEvent) {
      listeners.get(type)?.(event);
    },
  };
}

function installServiceWorker(registration = createRegistration()) {
  const listeners = new Map<string, Listener>();
  const container = {
    controller: registration.active,
    ready: Promise.resolve(registration),
    register: vi.fn().mockResolvedValue(registration),
    getRegistration: vi.fn().mockResolvedValue(registration),
    addEventListener: vi.fn((type: string, listener: Listener) => listeners.set(type, listener)),
    removeEventListener: vi.fn((type: string) => listeners.delete(type)),
    dispatch(type: string, event?: Event | MessageEvent) {
      listeners.get(type)?.(event);
    },
  };
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: container });
  return { container, registration };
}

function Probe() {
  const pwa = usePwa();
  return (
    <div>
      <output data-testid="status">{pwa.status}</output>
      <output data-testid="error">{pwa.error ?? ""}</output>
      <button onClick={pwa.applyUpdate}>Atualizar</button>
    </div>
  );
}

describe("PwaRegistrar", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: undefined });
    vi.spyOn(performance, "getEntriesByType").mockReturnValue([]);
  });

  it("keeps children available and reports unsupported without the Service Worker API", async () => {
    render(<PwaRegistrar><Probe /></PwaRegistrar>);
    expect(await screen.findByTestId("status")).toHaveTextContent("unsupported");
    expect(screen.getByRole("button", { name: "Atualizar" })).toBeEnabled();
  });

  it("does not register outside an eligible secure context", async () => {
    const { container } = installServiceWorker();
    Object.defineProperty(window, "isSecureContext", { configurable: true, value: false });
    render(<PwaRegistrar><Probe /></PwaRegistrar>);
    expect(await screen.findByTestId("status")).toHaveTextContent("unsupported");
    expect(container.register).not.toHaveBeenCalled();
  });

  it("registers /sw.js once and becomes ready after CACHE_READY", async () => {
    const { container } = installServiceWorker();
    render(<PwaRegistrar><Probe /></PwaRegistrar>);
    await waitFor(() => expect(container.register).toHaveBeenCalledTimes(1));
    expect(container.register).toHaveBeenCalledWith("/sw.js", { scope: "/" });
    act(() => container.dispatch("message", new MessageEvent("message", { data: { type: "CACHE_READY" } })));
    expect(await screen.findByTestId("status")).toHaveTextContent("ready");
  });

  it("warms only loaded same-origin Next static URLs", async () => {
    const { registration } = installServiceWorker();
    vi.spyOn(performance, "getEntriesByType").mockReturnValue([
      { name: `${location.origin}/_next/static/chunks/app.js` } as PerformanceResourceTiming,
      { name: `${location.origin}/v1/users` } as PerformanceResourceTiming,
      { name: "https://example.com/_next/static/foreign.js" } as PerformanceResourceTiming,
    ]);
    render(<PwaRegistrar><Probe /></PwaRegistrar>);
    await waitFor(() => expect(registration.active.postMessage).toHaveBeenCalled());
    expect(registration.active.messages).toContainEqual({
      type: "CACHE_URLS",
      urls: [`${location.origin}/_next/static/chunks/app.js`],
    });
  });

  it("does not create duplicate registrations when rerendered", async () => {
    const { container } = installServiceWorker();
    const view = render(<PwaRegistrar><Probe /></PwaRegistrar>);
    await waitFor(() => expect(container.register).toHaveBeenCalledTimes(1));
    view.rerender(<PwaRegistrar><Probe /></PwaRegistrar>);
    expect(container.register).toHaveBeenCalledTimes(1);
  });

  it("detects a worker that became waiting when the window regains focus without reloading", async () => {
    const reloadPage = vi.fn();
    const waiting = createWorker();
    const { registration } = installServiceWorker();
    render(<PwaRegistrar reloadPage={reloadPage}><Probe /></PwaRegistrar>);
    await waitFor(() => expect(registration.addEventListener).toHaveBeenCalled());
    registration.waiting = waiting;
    act(() => window.dispatchEvent(new Event("focus")));
    expect(await screen.findByTestId("status")).toHaveTextContent("update-available");
    expect(reloadPage).not.toHaveBeenCalled();
  });

  it("reports a worker that transitions to installed as an available update", async () => {
    const registration = createRegistration();
    installServiceWorker(registration);
    render(<PwaRegistrar><Probe /></PwaRegistrar>);
    await waitFor(() => expect(registration.addEventListener).toHaveBeenCalled());
    const stateListeners = new Map<string, Listener>();
    registration.installing = {
      state: "installed",
      addEventListener: (_type: string, listener: Listener) => stateListeners.set("statechange", listener),
      removeEventListener: vi.fn(),
    } as never;
    registration.dispatch("updatefound");
    act(() => stateListeners.get("statechange")?.());
    expect(await screen.findByTestId("status")).toHaveTextContent("update-available");
  });

  it("sends SKIP_WAITING only after explicit confirmation", async () => {
    const waiting = createWorker();
    installServiceWorker(createRegistration({ waiting }));
    render(<PwaRegistrar><Probe /></PwaRegistrar>);
    expect(await screen.findByTestId("status")).toHaveTextContent("update-available");
    expect(waiting.postMessage).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Atualizar" }));
    expect(waiting.messages).toEqual([{ type: "SKIP_WAITING" }]);
  });

  it("reloads at most once after confirmation across repeated controller changes", async () => {
    const reloadPage = vi.fn();
    const waiting = createWorker();
    const { container } = installServiceWorker(createRegistration({ waiting }));
    render(<PwaRegistrar reloadPage={reloadPage}><Probe /></PwaRegistrar>);
    await waitFor(() => expect(container.addEventListener).toHaveBeenCalled());
    await userEvent.click(screen.getByRole("button", { name: "Atualizar" }));
    act(() => {
      container.dispatch("controllerchange");
      container.dispatch("controllerchange");
    });
    expect(reloadPage).toHaveBeenCalledTimes(1);
  });

  it("sanitizes worker failures and removes all listeners on unmount", async () => {
    const { container, registration } = installServiceWorker();
    const removeWindowListener = vi.spyOn(window, "removeEventListener");
    const view = render(<PwaRegistrar><Probe /></PwaRegistrar>);
    await waitFor(() => expect(container.register).toHaveBeenCalled());
    act(() => container.dispatch("message", new MessageEvent("message", {
      data: { type: "CACHE_ERROR", reason: "token=secret cpf=123" },
    })));
    expect(await screen.findByTestId("status")).toHaveTextContent("error");
    expect(screen.getByTestId("error")).toHaveTextContent("Não foi possível preparar o modo offline.");
    expect(screen.getByTestId("error")).not.toHaveTextContent("secret");
    view.unmount();
    expect(container.removeEventListener).toHaveBeenCalledWith("controllerchange", expect.any(Function));
    expect(registration.removeEventListener).toHaveBeenCalledWith("updatefound", expect.any(Function));
    expect(removeWindowListener).toHaveBeenCalledWith("focus", expect.any(Function));
  });
});
