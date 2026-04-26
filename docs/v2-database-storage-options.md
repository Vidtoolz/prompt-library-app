# Prompt Library App v2 Database and Storage Options

Date: 2026-04-26

Issue: EKA-12

Status: Proposed for v2 prototype planning

## Context

EKA-11 recommends a hybrid local-primary sync architecture for Prompt Library App v2: the app should keep a local browser database as the working store while adding authenticated cloud sync as a replication and backup layer.

Prompt Library App v1.0.0 remains the stable fallback. V1 is a static app with no build step, stores data in browser `localStorage` under `prompt-shelf-state-v1`, and uses JSON export/import for backup and manual transfer. V2 storage work must not break that static local workflow.

This document compares storage options for the v2 hybrid architecture, focusing on:

- Multi-device sync.
- Offline behavior.
- Conflict handling.
- Migration from v1 JSON export.
- Hosting complexity.
- Cost shape.
- Suitability for a solo creator tool.

## Evaluation Summary

| Option | Multi-device sync | Offline behavior | Conflict handling | Hosting complexity | Cost shape | Solo creator fit |
| --- | --- | --- | --- | --- | --- | --- |
| IndexedDB with Dexie | Needs custom sync or Dexie Cloud | Strong local browser storage | App-owned unless using Dexie Cloud | Low locally; medium with custom backend | Free locally; service cost if cloud sync | Best local foundation |
| SQLite in browser | Needs custom sync layer | Strong if OPFS works | App-owned | Medium/high due workers, OPFS, headers | Free locally; backend cost separate | Powerful but likely heavy for prototype |
| Supabase/Postgres | Realtime helps online sync, not offline-first by itself | Needs local cache/queue | App-owned | Medium | Free tier possible, paid project if grown | Strong backend candidate |
| Firebase/Firestore | Built-in client sync and offline cache | Good built-in offline cache | Last-write-wins by default | Low/medium | Free tier possible, read/write billing | Fastest managed sync prototype |
| Turso/LibSQL | Promising SQLite-backed sync direction | Good in supported local replica/sync modes | Needs careful validation | Medium/high for browser fit | Free tier possible, sync/storage metered | Watchlist, not first prototype |
| File-based/export-only | Manual only | Excellent local fallback | Human/manual | Very low | Free | Required fallback, not enough for v2 sync |

## Option 1: IndexedDB with Dexie

IndexedDB is the browser-native structured storage choice. Dexie provides a cleaner API, schema versions, indexed queries, transactions, and a practical development model on top of IndexedDB. Dexie Cloud can add optional sync, authentication, access control, and real-time collaboration to a Dexie app.

### Multi-device sync

Plain Dexie does not solve multi-device sync. It is a strong local store, but sync still needs one of:

- A custom sync backend.
- Dexie Cloud.
- Another server transport layered over Dexie records.

Dexie Cloud is attractive because it keeps the app offline-first and adds sync/auth without building the whole backend.

### Offline behavior

Excellent. IndexedDB is designed for browser persistence and works naturally with a local-primary architecture. It avoids v1's `localStorage` limits and synchronous API.

### Conflict handling

With plain Dexie, Prompt Library App owns conflict detection and resolution. That is good for preserving prompt content safely, but it requires explicit metadata: sync IDs, revision tokens, updated timestamps, deleted/tombstone records, and field-level merge rules.

With Dexie Cloud, some sync mechanics move to the service, but the app should still define prompt-specific conflict behavior. Prompt text conflicts should not silently overwrite.

### Migration from v1 JSON

Very good. The v1 export format can be imported into local IndexedDB first, validated, assigned v2 sync metadata, and then synced. That gives a safe migration sequence:

1. Parse v1 JSON.
2. Validate and normalize.
3. Write to local v2 tables.
4. Export v2 backup.
5. Sync only after the local migration looks correct.

### Hosting complexity

Local-only Dexie keeps the static app shape simple. Dexie Cloud would add a hosted service dependency but avoids building and operating a custom backend. A custom sync backend would raise complexity.

