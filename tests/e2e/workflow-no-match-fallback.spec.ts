import { test, expect } from "@playwright/test";

/**
 * E2E test: Full workflow — no Doc match fallback (manual Doc selection)
 *
 * FIXTURE NOTE:
 * This test requires the test fixture environment to be set up such that the
 * most recent Calendar event (returned by getLatestOrganizerEvent) has a title
 * that matches NO Drive Doc. This may require:
 *   - Using a test Google account where the most recent organizer event has a
 *     unique title not present in any Gemini Notes Doc.
 *   - Running the test at a specific time when such an event is the most recent.
 *   - Or temporarily renaming the matching Doc in Drive before running this test.
 *
 * Expected outcomes:
 * - The confirm page shows the manual Doc ID input (no candidates).
 * - User fills in a Doc ID manually, completes the workflow, and succeeds.
 */

test("full workflow — no Doc match fallback (manual selection)", async ({ page }) => {
  const manualDocId = process.env.TEST_DOC_ID_WITH_TRANSCRIPT ?? "";

  // --- Step 1: Home screen ---
  await page.goto("/");
  await expect(page).toHaveURL("/");

  // --- Step 2: Trigger workflow ---
  await page.click("text=Trigger");

  // --- Step 3: Wait for confirm-doc page ---
  await page.waitForURL(/\/workflow\/confirm/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: /confirm doc/i })).toBeVisible();

  // --- Step 4: Assert that no Doc candidates are shown (no matches) ---
  // The manual input is displayed when the candidates list is empty.
  const manualInput = page.locator('[data-testid="manual-doc-input"]');
  await expect(manualInput).toBeVisible({ timeout: 15_000 });

  // Confirm no candidate rows are visible
  const candidates = page.locator('[data-testid="doc-candidate"]');
  await expect(candidates).toHaveCount(0);

  // --- Step 5: Fill in the manual Doc ID ---
  await manualInput.fill(manualDocId);

  // --- Step 6: Fill in meeting title and date (required for manual flow) ---
  const titleInput = page.locator('[data-testid="meeting-title-input"]');
  if (await titleInput.isVisible()) {
    await titleInput.fill(process.env.TEST_MEETING_TITLE ?? "Manual Test Meeting");
  }

  const dateInput = page.locator('[data-testid="meeting-date-input"]');
  if (await dateInput.isVisible()) {
    await dateInput.fill(process.env.TEST_MEETING_DATE ?? "2026-03-10");
  }

  // --- Step 7: Select any available project ---
  const projectDropdown = page.locator('[data-testid="project-select"]');
  await projectDropdown.selectOption({ index: 1 });

  // --- Step 8: Generate summary ---
  await page.click('[data-testid="generate-btn"]');
  await page.waitForURL(/\/workflow\/approve/, { timeout: 60_000 });

  // --- Step 9: Approval screen ---
  const summaryTextarea = page.locator('[data-testid="summary-textarea"]');
  await expect(summaryTextarea).toBeVisible({ timeout: 30_000 });
  await expect(summaryTextarea).not.toBeEmpty();

  // --- Step 10: Approve ---
  page.once("dialog", (dialog) => dialog.accept());
  await page.click('[data-testid="approve-btn"]');

  // --- Step 11: Assert success ---
  await expect(page.getByRole("heading", { name: /run complete/i })).toBeVisible({
    timeout: 60_000,
  });

  const slackBadge = page.locator('[data-testid="slack-status"]');
  await expect(slackBadge).toContainText(/success/i);

  const destBadge = page.locator('[data-testid="destination-status"]');
  await expect(destBadge).toContainText(/success/i);
});
