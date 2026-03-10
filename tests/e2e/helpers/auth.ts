import * as fs from "fs";
import * as path from "path";

const AUTH_STATE_PATH = path.join(
  process.cwd(),
  "tests",
  "e2e",
  "auth-state.json"
);

/**
 * Reads the Playwright auth state file and returns its path.
 *
 * Throws a descriptive error if the file does not exist, with instructions
 * for how to generate it.
 *
 * Usage in playwright.config.ts:
 *   use: { storageState: requireAuthState() }
 *
 * Usage in individual test files (if needed for per-test context):
 *   const context = await browser.newContext({ storageState: requireAuthState() });
 */
export function requireAuthState(): string {
  if (!fs.existsSync(AUTH_STATE_PATH)) {
    throw new Error(
      `Auth state file not found: ${AUTH_STATE_PATH}\n\n` +
        "Generate it by running the global setup (vitest will do this automatically),\n" +
        "or create it manually with:\n\n" +
        "  npx playwright codegen \\\n" +
        "    --save-storage=tests/e2e/auth-state.json \\\n" +
        `    ${process.env.TEST_APP_URL ?? "http://localhost:3000"}\n\n` +
        "Sign in with your test Google account, then close the browser.\n" +
        "The auth-state.json file is gitignored and must never be committed."
    );
  }

  return AUTH_STATE_PATH;
}
