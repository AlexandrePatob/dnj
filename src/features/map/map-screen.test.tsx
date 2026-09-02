import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EventMapScreen } from "./map-screen";

describe("EventMapScreen", () => {
  it("shows only the official map, with zoom and no space list", async () => {
    const user = userEvent.setup();
    render(<EventMapScreen animDir="up" onBack={vi.fn()} />);
    expect(screen.getByRole("link", { name: "Abrir no Google Maps" })).toHaveAttribute("href", expect.stringContaining("google.com/maps"));
    expect(screen.getByRole("img", { name: "Mapa isométrico oficial do evento DNJ 2026" })).toBeInTheDocument();
    expect(screen.getByText("Mapa Oficial")).toBeInTheDocument();
    expect(screen.queryByText(/Palco Juventude|Espaço Esperança/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ampliar mapa oficial" }));
    expect(screen.getByRole("dialog", { name: "Mapa oficial ampliado" })).toBeInTheDocument();
  });
});
