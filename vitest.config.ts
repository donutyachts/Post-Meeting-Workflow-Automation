import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    testTimeout: 60_000,
    // Vitest automatically loads .env.test.local when present
    // Ensure your test credentials are stored in .env.test.local (gitignored)
  },
});
