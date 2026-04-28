# Prompt Library App

Prompt Library App is a local-first browser app for saving, organizing, searching, importing, and exporting reusable prompts. The app itself is named **Prompt Shelf**.

It runs as a static site with no build step. Prompt data stays in your browser through `localStorage`; use JSON export/import for backups or moving data between browsers.

## Features

- Create, edit, duplicate, archive, favorite, and delete prompts
- Search prompts by title, content, tags, notes, or collection
- Filter by library view, collection, tag, and sort order
- Copy prompt content and track recent usage
- Backup and restore the library as JSON
- View storage and backup status in Settings
- Seeded sample prompts for first-run use

## Run Locally

No package install or build command is required.

For the most browser-like local setup, serve the directory:

```sh
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

You can also open `index.html` directly in a browser. If clipboard, import, or browser permissions behave differently from expected, use the local server command above.

## Tests

The app has a dependency-free Node test harness for the prompt model and backup/restore logic:

```sh
node tests/run-tests.js
```

Run a syntax check for the browser app script with:

```sh
node --check app.js
```

The browser DOM smoke test is also dependency-free. Serve the repository and open the smoke page:

```sh
python3 -m http.server 8000
```

```text
http://localhost:8000/tests/dom-smoke.html
```

The smoke page loads `prompt-model.js`, `storage-adapter.js`, and `app.js`, then checks the core browser globals and basic UI wiring. It uses an in-page fake `localStorage`, so it does not modify the normal Prompt Shelf browser library.

IndexedDB support is foundation-only and is not covered by Node because the app has no browser test dependency yet. For a manual browser check, open the app through the local server and run this in DevTools:

```js
const adapter = PromptShelfStorage.createIndexedDBAdapter({
  dbName: "prompt-shelf-smoke-test",
});
await adapter.saveState([{ id: "idb-smoke", title: "IDB Smoke", body: "Test" }]);
await adapter.loadState({ defaultPrompts: [] });
```

This checks the opt-in IndexedDB adapter without changing the default `localStorage` behavior.

## Main Workflows

### Create and Edit Prompts

Use **New Prompt** to add a prompt. Select any prompt to edit its title, collection, tags, prompt body, and usage notes. Changes save automatically to local browser storage.

### Organize the Library

The sidebar provides quick views for:

- **Library**: active, non-archived prompts
- **Favorites**: active prompts marked as favorites
- **Recently Used**: active prompts copied or used recently
- **Archive**: prompts removed from the active library without permanent deletion

Collections and tags are generated from the prompt metadata. Selecting a collection or tag filters the visible prompt list.

### Search and Sort

Use search to find prompts by title, content, tags, notes, or collection. Sort chips reorder the visible list by updated date, created date, title, or last used date. **Clear filters** resets the view, search, collection, tag, and sort state.

### Reuse, Duplicate, Archive, and Delete

Use **Copy Prompt** to copy the selected prompt body and update recent usage. Use **Duplicate** to create an editable copy. Use **Favorite** to pin a prompt to the Favorites view. Use **Archive** to hide a prompt from the active library, or **Delete** to permanently remove it after confirmation.

### Settings and Status

Use **Settings** in the sidebar to review the app name, prompt model version, storage mode, storage key, prompt count, folder count, tag count, and backup guidance. The panel is informational only. It does not enable IndexedDB migration or change the current `localStorage` behavior.

### Keyboard Shortcuts

- `/`: focus search
- `N`: create a new prompt
- `F`: toggle favorite on the selected prompt
- `C`: copy the selected prompt
- `Esc`: clear search or filters

## Data Storage

Prompt data is saved under the browser storage key `prompt-shelf-state-v1`.

The app now normalizes prompts to a v2-ready local model while preserving the existing v1 localStorage behavior. Each prompt keeps the current app fields and also carries the durable model fields:

- `id`
- `title`
- `body`
- `tags`
- `folder`
- `favorite`
- `created_at`
- `updated_at`
- `version`
- `archived`

Legacy aliases such as `content`, `createdAt`, and `updatedAt` are still written for compatibility with older exports and existing browser data.

Browser storage is accessed through `storage-adapter.js`, which preserves the existing `prompt-shelf-state-v1` key while keeping load/save/import/export behind a small interface for future IndexedDB or sync work.

The default storage path remains `localStorage`. `storage-adapter.js` also includes an opt-in IndexedDB foundation for future versions:

- `createLocalStorageAdapter()`
- `createIndexedDBAdapter()`
- `isIndexedDBAvailable()`
- `migrateLocalStorageToIndexedDB()`

IndexedDB is not enabled by the app UI yet, and migration is never automatic. The migration helper copies normalized localStorage prompts into IndexedDB when explicitly called and preserves the original localStorage data.

Backup JSON includes:

- `version`
- `schemaVersion`
- `exportedAt`
- `counts`
- `prompts`

Restore/import validates the selected JSON file, then shows a preview before changing local data. The preview includes prompt count, schema version, folder count, and tag count. Confirming restore replaces the current local library; cancelling leaves local data unchanged.

Import expects either an exported Prompt Shelf JSON object with a `prompts` array or a raw array of prompt objects. Invalid files, empty prompt sets, and unsupported shapes are rejected without changing local data. Imports accept both v2 `body` and legacy `content` prompt text.

Because storage is browser-local, each browser profile or device has its own separate library.

Import limits are intentionally modest: JSON files must be 2 MB or smaller and contain no more than 1,000 prompts. During import, Prompt Shelf repairs duplicate IDs, normalizes dates, trims long text fields, cleans tags, and skips entries that do not contain a title, prompt body, or notes.

## Backup / Restore Guidance

- Use **Backup JSON** before clearing browser data, switching devices, or testing imports.
- Keep exported JSON somewhere outside the browser profile, such as a project folder or cloud drive.
- Test backups by restoring into another browser profile first.
- Use restore only when you intentionally want the selected JSON file to become the full local library.

## Limitations

- No account sync, cloud storage, or multi-device merge.
- Data can be lost if browser storage is cleared without an export.
- Imports validate shape, but they do not resolve semantic duplicates beyond assigning copied IDs during `IMPORT`.
- The app is designed for local personal use, not shared team editing.

## Troubleshooting

- **App shows sample prompts again**: the browser may not have existing `localStorage` data for this origin. Import a saved JSON backup if you have one.
- **Copy does not work**: try serving the app with `python3 -m http.server 8000` and open `http://localhost:8000`.
- **Import fails**: confirm the file is valid JSON and contains either a `prompts` array or a raw array of prompt objects.
- **Changes are not saved**: check whether the browser blocks local storage or is running in a private profile.
- **Port 8000 is busy**: use another port, for example `python3 -m http.server 8080`.

