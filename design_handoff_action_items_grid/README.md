# Handoff: Action Items Grid — "Highlighter Marker" wireframe

## Overview
A wireframe for the **post-meeting automation workflow**. The screen shows a spreadsheet of action items automatically extracted from meeting recaps, with one row per item: meeting source, owner, the action, due date, and status. The aesthetic is "notebook-meets-spreadsheet" — sketchy dashed borders, a hand-drawn font, highlighter-marker emphasis on key cells, and chunky bright status pills.

## About the Design Files
The files in this bundle are **design references created in HTML** — a wireframe prototype showing intended look and behavior, not production code to copy directly. The task is to **recreate this design in the target codebase's existing environment** (React, Vue, SwiftUI, native, etc.) using its established patterns, component library, and design tokens. If no environment exists yet, pick the framework that best fits the project and implement the design there.

`highlighter-grid.html` + `highlighter-grid.jsx` are a runnable copy of the wireframe alone (open the HTML in a browser). `Spreadsheet UI - Gaudy Wireframes.html` is the original exploration canvas with all five options for context.

## Fidelity
**Low-fidelity wireframe.** It establishes:
- the overall page structure and information architecture
- the column model and visual hierarchy
- the *feel* (sketchy, marker-highlighted, bright pills)

Treat colors, font choices, and exact spacings as **directional, not final**. Apply your codebase's existing design system for fonts and tokens, and replace the placeholder hand-drawn fonts only if your brand calls for it. The marker/highlighter motif and the status-pill pattern are the load-bearing visual ideas — preserve those.

## Screens / Views

### Screen: Action Items Grid

**Purpose.** A single landing view where the user reviews, edits, and works through all action items extracted from recent meetings. Primary actions: scan, filter, mark status, add a new row, trigger a resync.

**Layout (top → bottom).**
1. **Header row** — flex, space-between, baseline-aligned.
   - Left: page title + subtitle.
   - Right: action button cluster (gap 10px).
2. **Grid table** — bordered card, 5 columns.
3. **Footer note** — small rotated "pulled from N meetings today" tag, sits below the grid.

Page padding: `40px 48px`. Max content width: `1200px`, centered.

#### Components

**Page title.**
- Text: "Action items"
- Wrapped in a highlighter span (yellow `#FFE600`) that paints only the lower ~35% of the text — implemented as `linear-gradient(transparent 55%, #FFE600 55% 90%, transparent 90%)` on `background`, with `padding: 0 6px`.
- Font: `Caveat`, 700, 48px, line-height 1.
- Subtitle below: "this week — 7 open, 1 shipped ✱", `Patrick Hand` 22px, opacity 0.7.

**Header buttons (SketchBtn).**
- Three pill buttons: `+ new row`, `filter`, `sync ↻` (last one filled yellow).
- Font: `Patrick Hand` 18px.
- Bg: `#FFFDF4` (default) or `#FFE600` (primary).
- Border: `2px solid #1a1a1a`. Border radius: 4px.
- Padding: `6px 14px`. Shadow: `3px 3px 0 #1a1a1a` (offset, hard, no blur).
- Hover: shift transform `translate(1px,1px)` and reduce shadow to `2px 2px 0 #1a1a1a` (suggested).

**Grid container.**
- `border: 2.5px solid #1a1a1a`, `border-radius: 6px`, `overflow: hidden`.
- Drop shadow: `6px 6px 0 #1a1a1a` (no blur — chunky offset).

**Grid header row.**
- Background: `#1a1a1a`, text `#FFFDF4`, font `Patrick Hand` 22px.
- 5 columns, grid template: `1.2fr 1.1fr 2fr 0.7fr 0.9fr`.
- Column dividers: `1.5px dashed rgba(255,253,244,0.33)`.
- Cell padding: `12px 16px`.
- Columns: Meeting · Owner · Action item · Due · Status.

**Grid body rows.**
- Alternating background: even rows `#FFF8E1` (warm cream), odd rows `#FFFDF4` (paper white).
- Row separator: `1.5px dashed rgba(26,26,26,0.33)` (top border on each row).
- Column dividers: same dashed style.
- Cell font: `Patrick Hand` 22px.
- Cell padding: `12px 16px`.

**Marker highlight on "Action item" cell.**
- A `<span>` with the same gradient trick used in the title: `linear-gradient(transparent 50%, <color> 50% 90%, transparent 90%)`, `padding: 0 4px`.
- Applied selectively to draw attention — in the wireframe, row index 0 = green `#7CF3A0`, row 2 = pink `#FF6BD6`. In production this should be a **per-row property** the user can toggle (e.g. "starred" or "needs attention" action items). Default: no highlight (transparent).

**"Due" cell.**
- Just the date string, with a pink underline: `border-bottom: 3px solid #FF6BD6`.
- Wrap only the date text, not the whole cell.

