# Prompt Library App v2 Backup, Export, and Restore Design

Date: 2026-04-26

Issue: EKA-17

Status: Proposed for v2 prototype planning

## Context

Prompt Library App v2 is planned as a hybrid local-primary sync app:

- Local working store: IndexedDB through Dexie.
- Managed sync/backend: Firebase Auth plus Firestore.
- V2 data model: prompt-centered records with ownership, device metadata, schema versioning, revisions, sync metadata, and `deletedAt` tombstones.
- Migration path: v1 JSON imports should be dry-run-first, local-only, and should not touch Firestore until the user explicitly enables sync.
- Conflict handling: prompt text is protected; the app should preserve both versions for authored-content conflicts and prefer duplicates over accidental overwrite.
- Stable fallback: v1.0.0 remains the localStorage-only fallback until v2 is proven.

Backup/export/restore is the escape hatch that prevents v2 sync from becoming lock-in. A user should be able to recover useful prompt data even if browser storage is corrupted, a Firestore account is lost, or sync has unresolved conflicts.

## Goals

- Keep manual JSON export as a first-class workflow.
- Use a versioned backup format that can evolve safely.
- Support full-library restore and merge import.
- Require pre-restore backup before destructive operations.
- Allow local Dexie export without requiring Firestore.
- Preserve v1 fallback and v1-compatible export where practical.
- Make Firestore sync implications explicit before restore or replace actions.
- Provide clear warnings for account loss, corrupted local database, and unresolved conflicts.

## Non-Goals for the First Prototype

- Built-in encrypted backup storage.
- Automatic scheduled cloud backups.
- Shared team library restore.
- Partial restore UI for every field.
- Cross-account transfer into Firestore without explicit user confirmation.

## Backup Types

### Manual v2 JSON export

Primary backup path for the prototype. User chooses Export and receives a JSON file containing the local v2 library.

Required properties:

- Works offline from Dexie.
- Does not require Firebase Auth.
- Does not require Firestore access.
- Includes active and archived prompts by default.
- Can optionally include tombstones, conflicts, and sync metadata in an advanced/full backup mode.

### v1-compatible JSON export

Secondary portability path. Converts v2 prompts back to the v1-compatible prompt shape:

- `collectionName` maps to `folder`.
- `tags`, `favorite`, `archived`, `useCount`, `content`, `notes`, and timestamps are preserved.
- v2 sync metadata is omitted.
- Tombstoned prompts are omitted.

This keeps v1.0.0 useful as a fallback even after v2 migration experiments.

### Firestore remote data

Firestore is sync infrastructure, not the only backup. It may help recover data across devices, but it is account-bound and can be affected by auth loss, rules mistakes, accidental deletes, or billing/configuration issues.

Safe default:

- Always keep manual export/restore working independently of Firestore.

## Versioned Backup Format

Minimum v2 backup wrapper:

```json
{
  "app": "Prompt Shelf",
  "format": "prompt-shelf-backup",
  "version": 2,
  "schemaVersion": 2,
  "exportedAt": "2026-04-26T00:00:00.000Z",
  "source": {
    "mode": "local-dexie",
    "ownerId": "firebase_uid_or_null",
    "deviceId": "device_id"
  },
  "options": {
    "includesSyncMetadata": false,
    "includesTombstones": false,
    "includesConflicts": false
  },
  "counts": {
    "prompts": 0,
    "archived": 0,
    "tombstones": 0,
    "conflicts": 0
  },
  "prompts": []
}
```

Default user export should set:

- `includesSyncMetadata: false`
- `includesTombstones: false`
- `includesConflicts: false`

Full diagnostic export can include:

- `syncId`
- `ownerId`
- device IDs
- revisions
- `syncStatus`
- `deletedAt` tombstones
- conflict records
- import batch metadata

Safe default:

- Default exports should be portable and user-friendly.
- Diagnostic exports should be clearly labeled because they may contain account/device metadata.

## Prompt Export Shape

Default v2 prompt export:

```json
{
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
  "lastUsedAt": null
}
```

Full backup prompt export may include:

```json
{
  "id": "local_id",
  "syncId": "remote_stable_id",
  "ownerId": "firebase_uid_or_null",
  "localDeviceId": "device_id",
  "createdByDeviceId": "device_id",
  "updatedByDeviceId": "device_id",
  "deletedAt": null,
  "schemaVersion": 2,
  "revision": 1,
  "remoteRevision": 0,
  "baseRevision": 0,
  "lastSyncedRevision": 0,
  "syncStatus": "synced",
  "importSource": "v1-json",
  "v1Id": "old_v1_id",
  "importBatchId": "batch_id"
}
```

