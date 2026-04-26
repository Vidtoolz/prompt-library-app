# Prompt Library App v2 Migration from v1 JSON

Date: 2026-04-26

Issue: EKA-15

Status: Proposed for v2 prototype planning

## Context

Prompt Library App v1.0.0 is the stable localStorage-only fallback. V1 stores prompt data under `prompt-shelf-state-v1` and exports portable JSON. V2 is planned as a hybrid local-primary sync architecture using:

- IndexedDB through Dexie as the local working store.
- Firebase Auth plus Firestore for managed sync.
- A prompt-centered v2 data model with `syncId`, ownership, device metadata, schema versioning, revisions, and `deletedAt` tombstones.
- Conservative sync conflict handling that preserves prompt text and prefers duplicate records over accidental overwrite.

The v2 migration must not require changing v1. A user should be able to keep using v1 after exporting JSON, and v2 should treat that export as a point-in-time snapshot.

## V1 Input Shapes

V2 migration should accept the same two input shapes that v1 import accepts.

Wrapped v1 export:

```json
{
  "app": "Prompt Shelf",
  "version": 1,
  "exportedAt": "2026-04-26T00:00:00.000Z",
  "prompts": []
}
```

Raw prompt array:

```json
[]
```

V1 prompt shape:

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

## Migration Goals

- Import a v1 export into the v2 local Dexie store without requiring sign-in first.
- Preserve all meaningful v1 fields.
- Generate v2 identity and sync metadata safely.
- Show a dry-run preview before changing local v2 data.
- Create or prompt for a backup before migration changes are committed.
- Avoid silent overwrites, especially when imported prompts look like existing local or synced prompts.
- Keep v1 usable as fallback.
- Allow v2 export/restore after migration.

## Schema Version Detection

Detection rules:

1. If the parsed JSON is an array, treat it as a legacy/raw prompt array.
2. If the parsed JSON is an object with `prompts` array:
   - `version === 1` and `app === "Prompt Shelf"` means canonical v1 export.
   - missing `version` but valid `prompts` means compatible legacy export with warning.
   - `version === 2` should route to v2 import/restore flow, not v1 migration.
   - unknown future versions should stop unless an explicit compatibility path exists.
3. If no prompt array is found, reject without changing local data.

Dry-run output should label the detected source:

- `Prompt Shelf v1 export`
- `Raw prompt array`
- `Compatible legacy prompt export`
- `Unsupported export version`

## Validation Rules

Validation should run as a dry-run before any write.

File-level validation:

- JSON must parse.
- Prompt candidates must be an array.
- Array must not be empty.
- Prototype limits can match or exceed v1 limits, but should be explicit before import.
- Report total candidates, valid prompts, skipped prompts, sanitized prompts, duplicate IDs, possible duplicates, and unsupported fields.

Prompt-level validation:

- Candidate must be an object.
- At least one of `title`, `content`, or `notes` must be present after trimming.
- Text fields must be strings or become empty strings.
- Dates must be valid ISO-style timestamps or replaced with migration time.
- `tags` may be an array of strings or comma-separated string.
- `favorite` and `archived` must normalize to booleans.
- `useCount` must normalize to a non-negative integer.

Validation must not upload anything to Firestore.

## Field Mapping

| V1 source | V2 target | Rule |
| --- | --- | --- |
| export `app` | migration metadata | Preserve in import report only. |
| export `version` | migration metadata | Use for schema detection. |
| export `exportedAt` | migration metadata | Preserve in import report. |
| prompt `id` | `v1Id` | Preserve original value for traceability. |
| prompt `id` | `id` | May reuse locally if unique and valid; otherwise generate new local ID. |
| missing | `syncId` | Generate a new stable cross-device ID. |
| missing | `ownerId` | Set null until user signs in and chooses sync. |
| missing | `localDeviceId` | Current browser-profile device ID. |
| missing | `createdByDeviceId` | Current device ID. |
| missing | `updatedByDeviceId` | Current device ID. |
| prompt `title` | `title` | Trim, cap length, default empty. |
| prompt `content` | `content` | Trim/cap according to v2 limits. |
| prompt `notes` | `notes` | Trim/cap according to v2 limits. |
| prompt `folder` | `collectionName` | Trim; default `Workspace`. |
| missing | `collectionId` | Null for prototype. |
| prompt `tags` | `tags` | Normalize, trim, dedupe case-insensitively, cap count. |
| missing | `tagIds` | Empty array for prototype. |
| prompt `favorite` | `favorite` | True only when strict true; otherwise false. |
| prompt `archived` | `archived` | True only when strict true; otherwise false. |
| prompt `useCount` | `useCount` | Non-negative integer; default 0. |
| prompt `createdAt` | `createdAt` | Preserve if valid; otherwise migration timestamp. |
| prompt `updatedAt` | `updatedAt` | Preserve if valid; otherwise migration timestamp. |
| prompt `lastUsedAt` | `lastUsedAt` | Preserve if valid; otherwise null. |
| missing | `deletedAt` | Null. V1 exports cannot represent deleted prompts. |
| missing | `schemaVersion` | 2. |
| missing | `revision` | 1 for imported records. |
| missing | `remoteRevision` | 0 until first upload. |
| missing | `baseRevision` | 0 until first sync base is established. |
| missing | `lastSyncedRevision` | 0 until confirmed sync. |
| missing | `syncStatus` | `local-only` before sync; `pending-create` only after user opts into sync. |
| missing | `syncError` | Null. |
| missing | `lastSyncedAt` | Null. |
| missing | `importSource` | `v1-json`. |
| missing | `importedAt` | Migration timestamp. |

