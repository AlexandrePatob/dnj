import { vi } from "vitest";

vi.mock("next/font/google", () => ({
  Poppins: ({ variable }: { variable?: string }) => ({
    className: "test-poppins",
    style: { fontFamily: "Poppins" },
    variable: variable ?? "--font-poppins",
  }),
}));