**Status pill.**
- Inline span, `border-radius: 999px`, `border: 2px solid #1a1a1a`, `padding: 2px 12px`, font 18px.
- Background color depends on status:
  - Done → `#FFE600` (yellow)
  - Doing → `#7CF3A0` (green)
  - Blocked → `#FF6BD6` (pink)
  - Todo → `#5BD7FF` (blue)

**Footer tag.**
- Inline-block, rotated `-1.5deg`, bg `#7CF3A0`, border `2px solid #1a1a1a`, `padding: 4px 14px`.
- Font: `Caveat` 28px.
- Copy: "↑ pulled from N meetings today".

## Interactions & Behavior

The wireframe is static. Intended behavior to implement:

- **+ new row** → inserts an empty row at the top; focus jumps to the Action-item cell for inline edit.
- **filter** → opens a popover with status checkboxes (Todo / Doing / Blocked / Done), owner filter, and "due this week" toggle.
- **sync ↻** → triggers a resync against the meeting-recap source; shows a spinner inside the button (rotate animation on the `↻` glyph, ~600ms loop) and toasts on success.
- **Cell click** → enters inline edit mode for that cell. Tab/Shift-Tab moves cell by cell, Enter commits, Esc cancels.
- **Status pill click** → cycles through statuses, OR opens a small popover with the four options. Color updates immediately.
- **Marker highlight toggle** → right-click an action-item cell (or a small star icon on hover) toggles the highlight on/off and lets the user pick a color from the 4-color palette.
- **Hover state on rows** → subtle: slight darkening of the background (~4% black overlay) and the dashed borders go solid.

Animations: keep them snappy and physical — 120–180ms ease-out for state changes, no spring overshoot. The sketchy aesthetic implies "paper", not "rubber".

## State Management

Per row:
```ts
type ActionItem = {
  id: string;
  meeting: string;       // source meeting title
  owner: string;         // "Maya · Devs", "Priya", etc. — free-form
  action: string;        // the action item text
  due: string;           // free-form for now ("Fri", "Aug 30", "Today")
  status: "Todo" | "Doing" | "Blocked" | "Done";
  highlight?: "#7CF3A0" | "#FF6BD6" | "#FFE600" | "#5BD7FF" | null;
};
```

Top-level state: `items: ActionItem[]`, `filter: FilterState`, `syncing: boolean`. Counts in the subtitle ("7 open, 1 shipped") derive from `items`.

Data source: whatever upstream pipeline the post-meeting automation uses (transcript → LLM extraction → action item rows). The grid is the read/write surface for that pipeline's output.

## Design Tokens

**Colors.**
| Token | Hex | Role |
|---|---|---|
| paper | `#FFFDF4` | base page bg, odd rows |
| cream | `#FFF8E1` | even-row stripe |
| ink | `#1a1a1a` | all text + borders |
| highlight/yellow | `#FFE600` | title marker, Done status, primary button |
| highlight/green | `#7CF3A0` | Doing status, footer tag |
| highlight/pink | `#FF6BD6` | Blocked status, due-date underline |
| highlight/blue | `#5BD7FF` | Todo status |

Ink-on-paper is the only text combo. All 4 highlight colors are saturated and meant to feel like real highlighter pens — do not desaturate them in production.

**Typography.**
- Display: `Caveat`, 700 (title, footer note, optional accents). 48px / 28px.
- Body: `Patrick Hand`, 400 (everything else). 18px / 22px.
- If your brand has hand-drawn alternatives, swap in kind. If your brand is strictly geometric/sans, keep `Patrick Hand` for the wireframe charm or substitute a *single* handwritten display font and use the brand sans for body — but losing the handwritten feel kills this direction; flag it before deciding.

**Spacing scale used:** 4, 6, 10, 12, 14, 16, 22, 40, 48 px. Treat as ad-hoc; map to your closest scale tokens.

**Borders.**
- Solid: `2px` or `2.5px` `#1a1a1a`.
- Dashed: `1.5px dashed` at 33% opacity.
- Radius: 4px (buttons), 6px (grid), 999px (pills).

**Shadows.**
- Buttons: `3px 3px 0 #1a1a1a`.
- Grid: `6px 6px 0 #1a1a1a`.
- Both are **offset, hard, no blur** — this is intentional.

## Assets
No bitmap assets. The "✱" and "↻" glyphs are Unicode. Replace the marker highlight with an SVG squiggle/scribble in production if you want more authentic ink texture — currently it's a flat `linear-gradient`.

## Files
- `highlighter-grid.html` — runnable standalone copy of the chosen wireframe.
- `highlighter-grid.jsx` — its React source.
- `Spreadsheet UI - Gaudy Wireframes.html` — original exploration canvas with all five options (other four are kept for context).
- `wireframes.jsx` + `design-canvas.jsx` — sources for the exploration canvas.
