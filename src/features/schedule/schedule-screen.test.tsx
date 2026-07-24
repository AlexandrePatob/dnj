import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EventScheduleScreen } from "./schedule-screen";

describe("EventScheduleScreen", () => {
  it("shows the mock schedule periods with their times and places", () => {
    render(<EventScheduleScreen animDir="up" onBack={vi.fn()} />);

    expect(screen.getByText("Programação demonstrativa, não atualizada ao vivo.")).toBeInTheDocument();
    expect(screen.getByText("Agora")).toBeInTheDocument();
    expect(screen.getByText("Em seguida")).toBeInTheDocument();
    expect(screen.getByText("Mais tarde")).toBeInTheDocument();
    expect(screen.getByText("14:00 · Espaço Juventude")).toBeInTheDocument();
    expect(screen.getByText("15:00 · Palco central")).toBeInTheDocument();
    expect(screen.getByText("16:30 · Espaço Esperança")).toBeInTheDocument();
  });
});
