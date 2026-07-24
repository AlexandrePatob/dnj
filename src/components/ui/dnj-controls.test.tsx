import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FieldInput } from "./dnj-controls";

describe("FieldInput", () => {
  it("associates its visible label with the input", () => {
    render(<FieldInput id="email" label="E-mail" type="email" />);

    expect(screen.getByLabelText("E-mail")).toHaveAttribute("id", "email");
  });

  it("links a specific description and validation error to the affected field", () => {
    render(
      <FieldInput
        id="cpf"
        label="CPF"
        description="Use os 11 números do seu CPF."
        error="Informe um CPF válido."
      />,
    );

    const input = screen.getByLabelText("CPF");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "cpf-description cpf-error");
    expect(screen.getByText("Informe um CPF válido.")).toHaveAttribute("role", "alert");
  });
});
