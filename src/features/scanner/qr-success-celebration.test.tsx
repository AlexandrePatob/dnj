import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QrSuccessCelebration } from "./qr-success-celebration";

describe("QrSuccessCelebration", () => {
  it("announces confirmed participation and the exact awarded points", () => {
    render(<QrSuccessCelebration points={50} label="Acolhida · Espaço Juventude" onDone={vi.fn()} />);
    expect(screen.getByLabelText("Participação confirmada")).toHaveTextContent("+50 pontos");
    expect(screen.getByText("Acolhida · Espaço Juventude")).toBeInTheDocument();
  });

  it("celebrates a repeated QR without displaying new points", () => {
    render(<QrSuccessCelebration points={0} label="Ponto de presença · Capela" alreadyRegistered onDone={vi.fn()} />);
    expect(screen.getByLabelText("Atividade já pontuada")).toHaveTextContent("Você já pontuou nessa atividade!");
    expect(screen.getByText("Sua participação está garantida no DNJ Game.")).toBeInTheDocument();
    expect(screen.queryByText("+0 pontos")).not.toBeInTheDocument();
  });

  it("keeps a game celebration visible for the requested duration", async () => {
    vi.useFakeTimers();
    try {
      const onDone = vi.fn();
      render(
        <QrSuccessCelebration
          points={50}
          label="Corrida do saco"
          scored
          durationMs={3_000}
          onDone={onDone}
        />,
      );
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2_999);
      });
      expect(onDone).not.toHaveBeenCalled();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });
      expect(onDone).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });
});