### Cost

Plain Dexie and IndexedDB are free. Dexie Cloud introduces service pricing if used beyond free/testing capacity.

### Solo creator suitability

High. This is the best local database foundation for a static browser app. It is understandable, browser-native, and compatible with keeping v1 as fallback.

## Option 2: SQLite Options

SQLite options include browser SQLite through WebAssembly and OPFS, server-side SQLite, or SQLite-compatible services. For browser use, SQLite Wasm plus OPFS can provide a real relational database locally.

### Multi-device sync

SQLite alone does not provide multi-device sync. Sync requires a separate replication layer, a server API, a SQLite sync service, or a product such as Turso/LibSQL.

### Offline behavior

Potentially strong. Browser SQLite can be durable and expressive, but OPFS has practical constraints:

- It runs in worker-thread contexts.
- It can require cross-origin isolation headers for some modes.
- Multi-tab locking and concurrency need careful handling.
- Browser support and private browsing behavior need testing.

### Conflict handling

SQLite gives transactions and relational structure, but not prompt-level sync conflict semantics. The app still needs revision metadata, tombstones, and merge logic.

### Migration from v1 JSON

Good, but heavier than IndexedDB/Dexie. JSON import can map cleanly into relational tables, but schema migrations and browser SQLite packaging add more prototype work.

### Hosting complexity

Medium to high for a browser-only prototype. It may require WebAssembly assets, workers, OPFS handling, and hosting headers. This is more moving parts than the current static app.

### Cost

Free locally. Any sync/backend layer has separate cost.

### Solo creator suitability

Medium. SQLite is technically strong, but it is likely too heavy for the first v2 prototype unless later requirements demand relational querying, local SQL, or a SQLite-native sync service.

## Option 3: Supabase/Postgres

Supabase provides managed Postgres, Auth, Realtime, Storage, and related platform services. For v2, Supabase would most likely be the cloud replication/backend layer paired with a local browser database.

### Multi-device sync

Good as a backend source of durable synced records. Supabase Realtime can notify clients about database changes, and Postgres gives a mature relational model for prompts, tags, collections, and user ownership.

Supabase is not automatically local-first on its own. A v2 hybrid architecture still needs local IndexedDB/Dexie plus a custom sync queue and reconciliation logic.

### Offline behavior

Not built in at the same level as Firestore's offline client cache or Dexie local-first behavior. Offline behavior should live in the local database. Supabase should be treated as the remote sync target.

### Conflict handling

App-owned. Postgres can enforce constraints and store revisions, but it will not decide how to merge concurrent prompt text edits. The app should store revision numbers or updated tokens and reject or preserve conflicting writes.

### Migration from v1 JSON

Good. Import into local v2 storage first, then push normalized records to Supabase. Postgres is a good long-term home for structured data and backups.

### Hosting complexity

Medium. Supabase reduces backend setup compared with building everything from scratch, but the app still needs:

- Auth configuration.
- Row Level Security policies.
- Schema migrations.
- Sync API or direct client writes.
- Realtime subscription design.
- Backup/export/restore discipline.

### Cost

Free tier is useful for prototyping. Paid usage is tied to organization/project plan and quota consumption such as database size, auth users, realtime messages, and egress.

### Solo creator suitability

High as the backend candidate if the project is willing to own sync logic. It is transparent, SQL-based, portable, and easier to inspect than a document-only store.

## Option 4: Firebase/Firestore

Firestore is a managed document database with web/mobile SDKs, security rules, realtime listeners, and built-in offline persistence. It can be used as both the remote database and local cache layer.

### Multi-device sync

Very strong out of the box. Firestore clients can listen to documents and collections and receive updates across devices. It is likely the fastest path to proving basic multi-device prompt sync.

### Offline behavior

Strong. Firestore supports offline data persistence for web apps, can read/write/listen/query cached data offline, and syncs local changes when the device returns online. On web, persistent cache must be configured and has browser constraints.

