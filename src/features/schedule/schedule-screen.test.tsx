import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { scheduleApi } from "@/lib/api/schedule";
import { EventScheduleScreen } from "./schedule-screen";

vi.mock("@/lib/api/schedule", () => ({ scheduleApi: { list: vi.fn() } }));

describe("EventScheduleScreen", () => {
  beforeEach(() => {
    vi.mocked(scheduleApi.list).mockResolvedValue({
      generatedAt: "2026-10-18T12:00:00.000Z",
      items: [
        {
          id: "opening",
          title: "Abertura",
          description: null,
          startsAt: "2026-10-18T12:00:00.000Z",
          endsAt: "2026-10-18T12:15:00.000Z",
          sector: {
            id: "stage",
            name: "Palco Principal",
            slug: "palco-principal",
          },
          state: "ended",
        },
        {
          id: "mass",
          title: "Santa Missa",
          description: "Pe. Reginaldo Manzotti",
          startsAt: "2026-10-18T21:00:00.000Z",
          endsAt: "2026-10-18T22:30:00.000Z",
          sector: {
            id: "stage",
            name: "Palco Principal",
            slug: "palco-principal",
          },
          state: "live",
        },
      ],
    });
  });

  it("lists the persisted official programme instead of demonstrative schedule items", async () => {
    render(<EventScheduleScreen animDir="up" onBack={vi.fn()} />);
    expect(await screen.findByText("Santa Missa")).toBeInTheDocument();
    expect(screen.getByText("Abertura")).toBeInTheDocument();
    expect(screen.getByText("ACONTECENDO AGORA")).toBeInTheDocument();
    expect(screen.getByText("Pe. Reginaldo Manzotti")).toBeInTheDocument();
    expect(screen.getByText(/Programação oficial do DNJ 2K26/)).toBeInTheDocument();
    expect(screen.queryByText(/demonstrativa/i)).not.toBeInTheDocument();
  });
});
