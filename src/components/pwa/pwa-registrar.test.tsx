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
    getRegistrations: vi.fn().mockResolvedValue([registration]),
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
      <output data-testid="install-status">{pwa.installStatus}</output>
      <output data-testid="ios-safari">{String(pwa.isIosSafari)}</output>
      <button onClick={pwa.applyUpdate}>Atualizar</button>
      <button onClick={() => void pwa.requestInstall()}>Instalar</button>
      <button onClick={pwa.dismissInstall}>Agora não</button>
    </div>
  );
}

function createInstallPrompt(outcome: string = "accepted") {
  const event = new Event("beforeinstallprompt", { cancelable: true });
  const prompt = vi.fn().mockResolvedValue(undefined);
  Object.assign(event, {
    prompt,
    userChoice: Promise.resolve({ outcome, platform: "web" }),
  });
  return { event, prompt };
}

function setNavigator(options: { maxTouchPoints?: number; platform?: string; userAgent?: string }) {
  if (options.userAgent !== undefined) {
    Object.defineProperty(navigator, "userAgent", { configurable: true, value: options.userAgent });
  }
  if (options.platform !== undefined) {
    Object.defineProperty(navigator, "platform", { configurable: true, value: options.platform });
  }
  if (options.maxTouchPoints !== undefined) {
    Object.defineProperty(navigator, "maxTouchPoints", { configurable: true, value: options.maxTouchPoints });
  }
}

