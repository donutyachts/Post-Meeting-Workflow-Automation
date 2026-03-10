/**
 * Typed, throw-on-missing accessors for all test environment variables.
 * Import `testEnv` and call the property as a function to retrieve the value.
 * An error is thrown immediately if the variable is absent, so tests fail fast
 * with a clear message rather than with an obscure downstream error.
 */

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required test env var: ${name}`);
  return v;
}

export const testEnv = {
  // Google integration
  googleAccessToken: () => requireEnv("TEST_GOOGLE_ACCESS_TOKEN"),
  calendarEventTitle: () => requireEnv("TEST_CALENDAR_EVENT_TITLE"),
  calendarAmbiguousTitle: () => requireEnv("TEST_CALENDAR_AMBIGUOUS_TITLE"),
  calendarNoMatchTitle: () => requireEnv("TEST_CALENDAR_NO_MATCH_TITLE"),
  docIdWithTranscript: () => requireEnv("TEST_DOC_ID_WITH_TRANSCRIPT"),
  docIdNoTranscript: () => requireEnv("TEST_DOC_ID_NO_TRANSCRIPT"),
  meetingTitle: () => requireEnv("TEST_MEETING_TITLE"),
  meetingDate: () => requireEnv("TEST_MEETING_DATE"),

  // Slack integration
  slackChannelId: () => requireEnv("TEST_SLACK_CHANNEL_ID"),
  slackThreadTs: () => requireEnv("TEST_SLACK_THREAD_TS"),

  // Notion integration
  notionDatabaseId: () => requireEnv("TEST_NOTION_DATABASE_ID"),

  // Google Sheets integration
  googleSheetsSpreadsheetId: () => requireEnv("TEST_GOOGLE_SHEETS_SPREADSHEET_ID"),

  // E2E / Playwright
  appUrl: () => process.env.TEST_APP_URL ?? "http://localhost:3000",
  googleEmail: () => requireEnv("TEST_GOOGLE_EMAIL"),
  googlePassword: () => requireEnv("TEST_GOOGLE_PASSWORD"),
  notionProjectId: () => requireEnv("TEST_NOTION_PROJECT_ID"),
  sheetsProjectId: () => requireEnv("TEST_SHEETS_PROJECT_ID"),

  // Runtime vars (must also be present for integration tests)
  aiProvider: () => requireEnv("AI_PROVIDER"),
  anthropicApiKey: () => requireEnv("ANTHROPIC_API_KEY"),
  googleAiStudioApiKey: () => requireEnv("GOOGLE_AI_STUDIO_API_KEY"),
  slackBotToken: () => requireEnv("SLACK_BOT_TOKEN"),
  notionApiKey: () => requireEnv("NOTION_API_KEY"),
};
