# Prompt Library App v2 Authentication and Identity Plan

Date: 2026-04-26

Issue: EKA-13

Status: Proposed for v2 prototype planning

## Context

Prompt Library App v2 is planned as a hybrid local-primary sync app:

- Local working store: IndexedDB through Dexie.
- Managed sync/backend: Firebase Auth plus Firestore.
- Data model: prompt records have `ownerId`, `localDeviceId`, `createdByDeviceId`, `updatedByDeviceId`, revisions, sync status, and tombstones.
- Migration: v1 JSON import is dry-run-first and local-only until the user explicitly enables sync.
- Conflict handling: local edits remain available offline, sync uses revision checks, and authored prompt conflicts preserve both versions.
- Backup/restore: manual JSON backup remains the escape hatch and must work without the original sync account.
- Stable fallback: v1.0.0 remains the localStorage-only fallback and must not require auth.

Authentication in v2 should unlock multi-device sync, not gate the local prompt library.

## Goals

- Let users use v2 locally without signing in.
- Let users opt into sync with a clear identity boundary.
- Use Firebase Auth UID as the Firestore owner boundary.
- Keep each browser profile identifiable with a local `deviceId`.
- Make account switching and sign-out behavior explicit.
- Preserve offline access to locally saved prompts.
- Provide a recovery story for account loss through manual JSON backup.
- Avoid accidental cross-account data mixing or remote deletion.

## Non-Goals for the First Prototype

- Team/shared libraries.
- Role-based access control beyond one owner per library.
- Organization accounts.
- Complex device management UI.
- Automatic cross-account transfer.
- Mandatory auth for local-only use.

## Identity Concepts

### ownerId

`ownerId` is the Firebase Auth UID. It is required for Firestore-synced records and null for local-only records.

Firestore path:

```text
users/{ownerId}/prompts/{syncId}
users/{ownerId}/meta/profile
```

Rules:

- `ownerId` defines remote ownership.
- Firestore security rules should allow users to read/write only records under their UID.
- A prompt should not be uploaded to Firestore until it has an `ownerId`.
- `ownerId` should not be treated as a portable ownership claim in manual backups; restored backups can be attached to a new account.

### userId

Use `userId` only as a UI/business term if needed. In storage and sync docs, prefer `ownerId` for the Firebase UID to avoid ambiguity.

### deviceId

`deviceId` is a locally generated browser-profile ID stored in Dexie `libraryMeta`.

Rules:

- Created on first v2 run.
- Stable for that browser profile.
- Not a secret and not an auth credential.
- Used for provenance, conflict messages, and filtering remote echoes.
- Included in prompt metadata as `localDeviceId`, `createdByDeviceId`, and `updatedByDeviceId`.

## Modes

### Local-only mode

Default mode. No sign-in required.

Behavior:

- Prompts are stored in Dexie.
- `ownerId = null`.
- `syncStatus = local-only`.
- Export/import/backup/restore work.
- User can migrate from v1 JSON and inspect prompts locally.
- No Firestore reads or writes.

User-facing state:

```text
Saved on this device. Sign in to sync across devices.
```

### Signed-in sync mode

Opt-in mode after Firebase Auth sign-in.

Behavior:

- Firebase UID becomes `activeOwnerId`.
- User can choose which local-only prompts to sync.
- Synced prompts receive `ownerId = activeOwnerId`.
- Firestore sync uses `users/{ownerId}/prompts/{syncId}`.
- Offline edits remain local and queue until sync resumes.

User-facing state:

```text
Sync is on for this account. Changes save locally first and sync when online.
```

### Signed-out with local data

After sign-out, local Dexie data may still exist.

Prototype recommendation:

- Keep local data on the device by default.
- Stop Firestore sync immediately.
- Keep synced records visible locally, clearly marked as local copies from the signed-out account.
- Offer "remove local data from this device" as an explicit separate action.

User-facing warning:

```text
Signing out stops sync. Prompts saved on this device can remain available locally unless you remove them.
```

## Authentication Providers

### Google sign-in

Recommended first provider for the v2 prototype.

Reasons:

