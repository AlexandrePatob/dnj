import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DnjOnboarding } from "./dnJ-onboarding";

describe("DnjOnboarding", () => {
  it("teaches the participant journey and can be skipped", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<DnjOnboarding onClose={onClose} />);
    expect(screen.getByLabelText("Conheça o DNJ Game")).toHaveTextContent("Escaneie e participe");
    await user.click(screen.getByRole("button", { name: "Pular por agora" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