### Conflict handling

Firestore's default multiple-change behavior is last-write-wins for the same document. That is a serious risk for prompt content. The prototype should avoid storing a whole prompt as one blindly overwritten document without app-level conflict detection.

Safer Firestore usage would include:

- `revision` or `updatedAt` preconditions.
- Conflict records when a stale client attempts to overwrite prompt content.
- Field-level rules for low-risk metadata.
- Tombstones for deletes.

### Migration from v1 JSON

Good. A v1 JSON import can create Firestore documents after validation. For the v2 hybrid target, import should still happen locally first so the user can verify the migration and export a backup.

### Hosting complexity

Low to medium. Firebase Auth, Firestore, Hosting, and security rules are integrated. The main complexity is data modeling, cost control, and avoiding silent last-write-wins conflicts.

### Cost

Free quota is useful for prototyping. Paid usage is based on stored data, document reads/writes/deletes, indexes, and bandwidth. Listener behavior can create read costs, so the app should keep queries narrow.

### Solo creator suitability

High for a prototype if speed matters more than SQL portability. It is the fastest managed option for basic two-device sync, but the conflict model needs discipline.

## Option 5: Turso/LibSQL

Turso/LibSQL is attractive because it keeps a SQLite-like model while adding cloud database features and sync/replication options. The docs now distinguish legacy embedded replicas from newer Turso Sync for true local-first reads/writes with explicit push/pull.

### Multi-device sync

Promising, especially for SQLite-minded architectures. However, the browser fit and sync behavior need a spike before choosing it as the first prototype stack. Some replica models are more natural for server/mobile/desktop environments than a simple static browser app.

### Offline behavior

Potentially strong where local replicas and offline-first writes are supported. For this app, the risk is whether the browser deployment model stays simple and whether the implementation works cleanly across the target browsers.

### Conflict handling

Needs validation. SQLite-compatible replication does not remove the need for prompt-level conflict policy. The app still needs revision metadata and content conflict handling.

### Migration from v1 JSON

Good if the data lands in SQL tables. The migration itself is straightforward; browser packaging and sync integration are the harder parts.

### Hosting complexity

Medium to high for this specific app today. Turso may be a strong later candidate, but it should be proven with a small spike before committing the v2 prototype to it.

### Cost

Free tier appears prototype-friendly, with usage metered around storage, rows read/written, and sync volume as the app grows.

### Solo creator suitability

Medium. Technically interesting and potentially powerful, but less direct than Dexie/Firestore or Dexie/Supabase for a static browser-first tool.

## Option 6: File-Based / Export-Only Fallback

This keeps the v1-style model: browser-local data plus explicit JSON export/import. It can be improved with clearer backups, schema versions, and restore previews, but it does not create real sync.

### Multi-device sync

Manual only. Users export from one device and import on another.

### Offline behavior

Excellent because there is no backend dependency.

### Conflict handling

Manual and error-prone. Import can detect duplicate IDs and offer import/replace choices, but it cannot provide real multi-device merge unless the app adds significant import conflict UI.

### Migration from v1 JSON

Excellent because this is already the v1 path.

### Hosting complexity

Very low.

### Cost

Free.

### Solo creator suitability

High as a fallback and escape hatch. Not sufficient as the v2 storage stack because it does not solve the multi-device usefulness goal.

## Recommendation

Use **IndexedDB with Dexie as the local v2 database**, paired with **Firestore as the first managed sync prototype backend**.

This is the recommended v2 prototype stack:

- Local working store: IndexedDB through Dexie.
- Remote sync/backend: Firebase Auth plus Firestore.
- Backup and portability: versioned JSON export/import remains mandatory.
- V1 fallback: keep v1.0.0 localStorage-only workflow unchanged until v2 proves migration, sync, conflicts, export/restore, privacy/security, and deployment reliability.

### Why this stack

Dexie is the cleanest local foundation for a browser-first static app. It keeps the hybrid local-primary direction honest: the app can read, search, edit, and export from local data even when sync is unavailable.

