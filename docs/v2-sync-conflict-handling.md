# Prompt Library App v2 Sync Conflict Handling

Date: 2026-04-26

Issue: EKA-16

Status: Proposed for v2 prototype planning

## Context

Prompt Library App v2 is planned around the chosen hybrid local-primary architecture:

- Local working store: IndexedDB through Dexie.
- Managed sync/backend: Firebase Auth plus Firestore.
- Data model: prompt-centered v2 schema with prompt revisions, device provenance, sync metadata, and `deletedAt` tombstones.
- Stable fallback: v1.0.0 remains the localStorage-only workflow until v2 sync is proven.

The conflict strategy must protect prompt content first. Metadata can merge automatically when safe, but title, prompt body, and notes must not be silently overwritten by last-write-wins behavior.

## Goals

- Keep local edits usable while offline.
- Sync across multiple devices without losing prompt content.
- Detect stale writes before Firestore overwrites meaningful fields.
- Preserve deleted/tombstoned records long enough to prevent resurrection.
- Provide a small, understandable user-facing conflict workflow.
- Keep the first prototype narrow enough to validate the architecture.

## Non-Goals for the First Prototype

- Real-time collaborative editing inside the same prompt body.
- Shared team libraries.
- Full version history UI.
- Complex CRDT/operational-transform text merging.
- First-class synced tag and collection rename workflows.

## Conflict-Relevant Fields

From the v2 data model, every prompt should include:

```json
{
  "syncId": "stable_remote_id",
  "ownerId": "firebase_uid_or_null",
  "localDeviceId": "device_id",
  "updatedByDeviceId": "device_id",
  "title": "",
  "content": "",
  "notes": "",
  "collectionName": "Workspace",
  "tags": [],
  "favorite": false,
  "archived": false,
  "useCount": 0,
  "createdAt": "2026-04-26T00:00:00.000Z",
  "updatedAt": "2026-04-26T00:00:00.000Z",
  "lastUsedAt": null,
  "deletedAt": null,
  "revision": 1,
  "remoteRevision": 0,
  "baseRevision": 0,
  "lastSyncedRevision": 0,
  "syncStatus": "local-only"
}
```

Minimum local conflict records should preserve both sides:

```json
{
  "id": "conflict_id",
  "entityType": "prompt",
  "entityId": "local_prompt_id",
  "syncId": "remote_prompt_id",
  "localRevision": 4,
  "remoteRevision": 5,
  "baseRevision": 3,
  "localSnapshot": {},
  "remoteSnapshot": {},
  "status": "open",
  "createdAt": "2026-04-26T00:00:00.000Z",
  "resolvedAt": null
}
```

## Revision Model

Use an optimistic revision model.

- `revision`: local logical revision; increments on every local user edit.
- `baseRevision`: remote revision the current local edit was based on.
- `remoteRevision`: latest remote revision observed for the prompt.
- `lastSyncedRevision`: local revision confirmed pushed to Firestore.

Firestore documents should include `remoteRevision` and `serverUpdatedAt`. Each successful remote write increments `remoteRevision`.

When pushing an update:

1. Read or transact against the remote document.
2. If remote `remoteRevision` equals local `baseRevision`, push can proceed.
3. If remote `remoteRevision` is newer than local `baseRevision`, compare changed fields.
4. Auto-merge only fields covered by safe rules.
5. Create a local conflict record when meaningful fields changed on both sides.

## updatedAt Handling

`updatedAt` is useful for display and sorting, but it should not be the only conflict detector.

Rules:

- Treat `updatedAt` as a user-visible timestamp, not an authority.
- Use `remoteRevision`/`baseRevision` for conflict detection.
- Preserve the latest meaningful edit timestamp when merging.
- Do not resolve content conflicts solely by whichever `updatedAt` is newest.
- Allow local clock skew; Firestore `serverUpdatedAt` can order sync operations, but user-visible `updatedAt` should remain the client edit timestamp.

Safe default:

- If only `updatedAt` differs and no user fields differ, take the newer timestamp and mark the record synced.
- If `updatedAt` differs because content fields differ, use the field conflict rules below.

## Field-Level Merge Rules

### Must preserve both versions on conflict

These fields carry high-value user-authored prompt content:

- `title`
- `content`
- `notes`

If local and remote both changed any of these fields since `baseRevision`, create a conflict record. Do not silently pick one side.

### Can auto-merge when only one side changed

If a field changed on only one side since the base snapshot, take the changed value.

Examples:

- Device A edits `content`.
- Device B toggles `favorite`.
- Merge both changes automatically.

### Deterministic metadata rules

Use safe automatic rules for lower-risk fields:

