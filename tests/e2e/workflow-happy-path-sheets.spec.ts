import { test, expect } from "@playwright/test";

/**
 * E2E test: Full workflow — happy path (Google Sheets destination)
 *
 * Prerequisites:
 * - TEST_SHEETS_PROJECT_ID must reference a Supabase project row configured
 *   with a Google Sheets destination pointing to TEST_GOOGLE_SHEETS_SPREADSHEET_ID.
 * - TEST_SLACK_THREAD_TS must be a valid thread_ts in TEST_SLACK_CHANNEL_ID.
 * - Auth state must be present at tests/e2e/auth-state.json.
 *
 * Expected outcomes:
 * - Summary appears as a thread reply in the test Slack channel.
 * - Structured data records are appended to the test Google Sheet.
 * - Workflow run logged in Supabase with approval_status: "approved",
 *   slack_status: "success", destination_status: "success".
 */

test("full workflow — happy path (Google Sheets)", async ({ page }) => {
  const slackThreadTs = process.env.TEST_SLACK_THREAD_TS ?? "";

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

  // --- Step 5: Select Google Sheets project ---
  const projectDropdown = page.locator('[data-testid="project-select"]');
  await projectDropdown.selectOption({ value: process.env.TEST_SHEETS_PROJECT_ID ?? "" });

  // --- Step 6: Generate summary (AI call — allow up to 60s) ---
  await page.click('[data-testid="generate-btn"]');
  await page.waitForURL(/\/workflow\/approve/, { timeout: 60_000 });

  // --- Step 7: Approval screen ---
  const summaryTextarea = page.locator('[data-testid="summary-textarea"]');
  await expect(summaryTextarea).toBeVisible({ timeout: 30_000 });
  await expect(summaryTextarea).not.toBeEmpty();

  // --- Step 8: Enter Slack thread link ---
  const threadInput = page.locator('[data-testid="thread-input"]');
  await threadInput.fill(slackThreadTs);

  // --- Step 9: Approve ---
  page.once("dialog", (dialog) => dialog.accept());
  await page.click('[data-testid="approve-btn"]');

  // --- Step 10: Wait for completion ---
  await expect(page.getByRole("heading", { name: /run complete/i })).toBeVisible({
    timeout: 60_000,
  });

  // --- Step 11: Verify status badges ---
  const slackBadge = page.locator('[data-testid="slack-status"]');
  await expect(slackBadge).toContainText(/success/i);

  const destBadge = page.locator('[data-testid="destination-status"]');
  await expect(destBadge).toContainText(/success/i);

  // --- Step 12: Verify run log ---
  await page.goto("/runs");
  const latestRun = page.locator('[data-testid="run-row"]').first();
  await expect(latestRun).toBeVisible();
  await expect(latestRun).toContainText(/approved/i);
  await expect(latestRun).toContainText(/success/i);
});
