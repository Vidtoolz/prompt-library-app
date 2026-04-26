# Prompt Library App v2 Data Model

Date: 2026-04-26

Issue: EKA-14

Status: Proposed for v2 prototype planning

## Context

Prompt Library App v2 is planned as a hybrid local-primary sync architecture:

- Local working store: IndexedDB through Dexie.
- Managed sync/backend: Firebase Auth plus Firestore.
- Stable fallback: v1.0.0 remains the localStorage-only workflow until v2 migration, sync, conflict handling, export/restore, privacy/security, and deployment reliability are proven.

V1 stores prompt objects in browser `localStorage` under `prompt-shelf-state-v1`. JSON export wraps those prompts in:

```json
{
  "app": "Prompt Shelf",
  "version": 1,
  "exportedAt": "2026-04-26T00:00:00.000Z",
  "prompts": []
}
```

The v1 prompt shape is:

```json
{
  "id": "prompt-id",
  "title": "Prompt title",
  "folder": "Collection name",
  "tags": ["tag"],
  "favorite": false,
  "archived": false,
  "useCount": 0,
  "content": "Prompt body",
  "notes": "Usage notes",
  "createdAt": "2026-04-26T00:00:00.000Z",
  "updatedAt": "2026-04-26T00:00:00.000Z",
  "lastUsedAt": null
}
```

The v2 model should preserve that data, add ownership and sync metadata, and support safe deletion/tombstone handling.

## Modeling Principles

- Keep prompts as the primary synced entity.
- Preserve the v1 import/export mental model; JSON remains an escape hatch.
- Treat collections and tags as lightweight user metadata at first, not heavy collaborative objects.
- Use explicit tombstones for deletes so offline devices do not resurrect deleted prompts.
- Store enough sync metadata to detect stale writes and content conflicts.
- Keep Firebase/Auth ownership separate from local anonymous ownership so local-only use can still work.
- Use stable IDs that can survive local import, cloud sync, export, and restore.
- Keep the prototype schema narrow; avoid team sharing and collaborative editing until single-user sync is proven.

## Entity Overview

Minimum v2 prototype entities:

- `Prompt`: the main prompt record, synced.
- `Collection`: optional normalized collection records, derived from prompt collection names in the prototype.
- `Tag`: optional normalized tag records, derived from prompt tags in the prototype.
- `LibraryMeta`: local user/device/schema/sync metadata.
- `SyncEvent`: local queue and audit records for push/pull work.
- `Conflict`: local records that preserve conflicting prompt versions for review.

For the first prototype, collections and tags can be derived from prompt records for UI, but the schema should leave room to promote them to first-class synced records later.

## Prompt Entity

Prompt records are the minimum required synced unit.

### Local Dexie table

Table: `prompts`

Recommended Dexie indexes:

```text
id, syncId, ownerId, collectionId, updatedAt, lastUsedAt, deletedAt, archived, favorite, schemaVersion, syncStatus
```

Fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | yes | Local primary key. Generated locally. May equal v1 `id` during migration if unique, but does not have to. |
| `syncId` | string | yes | Stable cross-device ID. Used as Firestore document ID where possible. |
| `ownerId` | string or null | no | Firebase Auth UID for synced records. Null for local-only records before sign-in. |
| `localDeviceId` | string | yes | Stable local device/profile ID for provenance and conflict diagnostics. |
| `createdByDeviceId` | string | yes | Device/profile that created or imported the record. |
| `updatedByDeviceId` | string | yes | Device/profile that last changed the record locally. |
| `title` | string | yes | V1 title. Can be empty only if content or notes is present during import cleanup. |
| `content` | string | yes | V1 prompt body. Must not be silently overwritten on conflict. |
| `notes` | string | yes | V1 usage notes. |
| `collectionId` | string or null | no | Optional normalized collection ID. Null means default workspace. |
| `collectionName` | string | yes | Human collection name. Maps from v1 `folder`; default `Workspace`. |
| `tags` | string[] | yes | Display tag names. Kept denormalized for simple local search and export. |
| `tagIds` | string[] | yes | Optional normalized tag IDs. Empty for first prototype if tags remain derived. |
| `favorite` | boolean | yes | Favorite state. |
| `archived` | boolean | yes | Archive state. Archived records remain synced and exportable. |
| `useCount` | number | yes | Copy/use count. Non-negative integer. |
| `createdAt` | ISO string | yes | Original creation timestamp when known. |
| `updatedAt` | ISO string | yes | User-visible last content/metadata update time. |
| `lastUsedAt` | ISO string or null | no | Last copied/used timestamp. |
| `deletedAt` | ISO string or null | no | Tombstone timestamp. Null for active/non-deleted records. |
| `schemaVersion` | number | yes | Record schema version. Start at `2`. |
| `revision` | number | yes | Local logical revision. Increment on every local change. |
| `remoteRevision` | number | yes | Last known remote revision from Firestore. `0` before first sync. |
| `baseRevision` | number | yes | Revision this local edit was based on. Used for stale-write/conflict checks. |
| `lastSyncedRevision` | number | yes | Local revision that has been confirmed synced. |
| `syncStatus` | string | yes | `local-only`, `pending-create`, `pending-update`, `pending-delete`, `synced`, `conflict`, or `error`. |
| `syncError` | string or null | no | Last sync error summary, not raw secrets or provider payloads. |
| `lastSyncedAt` | ISO string or null | no | Last successful push or pull for this record. |
| `importSource` | string or null | no | Example: `v1-json`, `v2-json`, `manual`. |
| `v1Id` | string or null | no | Original v1 ID if imported. Useful for duplicate diagnostics and export logs. |

### Firestore document

Collection path:

```text
users/{ownerId}/prompts/{syncId}
```

Recommended Firestore fields:

```json
{
  "syncId": "prompt_sync_id",
  "ownerId": "firebase_uid",
  "title": "Prompt title",
  "content": "Prompt body",
  "notes": "Usage notes",
  "collectionId": null,
  "collectionName": "Workspace",
  "tags": ["tag"],
  "tagIds": [],
  "favorite": false,
  "archived": false,
  "useCount": 0,
  "createdAt": "2026-04-26T00:00:00.000Z",
  "updatedAt": "2026-04-26T00:00:00.000Z",
  "lastUsedAt": null,
  "deletedAt": null,
  "schemaVersion": 2,
  "remoteRevision": 1,
  "lastWriteDeviceId": "device_id",
  "lastWriteClientAt": "2026-04-26T00:00:00.000Z",
  "serverUpdatedAt": "Firestore server timestamp"
}
```

Firestore should not store `syncError`, unsynced local queue state, or conflict drafts unless those are intentionally designed as synced recovery records.

### Prompt update rules

- Any edit to `title`, `content`, `notes`, `collectionName`, `tags`, `favorite`, `archived`, or `useCount` increments local `revision`.
- `updatedAt` changes for user-visible edits except pure sync metadata updates.
- `lastUsedAt` and `useCount` can change together when the user copies a prompt.
- `archived` is not deletion. Archived prompts remain available in export and sync.
- Delete sets `deletedAt` and `syncStatus = pending-delete`; physical purge can happen later after all devices have observed the tombstone.

## Tag Entity

For the first prototype, tags can be derived from `Prompt.tags`.

Optional local table for later:

Table: `tags`

Fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | yes | Local tag ID. |
| `syncId` | string | yes | Cross-device tag ID if tags become synced objects. |
| `ownerId` | string or null | no | Firebase Auth UID for synced tag records. |
| `name` | string | yes | Display name. |
| `normalizedName` | string | yes | Lowercase/trimmed key for dedupe. |
| `color` | string or null | no | Future UI metadata. |
| `createdAt` | ISO string | yes | Creation timestamp. |
| `updatedAt` | ISO string | yes | Update timestamp. |
| `deletedAt` | ISO string or null | no | Tombstone for renamed/deleted tag entity. |
| `schemaVersion` | number | yes | Start at `2`. |
| `revision` | number | yes | Sync revision if promoted. |
| `syncStatus` | string | yes | Same state vocabulary as prompts if synced. |

