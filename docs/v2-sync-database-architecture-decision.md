# Prompt Library App v2 Sync and Database Architecture Decision

Date: 2026-04-26

Issue: EKA-11

Status: Proposed for v2 prototype

## Context

Prompt Library App v1.0.0, also named Prompt Shelf, is a static browser app with no build step. It stores prompt data in browser `localStorage` under `prompt-shelf-state-v1` and supports JSON import/export for backups and manual transfer between browsers.

That v1 workflow is the stable fallback. V2 planning can explore sync, database-backed storage, multi-device use, and safer long-term prompt storage, but it must not require replacing or breaking the static local v1 app until the sync version is proven.

The v2 architecture should prioritize useful multi-device behavior:

- A prompt created or edited on one device should become available on another device.
- Users should have a safer recovery path than browser storage alone.
- JSON export/import should remain available so users can leave the sync system or recover from account/backend failures.
- The prototype should answer core data durability and sync questions without forcing a full rewrite of the app at the start.

## Options Compared

### Option 1: Local-first

In a local-first approach, the browser remains the primary source of truth. Data is stored locally first, usually in IndexedDB for capacity and structured access, and sync is layered on top. The app remains useful offline and reconciles changes with a server or sync service when connectivity returns.

Potential implementation shapes:

- Move v2 local persistence from `localStorage` to IndexedDB.
- Add a sync queue and per-record metadata such as stable IDs, revision IDs, updated timestamps, deleted/tombstone markers, and last-synced revisions.
- Use a backend primarily as replication, backup, identity, and multi-device transport.

Strengths:

- Best fit with the existing product behavior: the app is already local-first and personal.
- Strong offline behavior and fast UI.
- Lower risk of blocking prompt access during auth, network, or backend outages.
- Natural fallback story: v1 remains local-only, and v2 can still keep local data usable if sync is unavailable.
- Good privacy posture relative to cloud-first because local access can remain first-class and export can stay simple.

Risks:

- Conflict handling is real product work, not just infrastructure work.
- Correct sync metadata and deletion handling must be designed carefully before users depend on it.
- More client-side complexity than cloud-first.
- Browser storage still needs backup/export guidance because local device loss is possible before sync completes.

Capability and multi-device usefulness:

- High, if sync is implemented well.
- Best for users who switch devices, work offline, or want prompt access to remain resilient.
- Supports gradual rollout because local storage can work before sync is complete.

### Option 2: Cloud-first

In a cloud-first approach, the backend database is the primary source of truth. The client reads and writes directly through authenticated APIs, with local storage used only as cache or not used at all.

Potential implementation shapes:

- Add authentication before prompt storage.
- Store prompts, tags, collections, notes, favorites, archive state, use count, and timestamps in a hosted database.
- Use server APIs or a backend-as-a-service for CRUD operations and access control.

Strengths:

- Simplest mental model for multi-device sync: the latest saved server state appears everywhere.
- Easier account recovery story if the backend is reliable.
- Easier to enforce access control and central backup policies.
- Potentially simpler conflict model if edits are online-only or last-write-wins is accepted.

Risks:

- Weakest fit with v1 because prompt access becomes dependent on network, auth, and backend availability.
- Higher privacy and trust burden because prompt content is stored centrally.
- More likely to force a rewrite before the sync assumptions are proven.
- Offline behavior either becomes poor or requires local-first machinery anyway.
- Backend mistakes can affect all users at once.

Capability and multi-device usefulness:

- High when online and authenticated.
- Lower usefulness in offline or degraded-network situations.
- Recovery can be strong, but only if auth, backups, and database operations are reliable from the start.

### Option 3: Hybrid local-primary sync

In a hybrid approach, the client keeps a local database as the primary runtime store, while an authenticated cloud backend provides account identity, cross-device replication, backup, and restore. The server is authoritative for account access and durable replication, but the local app remains capable of reading and editing data without waiting on every network round trip.

Potential implementation shapes:

- Keep v1.0.0 available unchanged as the stable static fallback.
- Build v2 persistence around IndexedDB or another browser local database instead of expanding `localStorage`.
- Add explicit sync metadata to prompt records.
- Introduce optional sign-in for sync while preserving local-only use where possible.
- Use JSON export/import as the bridge from v1 to v2 and as an ongoing escape hatch.
- Prototype a narrow sync path before expanding to every edge case.

Strengths:

- Best balance of capability, multi-device usefulness, and resilience.
- Preserves the product's local-first feel while adding real sync and recovery.
- Allows v2 to prototype database-backed sync without immediately making every workflow depend on the backend.
- Keeps v1 fallback credible because v1 export can seed v2, and v2 can continue to export portable data.
- Creates room for safer long-term storage through cloud backup and restore.

