---
title: Prompt Library App Deployment Options
type: handoff
status: active
project: Prompt Library App
created_at: 2026-04-29
updated_at: 2026-04-29
---

# Prompt Library App Deployment Options

## Goal

Document the EKA-18 deployment options planning work for Prompt Library App and preserve the recommended local-first deployment path for the next v2 prototype phase.

## What Changed

Created `docs/v2-deployment-options.md`.

The planning document compares simple deployment paths for the current static Prompt Library App:

- Static local app.
- GitHub Pages.
- Local network hosting.
- Lightweight VPS/static host later.
- Keeping `v1-stable` / `v1.0.0` as the rollback path.

No app behavior was changed.

## Current State

The recommendation is to keep v2 as a static local app first.

Use local network hosting for device testing when a phone, tablet, second browser profile, or second machine needs to access the app from the same network.

Use GitHub Pages only when a shareable static preview is needed.

Defer VPS/static hosts until there is a concrete reason, such as custom domain needs, production-like HTTPS/header behavior, or a future sync/backend deployment requirement.

`v1-stable` and `v1.0.0` remain the rollback path for the known-good localStorage-only app.

Local checks run:

```sh
node tests/run-tests.js
node --check app.js
node --check prompt-model.js
node --check storage-adapter.js
node --check tests/run-tests.js
```

All checks passed.

## Open Problems

- No deployment has been performed yet.
- A future hosted preview still needs an explicit source branch or folder decision before enabling GitHub Pages or any other static host.
- A manual checklist for local, LAN, and hosted-origin storage behavior should be added before the first hosted preview.
- Asset paths should be verified from both `/` and a project subpath before enabling GitHub Pages.

## Next Action

Review `docs/v2-deployment-options.md` and decide whether the recommendation is acceptable for EKA-18.

If accepted, keep development local-first and use local network hosting for near-term multi-device checks. Do not enable public hosting until there is a clear preview need.

## Recommended Linear Action

Comment on EKA-18 with the summary:

```text
Created docs/v2-deployment-options.md. Recommendation: keep v2 as a static local app first, use local network hosting for device testing, use GitHub Pages only when a shareable preview is needed, defer VPS/static hosts, and keep v1-stable / v1.0.0 as the rollback path. Local checks passed.
```

Then move EKA-18 to review or done, depending on the project workflow.

## Recommended GitHub Action

Commit the docs-only change and open a pull request for EKA-18 if the branch workflow requires review.

Suggested commit message:

```text
docs: add deployment options plan
```
