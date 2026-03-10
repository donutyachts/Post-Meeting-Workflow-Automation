import { chromium } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

/**
 * Playwright global setup — runs once before all E2E tests.
 *
 * Checks whether auth-state.json already exists. If it does, the session is
 * reused and no browser launch is needed. If not, a full Google OAuth flow is
 * performed to obtain a valid session cookie and the state is saved.
 *
 * IMPORTANT: Google OAuth automation is fragile.
 * - 2-factor authentication will break the automated flow.
 * - Google may show a consent screen or a "verify it's you" challenge that
 *   Playwright cannot handle automatically.
 * - If this setup step fails, generate auth state manually with:
 *
 *     playwright codegen --save-storage=tests/e2e/auth-state.json http://localhost:3000
 *
 *   Sign in interactively and close the browser; the state file will be saved.
 */

const AUTH_STATE_PATH = path.join(
  process.cwd(),
  "tests",
  "e2e",
  "auth-state.json"
);

export default async function globalSetup(): Promise<void> {
  // Reuse existing auth state if present — avoids redundant OAuth round-trips
  if (fs.existsSync(AUTH_STATE_PATH)) {
    console.log(
      "[global-setup] auth-state.json already exists — skipping OAuth."
    );
    return;
  }

  const email = process.env.TEST_GOOGLE_EMAIL;
  const password = process.env.TEST_GOOGLE_PASSWORD;
  const appUrl = process.env.TEST_APP_URL ?? "http://localhost:3000";

  if (!email || !password) {
    throw new Error(
      "TEST_GOOGLE_EMAIL and TEST_GOOGLE_PASSWORD must be set in .env.test.local " +
        "for automated OAuth, or generate auth-state.json manually:\n\n" +
        "  playwright codegen --save-storage=tests/e2e/auth-state.json " +
        appUrl
    );
  }

  console.log("[global-setup] Generating auth state via Google OAuth…");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Navigate to the app — NextAuth should redirect to Google sign-in
  await page.goto(appUrl);

  // Wait for redirect to Google's sign-in page
  await page.waitForURL(/accounts\.google\.com/, { timeout: 30_000 });

  // --- Step 1: Enter email ---
  await page.locator('input[type="email"]').fill(email);
  await page.locator("#identifierNext, button:has-text('Next')").click();

  // --- Step 2: Enter password ---
  await page.locator('input[type="password"]').waitFor({ state: "visible" });
  await page.locator('input[type="password"]').fill(password);
  await page.locator("#passwordNext, button:has-text('Next')").click();

  // Wait for redirect back to the app home page
  await page.waitForURL(new RegExp(`^${appUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`), {
    timeout: 30_000,
  });

  // Ensure we're on the app, not still on an intermediate OAuth page
  await page.waitForLoadState("networkidle");

  // Save storage state (cookies + localStorage) for reuse in all tests
  await context.storageState({ path: AUTH_STATE_PATH });
  console.log(`[global-setup] Auth state saved to ${AUTH_STATE_PATH}`);

  await browser.close();
}