## ID and syncId Generation

Local `id` and cross-device `syncId` should be distinct concepts.

Local ID rules:

- Reuse v1 `id` only if it is a valid non-empty string and does not collide with another imported or existing local record.
- Generate a new local ID for invalid, missing, or duplicate IDs.
- Keep the original v1 value in `v1Id` even when a new local ID is generated.

`syncId` rules:

- Generate a new `syncId` for every imported v1 prompt during normal migration.
- Do not derive `syncId` directly from v1 `id` unless using a namespaced deterministic scheme and duplicate handling is proven.
- For the prototype, random stable IDs are safer because v1 exports may be imported on multiple devices.
- Do not upload to Firestore until the user approves sync after local migration.

Safe default:

- Prefer creating a distinct new synced prompt over merging into an existing remote record.

## Tag and Collection Derivation

V2 prototype should derive tags and collections from prompt fields.

Collection:

- Map v1 `folder` to v2 `collectionName`.
- Trim whitespace.
- Default empty/missing folder to `Workspace`.
- Keep collection as a string field on prompt for the prototype.
- Do not create first-class collection documents during migration.

Tags:

- Accept array or comma-separated string.
- Trim whitespace.
- Drop empty tags.
- Dedupe case-insensitively.
- Preserve display casing from the first occurrence.
- Cap count and length according to v2 limits.
- Do not create first-class tag documents during migration.

Preview should show distinct collections and tags detected.

## Timestamps

Timestamp rules:

- Preserve valid v1 `createdAt`, `updatedAt`, and `lastUsedAt`.
- Replace invalid `createdAt` or `updatedAt` with migration time.
- Replace invalid `lastUsedAt` with null.
- Add `importedAt` for migration diagnostics.
- Do not let timestamp recency decide conflict resolution.

If `updatedAt` is earlier than `createdAt`, keep both but flag the record as sanitized. The import should not fail for this alone.

## Favorite, Archive, Delete, Notes, and useCount

Favorite:

- Map v1 `favorite === true` to v2 `favorite = true`.
- Otherwise false.

Archive:

- Map v1 `archived === true` to v2 `archived = true`.
- Archived prompts remain importable, syncable, and exportable.
- Archive is not delete.

Delete/tombstone:

- V1 export has no deleted records.
- Set `deletedAt = null` on all migrated records.
- Do not infer deletion from archive state.

Notes:

- Map v1 `notes` to v2 `notes`.
- Notes are protected prompt-authored content and should participate in conflict detection after migration.

useCount:

- Normalize to a non-negative integer.
- Cap extreme values.
- Preserve value as historical metadata.
- Set `lastUsedAt` independently; do not infer last-used time from `useCount`.

## Duplicate Handling

Duplicate handling should be conservative.

Duplicate categories:

| Category | Detection | Prototype behavior |
| --- | --- | --- |
| Duplicate v1 IDs inside the same file | Same non-empty `id` appears more than once | Generate new local IDs/syncIds; report duplicates. |
| Duplicate existing local v2 IDs | Imported local `id` collides with Dexie record | Generate new local ID; keep `v1Id`. |
| Possible semantic duplicate | Same normalized title and content | Flag in preview; import as separate prompt unless user excludes it. |
| Same v1 file imported twice | Matching import fingerprint or many same `v1Id` values | Warn; default to importing as copies or canceling. |
| Import against existing synced prompt | Matching `syncId` only in v2 imports, not v1 | Do not apply v1 migration merge; route to restore/update flow. |

Safe default:

- Duplicate prompt is safer than lost prompt.
- Do not merge duplicates automatically in the v2 prototype.

## Dry-Run and Import Preview

Migration should have a dry-run phase that performs all parsing, validation, normalization, ID planning, and duplicate detection without writing to Dexie or Firestore.

Preview should show:

- Detected source type and version.
- File `exportedAt` if present.
- Total prompt candidates.
- Valid prompts to import.
- Skipped prompts.
- Sanitized prompts.
- Duplicate v1 IDs.
- Possible duplicate prompts.
- Distinct collections and tags.
- Archive/favorite counts.
- Records with invalid dates repaired.
- Whether sync will remain local-only after import.

Preview actions:

- Cancel.
- Export current v2 backup first.
- Import as copies.
- Replace local v2 library.

For the prototype, "replace remote synced library" should not be available from the v1 migration flow.

## Backup Before Migration

Before committing a migration, v2 should prompt the user to export the current v2 local library if it contains any prompts.

