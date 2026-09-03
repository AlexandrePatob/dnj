import { fireEvent, render, screen } from "@testing-library/react";
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

  it("zooms the expanded map with a two-finger gesture and provides button controls", async () => {
    const user = userEvent.setup();
    render(<EventMapScreen animDir="up" onBack={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Ampliar mapa oficial" }));

    const viewer = screen.getByRole("region", { name: "Área interativa do mapa oficial" });
    const image = screen.getByRole("img", { name: "Mapa isométrico oficial do evento DNJ 2026 ampliado" });
    Object.defineProperties(viewer, { clientWidth: { configurable: true, value: 320 }, clientHeight: { configurable: true, value: 600 } });
    Object.defineProperties(image, { offsetWidth: { configurable: true, value: 400 }, offsetHeight: { configurable: true, value: 214 } });
    fireEvent.pointerDown(viewer, { pointerId: 1, pointerType: "touch", clientX: 100, clientY: 200 });
    fireEvent.pointerDown(viewer, { pointerId: 2, pointerType: "touch", clientX: 200, clientY: 200 });
    fireEvent.pointerMove(viewer, { pointerId: 1, pointerType: "touch", clientX: 70, clientY: 200 });
    fireEvent.pointerMove(viewer, { pointerId: 2, pointerType: "touch", clientX: 230, clientY: 200 });

    expect(image.style.transform).toContain("scale(1.6)");
    expect(screen.getByText("160%")).toBeInTheDocument();

    fireEvent.pointerUp(viewer, { pointerId: 1, pointerType: "touch" });
    fireEvent.pointerUp(viewer, { pointerId: 2, pointerType: "touch" });
    const beforeDrag = image.style.transform;
    fireEvent.pointerDown(viewer, { pointerId: 3, pointerType: "touch", clientX: 180, clientY: 300 });
    fireEvent.pointerMove(viewer, { pointerId: 3, pointerType: "touch", clientX: 120, clientY: 300 });
    expect(image.style.transform).not.toBe(beforeDrag);
    fireEvent.pointerUp(viewer, { pointerId: 3, pointerType: "touch" });
    await user.click(screen.getByRole("button", { name: "Aumentar zoom" }));
    expect(image.style.transform).toContain("scale(1.85)");
  });
});
