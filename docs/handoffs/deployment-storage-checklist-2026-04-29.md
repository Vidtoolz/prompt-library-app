---
title: Prompt Library App Deployment Storage Checklist
type: handoff
status: active
project: Prompt Library App
created_at: 2026-04-29
updated_at: 2026-04-29
---

# Prompt Library App Deployment Storage Checklist

## Goal

Add a concise manual checklist that supports the deployment-options decision for Prompt Library App without deploying anything, calling external APIs, or changing app behavior.

## What Changed

Created `docs/deployment-storage-checklist.md`.

The checklist covers three test contexts:

- Local localhost testing.
- LAN testing from another device.
- Future hosted preview, such as GitHub Pages.

Each context includes checks for app load, asset paths, browser storage origin behavior, JSON export, JSON import/restore, cross-origin data expectations, and the `v1-stable` rollback path.

No app behavior was changed.

## Current State

Deployment remains local-first.

The checklist is ready to use before any hosted preview is enabled. It reinforces the existing deployment-options recommendation:

```text
Primary: static local app served from the repo.
Testing: local network hosting when another device is needed.
First hosted preview: GitHub Pages, only after local checks and a clear preview need.
Fallback: v1-stable / v1.0.0 static app.
```

## Validation

Run these local checks after the docs-only change:

```sh
node tests/run-tests.js
node --check app.js
node --check prompt-model.js
node --check storage-adapter.js
node --check tests/run-tests.js
```

Expected result: all checks pass.

## Open Problems

- No deployment has been performed.
- Future GitHub Pages or other hosted preview still needs an explicit source branch or folder decision.
- The hosted-preview section remains a future checklist until a hosted preview exists.
- Actual manual browser validation still needs to be performed in each target context before using that context as release evidence.

## Next Action

Use `docs/deployment-storage-checklist.md` during local, LAN, and future hosted-preview validation.

Before enabling a hosted preview, document the deployment source and confirm asset paths from the hosted project subpath.

## Recommended GitHub Action

Commit the docs-only change if the branch workflow requires it.

Suggested commit message:

```text
docs: add deployment storage checklist
```
