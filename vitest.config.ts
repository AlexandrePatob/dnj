import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const alias = {
  "@": fileURLToPath(new URL("./src", import.meta.url)),
};

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "node",
          environment: "node",
          env: { NEXT_PUBLIC_API_URL: "https://api.dnj.test/v2" },
          include: ["src/**/*.test.ts", "scripts/**/*.test.ts", "tests/setup/**/*.test.ts"],
          setupFiles: ["./tests/setup/node.ts"],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "react",
          environment: "jsdom",
          env: { NEXT_PUBLIC_API_URL: "https://api.dnj.test/v2" },
          include: ["src/**/*.test.tsx"],
          setupFiles: ["./tests/setup/react.ts"],
        },
      },
    ],
  },
});