## Project Files

- `index.html` defines the static app structure
- `styles.css` contains the full responsive UI styling
- `prompt-model.js` contains dependency-free prompt normalization, backup, and import helpers shared by browser and Node tests
- `storage-adapter.js` contains the default localStorage adapter plus the opt-in IndexedDB adapter foundation
- `app.js` contains state management, rendering, local storage, import/export UI wiring, and keyboard shortcuts
- `tests/run-tests.js` runs the dependency-free model and backup/restore tests with Node
- `tests/dom-smoke.html` and `tests/dom-smoke.js` provide a dependency-free browser smoke test
- `scripts/linear.mjs` provides a small Linear GraphQL helper for Hermes workflows

## Linear Helper

The repository includes a dependency-free Node helper for common Linear operations. It uses the Linear GraphQL API and reads `LINEAR_API_KEY` from either the current environment or:

```text
~/.config/hermes/secrets/linear.env
```

Example secrets file:

```sh
LINEAR_API_KEY=lin_api_your_key_here
```

Do not commit API keys or local secret files.

### Commands

List teams:

```sh
node scripts/linear.mjs list-teams
```

List projects:

```sh
node scripts/linear.mjs list-projects
```

List open issues:

```sh
node scripts/linear.mjs list-open-issues
node scripts/linear.mjs list-open-issues --team EKA
```

Create an issue:

```sh
node scripts/linear.mjs create-issue --team EKA --title "Manual browser testing pass" --description "Run the v1 browser test checklist." --project "Prompt Library App" --state Backlog
```

Add a comment:

```sh
node scripts/linear.mjs add-comment --issue EKA-123 --body "Tested locally and found no blockers."
```

Mark an issue done:

```sh
node scripts/linear.mjs mark-done --issue EKA-123
```

The write commands require explicit issue or team arguments. The helper prints JSON results and exits with a non-zero status if Linear returns an error.

## v1 Release Checklist

- Core prompt workflows tested: create, edit, save, reload, search, favorite, archive, copy, duplicate, and delete
- JSON import/export hardened and tested with malformed, partial, oversized, duplicate-ID, merge, and replace scenarios
- Responsive layout tested at 390px, 720px, 900px, 1040px, and 1440px
- README covers setup, workflows, backup guidance, limitations, and troubleshooting
- GitHub repository is connected and `main` contains the v1-ready code
- Linear + GitHub + Codex loop check: docs-only updates can be proposed via Codex and tracked in Linear issue comments

Known v1 risks:

- Data is browser-local and can be lost if browser storage is cleared without an export
- Import limits are fixed at 2 MB and 1,000 prompts
- Validation summarizes cleanup instead of showing per-field import warnings
- Mobile Safari and other non-Chromium browsers should still get a quick smoke test before broad distribution

## Hermes Workflow Smoke Test Log

- **2026-04-27 — EKA-23**: This Linear issue was created by Hermes and executed through Codex in this repository to validate the **Linear → Codex → GitHub** workflow loop with a harmless docs-only update.
