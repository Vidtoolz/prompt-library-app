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

## Data Storage

Prompt data is saved under the browser storage key `prompt-shelf-state-v1`.

Exported JSON includes:

- `version`
- `exportedAt`
- `prompts`

Imports validate the selected JSON file, then prompt for one of two modes:

- `IMPORT` adds the imported prompts as copies
- `REPLACE` overwrites the current local library

## Project Files

- `index.html` defines the static app structure
- `styles.css` contains the full responsive UI styling
- `app.js` contains state management, rendering, local storage, import/export, and keyboard shortcuts

## Release Checklist

- Run a manual browser pass on the primary prompt workflows
- Verify JSON export can be imported back without data loss
- Test common mobile, tablet, laptop, and desktop viewport sizes
- Confirm repository metadata is present before publishing to GitHub
