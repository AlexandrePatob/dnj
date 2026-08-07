import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrandSticker } from "./brand-sticker";

describe("BrandSticker", () => {
  it("exposes the DNJ 2K26 sticker as the participant brand", () => {
    render(<BrandSticker variant="header" />);
    const logo = screen.getByRole("img", { name: "DNJ 2K26" });
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveClass("h-8", "max-w-[4.25rem]");
    expect(logo.getAttribute("style")).not.toContain("height");
  });
});