## Local Dexie Export

Export should read from local Dexie as the source of truth for the current device.

Default export includes:

- prompts where `deletedAt === null`
- active prompts
- archived prompts
- derived tags and collections through prompt fields

Default export excludes:

- tombstones
- local sync queue entries
- raw sync errors
- unresolved conflict snapshots
- Firebase tokens or auth state

Diagnostic export can include:

- tombstones
- local conflict records
- sync status summaries
- import batch metadata

Never export:

- Firebase auth tokens
- API keys
- raw provider error payloads that could contain sensitive implementation details

## Export While Sync Is Pending

Export must work even when:

- offline
- sync is pending
- sync has errors
- conflicts exist

If unsynced changes exist, include a warning in the UI and backup metadata:

```text
This export includes local changes that may not have synced yet.
```

If conflicts exist:

- default export should include the current chosen local prompt state and warn that unresolved conflicts exist.
- diagnostic export can include conflict snapshots.

## Restore Modes

### Merge Import

Merge import adds imported prompts as additional records.

Rules:

- Generate new local IDs.
- Generate new `syncId` values by default.
- Preserve original IDs from backup in metadata when useful.
- Do not overwrite existing prompts.
- Detect possible semantic duplicates and show them in preview.
- Keep imported prompts `local-only` until the user explicitly syncs.

Safe default:

- Merge import is the safest default restore mode.

### Replace Import

Replace import changes the current local v2 library to match the backup.

Rules:

- Require pre-restore backup.
- Show a destructive warning.
- Replace local Dexie prompt records inside a transaction.
- Do not delete Firestore remote prompts automatically.
- If sync is connected, either block replace or require explicit "local only replace" confirmation.
- Imported records should start `local-only` or `pending-create` only after the user explicitly syncs.

Safe default:

- In the first prototype, replace should affect only local Dexie. Remote replace/delete should be a separate future workflow.

### Full-Library Restore

Full-library restore is a replace import from a v2 backup.

Minimum flow:

1. Parse backup.
2. Detect format/version.
3. Dry-run validate.
4. Show counts and warnings.
5. Require current-library export first if local data exists.
6. Require confirmation.
7. Write restore transaction to Dexie.
8. Keep Firestore untouched.
9. Show next-step options: inspect locally, export backup, then connect/sync.

## Pre-Restore Backup

Before any replace or full-library restore:

- Prompt the user to export the current v2 library.
- If unresolved conflicts exist, recommend diagnostic export.
- If sync is pending, warn that local changes may not exist elsewhere.
- If user skips backup, require explicit confirmation.

Suggested message:

```text
Before replacing this local library, export a backup. Replace cannot be undone unless you have a backup file.
```

## Restore Preview and Dry-Run Validation

Restore/import must have a dry-run preview before writing.

Preview should show:

- Detected format/version.
- Whether it is v1-compatible, v2 default backup, or v2 diagnostic backup.
- Prompt count.
- Archived count.
- Tombstone count if included.
- Conflict count if included.
- Possible duplicates against current local library.
- Invalid/skipped/sanitized records.
- Whether sync metadata will be kept or regenerated.
- Whether Firestore will be touched. Prototype default: no.

Dry-run should reject:

- unsupported backup versions
- malformed JSON
- missing prompt array
- empty prompt array unless restoring an intentionally empty backup is explicitly supported
- records with no title/content/notes after normalization

## Firestore Sync Implications

Manual restore should not immediately mutate Firestore.

Recommended prototype behavior:

- Restore writes to Dexie only.
- Restored prompts are `local-only`.
- User must explicitly choose to sync restored prompts.
- When syncing restored prompts, use normal conflict handling and compare-before-write.
- If restored records include old `syncId` values, do not reuse them by default unless restoring into the same account and the user confirms.

Scenarios:

| Scenario | Prototype behavior |
| --- | --- |
| Merge import while signed out | Local-only records; no Firestore writes. |
| Merge import while signed in | Local-only records first; user chooses sync. |
| Replace local library while signed in | Local replace only; remote unchanged. |
| Restore backup from another account | Generate new `syncId`s by default; warn about account metadata. |
| Restore diagnostic backup into same account | Ask whether to preserve or regenerate sync IDs; default regenerate. |