- Low-friction sign-in.
- Common Firebase Auth path.
- Avoids password storage/support burden.
- Good fit for proving single-user multi-device sync quickly.

Risks:

- Some users do not want Google.
- Account loss or provider lockout can block Firestore access.
- Popup/redirect behavior differs across browsers.

Safe default:

- Keep JSON backup/restore independent of Google account access.

### Email/password

Possible later provider.

Benefits:

- Familiar account model.
- Not tied to Google identity.

Costs:

- Password reset and account recovery expectations.
- More security surface and support burden.
- Higher friction for a solo creator tool prototype.

Prototype recommendation:

- Do not include email/password in the first prototype unless Google sign-in is unacceptable.

### Email magic link

Good future option for passwordless email identity.

Benefits:

- Avoids password storage.
- Works for users without Google.

Costs:

- Email deliverability.
- Link handling across devices/browsers.
- Can be awkward for offline-first flows.

Prototype recommendation:

- Consider as second provider after Google sign-in validates the sync flow.

### Anonymous Firebase Auth

Useful but risky.

Potential use:

- Create a Firebase UID without explicit sign-in.
- Later link anonymous account to Google/email.

Risks:

- Users may think anonymous sync is backed by a recoverable account when it is not.
- Account can be lost if local auth state is cleared before linking.
- Confusing overlap with local-only mode.

Prototype recommendation:

- Prefer explicit local-only mode over anonymous auth for the first prototype.
- If anonymous auth is tested, label it clearly as temporary and require linking before relying on sync.

## Minimum Provider Recommendation

Use:

- Local-only mode by default.
- Google sign-in as the only sync provider for the first prototype.
- No anonymous auth in the default prototype.
- No email/password or magic link until after sync behavior is validated.

This keeps the identity surface small while proving the important v2 behavior: local-first use plus optional multi-device sync.

## Sync Enable Flow

Sync should be explicit.

Recommended flow:

1. User uses v2 locally or imports v1 JSON.
2. User selects "Turn on sync".
3. App explains that sync requires sign-in and uploads selected local prompts to the signed-in account.
4. User signs in with Google.
5. App sets `activeOwnerId`.
6. App shows local prompts that will be attached to the account.
7. User confirms upload/sync.
8. App assigns `ownerId`, queues `pending-create`, and starts Firestore sync.

Do not automatically upload local-only prompts immediately after sign-in without confirmation.

User-facing message:

```text
Sync will attach this local library to your signed-in account. Review your prompts before uploading.
```

## Sync Disable Flow

Sync disable should stop future remote reads/writes without deleting data.

Recommended behavior:

- Stop Firestore listeners.
- Keep local Dexie records.
- Preserve `ownerId` metadata for diagnostics.
- Mark sync disabled at `libraryMeta.activeOwnerId` or sync settings level.
- Local edits become local-only/pending until sync is re-enabled.
- Do not delete Firestore records.

User-facing message:

```text
Sync is off on this device. Local changes will not upload until you turn sync back on.
```

## Account Switching

Account switching is high-risk because local data may belong to a prior account.

Minimum prototype behavior:

- Block direct account switch while synced/local data exists.
- Require sign-out first.
- On sign-in to a different account, show a choice:
  - keep current local library as local-only,
  - clear local library after backup,
  - import/merge current local prompts into the new account after confirmation.

Never silently attach previous-account data to a new `ownerId`.

User-facing warning:

```text
This device has prompts from another account or local library. Choose what to do before syncing with the new account.
```

## Sign-Out Behavior

Sign-out should separate auth from local storage.

Recommended flow:

1. User selects sign out.
2. App warns that sync will stop.
3. User chooses whether to keep local data on this device.
4. Firebase signs out.
5. Firestore listeners stop.
6. Local records remain unless user explicitly removes them.

If the user chooses to remove local data:

- Prompt for backup first.
- Clear Dexie only after confirmation.
- Do not delete Firestore remote data.

## Offline Access

Offline access is core to the hybrid architecture.

Behavior:

- Local-only mode works offline.
- Signed-in mode continues to read/write Dexie offline.
- Auth token refresh may fail offline, but local access should continue.
- Pending writes queue locally.
- Sign-in itself requires network.
- Sign-out can clear auth state locally, but should not require Firestore.

