# Handoff: Highlighter Marker — **visual style only**

## ⚠️ Read this first — what this handoff IS and IS NOT

This bundle is a **visual style reference**. It is *not* a feature spec, a page to build, or an interaction blueprint.

**DO:**
- Take the existing screens, components, and routes that already exist in this app and **restyle them** to match the visual language below.
- Use the component-by-component mapping in the "App inventory → restyle" section. Every restyle target is something already in the app today.

**DO NOT:**
- Build a new "Action items" page from the wireframe. The app already has an Action items route — restyle it, do not rebuild it.
- Add the interactions described in the wireframe (filter popovers, sync animations, inline edit, status cycling, marker toggle). Keep every existing behavior exactly as-is.
- Copy the row data, column headers, copy strings, or footer note from the wireframe HTML. All of that is placeholder content.
- Add new features, buttons, columns, badges, or pages that aren't already present in the app today.

**The deliverable for Claude Code is:** "Apply this visual language to the existing components." Nothing more.

## The app (inventory as of today)

The app is a small post-meeting automation tool with a fixed top nav and four routes:

- **Post-Meeting Workflow** — landing / workflow runner (`Confirm Doc & assign project` step → `Review & approve` step).
- **Action items** — list of extracted action items.
- **Run History** — table of past workflow runs.
- **Projects** — list of projects + new-project form.

Existing UI primitives across these routes:

| # | Existing component | Where it appears today |
|---|---|---|
| 1 | Top nav bar (horizontal tabs, active tab bold, thin bottom hairline) | every page |
| 2 | Page H1 (large bold sans, e.g. "Projects", "Run history", "Review & approve") | every page |
| 3 | Primary button — blue fill, white text (`+ New project`, `Run workflow`, `Create`, `Generate summary`, `Approve & Post`) | every page |
| 4 | Secondary button — white fill, gray border, dark text (`Edit`, `Cancel`, `+ Add record`) | Projects, New project form, Review & approve |
| 5 | Destructive button — red fill, white text (`Delete`, `Discard`) | Projects, Review & approve |
| 6 | Card — white bg, thin gray border, rounded corners, no shadow | Projects card, New project form, Run history table wrapper, Confirm Doc form, Gemini Notes Doc table, Structured records table |
| 7 | Data table — header band with TINY UPPERCASE labels, light gray row dividers, no row stripes | Run history, Gemini Notes Doc, Structured records |
| 8 | Status pill — small soft-tinted pill with dark text (`approved`/`success`/`failed`/`skipped`/`discarded` in Run History; `partial` in Confirm Doc) | Run history, Confirm Doc |
| 9 | Category tag — small gray lowercase pill (`problems`, `risks`, `changes`, `decisions`, `conclusions`, `action items`, `things to know`) | Review & approve (Structured records first column) |
| 10 | Form field — tiny uppercase label above an input with thin gray border and rounded corners. Variants: text, date, select dropdown, radio | New project form, Confirm Doc form, Slack thread link |
| 11 | Inline row actions — `Edit` (blue text link) and `Delete` (red text link) at the end of each table row | Structured records table |
| 12 | Mono / code text for IDs (e.g. `C05FAFF8LH1`, `1nPCreKz9X1Eph4-…`) | Projects card |
| 13 | Definition-list rows — gray label / dark value pairs (Slack channel · Destination · Destination ID) | Projects card |
| 14 | Section sub-heading — bold sans, smaller than H1 (`New project`, `Gemini Notes Doc`, `Summary`, `Structured records`, `Brand Unification`) | inside cards |
| 15 | Helper / placeholder text — gray, smaller (calendar event hint, "Calendar event: …", input placeholders) | Confirm Doc form, input fields |
| 16 | Plain text link — small blue underlined ("Use a different Doc", "Google Sheets") | Confirm Doc, Projects card |
| 17 | Two-pane layout — Summary (left) + Structured records (right), with footer (Slack thread input + Approve & Post / Discard) | Review & approve |
| 18 | Code/mono preformatted block — gray-bordered scrollable block with monospace text | Summary preview in Review & approve |

## App inventory → restyle

For each existing component above, here is the highlighter-marker treatment. **Restyle them in place — do not add new ones, do not remove existing ones.**

