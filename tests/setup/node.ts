import { vi } from "vitest";

vi.mock("next/font/google", () => ({
  Space_Grotesk: ({ variable }: { variable?: string }) => ({
    className: "test-space-grotesk",
    style: { fontFamily: "Space Grotesk" },
    variable: variable ?? "--font-space-grotesk",
  }),
  Poppins: ({ variable }: { variable?: string }) => ({
    className: "test-poppins",
    style: { fontFamily: "Poppins" },
    variable: variable ?? "--font-poppins",
  }),
}));
