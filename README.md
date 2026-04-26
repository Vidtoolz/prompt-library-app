# Prompt Library App

Prompt Library App is a local-first browser app for saving, organizing, searching, importing, and exporting reusable prompts. The in-app name is Prompt Shelf.

The app runs as a static site with no build step. Prompt data is stored in the browser with `localStorage`, and JSON import/export is available from the sidebar.

## Features

- Create, edit, duplicate, archive, favorite, and delete prompts
- Search prompts by title, content, tags, notes, or collection
- Filter by library view, collection, tag, and sort order
- Copy prompt content and track recent usage
- Import and export the library as JSON
- Seeded sample prompts for first-run use

## Run Locally

Open `index.html` directly in a browser, or serve the directory locally:

```sh
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

No package install or build command is required.

## Main Workflows

### Create and Edit Prompts

Use **New Prompt** to add a prompt to the library. Select a prompt from the list to edit its title, collection, tags, prompt body, and usage notes. Changes are saved automatically to local browser storage.

### Organize the Library

The sidebar provides quick views for:

- **Library**: active, non-archived prompts
- **Favorites**: active prompts marked as favorites
- **Recently Used**: active prompts copied or used recently
- **Archive**: prompts removed from the active library without permanent deletion

Collections and tags are generated from the prompt metadata. Selecting a collection or tag filters the visible prompt list.

### Search and Sort

Use the search field to find prompts by title, prompt content, tags, notes, or collection. Sort chips reorder the visible list by updated date, created date, title, or last used date. **Clear filters** resets the current view, search, collection, tag, and sort state.

### Reuse, Duplicate, Archive, and Delete

Use **Copy Prompt** to copy the selected prompt body to the clipboard and update its recent usage metadata. Use **Duplicate** to create an editable copy. Use **Favorite** to pin useful prompts to the Favorites view. Use **Archive** to hide a prompt from the active library, or **Delete** to permanently remove it from local storage after confirmation.

### Keyboard Shortcuts

- `/`: focus search
- `N`: create a new prompt
- `F`: toggle favorite on the selected prompt
- `C`: copy the selected prompt
- `Esc`: clear search or filters

## Data Storage

Prompt data is saved under the browser storage key `prompt-shelf-state-v1`.

Exported JSON includes:

- `version`
- `exportedAt`
- `prompts`

Imports validate the selected JSON file, then prompt for one of two modes:

- `IMPORT` adds the imported prompts as copies
- `REPLACE` overwrites the current local library

Import expects either an exported Prompt Shelf JSON object with a `prompts` array or a raw array of prompt objects. Invalid files, empty prompt sets, and unsupported shapes are rejected without changing local data.

Because storage is browser-local, each browser profile or device has its own library. Use export and import to move prompts between browsers or keep a manual backup.

## Project Files

- `index.html` defines the static app structure
- `styles.css` contains the full responsive UI styling
- `app.js` contains state management, rendering, local storage, import/export, and keyboard shortcuts
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

## Release Checklist

- Run a manual browser pass on the primary prompt workflows
- Verify JSON export can be imported back without data loss
- Test common mobile, tablet, laptop, and desktop viewport sizes
- Confirm repository metadata is present before publishing to GitHub
