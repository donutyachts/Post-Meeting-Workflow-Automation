import { test, expect } from "@playwright/test";

/**
 * E2E test: Full workflow — discard
 *
 * Triggers the workflow through to the approval screen, then discards.
 *
 * Expected outcomes:
 * - Nothing posted to Slack.
 * - Nothing written to Notion or Sheets.
 * - Workflow run logged in Supabase with:
 *     approval_status: "discarded"
 *     slack_status: "skipped"
 *     destination_status: "skipped"
 */

test("full workflow — discard", async ({ page }) => {
  // --- Step 1: Home screen ---
  await page.goto("/");
  await expect(page).toHaveURL("/");

  // --- Step 2: Trigger workflow ---
  await page.click("text=Trigger");

  // --- Step 3: Wait for confirm-doc page ---
  await page.waitForURL(/\/workflow\/confirm/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: /confirm doc/i })).toBeVisible();

  // --- Step 4: Select doc (first candidate or auto-selected) ---
  const firstCandidate = page.locator('[data-testid="doc-candidate"]').first();
  if (await firstCandidate.isVisible()) {
    await firstCandidate.click();
  }

  // --- Step 5: Select any available project ---
  const projectDropdown = page.locator('[data-testid="project-select"]');
  await projectDropdown.selectOption({ index: 1 }); // pick first non-empty option

  // --- Step 6: Generate summary (AI call — allow up to 60s) ---
  await page.click('[data-testid="generate-btn"]');
  await page.waitForURL(/\/workflow\/approve/, { timeout: 60_000 });

  // --- Step 7: Approval screen — wait for summary to load ---
  const summaryTextarea = page.locator('[data-testid="summary-textarea"]');
  await expect(summaryTextarea).toBeVisible({ timeout: 30_000 });

  // --- Step 8: Click Discard ---
  page.once("dialog", (dialog) => dialog.accept());
  await page.click('[data-testid="discard-btn"]');

  // --- Step 9: Wait for redirect to home ---
  await page.waitForURL("/", { timeout: 30_000 });

  // --- Step 10: Verify run log on /runs page ---
  await page.goto("/runs");
  const latestRun = page.locator('[data-testid="run-row"]').first();
  await expect(latestRun).toBeVisible();
  await expect(latestRun).toContainText(/discarded/i);
  // slack_status and destination_status should both be "skipped"
  await expect(latestRun).toContainText(/skipped/i);
});
