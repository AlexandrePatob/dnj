import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { QueueScreen } from "./queue-screen";

describe("QueueScreen", () => {
  it("reports a recoverable error when Firestore is not configured", async () => {
    const user = userEvent.setup();
    render(<QueueScreen animDir="up" />);
    await user.click(screen.getByRole("button", { name: "Entrar na fila de Confissão" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Fila indisponível");
  });
});
