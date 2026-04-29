---
title: Prompt Library App Local Validation Workflow
type: handoff
status: active
project: Prompt Library App
created_at: 2026-04-29
updated_at: 2026-04-29
---

# Prompt Library App Local Validation Workflow

## Goal

Make the local validation workflow after EKA-18 easier to run and record without deploying, calling external APIs, adding dependencies, or changing app behavior.

## What Changed

Created `docs/manual-validation-log-2026-04-29.md` as a reusable manual validation record for local checks.

The log covers:

- Localhost app load.
- Create/edit prompt.
- Favorite/unfavorite.
- Tag or collection behavior.
- JSON export.
- JSON import/restore.
- Browser refresh persistence.
- `v1-stable` rollback note.
- Known issues found.
- Final result.

Created `scripts/serve-local.sh`, a small wrapper that serves the static app from the repository root with:

```sh
python3 -m http.server 8000
```

No app behavior was changed.

## Current State

The app remains a no-build static browser app. Local validation should start with:

```sh
scripts/serve-local.sh
```

Then open:

```text
http://localhost:8000/
```

The manual validation log is ready to fill in during browser testing.

## Open Problems

- Manual browser validation has not been recorded in the log yet.
- No deployment has been performed.
- Hosted preview behavior remains out of scope until a separate deployment decision is made.
- Browser storage remains origin-scoped; localhost, LAN URLs, `file://`, and future hosted URLs should be treated as separate storage contexts.

## Next Action

Run the local server, complete `docs/manual-validation-log-2026-04-29.md` in a browser, and record any issues found under the known issues section.

## Recommended Linear Action

Update EKA-18 with the local validation workflow files and note that actual manual browser results still need to be recorded if they have not been completed.

## Recommended GitHub Action

Commit the local validation workflow changes after checks pass.

Suggested commit message:

```text
docs: add local validation workflow
```