Prototype recommendation: derive tags from prompt arrays and do not sync separate tag records yet. This avoids tag rename conflict complexity in the first prototype.

## Collection Entity

V1 calls collections `folder`. V2 should expose the user-facing concept as collection while preserving import compatibility with `folder`.

For the first prototype, collections can be derived from `Prompt.collectionName`.

Optional local table for later:

Table: `collections`

Fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | yes | Local collection ID. |
| `syncId` | string | yes | Cross-device collection ID if promoted. |
| `ownerId` | string or null | no | Firebase Auth UID for synced collection records. |
| `name` | string | yes | Display name. |
| `normalizedName` | string | yes | Lowercase/trimmed key for dedupe. |
| `description` | string | no | Future optional metadata. |
| `sortOrder` | number | no | Future manual ordering. |
| `createdAt` | ISO string | yes | Creation timestamp. |
| `updatedAt` | ISO string | yes | Update timestamp. |
| `deletedAt` | ISO string or null | no | Tombstone if promoted. |
| `schemaVersion` | number | yes | Start at `2`. |
| `revision` | number | yes | Sync revision if promoted. |
| `syncStatus` | string | yes | Same state vocabulary as prompts if synced. |

Prototype recommendation: store `collectionName` directly on prompts, derive collection lists locally, and avoid a separate Firestore collection until rename/order behavior is needed.

## Favorite and Archive State

Favorite and archive state should remain fields on `Prompt`, not separate entities.

Reasons:

- V1 already stores `favorite` and `archived` as booleans on each prompt.
- User workflows toggle them directly on the prompt.
- This avoids extra join tables and conflict surfaces.

Sync behavior:

- `favorite` is a low-risk field and can use deterministic last-field-write if necessary.
- `archived` affects visibility but not data existence. It can also use deterministic field-level resolution.
- Neither field should override content conflict handling.

## Ownership and Device Metadata

### User ownership

Firebase Auth UID is the remote owner boundary.

Firestore path:

```text
users/{ownerId}/...
```

Every synced document must include `ownerId` and be protected by Firestore security rules so users can only read/write their own records.

### Local ownership

Local-only records may have `ownerId = null` before sign-in. When a user signs in, the app should offer to attach/import local records into that user's synced library.

### Device identity

Each browser profile should have a generated `deviceId` stored in `LibraryMeta`.

Device IDs are useful for:

- Distinguishing local writes from remote echoes.
- Explaining conflicts.
- Debugging sync issues.
- Avoiding accidental duplicate imports from the same profile.

Device IDs are not security credentials.

## LibraryMeta Entity

Local Dexie table: `libraryMeta`

Key/value style is sufficient for the prototype.

Fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `key` | string | yes | Primary key. |
| `value` | JSON value | yes | Stored value. |
| `updatedAt` | ISO string | yes | Last update time. |

Recommended keys:

- `schemaVersion`: current local schema version, start at `2`.
- `deviceId`: generated stable browser-profile ID.
- `activeOwnerId`: Firebase UID currently attached to the local library, or null.
- `lastFullSyncAt`: last completed full pull/push pass.
- `lastV1ImportAt`: timestamp of last v1 JSON migration/import.
- `lastExportAt`: timestamp of last v2 JSON export.

Firestore can store a lightweight user profile document:

```text
users/{ownerId}/meta/profile
```

Fields:

- `schemaVersion`.
- `createdAt`.
- `updatedAt`.
- `lastSeenAt`.

Keep this minimal for the prototype.

## SyncEvent Entity

Local Dexie table: `syncEvents`

This table supports queued operations and debugging. It does not need to sync to Firestore.

Fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | yes | Local event ID. |
| `entityType` | string | yes | `prompt`, `tag`, `collection`, or `libraryMeta`. Prototype should mostly use `prompt`. |
| `entityId` | string | yes | Local entity ID. |
| `syncId` | string | yes | Remote entity ID. |
| `operation` | string | yes | `create`, `update`, `delete`, `pull`, `resolve-conflict`. |
| `status` | string | yes | `pending`, `processing`, `done`, `error`, `conflict`. |
| `baseRevision` | number | yes | Revision known before the operation. |
| `targetRevision` | number | yes | Local revision intended to sync. |
| `attempts` | number | yes | Retry count. |
| `error` | string or null | no | Sanitized error summary. |
| `createdAt` | ISO string | yes | Queue time. |
| `updatedAt` | ISO string | yes | Last processing update. |

The prototype can start with a simpler queue, but it should have enough structure to avoid losing failed writes.

## Conflict Entity

Local Dexie table: `conflicts`

Conflicts should be local until intentionally resolved. They preserve both versions so prompt text is not silently lost.

Fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | yes | Conflict ID. |
| `entityType` | string | yes | Prototype: `prompt`. |
| `entityId` | string | yes | Local prompt ID. |
| `syncId` | string | yes | Remote prompt ID. |
| `localRevision` | number | yes | Local revision involved. |
| `remoteRevision` | number | yes | Remote revision involved. |
| `baseRevision` | number | yes | Common base if known. |
| `localSnapshot` | object | yes | Local prompt snapshot. |
| `remoteSnapshot` | object | yes | Remote prompt snapshot. |
| `status` | string | yes | `open`, `resolved-local`, `resolved-remote`, `resolved-merged`, `dismissed`. |
| `createdAt` | ISO string | yes | Conflict creation time. |
| `resolvedAt` | ISO string or null | no | Resolution time. |

Prototype conflict rule:

- Preserve both versions for concurrent changes to `title`, `content`, or `notes`.
- Allow deterministic field-level resolution for low-risk metadata such as `favorite`, `archived`, `useCount`, and `lastUsedAt`.

## V1 to V2 Migration Mapping

V2 migration should accept both v1 export wrapper objects and raw prompt arrays, matching v1 import behavior.

| V1 source | V2 target | Notes |
| --- | --- | --- |
| export `app` | import metadata only | Store in migration log if useful. Do not sync per prompt. |
| export `version` | import metadata only | V1 expected as `1`; unknown versions should trigger warnings. |
| export `exportedAt` | import metadata only | Store in migration report. |
| prompt `id` | `v1Id`; maybe local `id`; source for `syncId` seed | Keep for traceability. Generate a new ID if duplicate/invalid. |
| prompt `title` | `title` | Trim and enforce v2 length limits. |
| prompt `folder` | `collectionName` | Default to `Workspace`. Preserve as collection display name. |
| prompt `tags` | `tags` | Normalize strings, trim, dedupe case-insensitively, cap count. |
| prompt `favorite` | `favorite` | Boolean; default false. |
| prompt `archived` | `archived` | Boolean; default false. |
| prompt `useCount` | `useCount` | Non-negative integer; default 0. |
| prompt `content` | `content` | Main prompt body. |
| prompt `notes` | `notes` | Usage notes. |
| prompt `createdAt` | `createdAt` | Preserve valid ISO timestamp; otherwise use migration time. |
| prompt `updatedAt` | `updatedAt` | Preserve valid ISO timestamp; otherwise use migration time. |
| prompt `lastUsedAt` | `lastUsedAt` | Preserve valid ISO timestamp; otherwise null. |
| missing | `syncId` | Generate stable v2 sync ID during migration. |
| missing | `ownerId` | Null until user signs in and chooses to sync. |
| missing | `localDeviceId` | Current device ID. |
| missing | `createdByDeviceId` | Current device ID for imported records unless provenance exists. |
| missing | `updatedByDeviceId` | Current device ID. |
| missing | `collectionId` | Null in prototype; can be filled if collections are promoted. |
| missing | `tagIds` | Empty array in prototype. |
| missing | `deletedAt` | Null. V1 permanent deletes are absent and cannot be reconstructed. |
| missing | `schemaVersion` | `2`. |
| missing | `revision` | `1` for imported records. |
| missing | `remoteRevision` | `0` until first upload. |
| missing | `baseRevision` | `0` for imported records. |
| missing | `lastSyncedRevision` | `0` until first confirmed sync. |
| missing | `syncStatus` | `local-only` before sign-in, then `pending-create` when queued for sync. |
| missing | `importSource` | `v1-json`. |