### 1. Top nav bar
- Bg `#FFFDF4`. Bottom hairline becomes `2px solid #1a1a1a` (was: thin gray).
- Brand "Post-Meeting Workflow" set in `Caveat` 700, ~32px, black. Add the yellow highlighter stroke (`linear-gradient(transparent 55%, #FFE600 55% 90%, transparent 90%)`) **only behind the brand word**, not the tabs.
- Tabs in `Patrick Hand` 20px, black. Active tab keeps its bold/weight cue, but additionally gets a pink underline `border-bottom: 3px solid #FF6BD6` sitting on the hairline.

### 2. Page H1
- `Caveat` 700, 48px, black, line-height 1.
- No layout changes. Same place on the page.

### 3. Primary button (blue → yellow)
- Replace blue fill `#2563EB` with `#FFE600`. Text becomes `#1a1a1a` (was white).
- Border `2px solid #1a1a1a`, radius 4px (was probably ~6–8px).
- Shadow `3px 3px 0 #1a1a1a` — offset, hard, no blur.
- Font `Patrick Hand` 18px.
- Hover: `transform: translate(1px,1px); box-shadow: 2px 2px 0 #1a1a1a;` (suggested).
- Applies to: `+ New project`, `Run workflow`, `Create`, `Generate summary`, `Approve & Post`.

### 4. Secondary button (gray-bordered → paper)
- Fill `#FFFDF4`. Text `#1a1a1a`.
- Same `2px solid #1a1a1a` border, 4px radius, `3px 3px 0 #1a1a1a` shadow as primary.
- Font `Patrick Hand` 18px.
- Applies to: `Edit`, `Cancel`, `+ Add record`.

### 5. Destructive button (red → pink)
- Fill `#FF6BD6`. Text `#1a1a1a` (was white — black reads better on pink).
- Same border / radius / shadow.
- Applies to: `Delete`, `Discard`.

### 6. Card
- Bg `#FFFDF4`. Border `2.5px solid #1a1a1a`, radius 6px.
- Shadow `6px 6px 0 #1a1a1a` (offset, hard, no blur — replaces the current no-shadow look).
- Internal padding stays as-is.

### 7. Data table
- Wrapped in the card style above (`Run history`, `Gemini Notes Doc`, `Structured records`).
- Header band: bg `#1a1a1a`, text `#FFFDF4`, font `Patrick Hand` 22px (kept normal-case — drop the existing tiny-uppercase treatment). Column dividers `1.5px dashed rgba(255,253,244,0.33)`.
- Body rows: alternating `#FFFDF4` / `#FFF8E1`. Row separator `1.5px dashed rgba(26,26,26,0.33)` on top of each row.
- Cells: `Patrick Hand` 22px, padding `12px 16px`. Same column dividers as the header.
- **Do not change column count, column order, or sortability.** Same columns as today.

### 8. Status pill (Run History `approved`/`failed`/`success`/`skipped`/`discarded`; Confirm Doc `partial`)
Replace the existing soft-tinted pills with bold-bordered ones, keeping the same labels and same status-to-color semantics:

| Existing label | New fill | Reasoning |
|---|---|---|
| `approved`, `success` | `#7CF3A0` (green) | positive outcome |
| `failed` | `#FF6BD6` (pink) | error |
| `skipped`, `discarded` | `#5BD7FF` (blue) | neutral / not run |
| `partial` | `#FFE600` (yellow) | warning |

Pill style for all: `padding: 2px 12px; border: 2px solid #1a1a1a; border-radius: 999px; font: 'Patrick Hand' 18px;` text `#1a1a1a`.

### 9. Category tag (Structured records first column)
Same pill shape as status pills (`2px solid #1a1a1a`, 999px radius, `Patrick Hand` 18px). Fill assignments (keep the same lowercase labels):

| Label | Fill |
|---|---|
| `problems` | `#FF6BD6` |
| `risks` | `#FFE600` |
| `changes` | `#5BD7FF` |
| `decisions` | `#7CF3A0` |
| `conclusions` | `#7CF3A0` |
| `action items` | `#FFE600` |
| `things to know` | `#FFFDF4` (paper — neutral) |

