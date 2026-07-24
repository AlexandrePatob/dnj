import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EventMapScreen } from "./map-screen";
describe("EventMapScreen", () => { it("discloses mock data and shows the selected space detail", async () => { const user = userEvent.setup(); render(<EventMapScreen animDir="up" onBack={vi.fn()} />); expect(screen.getByText("Mapa demonstrativo, não atualizado ao vivo.")).toBeInTheDocument(); await user.click(screen.getByRole("button", { name: "Espaço Esperança" })); expect(screen.getByRole("heading", { name: "Espaço Esperança" })).toBeInTheDocument(); expect(screen.getByText(/Dedicado à reconciliação/)).toBeInTheDocument(); }); });
