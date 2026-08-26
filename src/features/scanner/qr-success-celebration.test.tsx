import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QrSuccessCelebration } from "./qr-success-celebration";

describe("QrSuccessCelebration", () => {
  it("announces confirmed participation and the exact awarded points", () => {
    render(<QrSuccessCelebration points={50} label="Acolhida · Espaço Juventude" onDone={vi.fn()} />);
    expect(screen.getByLabelText("Participação confirmada")).toHaveTextContent("+50 pontos");
    expect(screen.getByText("Acolhida · Espaço Juventude")).toBeInTheDocument();
  });
});