Firestore is the fastest way to test useful multi-device sync without building a custom Postgres sync service first. It provides managed realtime listeners, auth integration, offline persistence, and a mature web SDK. The main risk, last-write-wins conflicts, is known and can be explicitly tested in the prototype.

### Why not Supabase first

Supabase/Postgres is a strong longer-term backend candidate, especially if SQL portability, relational integrity, and direct database ownership matter more than speed of sync prototyping. It should remain the second candidate after the Firestore prototype or be selected if EKA-13/EKA-19 strongly prefer Postgres/RLS and lower platform lock-in.

The reason not to pick it first is that local-first sync behavior would be app-owned from day one. That adds backend schema, RLS, realtime subscriptions, sync queues, conflict APIs, and reconciliation work before the project has proven the v2 user experience.

### Why not Dexie Cloud first

Dexie Cloud is compelling and may be the lowest-code local-first path. It should be considered as a prototype accelerator if the project is comfortable with its service model. The reason to avoid making it the default recommendation is that Firebase/Supabase are more broadly familiar backend choices, and Firestore makes it easier to evaluate a mainstream managed sync path before committing to a narrower ecosystem.

### Why not SQLite/Turso first

SQLite and Turso/LibSQL are worth tracking, but they increase prototype complexity for a static browser app. Browser SQLite brings OPFS, workers, headers, and locking concerns. Turso sync is promising, but should get a focused spike before being used as the first v2 prototype storage layer.

### Why not file/export-only

It remains required as the fallback and escape hatch, but it fails the v2 goal of useful multi-device sync.

## Prototype Guardrails

The prototype should prove:

1. Import v1 JSON into Dexie.
2. Add v2 sync metadata locally before cloud upload.
3. Sign in with a test identity.
4. Sync a prompt library to Firestore.
5. Open a second browser profile/device and hydrate local Dexie from Firestore.
6. Edit prompt content on both devices while offline or before sync and verify conflict handling.
7. Preserve both versions on content conflict; do not silently last-write-wins prompt text.
8. Export a complete v2 JSON backup without relying on Firestore.
9. Confirm v1.0.0 still runs unchanged and can import/export its original format.

## Minimum Data Shape for the Prototype

Prompt records should include:

- `id`: local record ID.
- `syncId`: stable cross-device ID.
- `ownerId`: authenticated user ID for synced records.
- `title`.
- `content`.
- `notes`.
- `collection`.
- `tags`.
- `favorite`.
- `archived`.
- `useCount`.
- `createdAt`.
- `updatedAt`.
- `lastUsedAt`.
- `deletedAt`.
- `schemaVersion`.
- `revision`.
- `lastSyncedRevision`.

Use tombstones for deletes so a device that has been offline does not resurrect deleted prompts.

## Cost and Operational Notes

For a solo creator tool, all serious candidates should fit inside free or low-cost prototype tiers. The larger risk is not raw storage cost; it is accidental read/write/listener usage, unclear account recovery, missing export, and backend lock-in.

Prototype cost controls:

- Sync only the authenticated user's records.
- Avoid broad realtime listeners over every record if the library grows.
- Paginate or scope remote reads where possible.
- Keep local search local instead of querying the backend on every keystroke.
- Add export/restore before inviting real usage.
- Set budget alerts before using any paid backend plan.

## Sources Checked

- Dexie Cloud documentation: https://dexie.org/docs/cloud
- SQLite Wasm persistent storage options: https://sqlite.org/wasm/doc/92e1d3dab4/persistence.md
- Supabase billing documentation: https://supabase.com/docs/guides/platform/billing-on-supabase
- Firebase Firestore offline persistence documentation: https://firebase.google.com/docs/firestore/manage-data/enable-offline
- Firebase Firestore pricing documentation: https://firebase.google.com/docs/firestore/pricing
- Turso embedded replicas and sync direction: https://docs.turso.tech/features/embedded-replicas/introduction
- Turso pricing: https://turso.tech/pricing