### 10. Form field
- Tiny uppercase label stays (it's a useful structural cue), but font becomes `Patrick Hand` 14px, color `#1a1a1a`, opacity 0.75.
- Input: bg `#FFFDF4`, `2px solid #1a1a1a`, radius 4px, padding `8px 12px`, font `Patrick Hand` 20px.
- Focus state: same border, plus `box-shadow: 3px 3px 0 #FFE600` (yellow drop tab — replaces the current blue focus ring).
- Same rule for `<input type="text">`, `<input type="date">`, `<select>`. For `<select>`, ensure the chevron is `#1a1a1a`.
- Radio: 18px circle, `2px solid #1a1a1a`. Selected inner dot fill `#FF6BD6`.

### 11. Inline row actions (`Edit` / `Delete` at row end)
Keep them as text links — do not turn them into pills/buttons. Restyle:
- Both use `Patrick Hand` 20px.
- `Edit` color stays a link cue but becomes `#1a1a1a` with a `2px` solid `#5BD7FF` underline.
- `Delete` becomes `#1a1a1a` with a `2px` solid `#FF6BD6` underline.

### 12. Mono / code text for IDs
- Switch from the system mono to `JetBrains Mono` (or whatever mono the app already imports — fine to keep current).
- Wrap each ID in a small inline tag: `background: #FFF8E1; border: 1.5px dashed #1a1a1a; padding: 1px 6px; border-radius: 3px;`.
- This includes Slack channel IDs and Destination IDs.

### 13. Definition-list rows (label / value pairs in Projects card)
- Labels: `Patrick Hand` 18px, opacity 0.6.
- Values: `Patrick Hand` 20px, `#1a1a1a`.
- No other layout change; keep the two-column alignment.

### 14. Section sub-heading
- `Caveat` 700, 32px, `#1a1a1a`.
- The brand-card sub-heading "Brand Unification" can optionally get a small yellow marker stroke behind the first word — sparingly, not on every sub-heading.

### 15. Helper / placeholder text
- `Patrick Hand` 18px italic, color `#1a1a1a` opacity 0.55.

### 16. Plain text link
- `Patrick Hand` 18px, color `#1a1a1a`, `border-bottom: 2px solid #FF6BD6` (replaces the underline + blue color).
- Hover: thicker underline `3px` (suggested).

### 17. Two-pane Review & approve layout
- No structural changes. Same left/right split, same footer.
- Both panes are cards (rule 6). The Slack-thread input is rule 10.

### 18. Code/mono preformatted block (Summary preview)
- Bg `#FFF8E1`, border `2px solid #1a1a1a`, radius 6px.
- Inside: keep `JetBrains Mono` or current mono. The dashed divider between "raw" and "PREVIEW" sections becomes `1.5px dashed #1a1a1a`.

## Design tokens (reference)

| Token | Hex | Role |
|---|---|---|
| paper | `#FFFDF4` | all backgrounds, odd-row stripe, secondary button fill |
| cream | `#FFF8E1` | even-row stripe, ID inline tag bg, summary block bg |
| ink | `#1a1a1a` | every text color, every border, every shadow |
| yellow | `#FFE600` | primary button, `partial` pill, `action items` tag, title marker, focus drop |
| green | `#7CF3A0` | `approved`/`success` pill, `decisions`/`conclusions` tag |
| pink | `#FF6BD6` | `failed` pill, `problems` tag, `Delete`/`Discard` button, active-tab underline |
| blue | `#5BD7FF` | `skipped`/`discarded` pill, `changes` tag, `Edit` underline |

## Type
- Display: **Caveat** 700 — H1, brand wordmark, section sub-headings.
- Body: **Patrick Hand** 400 — everything else (tabs, table cells, form inputs, buttons, helper text).
- Mono: whatever the app already uses, or **JetBrains Mono** — for IDs and the summary preformatted block.

Load both display fonts from Google Fonts. If the app's brand requires sans-serif, flag with the user before substituting — the handwritten feel is most of this direction's character.

## Files
- `highlighter-grid.html` + `.jsx` — sample of the visual style applied to one fictional table. Use only as a visual reference for tokens / motif. **Do not port this page into the app.**
- `Spreadsheet UI - Gaudy Wireframes.html` + sources — original exploration canvas with all five style options for context.

## Suggested prompt to Claude Code

> Read `README.md` in this folder. It is a **visual style guide** scoped to the existing app — not a feature to build. The app already has these routes: Post-Meeting Workflow (Confirm Doc → Review & approve), Action items, Run History, Projects. Do NOT add pages, columns, badges, or interactions. For each numbered row in the "App inventory → restyle" table, identify the corresponding component in the codebase and apply the restyling rules. Start by listing the file paths you intend to touch and wait for my approval before changing anything.