| Field | Prototype rule |
| --- | --- |
| `favorite` | Last metadata write wins if no content conflict exists. |
| `archived` | Last metadata write wins if no delete tombstone exists. |
| `collectionName` | Auto-merge if one side changed; conflict if both sides changed to different non-empty names. |
| `tags` | Union additions when possible; preserve both sets if one side removed tags while the other added/renamed. |
| `useCount` | Merge by delta when base is known; otherwise use max. |
| `lastUsedAt` | Use latest valid timestamp. |
| `updatedAt` | Latest meaningful edit timestamp after merge. |

Safe default:

- When in doubt, preserve both versions and ask the user.

## deletedAt Tombstones

Deletes must use `deletedAt` tombstones, not immediate physical removal.

Tombstone rules:

- A delete sets `deletedAt`, increments `revision`, and queues `pending-delete`.
- Firestore keeps the tombstone document with `deletedAt` set.
- Local Dexie keeps the tombstone until all active devices are expected to have pulled it or until a retention window expires.
- Tombstoned prompts are excluded from normal library views and default exports.
- Full backup/export can optionally include tombstones.

Conflict rules:

| Scenario | Prototype behavior |
| --- | --- |
| Local edit vs remote delete | Create conflict. Show local edited version and remote deleted state. |
| Local delete vs remote edit | Create conflict. Show remote edited version and local deleted state. |
| Delete on both sides | Merge tombstone; keep earliest `deletedAt` or latest remote revision. |
| Remote tombstone arrives for a clean local record | Apply tombstone locally. |
| Offline device edits a tombstoned prompt unknowingly | Create conflict when reconnecting. |

Safe default:

- Deletion never silently destroys an unsynced local content edit.
- A tombstone prevents prompt resurrection unless the user explicitly restores a version.

## Multi-Device Edit Flow

Example:

1. Device A and Device B both pull prompt `P` at `remoteRevision = 3`.
2. Device A edits `content`, local `revision = 4`, `baseRevision = 3`.
3. Device A syncs successfully; Firestore becomes `remoteRevision = 4`.
4. Device B edits `notes`, local `revision = 4`, `baseRevision = 3`.
5. Device B tries to sync and sees remote `remoteRevision = 4`.
6. The sync engine compares fields changed since base.
7. If A changed `content` and B changed `notes`, create a conflict because both are high-value content fields.

The prototype should be conservative for authored text. A later version can add smarter merge UI for non-overlapping text fields.

## Offline Edits

Local Dexie remains writable offline.

Offline behavior:

- Every local edit increments `revision`.
- Each edit creates or updates a pending sync event.
- `syncStatus` becomes `pending-create`, `pending-update`, or `pending-delete`.
- The app should show that changes are saved locally but not fully synced.
- When connectivity returns, queued operations replay in revision order per prompt.

Offline safety:

- Do not collapse multiple local edits into a state that loses the base snapshot needed for conflict comparison.
- Keep enough pre-edit/base state to identify which fields changed locally.
- If the base snapshot is missing, compare current local vs current remote conservatively and create a conflict for authored content differences.

## Duplicate Imported Prompts

V1 import has two modes: `IMPORT` adds copies and `REPLACE` overwrites the local library. V2 should keep that mental model.

Duplicate cases:

| Case | Prototype behavior |
| --- | --- |
| Same v1 `id` imported twice with `IMPORT` | Generate new `syncId` values; keep `v1Id` for traceability. No conflict. |
| Same v1 `id` imported with `REPLACE` before sync | Replace local library after explicit confirmation and backup prompt. |
| Import matches existing synced `syncId` | Treat as restore/update candidate; require user confirmation before overwriting. |
| Import has same title/content but different ID | Do not auto-dedupe in prototype; optionally flag as possible duplicate. |
| Same v1 file imported on two devices before first sync | Upload creates separate prompts unless import session dedupe is implemented. |

Safe default:

- Prefer duplicate prompts over accidental overwrite.
- Detect and report possible duplicates, but do not merge them silently.
- Keep `v1Id`, `importSource`, and import timestamp for diagnostics.

## Tag and Collection Changes

For the prototype, tags and collections are derived from prompt fields:

- `tags`: string array on prompt.
- `collectionName`: string on prompt.

Tag rules:

- If only one side changed tags, take that side.
- If both sides added tags, use case-insensitive union.
- If one side removed a tag and the other side kept or added tags, preserve both sets and flag if removal intent is ambiguous.
- Normalize tags by trimming and deduping case-insensitively.

Collection rules:

- If only one side changed `collectionName`, take that side.
- If both sides changed `collectionName` to the same normalized value, merge.
- If both sides changed to different values, create a conflict record or include it in the prompt conflict UI.

Safe default:

- Tag additions can merge automatically.
- Tag removals and collection renames are more likely to reflect user intent; avoid silent destructive merges.

## useCount and lastUsedAt

`useCount` is telemetry-like user metadata. It should not block content sync.

Recommended prototype strategy:

