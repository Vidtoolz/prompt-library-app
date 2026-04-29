# Prompt Library App Manual Validation Log

Date: 2026-04-29

Project: Prompt Library App

Context: Local validation after EKA-18. Use local files only. Do not deploy. Do not call external APIs.

Recommended local server:

```sh
scripts/serve-local.sh
```

Then open:

```text
http://localhost:8000/
```

## 1. Localhost App Load

- [ ] Start the local static server.
- [ ] Open `http://localhost:8000/`.
- [ ] Confirm the app loads without blocking console errors.
- [ ] Confirm `index.html`, `styles.css`, `app.js`, `prompt-model.js`, and `storage-adapter.js` load from the local origin.

Notes:

```text

```

## 2. Create/Edit Prompt

- [ ] Create a new prompt.
- [ ] Edit the prompt title.
- [ ] Edit the prompt body.
- [ ] Edit notes or collection metadata if available.
- [ ] Confirm changes save without a page reload.

Notes:

```text

```

## 3. Favorite/Unfavorite

- [ ] Mark a prompt as favorite.
- [ ] Confirm it appears in the Favorites view.
- [ ] Remove the favorite state.
- [ ] Confirm it no longer appears in the Favorites view.

Notes:

```text

```

## 4. Tag Or Collection Behavior If Available

- [ ] Add or edit a collection value if available.
- [ ] Add or edit one or more tags if available.
- [ ] Confirm collection filtering works.
- [ ] Confirm tag filtering works.
- [ ] Confirm clearing filters returns to the expected library view.

Notes:

```text

```

## 5. JSON Export

- [ ] Run a backup/export from the app.
- [ ] Confirm a JSON file downloads.
- [ ] Confirm the file opens as valid JSON.
- [ ] Confirm the JSON includes a `prompts` array or expected backup shape.

Notes:

```text

```

## 6. JSON Import/Restore

- [ ] Use a known exported JSON file.
- [ ] Start the import/restore flow.
- [ ] Confirm the preview appears before local data changes.
- [ ] Confirm cancel leaves local data unchanged.
- [ ] Confirm restore replaces the local library only after confirmation.

Notes:

```text

```

## 7. Browser Refresh Persistence

- [ ] Create or edit a prompt.
- [ ] Refresh the browser.
- [ ] Confirm the change persists on `http://localhost:8000/`.
- [ ] Confirm the result is understood as local to this browser origin.

Notes:

```text

```

## 8. v1-stable Rollback Note

- [ ] Confirm `v1-stable` remains the rollback branch.
- [ ] Confirm `v1.0.0` remains the known-good tag.
- [ ] Confirm JSON export/import is still the manual data transfer and recovery path.
- [ ] Do not deploy as part of this validation.

Notes:

```text

```

## 9. Known Issues Found

- [ ] No known issues found.
- [ ] Known issues listed below.

Issues:

```text

```

## 10. Final Result

Result:

- [ ] Pass
- [ ] Pass with notes
- [ ] Fail
- [ ] Blocked

Summary:

```text

```