Backup rules:

- If current v2 local library is empty, backup prompt can be informational.
- If current v2 local library has records, strongly recommend export before import.
- If replacing local v2 data, require a backup confirmation step.
- Never mutate the original v1 export file.
- Remind the user to keep the original v1 JSON export.

Suggested message:

```text
Before importing, export your current v2 library so you can restore it if needed. Your v1 JSON file will not be changed.
```

## Commit Phase

After preview and backup confirmation:

1. Start a Dexie transaction.
2. Write migrated prompts with generated local IDs and sync IDs.
3. Write import metadata to `libraryMeta`.
4. Write an import report locally.
5. Leave records `syncStatus = local-only`.
6. Do not upload to Firestore during the migration transaction.
7. Show completion summary and next-step options.

For `IMPORT`:

- Add migrated prompts alongside existing v2 prompts.
- Generate fresh `syncId` values.
- Keep existing prompts unchanged.

For `REPLACE`:

- Prototype should replace local v2 library only after backup confirmation.
- If the current library has synced records, either block replace or make it a local-only reset that does not delete remote records until a separate confirmed sync action exists.
- Prefer not to offer remote replace in the first prototype.

## Rollback and Recovery

Rollback options:

- Before commit: cancel leaves no changes.
- During Dexie transaction failure: transaction rolls back automatically.
- After commit: user can restore from the pre-migration v2 backup or remove the import batch if an import batch ID is recorded.

Recommended import batch fields:

- `importBatchId`.
- `importedAt`.
- `sourceVersion`.
- `sourceExportedAt`.
- `recordCount`.
- `sanitizedCount`.
- `skippedCount`.

Every imported prompt should include `importBatchId` so v2 can offer "undo this import" before sync.

Safe rollback default:

- Allow local undo of an unsynced import batch.
- Once synced, route rollback through normal delete/tombstone and conflict handling.

## Sync After Migration

Migration should be local-first.

After import completes:

- User can inspect migrated prompts locally.
- User can export a v2 JSON backup.
- User can sign in or connect sync.
- Only then should records become `pending-create` for Firestore.

If the user continues using v1 after exporting:

- The v2 migration remains a snapshot.
- Later v1 changes require another v1 export/import.
- Re-import should default to adding copies or showing possible duplicates.
- Do not assume v2 can detect all changes between two v1 exports.

## User-Facing Messages

Parsing errors:

```text
Import failed: choose a valid Prompt Shelf JSON export.
```

Unsupported version:

```text
This file looks like a Prompt Shelf export, but its version is not supported by this v2 migration tool.
```

Dry-run summary:

```text
Found 124 prompts in a Prompt Shelf v1 export from Apr 26, 2026. 121 can be imported, 2 need cleanup, and 3 possible duplicates were found. No changes have been made yet.
```

Backup prompt:

```text
Export your current v2 library before importing. This gives you a rollback file if the migration is not what you expected.
```

Local-only completion:

```text
Imported 121 prompts locally. They have not been synced yet. Review the library, export a v2 backup, then connect sync when ready.
```

Duplicate warning:

```text
Some prompts look like duplicates. The safe default is to import them as separate prompts so nothing is overwritten.
```

Replace warning:

```text
Replace changes only this local v2 library. It will not delete remote synced prompts unless you confirm a separate sync replace action.
```

## Minimum Safe Migration Flow for V2 Prototype

Implement this minimum flow:

1. User selects a v1 JSON export or raw prompt array.
2. V2 parses the file and detects source type/version.
3. V2 runs dry-run validation and normalization.
4. V2 generates planned local IDs, `syncId` values, device metadata, schema version, and sync metadata.
5. V2 shows an import preview with skipped/sanitized/duplicate counts, collection/tag summary, and archive/favorite counts.
6. If existing v2 data exists, prompt for v2 backup before continuing.
7. User chooses `Import as copies` or `Replace local v2 library`.
8. V2 writes to Dexie in one transaction.
9. Imported records remain `syncStatus = local-only`.
10. V2 shows completion summary and suggests exporting a v2 backup.
11. Sync upload is a separate explicit step after review/sign-in.

This flow preserves the v1 fallback, avoids accidental remote mutation, and gives the prototype a safe path to prove migration before sync.

## Risks to Validate

- Very large v1 exports and browser memory limits.
- Repeated imports of the same file.
- Users expecting v2 to stay in sync with v1 after the export.
- Replacing local v2 data when remote sync is already connected.
- Importing malformed but partially recoverable prompt objects.
- Duplicate detection producing false positives.
- Users skipping backup before a destructive local replace.

## Recommendation

Use a dry-run-first, local-only migration for the v2 prototype.

The migration should import v1 JSON into Dexie, generate fresh `syncId` values, preserve v1 IDs as `v1Id`, derive tags and collections from prompt fields, keep all imported records local-only until the user explicitly enables sync, and prefer duplicate prompts over automatic merging. Firestore should not be touched during the migration itself.

This is the minimum safe migration path that preserves v1.0.0 as fallback while giving v2 enough structure to validate sync later.
