import { describe, expect, it } from "vitest";

import { deviceDateTimeToUtc } from "./date-time";

describe("deviceDateTimeToUtc", () => {
  it("converts a device-local datetime value into a UTC instant", () => {
    const value = "2026-08-26T00:04";

    expect(deviceDateTimeToUtc(value)).toBe(new Date(value).toISOString());
  });

  it("rejects an invalid datetime value", () => {
    expect(deviceDateTimeToUtc("not-a-date")).toBeNull();
  });
});
