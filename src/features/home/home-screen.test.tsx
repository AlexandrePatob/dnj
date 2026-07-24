import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HomeScreen } from "./home-screen";

describe("HomeScreen", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", class { disconnect() {} observe() {} takeRecords() { return []; } unobserve() {} });
  });
  it("prioritizes the demonstrative current activity and opens its schedule action", async () => {
    const user = userEvent.setup();
    const onOpenSchedule = vi.fn();
    const onOpenMap = vi.fn();
    render(<HomeScreen user={{ name: "Ana", cpf: "", email: "", group: "", points: 10, rankPosition: 1 }} animDir="up" onOpenSchedule={onOpenSchedule} onOpenMap={onOpenMap} />);
    expect(screen.getByText("Agora no DNJ · dados demonstrativos")).toBeInTheDocument();
    expect(screen.getByText("Espaço Juventude · 14:00")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ver cronograma" }));
    expect(onOpenSchedule).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Acessar" }));
    expect(onOpenSchedule).toHaveBeenCalledTimes(2);
    await user.click(screen.getByRole("button", { name: "Abrir mapa" }));
    expect(onOpenMap).toHaveBeenCalledOnce();
  });
});