Risks:

- Most architecture work: local schema, backend schema, auth, sync metadata, and conflict handling all need decisions.
- Requires careful release criteria before replacing v1 as the recommended workflow.
- Conflict resolution and migrations must be tested with real multi-device scenarios.
- Privacy/security expectations need to be explicit because prompt text may be sensitive.

Capability and multi-device usefulness:

- Highest if implemented with clear scope.
- Supports create/edit/search/archive/favorite across devices while keeping local interaction fast.
- Can handle offline edits if the prototype includes a sync queue and conflict policy.

## Decision

Recommend a hybrid local-primary sync architecture for the v2 prototype.

The prototype should use a local browser database as the app's working store and add authenticated cloud sync as a replication and backup layer. V1.0.0 should remain unchanged and available as the stable localStorage-only fallback until the prototype proves migration, sync, conflict handling, export/restore, and deployment reliability.

This recommendation intentionally does not choose a specific database vendor yet. EKA-12 should compare storage vendors and implementation options. EKA-11's architecture decision is that v2 should not be purely cloud-first, and should not stay purely local-first without a serious sync and backup path. The most useful v2 direction is local-primary behavior with cloud-backed multi-device sync.

## Prototype Scope Recommendation

The v2 prototype should prove the smallest useful end-to-end flow:

1. Import a v1 JSON export into the v2 local database.
2. Sign in or connect a sync identity.
3. Sync prompts across two browser profiles or devices.
4. Edit a prompt on one device and observe the update on another.
5. Create a conflicting edit and verify the selected conflict policy.
6. Export the v2 library back to portable JSON.
7. Confirm v1.0.0 remains usable and unchanged.

The first prototype does not need shared team libraries, collaborative editing, rich admin tooling, or a full production account-management system. Those should wait until single-user multi-device sync is proven.

## Data Implications

The v2 data model should support at least:

- Prompt ID and stable sync ID.
- Title.
- Prompt content.
- Notes.
- Tags.
- Collection.
- Favorite state.
- Archive state.
- Use count.
- Created, updated, last used, and deleted/tombstone timestamps.
- Schema version.
- Revision or change token for sync conflict detection.

The model should preserve import compatibility with v1 fields where possible. If v1 uses `folder`, v2 can either continue that field name internally or migrate it explicitly to `collection` with a documented mapping.

## Conflict Policy for Prototype

For the prototype, use explicit conflict detection rather than silent last-write-wins.

Recommended starting policy:

- Non-overlapping field updates can merge automatically when safe.
- Concurrent edits to prompt title, content, or notes should preserve both versions and ask the user to choose or copy from each version.
- Favorite, archive, use count, and last-used updates can use deterministic field-level rules, documented in the sync strategy.
- Deletes should use tombstones so another device does not accidentally resurrect deleted prompts.

Last-write-wins may be acceptable for low-risk metadata in the prototype, but it should not silently overwrite prompt content.

## Serious Risks to Track

- Data loss during migration from v1 JSON or during first sync.
- Silent overwrite of prompt content during conflicts.
- Backend outage preventing access if the architecture drifts toward cloud-first.
- Sensitive prompts being stored or logged in places users do not expect.
- Account loss or auth provider failure trapping user data.
- Browser storage quota, private browsing, or IndexedDB failure modes.
- Schema migration mistakes after users have synced data.
- Export/restore gaps that make v2 harder to leave than v1.

## Release Criteria Before V2 Replaces V1

V2 should not replace v1.0.0 as the recommended workflow until:

- V1 JSON export migration has been tested with valid, partial, duplicate-ID, and malformed data.
- Two-device sync works for create, edit, archive, favorite, delete, and restore/export paths.
- Prompt-content conflicts are detectable and recoverable.
- Export/restore works without requiring the original backend account.
- Privacy and security review is complete.
- Deployment has a rollback path to the static v1 build.
- Browser support covers the same practical baseline as v1, plus any browsers needed for the chosen storage layer.

## Follow-up Issues

- EKA-12: Database/storage options comparison.
- EKA-13: Authentication and user identity plan.
- EKA-14: Data model for prompts, tags, collections, favorites, archive, notes, useCount, timestamps.
- EKA-15: Migration path from v1 localStorage JSON export.
- EKA-16: Sync conflict handling strategy.
- EKA-17: Backup/export/restore design.
- EKA-18: Deployment options.
- EKA-19: Privacy/security review.
- EKA-20: v2 prototype scope.
- EKA-21: v2 release criteria.
