// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useNetworkStatus } from "./use-network-status";

describe("useNetworkStatus", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  });

  it("initializes from navigator.onLine", () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(false);
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
