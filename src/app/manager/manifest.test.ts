import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("manager manifest", () => {
  it("installs the operational app with its own green entry point", () => {
    const value = manifest();
    expect(value.start_url).toBe("/manager");
    expect(value.theme_color).toBe("#133d30");
    expect(value.icons?.[0]?.src).toBe("/icons/manager-icon.svg");
  });
});
