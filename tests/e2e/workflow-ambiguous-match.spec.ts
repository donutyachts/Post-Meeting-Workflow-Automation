import { test, expect } from "@playwright/test";

/**
 * E2E test: Full workflow — manual selection after ambiguous Doc match
 *
 * FIXTURE NOTE:
 * This test requires the test fixture environment to be set up such that the
 * most recent Calendar event (returned by getLatestOrganizerEvent) has a title
 * that matches MULTIPLE Drive Docs, and tiebreaker logic (date + duration
 * filters) does NOT resolve to a single candidate. This may require:
 *   - Using a test Google account where a recurring meeting title appears in
 *     several Gemini Notes Docs with similar dates.
 *   - Or pre-creating multiple Docs with the same title prefix in Drive.
 *   - Using TEST_CALENDAR_AMBIGUOUS_TITLE as the effective event title
 *     (if the test account's most recent event uses that title).
 *
 * Expected outcomes:
 * - The confirm page shows a radio-button table with more than one candidate.
 * - User selects the first candidate and completes the workflow successfully.
 */

test("full workflow — ambiguous match (multiple candidates, manual selection)", async ({ page }) => {
  // --- Step 1: Home screen ---
  await page.goto("/");
  await expect(page).toHaveURL("/");

  // --- Step 2: Trigger workflow ---
  await page.click("text=Trigger");

  // --- Step 3: Wait for confirm-doc page ---
  await page.waitForURL(/\/workflow\/confirm/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: /confirm doc/i })).toBeVisible();

  // --- Step 4: Assert multiple candidates are shown ---
  const candidates = page.locator('[data-testid="doc-candidate"]');
  const candidateCount = await candidates.count();
  expect(candidateCount).toBeGreaterThan(1);

  // --- Step 5: Select the first candidate ---
  await candidates.first().click();

  // --- Step 6: Select any available project ---
  const projectDropdown = page.locator('[data-testid="project-select"]');
  await projectDropdown.selectOption({ index: 1 });

  // --- Step 7: Generate summary ---
  await page.click('[data-testid="generate-btn"]');
  await page.waitForURL(/\/workflow\/approve/, { timeout: 60_000 });

  // --- Step 8: Approval screen ---
  const summaryTextarea = page.locator('[data-testid="summary-textarea"]');
  await expect(summaryTextarea).toBeVisible({ timeout: 30_000 });
  await expect(summaryTextarea).not.toBeEmpty();

  // --- Step 9: Approve ---
  page.once("dialog", (dialog) => dialog.accept());
  await page.click('[data-testid="approve-btn"]');

  // --- Step 10: Assert success ---
  await expect(page.getByRole("heading", { name: /run complete/i })).toBeVisible({
    timeout: 60_000,
  });

  const slackBadge = page.locator('[data-testid="slack-status"]');
  await expect(slackBadge).toContainText(/success/i);

  const destBadge = page.locator('[data-testid="destination-status"]');
  await expect(destBadge).toContainText(/success/i);
});
