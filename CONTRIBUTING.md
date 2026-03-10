# CONTRIBUTING.md

A guide for directing Claude Code to build and extend this project correctly and consistently.

---

## Before You Start

Resolve all open questions in Section 10 of the spec before handing anything to Claude Code. Claude Code will make assumptions to fill gaps and those assumptions will be wrong or inconsistent. Add the decisions back into the spec before starting any build session.

---

## Setting Up Claude Code for This Project

Create a Claude project and attach the spec as a project document so it is in context for every session. Do not paste the spec fresh into each conversation — context drift across sessions will cause inconsistent output.

---

## First Thing to Build

Before writing any code, ask Claude Code to generate the complete file and folder structure for the project:

> "Based on this spec, generate the complete file and folder structure for this project without writing any code."

Review the output against the project structure defined in Section 11.1 of the spec and correct any deviations before a single line of code is written. Fixing structure early is cheap. Refactoring it later is not.

---

## Build Order

Always build in this order. Never ask Claude Code to build multiple layers simultaneously — it will cut corners.

1. Supabase schema and TypeScript types (spec Section 5)
2. Auth and Google OAuth setup (spec Section 2)
3. AI provider abstraction layer — `lib/ai/generate.ts` (spec Section 3.5.1)
4. Google API clients — calendar, drive, docs, sheets (spec Section 2)
5. API routes — one at a time (spec Section 6)
6. Frontend screens — one at a time (spec Section 3)
7. Tests (spec Section 8)

---

## How to Write Prompts

Always reference the specific spec section number in every prompt. This anchors Claude Code to the exact requirements and reduces hallucinated features.

**Instead of:**
> "Build the approval screen."

**Say:**
> "Build the approval screen per Section 3.6 of the spec."

---

## After Every Build Step

After each major component is built, ask Claude Code to verify its own output against the spec:

> "Review what you just built against Section X of the spec and list any gaps or deviations."

Do this after every component — not just at the end. Gaps compound quickly if left unchecked.

---

## The AI Prompt

Section 3.5.1 of the spec contains the exact AI prompt that must be used in `lib/ai/generate.ts`. Paste it verbatim or instruct Claude Code to copy it exactly without modification. Do not let Claude Code rewrite or paraphrase it. This is the highest-risk component for drift and the hardest to debug after the fact.

---

## Files to Create Manually Before Building

Create these files in the repository root before handing the project to Claude Code. Copy the content directly from the spec rather than asking Claude Code to generate them.

- `.env.example` — from spec Section 11.2, step 6
- `SETUP.md` — from spec Section 11.2
- `README.md` — from spec Section 11.1

Claude Code works better when it can reference concrete files rather than reconstructing content from prose.

---

## Extending the Project

When adding new features after the initial build:

- Update the spec first — add or modify the relevant sections before writing any code
- Resolve any new open questions before starting the build session
- Follow the same build order and prompt conventions above
- Do not ask Claude Code to infer requirements from existing code — always reference the spec explicitly