### Import modes

V2 should preserve the two v1 import modes in spirit:

- `IMPORT`: add imported records as new v2 records with new `syncId` values. Keep `v1Id` for traceability.
- `REPLACE`: mark existing local records as deleted/tombstoned or clear local records before sync attachment, then import the selected JSON as the local library.

For a synced account, `REPLACE` needs extra care. It should not wipe remote Firestore data until the user confirms a remote replace operation and a local export backup exists.

## Minimum Viable V2 Schema

The first prototype should implement only what is required to prove local migration, two-device sync, and safe conflict handling.

### Dexie stores

```js
db.version(2).stores({
  prompts:
    "id, syncId, ownerId, collectionName, updatedAt, lastUsedAt, deletedAt, archived, favorite, schemaVersion, syncStatus",
  libraryMeta: "key",
  syncEvents: "id, entityType, entityId, syncId, status, createdAt",
  conflicts: "id, entityType, entityId, syncId, status, createdAt"
});
```

### Required prototype prompt fields

```json
{
  "id": "local_id",
  "syncId": "remote_stable_id",
  "ownerId": null,
  "localDeviceId": "device_id",
  "createdByDeviceId": "device_id",
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
  "schemaVersion": 2,
  "revision": 1,
  "remoteRevision": 0,
  "baseRevision": 0,
  "lastSyncedRevision": 0,
  "syncStatus": "local-only",
  "syncError": null,
  "lastSyncedAt": null,
  "importSource": "v1-json",
  "v1Id": "old_v1_id"
}
```

Do not add first-class synced tag or collection documents in the initial prototype unless the UI requires tag/collection rename behavior. Derived tags and collections are enough for v1 parity.

### Firestore prototype paths

```text
users/{ownerId}/prompts/{syncId}
users/{ownerId}/meta/profile
```

Only `prompts` needs to be implemented for the first sync proof.

### Firestore prompt document minimum

```json
{
  "syncId": "remote_stable_id",
  "ownerId": "firebase_uid",
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
  "schemaVersion": 2,
  "remoteRevision": 1,
  "lastWriteDeviceId": "device_id",
  "lastWriteClientAt": "2026-04-26T00:00:00.000Z",
  "serverUpdatedAt": "server_timestamp"
}
```

## Export Format Recommendation

V2 export should remain portable JSON:

```json
{
  "app": "Prompt Shelf",
  "version": 2,
  "exportedAt": "2026-04-26T00:00:00.000Z",
  "schemaVersion": 2,
  "source": "v2",
  "prompts": []
}
```

Export should include active, archived, and tombstoned records only when the user explicitly chooses a full forensic backup. Default user exports should include active and archived prompts, not old tombstones.

V2 should still be able to export a v1-compatible prompt array if needed:

- `collectionName` maps back to `folder`.
- Sync metadata is omitted.
- Tombstoned records are omitted.

## Open Decisions for Later Issues

- Whether Firebase anonymous auth is allowed before account linking.
- Whether tag and collection rename behavior needs first-class synced entities.
- How long tombstones are retained.
- Whether conflicts are local-only or optionally synced for recovery.
- Whether `useCount` should merge by max, sum of device increments, or latest field write.
- Whether export should include owner/device metadata by default.

## Recommendation

Use a prompt-centered v2 schema for the first prototype:

- Prompts are first-class synced records in Dexie and Firestore.
- Tags and collections are derived from prompt fields initially.
- Favorite and archive state stay as prompt booleans.
- Deletes are tombstones through `deletedAt`.
- Every prompt carries schema version, local revision, remote revision, sync status, owner ID, and device provenance.
- V1 migration preserves all existing v1 fields and adds sync metadata without requiring sign-in first.

This is the smallest schema that can prove the v2 architecture without breaking the stable v1.0.0 fallback.
