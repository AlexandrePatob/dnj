import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EventMapScreen } from "./map-screen";

describe("EventMapScreen", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [{ id: "space-1", name: "Espaço Esperança", slug: "espaco-esperanca", mapReference: "map:esperanca" }] }));
  });

  it("links to the official map and shows the selected persisted space", async () => {
    const user = userEvent.setup();
    render(<EventMapScreen animDir="up" onBack={vi.fn()} />);
    expect(screen.getByRole("link", { name: "Abrir mapa oficial" })).toHaveAttribute("href", expect.stringContaining("google.com/maps"));
    await user.click(await screen.findByRole("button", { name: "Espaço Esperança" }));
    expect(screen.getByRole("heading", { name: "Espaço Esperança" })).toBeInTheDocument();
    expect(screen.getByText("map:esperanca")).toBeInTheDocument();
  });
});