User-facing state:

```text
Offline. Changes are saved locally and will sync when this account is online again.
```

## Local Data Ownership

Local Dexie data belongs to the browser profile until explicitly attached to a sync account.

Rules:

- `ownerId = null` means local-only.
- Local-only prompts can be exported, deleted, or attached to an account.
- Attaching to an account should be explicit and reversible only through backup/restore or delete/tombstone handling.
- Manual backup files should restore prompts locally even if the original `ownerId` is unavailable.

## Firestore Ownership and Security Rules

Firestore security should enforce:

- authenticated user can read/write only `users/{uid}/...`
- prompt `ownerId` must match `request.auth.uid`
- users cannot write under another user's path
- clients cannot set `ownerId` to a different UID

Conflict handling, revision checks, and merge semantics remain app logic. Security rules protect ownership but do not resolve sync conflicts.

## Backup and Account Loss

Account loss must not mean prompt loss if the user has a backup.

Recovery expectations:

- Default v2 backups omit or ignore account-bound sync metadata.
- Restore from JSON works without the original Firebase account.
- Restored prompts can later attach to a new account with new `ownerId` and new `syncId`s.
- Firestore should not be treated as the only backup.

User-facing message:

```text
Keep a JSON backup outside this browser. It can restore prompts locally even if you lose access to your sync account.
```

## Import/Export Identity Effects

Import:

- v1 migration creates local-only records with `ownerId = null`.
- v2 restore should default to regenerated IDs/sync IDs and local-only records.
- Import into a signed-in session should still preview before attaching records to `ownerId`.

Export:

- Default export should omit Firebase tokens and auth state.
- Default export should not require the same account to restore.
- Diagnostic export may include `ownerId` and `deviceId`, clearly labeled.

## User-Facing Warnings

Before turning on sync:

```text
Sync uploads selected local prompts to your signed-in account. Review your library before continuing.
```

Before sign-out:

```text
Signing out stops sync on this device. You can keep local prompts here or remove them after exporting a backup.
```

Before account switch:

```text
This device already has local prompts. Do not sync them to a different account unless you mean to attach them there.
```

When offline:

```text
Offline. Changes are saved locally and will sync when this account is online again.
```

On account loss/backup:

```text
Firestore sync is not a replacement for backup. Export JSON regularly so you can restore without the original account.
```

When using local-only:

```text
Local-only prompts stay on this device unless you export them or turn on sync.
```

## Minimum Authentication Design for V2 Prototype

Implement this minimum design:

1. Local-only mode is the default.
2. Generate and store a local `deviceId` in Dexie `libraryMeta`.
3. Use Firebase Auth with Google sign-in as the only sync provider.
4. Use Firebase UID as `ownerId`.
5. Store synced data under `users/{ownerId}/prompts/{syncId}`.
6. Require explicit user confirmation before attaching local-only prompts to a signed-in account.
7. Keep local Dexie access available offline.
8. Sign-out stops sync but keeps local data unless the user explicitly removes it after backup warning.
9. Block silent account switching; require a user choice for local data.
10. Keep manual JSON backup/restore independent of Firebase account access.

Do not require auth for v1.0.0 or for v2 local-only use.

## Risks to Validate

- Users misunderstanding local-only as backed up.
- Users misunderstanding sync as a substitute for manual backup.
- Google popup/redirect behavior across browsers.
- Account switching accidentally attaching local data to the wrong account.
- Auth state lost while offline.
- Firestore rules allowing cross-user reads/writes due to misconfiguration.
- Restoring backups that contain old `ownerId` metadata.

## Recommendation

Use optional Google sign-in for the first v2 sync prototype, with local-only mode as the default and Firebase UID as `ownerId`.

The prototype should keep auth narrow: no required sign-in, no anonymous auth by default, no email/password or magic link until sync is proven. Device identity should be local and non-secret. Sync enablement should be explicit, sign-out should preserve local data by default, and backups should remain usable without the original account.

This proves the multi-device sync identity path while preserving the v1 fallback and the local-first product behavior.