- Track local use-count increments as deltas when possible.
- If base value is known, merged `useCount = remoteUseCount + localDelta`.
- If base value is unknown, merged `useCount = max(localUseCount, remoteUseCount)`.
- `lastUsedAt = max(localLastUsedAt, remoteLastUsedAt)`.

This avoids most lost increments without adding a separate event stream.

Future option:

- Store use events per device and derive `useCount`; skip this for the first prototype.

## Conflict Record Lifecycle

Conflict records live locally in Dexie.

Lifecycle:

1. Sync detects a conflict.
2. Write a `conflicts` record with local and remote snapshots.
3. Mark prompt `syncStatus = conflict`.
4. Keep the local prompt editable only after the user chooses a resolution, or allow editing a draft copy.
5. User resolves by choosing local, remote, restore deleted, keep deleted, or merged version.
6. Resolution writes a new prompt revision and queues sync.
7. Conflict status becomes `resolved-local`, `resolved-remote`, `resolved-merged`, or `dismissed`.

Conflict record should not include secrets, auth tokens, or raw provider error payloads.

## User-Facing Conflict Resolution

The UI should be simple and explicit.

Minimum conflict UI:

- Show a badge or filtered view for prompts needing attention.
- For each conflict, show:
  - local version title/content/notes/metadata summary,
  - remote version title/content/notes/metadata summary,
  - timestamps and device labels if available,
  - whether one side deleted the prompt.
- Actions:
  - Keep local version.
  - Keep remote version.
  - Keep both as separate prompts.
  - Restore deleted version.
  - Keep deleted.

For the first prototype, manual text merge can be simple:

- User copies from local/remote into a single editable resolved version.
- Saving the resolved version creates a new revision.

Safe wording:

- Avoid implying data is lost while both snapshots are preserved.
- Make delete conflicts explicit: "This prompt was edited on this device but deleted on another device."

## Firestore Write Safety

Firestore can behave like last-write-wins if updates are blindly written. The prototype should avoid blind overwrites.

Recommended write pattern:

- Use transaction or compare-before-write.
- Include expected `remoteRevision` in the write path.
- Reject or branch to conflict handling when the server revision changed.
- Increment `remoteRevision` only on accepted writes.
- Use `serverUpdatedAt` for remote ordering and diagnostics.

Security rules should enforce ownership, but conflict handling is app logic.

## Minimum Conflict Strategy for V2 Prototype

Implement this minimum strategy:

1. Use `remoteRevision`, `baseRevision`, `revision`, and `lastSyncedRevision` for conflict detection.
2. Keep a base snapshot or changed-field set for pending local edits.
3. Use Firestore compare-before-write; do not blind-write prompt documents.
4. Auto-merge one-sided field changes.
5. Auto-merge low-risk metadata:
   - `favorite`: last metadata write wins.
   - `archived`: last metadata write wins unless delete tombstone exists.
   - `useCount`: delta merge when possible, otherwise max.
   - `lastUsedAt`: latest timestamp.
   - tag additions: union.
6. Create conflict records for:
   - concurrent `title`, `content`, or `notes` changes,
   - edit vs delete,
   - delete vs edit,
   - conflicting collection rename,
   - ambiguous tag removal vs tag edit.
7. Use `deletedAt` tombstones and never physically purge in the prototype.
8. Provide user actions to keep local, keep remote, keep both, restore deleted, or keep deleted.
9. Keep v1.0.0 unchanged as the fallback and keep JSON export/import available.

## Safe Defaults

- Preserve more data rather than less.
- Prefer duplicate prompts over accidental overwrite.
- Never silently discard prompt `content` or `notes`.
- Treat deletes as reversible tombstones during the prototype.
- Use local saves first; sync failure should not block local prompt access.
- Keep conflict resolution manual where the app cannot explain an automatic merge clearly.
- Export should work even while sync conflicts exist, and should flag unresolved conflicts in export metadata when possible.

## Risks to Validate

- Firestore transaction and offline cache behavior around stale writes.
- Clock skew affecting `updatedAt` and `lastUsedAt` interpretation.
- Tombstone retention and storage growth.
- Duplicate prompts from repeated imports before first sync.
- Conflicts created by two devices importing the same v1 export.
- User confusion if conflict UI appears too often.
- Accidental metadata loss from overly aggressive automatic merge rules.

## Recommendation

For the v2 prototype, use a conservative field-level conflict strategy:

- Revisions and compare-before-write for detection.
- Tombstones for all deletes.
- Automatic merge only for clearly safe metadata and one-sided changes.
- Local conflict records for authored prompt text and delete/edit conflicts.
- A small manual resolution UI that can keep either version or both.

This strategy is deliberately conservative. It protects user-authored prompt content while still allowing the prototype to prove multi-device sync without implementing a complex collaborative editing engine.