Safe default:

- Regenerate sync IDs on restore unless the user is doing an advanced same-account recovery.

## Account Loss Recovery

If the user loses Firebase account access:

- Manual JSON backup should still restore local prompt data.
- Default backup should not require the old `ownerId`.
- Restore should generate new `ownerId` when the user signs into a new account.
- Sync metadata from the old account should be omitted or ignored by default.

Recommended message:

```text
This backup can restore your prompts locally without the original sync account. If you connect a new account, v2 will create new synced copies.
```

## Corrupted Local Database Recovery

If Dexie/IndexedDB data is corrupted or unavailable:

Recovery flow:

1. App detects local database load failure.
2. Show recovery screen with options:
   - retry local database,
   - restore from JSON backup,
   - start with empty local library,
   - if signed in and Firestore is reachable, rebuild local library from sync.
3. Do not delete the old local database automatically.
4. If possible, attempt diagnostic export before reset.

Safe default:

- Do not automatically overwrite or clear local data after a database error.
- Make restore-from-JSON available without sign-in.

## Corrupted or Partial Backup Handling

For malformed backup files:

- Reject without writing.
- Show a clear parse/validation message.
- If some prompts are valid, allow an advanced partial recovery only after preview.

For partial recovery:

- Import only valid prompts.
- Report skipped records.
- Generate new IDs/sync IDs.
- Keep local-only until reviewed.

## User-Facing Warnings

Manual export:

```text
This JSON file is your portable backup. Keep it somewhere outside this browser profile.
```

Unsynced export:

```text
Some local changes have not synced yet. This export includes what is currently saved on this device.
```

Conflict export:

```text
There are unresolved sync conflicts. Export still works, but resolve conflicts before using this backup as your only copy.
```

Merge import:

```text
Imported prompts will be added as separate prompts. Existing prompts will not be overwritten.
```

Replace import:

```text
Replace changes this local v2 library. Export a backup first. Remote synced prompts will not be deleted by this step.
```

Account-loss restore:

```text
This backup can restore prompts locally even without the original sync account.
```

Corrupted local database:

```text
The local database could not be opened. You can retry, restore from JSON, or rebuild from sync if your account is connected.
```

## Compatibility With V1

V2 should support:

- importing v1 JSON exports through the EKA-15 migration flow,
- exporting v1-compatible JSON for fallback use,
- preserving `folder` through `collectionName -> folder` conversion,
- omitting sync-only metadata from v1-compatible export,
- leaving v1.0.0 unchanged.

V1-compatible export should be clearly labeled because it may lose v2-only metadata such as sync IDs, tombstones, conflicts, and import batch IDs.

## Minimum Prototype Design

Implement these minimum backup/export/restore capabilities:

1. Default v2 JSON export from Dexie.
2. V1-compatible JSON export.
3. V2 backup format with `version`, `schemaVersion`, `exportedAt`, `source`, `options`, `counts`, and `prompts`.
4. Merge import with dry-run preview.
5. Local-only replace import with mandatory backup prompt.
6. Pre-restore backup warning before any replace.
7. Restore writes to Dexie only; Firestore remains untouched until explicit sync.
8. Regenerate local IDs and sync IDs by default on restore/import.
9. Preserve imported records as `local-only` until reviewed.
10. Warnings for unsynced changes, unresolved conflicts, account loss, and corrupted local database.

Do not implement remote destructive restore in the first prototype.

## Risks to Validate

- Users assuming Firestore is a complete backup.
- Users replacing local data without exporting first.
- Reusing sync IDs incorrectly and overwriting remote records.
- Restoring a backup with unresolved conflicts and losing alternate snapshots.
- Very large JSON export/import performance.
- Browser download restrictions or private browsing storage limits.
- Confusion between v1-compatible export and full v2 backup.

## Recommendation

Use manual JSON backup as the primary v2 prototype backup mechanism.

The minimum safe design is:

- export from local Dexie,
- use a versioned v2 backup wrapper,
- keep v1-compatible export available,
- make merge import the default restore path,
- require pre-restore backup for replace/full restore,
- keep restore local-only until explicit sync,
- regenerate sync IDs by default,
- never let restore directly delete or overwrite Firestore data in the prototype.

This preserves the v1 fallback story, avoids lock-in, and gives users a recovery path even when sync, account access, or local browser storage fails.