describe("PwaRegistrar", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: undefined });
    Object.defineProperty(navigator, "standalone", { configurable: true, value: false });
    setNavigator({
      maxTouchPoints: 0,
      platform: "Win32",
      userAgent: "Mozilla/5.0 Chrome/126.0.0.0 Safari/537.36",
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({
        addEventListener: vi.fn(),
        matches: false,
        removeEventListener: vi.fn(),
      }),
    });
    vi.spyOn(performance, "getEntriesByType").mockReturnValue([]);
  });

  it("exposes an eligible browser prompt and invokes it exactly once from the install action", async () => {
    render(<PwaRegistrar><Probe /></PwaRegistrar>);
    const installPrompt = createInstallPrompt("accepted");

    act(() => window.dispatchEvent(installPrompt.event));

    expect(installPrompt.event.defaultPrevented).toBe(true);
    expect(screen.getByTestId("install-status")).toHaveTextContent("available");
    await userEvent.click(screen.getByRole("button", { name: "Instalar" }));
    await userEvent.click(screen.getByRole("button", { name: "Instalar" }));
    expect(installPrompt.prompt).toHaveBeenCalledTimes(1);
    expect(await screen.findByTestId("install-status")).toHaveTextContent("installed");

    const laterPrompt = createInstallPrompt();
    act(() => window.dispatchEvent(laterPrompt.event));
    expect(screen.getByTestId("install-status")).toHaveTextContent("installed");
    expect(laterPrompt.prompt).not.toHaveBeenCalled();
  });

  it("snoozes a dismissed native prompt for exactly seven days", async () => {
    const now = new Date("2026-07-22T12:00:00.000Z").getTime();
    vi.spyOn(Date, "now").mockReturnValue(now);
    render(<PwaRegistrar><Probe /></PwaRegistrar>);
    const installPrompt = createInstallPrompt("dismissed");

    act(() => window.dispatchEvent(installPrompt.event));
    await userEvent.click(screen.getByRole("button", { name: "Instalar" }));

    expect(await screen.findByTestId("install-status")).toHaveTextContent("unavailable");
    expect(localStorage.getItem("dnj.pwa.install-promotion.dismissed-until.v1")).toBe(
      String(now + 7 * 24 * 60 * 60 * 1000),
    );
  });

  it("snoozes Agora não for exactly seven days and respects it after remount", async () => {
    const now = new Date("2026-07-22T12:00:00.000Z").getTime();
    vi.spyOn(Date, "now").mockReturnValue(now);
    const view = render(<PwaRegistrar><Probe /></PwaRegistrar>);
    act(() => window.dispatchEvent(createInstallPrompt().event));
    await userEvent.click(screen.getByRole("button", { name: "Agora não" }));
    expect(screen.getByTestId("install-status")).toHaveTextContent("unavailable");
    expect(localStorage.getItem("dnj.pwa.install-promotion.dismissed-until.v1")).toBe(
      String(now + 7 * 24 * 60 * 60 * 1000),
    );

    view.unmount();
    render(<PwaRegistrar><Probe /></PwaRegistrar>);
    act(() => window.dispatchEvent(createInstallPrompt().event));
    expect(screen.getByTestId("install-status")).toHaveTextContent("unavailable");
  });

  it("respects a current snooze and accepts a new prompt after it expires", () => {
    const now = new Date("2026-07-22T12:00:00.000Z").getTime();
    vi.spyOn(Date, "now").mockReturnValue(now);
    localStorage.setItem("dnj.pwa.install-promotion.dismissed-until.v1", String(now + 1));
    const firstView = render(<PwaRegistrar><Probe /></PwaRegistrar>);
    act(() => window.dispatchEvent(createInstallPrompt().event));
    expect(screen.getByTestId("install-status")).toHaveTextContent("unavailable");

    firstView.unmount();
    localStorage.setItem("dnj.pwa.install-promotion.dismissed-until.v1", String(now - 1));
    render(<PwaRegistrar><Probe /></PwaRegistrar>);
    act(() => window.dispatchEvent(createInstallPrompt().event));
    expect(screen.getByTestId("install-status")).toHaveTextContent("available");
  });

  it("offers manual installation on iOS and distinguishes Safari from other browsers", async () => {
    setNavigator({ platform: "iPhone", userAgent: "Mozilla/5.0 (iPhone) Version/18.0 Mobile/15E148 Safari/604.1" });
    const safariView = render(<PwaRegistrar><Probe /></PwaRegistrar>);
    await waitFor(() => expect(screen.getByTestId("install-status")).toHaveTextContent("manual"));
    expect(screen.getByTestId("ios-safari")).toHaveTextContent("true");

    safariView.unmount();
    setNavigator({ platform: "iPhone", userAgent: "Mozilla/5.0 (iPhone) CriOS/126.0 Mobile/15E148 Safari/604.1" });
    render(<PwaRegistrar><Probe /></PwaRegistrar>);
    await waitFor(() => expect(screen.getByTestId("install-status")).toHaveTextContent("manual"));
    expect(screen.getByTestId("ios-safari")).toHaveTextContent("false");
  });

  it("detects iPadOS when Safari reports a desktop platform", async () => {
    setNavigator({
      maxTouchPoints: 5,
      platform: "MacIntel",
      userAgent: "Mozilla/5.0 (Macintosh) Version/18.0 Mobile/15E148 Safari/604.1",
    });
    render(<PwaRegistrar><Probe /></PwaRegistrar>);
    expect(await screen.findByTestId("install-status")).toHaveTextContent("manual");
    expect(screen.getByTestId("ios-safari")).toHaveTextContent("true");
  });

  it("keeps installation hidden when already running standalone", async () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({
        addEventListener: vi.fn(),
        matches: true,
        removeEventListener: vi.fn(),
      }),
    });
    render(<PwaRegistrar><Probe /></PwaRegistrar>);
    act(() => window.dispatchEvent(createInstallPrompt().event));
    expect(await screen.findByTestId("install-status")).toHaveTextContent("installed");
  });

  it("marks installation complete when the browser emits appinstalled", () => {
    render(<PwaRegistrar><Probe /></PwaRegistrar>);
    act(() => window.dispatchEvent(createInstallPrompt().event));
    expect(screen.getByTestId("install-status")).toHaveTextContent("available");
    act(() => window.dispatchEvent(new Event("appinstalled")));
    expect(screen.getByTestId("install-status")).toHaveTextContent("installed");
    const laterPrompt = createInstallPrompt();
    act(() => window.dispatchEvent(laterPrompt.event));
    expect(screen.getByTestId("install-status")).toHaveTextContent("installed");
    expect(laterPrompt.prompt).not.toHaveBeenCalled();
  });

  it("uses only the latest browser prompt when eligibility is emitted repeatedly", async () => {
    render(<PwaRegistrar><Probe /></PwaRegistrar>);
    const firstPrompt = createInstallPrompt();
    const latestPrompt = createInstallPrompt();
    act(() => {
      window.dispatchEvent(firstPrompt.event);
      window.dispatchEvent(latestPrompt.event);
    });
    await userEvent.click(screen.getByRole("button", { name: "Instalar" }));
    expect(firstPrompt.prompt).not.toHaveBeenCalled();
    expect(latestPrompt.prompt).toHaveBeenCalledTimes(1);
  });

  it("hides the promotion for the session when the native prompt fails", async () => {
    render(<PwaRegistrar><Probe /></PwaRegistrar>);
    const installPrompt = createInstallPrompt();
    installPrompt.prompt.mockRejectedValue(new DOMException("Prompt failed"));
    act(() => window.dispatchEvent(installPrompt.event));
    await userEvent.click(screen.getByRole("button", { name: "Instalar" }));
    expect(await screen.findByTestId("install-status")).toHaveTextContent("unavailable");
    expect(localStorage.getItem("dnj.pwa.install-promotion.dismissed-until.v1")).toBeNull();
    act(() => window.dispatchEvent(createInstallPrompt().event));
    expect(screen.getByTestId("install-status")).toHaveTextContent("unavailable");
  });

  it("treats an invalid native choice as session-only dismissal", async () => {
    render(<PwaRegistrar><Probe /></PwaRegistrar>);
    act(() => window.dispatchEvent(createInstallPrompt("unknown").event));
    await userEvent.click(screen.getByRole("button", { name: "Instalar" }));
    expect(await screen.findByTestId("install-status")).toHaveTextContent("unavailable");
    expect(localStorage.getItem("dnj.pwa.install-promotion.dismissed-until.v1")).toBeNull();
    act(() => window.dispatchEvent(createInstallPrompt().event));
    expect(screen.getByTestId("install-status")).toHaveTextContent("unavailable");
  });

  it("dismisses for the current session when local storage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage unavailable");
    });
    render(<PwaRegistrar><Probe /></PwaRegistrar>);
    act(() => window.dispatchEvent(createInstallPrompt().event));
    await userEvent.click(screen.getByRole("button", { name: "Agora não" }));
    expect(screen.getByTestId("install-status")).toHaveTextContent("unavailable");
    act(() => window.dispatchEvent(createInstallPrompt().event));
    expect(screen.getByTestId("install-status")).toHaveTextContent("unavailable");
  });

  it("keeps accepted installation for the session when local storage cleanup fails", async () => {
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new DOMException("Storage unavailable");
    });
    render(<PwaRegistrar><Probe /></PwaRegistrar>);
    act(() => window.dispatchEvent(createInstallPrompt("accepted").event));
    await userEvent.click(screen.getByRole("button", { name: "Instalar" }));
    expect(await screen.findByTestId("install-status")).toHaveTextContent("installed");
    act(() => window.dispatchEvent(createInstallPrompt().event));
    expect(screen.getByTestId("install-status")).toHaveTextContent("installed");
  });

  it("removes browser installation listeners on unmount", () => {
    const removeWindowListener = vi.spyOn(window, "removeEventListener");
    const view = render(<PwaRegistrar><Probe /></PwaRegistrar>);
    view.unmount();
    expect(removeWindowListener).toHaveBeenCalledWith("beforeinstallprompt", expect.any(Function));
    expect(removeWindowListener).toHaveBeenCalledWith("appinstalled", expect.any(Function));
  });

  it("keeps children available and reports unsupported without the Service Worker API", async () => {
    render(<PwaRegistrar><Probe /></PwaRegistrar>);
    expect(await screen.findByTestId("status")).toHaveTextContent("unsupported");
    expect(screen.getByTestId("install-status")).toHaveTextContent("unavailable");
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
    const { container, registration } = installServiceWorker();
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
    const { container, registration } = installServiceWorker();
    render(<PwaRegistrar reloadPage={reloadPage}><Probe /></PwaRegistrar>);
    await waitFor(() => expect(registration.addEventListener).toHaveBeenCalled());
    registration.waiting = waiting;
    act(() => window.dispatchEvent(new Event("focus")));
    expect(await screen.findByTestId("status")).toHaveTextContent("update-available");
    act(() => container.dispatch("message", new MessageEvent("message", { data: { type: "CACHE_READY" } })));
    expect(screen.getByTestId("status")).toHaveTextContent("update-available");
    expect(container.getRegistrations).toHaveBeenCalledTimes(1);
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
