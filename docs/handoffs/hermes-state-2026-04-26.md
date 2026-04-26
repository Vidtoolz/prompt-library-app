# Hermes State Update — Prompt Library App

Date: 2026-04-26  
Project: Prompt Library App  
Repo: https://github.com/Vidtoolz/prompt-library-app  
Local path: /home/vidtoolz/prompt-library-app  
Linear workspace: eka vidnux hermes codex  
Linear project v1: Prompt Library App  
Linear project v2: Prompt Library App v2 — Sync & Database  

## Current stable release

Prompt Library App v1.0.0 is complete.

Git markers:

- main = active development branch
- v1-stable = stable local v1 fallback branch
- v1.0.0 = exact v1 release tag

v1 is a static localStorage-based app. It should remain available as the fallback while v2 sync/database work is explored.

## v1 completed features

- Prompt library
- Search
- Favorites
- Tags
- Collections
- Archive
- Prompt detail editor
- Notes
- Copy button
- Duplicate/delete
- Import/export JSON
- Keyboard shortcuts
- localStorage persistence
- Responsive layout
- Safer delete confirmation
- Hardened JSON import/export
- README documentation

## v1 completed Linear issues

- EKA-5 Manual browser testing pass — Done
- EKA-6 Harden JSON import/export — Done
- EKA-7 Responsive layout testing — Done
- EKA-8 README documentation — Done
- EKA-9 GitHub repository setup — Done
- EKA-10 Complete v1 release checklist — Done

## v1 release note

A Linear document named “v1.0.0 Release Note” was created. It notes the v1.0.0 tag, completed backlog, known risks, and v2 planning direction.

## Integrations proven

The working loop is:

Idea → Codex builds → GitHub stores code → Linear tracks work → release tag → Linear release note

Confirmed working:

- Codex ↔ Linear MCP
- Linear ↔ GitHub
- Vidnux ↔ GitHub
- GitHub token push from Vidnux
- Local v1 fallback branch and tag

## Hermes Linear helper

A project-local helper exists at:

scripts/linear.mjs

It supports:

- list teams
- list projects
- list open issues
- create issue
- add comment
- mark issue done

It currently lives inside prompt-library-app, not yet in a general Hermes tools repo. Later it should probably be moved or copied into a general Hermes tools location.

No secrets were hardcoded. It expects LINEAR_API_KEY from the environment or:

~/.config/hermes/secrets/linear.env

## v2 planning project

Created Linear project:

Prompt Library App v2 — Sync & Database

Goal:

Move beyond localStorage toward sync/database/multi-device use while keeping v1.0.0 as the stable fallback.

Recommended v2 direction:

- Hybrid local-primary sync architecture
- IndexedDB/Dexie for local storage
- Firebase Auth + Firestore for managed sync
- Versioned JSON export/import retained
- v1.0.0 remains fallback

## v2 planning docs already merged into main

- docs/v2-sync-database-architecture-decision.md
- docs/v2-database-storage-options.md
- docs/v2-data-model.md
- docs/v2-sync-conflict-handling.md
- docs/v2-v1-json-migration.md
- docs/v2-backup-export-restore.md

## v2 planning issues completed

- EKA-11 Architecture decision — Done
- EKA-12 Database/storage options comparison — Done
- EKA-14 Data model — Done
- EKA-16 Sync conflict handling strategy — Done
- EKA-15 Migration path from v1 JSON export — Done
- EKA-17 Backup/export/restore design — Done
- EKA-13 Authentication and user identity plan — Done, PR #7 pending merge at last known state

## PR waiting at last known state

PR #7:

https://github.com/Vidtoolz/prompt-library-app/pull/7

Contains:

docs/v2-authentication-identity.md

Next action:

- Mark PR #7 Ready for review
- Merge it
- Pull main locally

## Next v2 issue

Next planned issue:

EKA-18 Deployment options

Suggested Codex task:

Create a v2 deployment options planning document comparing GitHub Pages, Netlify, Vercel, Firebase Hosting, Cloudflare Pages, and local/self-hosted use. Recommend the minimum deployment approach for the v2 prototype.

## Important project rule

Do not break v1.0.0. v1-stable and v1.0.0 exist as fallback. v2 can evolve on main, but v1 localStorage workflow should remain recoverable.
