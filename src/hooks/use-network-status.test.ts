// @vitest-environment jsdom

import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useNetworkStatus } from "./use-network-status";

describe("useNetworkStatus", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  });

  it("hydrates with the server snapshot before synchronizing offline state after mount", async () => {
    function Probe() {
      const status = useNetworkStatus();
      return createElement("output", null, status.isOnline ? "Online" : "Offline");
    }

    vi.stubGlobal("navigator", undefined);
    const serverHtml = renderToString(createElement(Probe));
    expect(serverHtml).toContain("Online");

    vi.stubGlobal("navigator", { onLine: false });
    const container = document.createElement("div");
    container.innerHTML = serverHtml;
    document.body.appendChild(container);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const root = hydrateRoot(container, createElement(Probe));

    await waitFor(() => expect(container.textContent).toContain("Offline"));
    expect(consoleError.mock.calls.flat().join(" ")).not.toMatch(/hydration|did not match/i);
    act(() => root.unmount());
    container.remove();
  });

  it("updates connectivity and timestamp from browser events", () => {
    vi.spyOn(Date, "now").mockReturnValue(20260722);
    const { result } = renderHook(() => useNetworkStatus());
    act(() => window.dispatchEvent(new Event("offline")));
    expect(result.current).toEqual({ isOnline: false, changedAt: 20260722 });
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    act(() => window.dispatchEvent(new Event("online")));
    expect(result.current).toEqual({ isOnline: true, changedAt: 20260722 });
  });

  it("removes online and offline listeners on unmount", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useNetworkStatus());
    unmount();
    expect(remove).toHaveBeenCalledWith("online", expect.any(Function));
    expect(remove).toHaveBeenCalledWith("offline", expect.any(Function));
  });
});
