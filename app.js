const {
  PROMPT_MODEL_VERSION,
  buildStorageStatusSummary,
  ensureUniquePromptIds,
  buildImportPreview,
  normalizePrompt: normalizePromptModel,
  normalizeTags,
} = window.PromptShelfModel;
const storageAdapter = window.PromptShelfStorage;
const RECENT_WINDOW_DAYS = 21;
const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

const seedPrompts = [
  {
    id: "prompt-daily-planning",
    title: "Daily Focus Planner",
    folder: "Operations",
    tags: ["planning", "priorities", "daily"],
    favorite: true,
    archived: false,
    useCount: 21,
    content:
      "Help me plan today from the notes below. Separate urgent work from important work, identify the smallest next action for each priority, flag anything that can wait, and end with a realistic three-block schedule. If the input is vague, ask only the minimum clarifying question.",
    notes:
      "Useful at the start of a work session. Paste calendar notes, loose tasks, or yesterday's leftovers.",
    createdAt: "2026-04-06T07:15:00.000Z",
    updatedAt: "2026-04-26T06:50:00.000Z",
    lastUsedAt: "2026-04-26T06:55:00.000Z",
  },
  {
    id: "prompt-audience-synthesis",
    title: "Audience Interview Synthesizer",
    folder: "Research",
    tags: ["qualitative", "synthesis", "customers"],
    favorite: true,
    archived: false,
    useCount: 12,
    content:
      "You are a research analyst. Review the interview notes I paste below and turn them into a concise synthesis. Return the top recurring pains, exact language worth keeping, objections, jobs to be done, and the three strongest product opportunities. If the data is thin or contradictory, say so plainly.",
    notes:
      "Best after 3 to 8 interviews. Ask for target audience and product context if I forget to include them.",
    createdAt: "2026-04-03T08:20:00.000Z",
    updatedAt: "2026-04-22T09:45:00.000Z",
    lastUsedAt: "2026-04-25T14:10:00.000Z",
  },
  {
    id: "prompt-release-notes",
    title: "Release Notes Draft",
    folder: "Product",
    tags: ["release", "changelog", "launch"],
    favorite: true,
    archived: false,
    useCount: 18,
    content:
      "Turn the raw engineering notes below into customer-facing release notes. Keep the tone precise and calm. Group changes into Improvements, Fixes, and Small Wins. Avoid hype. Mention any important behavior changes or migration notes. End with one short sentence on who benefits most from this release.",
    notes:
      "Use when product and engineering updates are mixed together. Good for weekly shipping cadence.",
    createdAt: "2026-04-01T12:35:00.000Z",
    updatedAt: "2026-04-24T11:25:00.000Z",
    lastUsedAt: "2026-04-24T11:26:00.000Z",
  },
  {
    id: "prompt-bug-triage",
    title: "Bug Triage Cut Through",
    folder: "Support",
    tags: ["bugs", "triage", "severity"],
    favorite: false,
    archived: false,
    useCount: 9,
    content:
      "Review the bug report below. Extract the reproduction steps, expected behavior, actual behavior, affected surface area, likely severity, and the smallest next action that reduces uncertainty. If the report is missing critical details, list the exact follow-up questions in priority order.",
    notes:
      "Useful for messy incoming issues from chat or email. Keeps the handoff to engineering cleaner.",
    createdAt: "2026-04-04T07:55:00.000Z",
    updatedAt: "2026-04-20T16:08:00.000Z",
    lastUsedAt: "2026-04-23T09:12:00.000Z",
  },
  {
    id: "prompt-technical-plan",
    title: "Technical Plan With Verification",
    folder: "Engineering",
    tags: ["planning", "verification", "implementation"],
    favorite: true,
    archived: false,
    useCount: 14,
    content:
      "Draft a technical implementation plan for the request below. Name the exact files that will likely change, the expected data flow, the riskiest edge cases, the commands needed for verification, and a rollback path if the change fails. Keep the plan concrete and defensible.",
    notes:
      "Strong default for scoped feature work. Good before asking an engineer to execute.",
    createdAt: "2026-04-02T10:10:00.000Z",
    updatedAt: "2026-04-21T13:02:00.000Z",
    lastUsedAt: "2026-04-25T08:34:00.000Z",
  },
  {
    id: "prompt-script-polish",
    title: "Script Polish Pass",
    folder: "Writing",
    tags: ["scripts", "editing", "voice"],
    favorite: false,
    archived: false,
    useCount: 6,
    content:
      "Edit the draft below for clarity, rhythm, and spoken delivery. Keep the meaning intact. Cut filler, flatten hype, and tighten sentence length variation so it reads naturally aloud. Flag any claim that sounds weak, vague, or unsupported.",
    notes:
      "Use for YouTube and short spoken explainers. Usually strongest on second draft material.",
    createdAt: "2026-04-05T14:16:00.000Z",
    updatedAt: "2026-04-18T15:28:00.000Z",
    lastUsedAt: "2026-04-19T07:42:00.000Z",
  },
  {
    id: "prompt-email-reply",
    title: "Calm Email Reply Draft",
    folder: "Writing",
    tags: ["email", "reply", "tone"],
    favorite: false,
    archived: false,
    useCount: 5,
    content:
      "Draft a concise reply to the email below. Keep it direct, respectful, and low-friction. Preserve my position without sounding defensive. If there are commitments, make them explicit. If the email needs a boundary, state it clearly in one sentence.",
    notes:
      "Good for inbox replies where tone matters. Paste the original email and the outcome you want.",
    createdAt: "2026-04-08T09:30:00.000Z",
    updatedAt: "2026-04-23T17:05:00.000Z",
    lastUsedAt: "2026-04-23T17:08:00.000Z",
  },
  {
    id: "prompt-legacy-archive",
    title: "Legacy Launch Teardown",
    folder: "Archive",
    tags: ["launch", "retrospective", "archive"],
    favorite: false,
    archived: true,
    useCount: 3,
    content:
      "Review the launch notes and feedback below. Summarize what worked, what fell flat, and what the team should repeat or stop doing. Separate signal from anecdote. End with a short list of changes to test before the next launch.",
    notes:
      "Kept for old launch postmortems. Usually only needed when revisiting prior cycles.",
    createdAt: "2026-03-22T09:05:00.000Z",
    updatedAt: "2026-04-09T08:11:00.000Z",
    lastUsedAt: "2026-04-09T08:12:00.000Z",
  },
];

let storageAvailable = true;

const state = {
  prompts: loadPrompts(),
  selectedId: null,
  view: "all",
  activeCollection: "all",
  activeTag: "all",
  query: "",
  sort: "updated",
};

const refs = {};
let toastTimer;
let pendingRestore = null;

window.addEventListener("DOMContentLoaded", init);

function init() {
  cacheElements();
  bindEvents();
  ensureSelection();
  renderAll();

  window.requestAnimationFrame(() => {
    document.body.classList.add("app-ready");
  });
}

function cacheElements() {
  refs.newPromptButton = document.getElementById("newPromptButton");
  refs.viewNav = document.getElementById("viewNav");
  refs.collectionList = document.getElementById("collectionList");
  refs.collectionCount = document.getElementById("collectionCount");
  refs.tagList = document.getElementById("tagList");
  refs.tagCount = document.getElementById("tagCount");
  refs.storageStatus = document.getElementById("storageStatus");
  refs.importButton = document.getElementById("importButton");
  refs.exportButton = document.getElementById("exportButton");
  refs.settingsButton = document.getElementById("settingsButton");
  refs.importFileInput = document.getElementById("importFileInput");
  refs.restoreModal = document.getElementById("restoreModal");
  refs.restorePreview = document.getElementById("restorePreview");
  refs.cancelRestoreButton = document.getElementById("cancelRestoreButton");
  refs.confirmRestoreButton = document.getElementById("confirmRestoreButton");
  refs.settingsModal = document.getElementById("settingsModal");
  refs.settingsSummary = document.getElementById("settingsSummary");
  refs.closeSettingsButton = document.getElementById("closeSettingsButton");
  refs.libraryTitle = document.getElementById("libraryTitle");
  refs.searchInput = document.getElementById("searchInput");
  refs.filterChips = document.getElementById("filterChips");
  refs.resultSummary = document.getElementById("resultSummary");
  refs.clearFiltersButton = document.getElementById("clearFiltersButton");
  refs.libraryList = document.getElementById("libraryList");
  refs.detailTitle = document.getElementById("detailTitle");
  refs.favoriteToggle = document.getElementById("favoriteToggle");
  refs.archiveToggle = document.getElementById("archiveToggle");
  refs.copyPromptTop = document.getElementById("copyPromptTop");
  refs.copyPromptButton = document.getElementById("copyPromptButton");
  refs.duplicatePromptTop = document.getElementById("duplicatePromptTop");
  refs.duplicatePromptButton = document.getElementById("duplicatePromptButton");
  refs.deletePromptButton = document.getElementById("deletePromptButton");
  refs.promptForm = document.getElementById("promptForm");
  refs.titleInput = document.getElementById("titleInput");
  refs.folderInput = document.getElementById("folderInput");
  refs.tagsInput = document.getElementById("tagsInput");
  refs.contentInput = document.getElementById("contentInput");
  refs.notesInput = document.getElementById("notesInput");
  refs.summaryFolder = document.getElementById("summaryFolder");
  refs.summaryUpdated = document.getElementById("summaryUpdated");
  refs.summaryUsed = document.getElementById("summaryUsed");
  refs.previewMeta = document.getElementById("previewMeta");
  refs.promptPreview = document.getElementById("promptPreview");
  refs.saveStatus = document.getElementById("saveStatus");
  refs.folderOptions = document.getElementById("folderOptions");
  refs.toast = document.getElementById("toast");
  refs.countAll = document.getElementById("countAll");
  refs.countFavorites = document.getElementById("countFavorites");
  refs.countRecent = document.getElementById("countRecent");
  refs.countArchive = document.getElementById("countArchive");
}

function bindEvents() {
  refs.newPromptButton.addEventListener("click", createPrompt);
  refs.viewNav.addEventListener("click", handleViewChange);
  refs.collectionList.addEventListener("click", handleCollectionChange);
  refs.tagList.addEventListener("click", handleTagChange);
  refs.filterChips.addEventListener("click", handleSortChange);
  refs.searchInput.addEventListener("input", handleSearch);
  refs.clearFiltersButton.addEventListener("click", clearFilters);
  refs.importButton.addEventListener("click", () => refs.importFileInput.click());
  refs.exportButton.addEventListener("click", exportLibrary);
  refs.settingsButton.addEventListener("click", openSettings);
  refs.importFileInput.addEventListener("change", importLibrary);
  refs.cancelRestoreButton.addEventListener("click", closeRestorePreview);
  refs.confirmRestoreButton.addEventListener("click", confirmRestore);
  refs.closeSettingsButton.addEventListener("click", closeSettings);
  document.addEventListener("keydown", handleKeyboardShortcuts);

  refs.libraryList.addEventListener("click", (event) => {
    const row = event.target.closest("[data-prompt-id]");
    if (!row) {
      return;
    }

    state.selectedId = row.dataset.promptId;
    renderAll();
  });

  refs.promptForm.addEventListener("input", handleFormInput);
  refs.favoriteToggle.addEventListener("click", toggleFavorite);
  refs.archiveToggle.addEventListener("click", toggleArchive);
  refs.copyPromptTop.addEventListener("click", copySelectedPrompt);
  refs.copyPromptButton.addEventListener("click", copySelectedPrompt);
  refs.duplicatePromptTop.addEventListener("click", duplicateSelectedPrompt);
  refs.duplicatePromptButton.addEventListener("click", duplicateSelectedPrompt);
  refs.deletePromptButton.addEventListener("click", deleteSelectedPrompt);
}

function handleViewChange(event) {
  const button = event.target.closest("[data-view]");
  if (!button) {
    return;
  }

  state.view = button.dataset.view;
  if (state.view === "archive") {
    state.activeCollection = "all";
  }
  ensureSelection(true);
  renderAll();
}

function handleCollectionChange(event) {
  const button = event.target.closest("[data-collection]");
  if (!button) {
    return;
  }

  state.activeCollection = button.dataset.collection;
  if (state.activeCollection !== "all" && state.view === "archive") {
    state.view = "all";
  }
  ensureSelection(true);
  renderAll();
}

function handleTagChange(event) {
  const button = event.target.closest("[data-tag]");
  if (!button) {
    return;
  }

  state.activeTag = button.dataset.tag;
  ensureSelection(true);
  renderAll();
}

function handleSortChange(event) {
  const button = event.target.closest("[data-sort]");
  if (!button) {
    return;
  }

  state.sort = button.dataset.sort;
  renderAll();
}

function handleSearch(event) {
  state.query = event.target.value;
  ensureSelection(true);
  renderAll();
}

function handleFormInput() {
  const prompt = getSelectedPrompt();
  if (!prompt) {
    return;
  }

  prompt.title = refs.titleInput.value;
  prompt.folder = refs.folderInput.value.trim();
  prompt.tags = parseTags(refs.tagsInput.value);
  prompt.content = refs.contentInput.value;
  prompt.body = refs.contentInput.value;
  prompt.notes = refs.notesInput.value;
  touchPrompt(prompt);

  const saved = persistPrompts();
  if (saved) {
    updateStorageStatus();
  }
  renderSidebar();
  renderList();
  syncDetailMeta(prompt);
  syncPreview(prompt);
  refs.saveStatus.textContent = saved ? "Saved locally." : "Unable to save locally.";
}

function createPrompt() {
  const collectionName =
    state.activeCollection !== "all" ? state.activeCollection : "Workspace";
  const tags = state.activeTag !== "all" ? [state.activeTag] : [];

  const now = new Date().toISOString();
  const draft = normalizePromptModel({
    id: buildId(),
    title: "Untitled Prompt",
    folder: collectionName,
    tags,
    favorite: false,
    archived: false,
    useCount: 0,
    body: "",
    content: "",
    notes: "",
    created_at: now,
    updated_at: now,
    createdAt: now,
    updatedAt: now,
    lastUsedAt: null,
    version: PROMPT_MODEL_VERSION,
  });

  state.prompts.unshift(draft);
  state.view = "all";
  state.selectedId = draft.id;
  state.query = "";
  const saved = persistPrompts();
  renderAll();
  flashSaveState(saved ? "New prompt created." : "New prompt created, but not saved locally.");
}

function toggleFavorite() {
  const prompt = getSelectedPrompt();
  if (!prompt) {
    return;
  }

  prompt.favorite = !prompt.favorite;
  touchPrompt(prompt);
  const saved = persistPrompts();
  renderAll();
  flashSaveState(
    saved
      ? prompt.favorite
        ? "Added to favorites."
        : "Removed from favorites."
      : "Favorite changed, but not saved locally."
  );
}

function toggleArchive() {
  const prompt = getSelectedPrompt();
  if (!prompt) {
    return;
  }

  prompt.archived = !prompt.archived;
  touchPrompt(prompt);
  if (prompt.archived) {
    prompt.favorite = false;
  }

  const saved = persistPrompts();
  ensureSelection(true);
  renderAll();
  flashSaveState(
    saved
      ? prompt.archived
        ? "Prompt archived."
        : "Prompt restored."
      : "Archive changed, but not saved locally."
  );
}

async function copySelectedPrompt() {
  const prompt = getSelectedPrompt();
  if (!prompt) {
    return;
  }

  const payload = buildCopyPayload(prompt);
  let copied = false;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(payload);
      copied = true;
    }
  } catch (error) {
    copied = false;
  }

  if (!copied) {
    copied = fallbackCopy(payload);
  }

  if (!copied) {
    showToast("Copy failed. Select the prompt text manually.");
    return;
  }

  prompt.lastUsedAt = new Date().toISOString();
  prompt.useCount = (prompt.useCount || 0) + 1;
  const saved = persistPrompts();
  renderAll();
  showToast(
    saved
      ? `Copied "${displayTitle(prompt)}".`
      : `Copied "${displayTitle(prompt)}", but usage was not saved.`
  );
}

function exportLibrary() {
  const payload = storageAdapter.exportState(state.prompts);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const dateStamp = new Date().toISOString().slice(0, 10);

  anchor.href = url;
  anchor.download = `prompt-shelf-backup-${dateStamp}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  showToast(`Backed up ${state.prompts.length} prompt${state.prompts.length === 1 ? "" : "s"} to JSON.`);
}

async function importLibrary(event) {
  const [file] = event.target.files;
  event.target.value = "";

  if (!file) {
    return;
  }

  if (file.size > MAX_IMPORT_BYTES) {
    showToast("Import failed: JSON file is larger than 2 MB.");
    return;
  }

  try {
    const importedText = await file.text();
    const result = storageAdapter.importState(importedText);

    if (!result.ok) {
      showToast(result.message);
      return;
    }

    showRestorePreview(result);
  } catch (error) {
    showToast("Import failed: choose a valid JSON export.");
  }
}

function showRestorePreview(result) {
  pendingRestore = result;
  const preview = buildRestorePreview(result);
  refs.restorePreview.replaceChildren();

  [
    ["Prompts to import", preview.promptCount],
    ["Schema version", preview.schemaVersion],
    ["Folders", preview.folderCount],
    ["Tags", preview.tagCount],
  ].forEach(([label, value]) => {
    const row = document.createElement("div");
    row.className = "restore-preview-row";
    const labelElement = document.createElement("span");
    const valueElement = document.createElement("strong");
    labelElement.textContent = label;
    valueElement.textContent = String(value);
    row.append(labelElement, valueElement);
    refs.restorePreview.append(row);
  });

  refs.restoreModal.hidden = false;
  refs.confirmRestoreButton.focus();
}

function closeRestorePreview() {
  pendingRestore = null;
  refs.restoreModal.hidden = true;
  refs.importButton.focus();
  showToast("Restore cancelled. No local data changed.");
}

function confirmRestore() {
  if (!pendingRestore?.ok) {
    closeRestorePreview();
    return;
  }

  const { prompts: imported, skipped, sanitized } = pendingRestore;
  state.prompts = ensureUniquePromptIds(imported.map(normalizePromptModel));
  state.view = "all";
  state.activeCollection = "all";
  state.activeTag = "all";
  state.query = "";
  pendingRestore = null;
  refs.restoreModal.hidden = true;
  const saved = persistPrompts();
  ensureSelection(true);
  renderAll();
  flashSaveState(
    saved
      ? buildImportSummary("Restored library with", imported.length, skipped, sanitized)
      : "Restore loaded, but not saved locally."
  );
}

function openSettings() {
  renderSettingsSummary();
  refs.settingsModal.hidden = false;
  refs.closeSettingsButton.focus();
}

function closeSettings() {
  refs.settingsModal.hidden = true;
  refs.settingsButton.focus();
}

function renderSettingsSummary() {
  const summary = buildStorageStatusSummary(state.prompts, {
    appName: "Prompt Shelf",
    appVersion: `Prompt model v${PROMPT_MODEL_VERSION}`,
    storageMode: storageAdapter.storageType || "localStorage",
    storageKey: storageAdapter.getStorageKey(),
  });

  refs.settingsSummary.replaceChildren();

  [
    ["App", summary.appName],
    ["Version", summary.appVersion],
    ["Storage mode", summary.storageMode],
    ["Storage key", summary.storageKey],
    ["Prompts", summary.promptCount],
    ["Folders", summary.folderCount],
    ["Tags", summary.tagCount],
  ].forEach(([label, value]) => {
    refs.settingsSummary.append(createSummaryRow(label, value));
  });

  refs.settingsSummary.append(
    createSummaryNote("Backup recommendation", summary.backupRecommendation),
    createSummaryNote("IndexedDB", summary.indexedDBNote)
  );
}

function duplicateSelectedPrompt() {
  const prompt = getSelectedPrompt();
  if (!prompt) {
    return;
  }

  const now = new Date().toISOString();
  const duplicate = {
    ...structuredClone(prompt),
    id: buildId(),
    title: `${displayTitle(prompt)} Copy`,
    favorite: false,
    archived: false,
    useCount: 0,
    createdAt: now,
    updatedAt: now,
    created_at: now,
    updated_at: now,
    version: PROMPT_MODEL_VERSION,
    lastUsedAt: null,
  };
  duplicate.body = getPromptBody(duplicate);
  duplicate.content = getPromptBody(duplicate);

  state.prompts.unshift(duplicate);
  state.view = "all";
  state.selectedId = duplicate.id;
  const saved = persistPrompts();
  renderAll();
  flashSaveState(
    saved
      ? `Duplicated "${displayTitle(prompt)}".`
      : "Prompt duplicated, but not saved locally."
  );
}

function deleteSelectedPrompt() {
  const prompt = getSelectedPrompt();
  if (!prompt) {
    return;
  }

  const title = displayTitle(prompt);
  const confirmation = window.prompt(
    `Permanently delete "${title}" from local storage?\n\nType DELETE to confirm.`
  );

  if (confirmation !== "DELETE") {
    showToast("Delete cancelled. No local data changed.");
    return;
  }

  state.prompts = state.prompts.filter((item) => item.id !== prompt.id);
  const saved = persistPrompts();
  ensureSelection(true);
  renderAll();
  flashSaveState(saved ? `Deleted "${title}".` : "Prompt deleted, but not saved locally.");
}

function clearFilters() {
  state.view = "all";
  state.activeCollection = "all";
  state.activeTag = "all";
  state.query = "";
  state.sort = "updated";
  ensureSelection(true);
  renderAll();
}

function ensureSelection(forceVisible = false) {
  const selectedExists = state.prompts.some((prompt) => prompt.id === state.selectedId);
  const visible = getVisiblePrompts();

  if (forceVisible && !visible.length) {
    state.selectedId = null;
    return;
  }

  if (!selectedExists) {
    state.selectedId = visible[0]?.id || state.prompts[0]?.id || null;
    return;
  }

  if (forceVisible && !visible.some((prompt) => prompt.id === state.selectedId)) {
    state.selectedId = visible[0]?.id || state.prompts[0]?.id || null;
  }
}

function renderAll() {
  ensureSelection(true);
  renderSidebar();
  syncControls();
  renderList();
  renderDetail();
}

function renderSidebar() {
  const activePrompts = state.prompts.filter((prompt) => !prompt.archived);
  const favoritePrompts = activePrompts.filter((prompt) => prompt.favorite);
  const archivedPrompts = state.prompts.filter((prompt) => prompt.archived);
  const recentPrompts = activePrompts.filter((prompt) => isRecent(prompt.lastUsedAt));
  const collections = getCollections();
  const tags = getTags();

  refs.countAll.textContent = String(activePrompts.length);
  refs.countFavorites.textContent = String(favoritePrompts.length);
  refs.countRecent.textContent = String(recentPrompts.length);
  refs.countArchive.textContent = String(archivedPrompts.length);
  refs.collectionCount.textContent = `${collections.length} groups`;
  refs.tagCount.textContent = `${tags.length} tags`;

  refs.collectionList.replaceChildren();
  refs.tagList.replaceChildren();

  const allCollections = createCollectionButton("All collections", "all", getVisibleCollectionCount());
  refs.collectionList.append(allCollections);

  collections.forEach((collection) => {
    refs.collectionList.append(
      createCollectionButton(collection.name, collection.name, collection.count)
    );
  });

  const allTags = createTagButton("All tags", "all", activePrompts.length);
  refs.tagList.append(allTags);

  tags.forEach((tag) => {
    refs.tagList.append(createTagButton(tag.name, tag.name, tag.count));
  });

  refs.folderOptions.replaceChildren();
  collections.forEach((collection) => {
    const option = document.createElement("option");
    option.value = collection.name;
    refs.folderOptions.append(option);
  });

  updateStorageStatus();
}

function renderList() {
  const visible = getVisiblePrompts();
  const fragment = document.createDocumentFragment();

  refs.libraryTitle.textContent = buildLibraryTitle(visible.length);
  refs.resultSummary.textContent = buildResultSummary(visible.length);
  refs.clearFiltersButton.hidden = !hasActiveFilters();

  if (!visible.length) {
    const empty = document.createElement("section");
    empty.className = "empty-state";
    empty.append(createEmptyStateContent());
    refs.libraryList.replaceChildren(empty);
    return;
  }

  visible.forEach((prompt, index) => {
    const row = document.createElement("button");
    row.className = "prompt-row";
    row.type = "button";
    row.dataset.promptId = prompt.id;
    row.style.setProperty("--row-index", String(index));

    if (prompt.id === state.selectedId) {
      row.classList.add("is-selected");
    }

    const title = document.createElement("h3");
    title.className = "row-title";
    title.textContent = displayTitle(prompt);

    const meta = document.createElement("p");
    meta.className = "row-meta";
    meta.textContent = `${displayFolder(prompt.folder)}  |  Updated ${formatRelative(getUpdatedAt(prompt))}`;

    const headerWrap = document.createElement("div");
    headerWrap.className = "row-title-wrap";
    headerWrap.append(title, meta);

    const statusWrap = document.createElement("div");
    statusWrap.className = "row-tags";
    if (prompt.favorite) {
      statusWrap.append(createStatusChip("Favorite", "favorite"));
    }
    if (prompt.archived) {
      statusWrap.append(createStatusChip("Archived", "archive"));
    }

    const header = document.createElement("div");
    header.className = "row-header";
    header.append(headerWrap, statusWrap);

    const snippet = document.createElement("p");
    snippet.className = "row-snippet";
    snippet.textContent = getPromptBody(prompt).trim() || "No prompt text yet.";

    const footer = document.createElement("div");
    footer.className = "row-footer";

    const tags = document.createElement("div");
    tags.className = "row-tags";
    const visibleTags = prompt.tags.length ? prompt.tags.slice(0, 3) : [displayFolder(prompt.folder)];
    visibleTags.forEach((tag) => {
      const chip = document.createElement("span");
      chip.className = "tag-chip";
      chip.textContent = tag;
      tags.append(chip);
    });

    const usedMeta = document.createElement("p");
    usedMeta.className = "row-meta";
    usedMeta.textContent = prompt.lastUsedAt
      ? `Last used ${formatRelative(prompt.lastUsedAt)}`
      : "Not used yet";

    footer.append(tags, usedMeta);
    row.append(header, snippet, footer);
    fragment.append(row);
  });

  refs.libraryList.replaceChildren(fragment);
}

function renderDetail() {
  const prompt = getSelectedPrompt();
  const hasPrompt = Boolean(prompt);

  setDetailDisabled(!hasPrompt);

  if (!prompt) {
    refs.detailTitle.textContent = "Select a prompt";
    refs.summaryFolder.textContent = "-";
    refs.summaryUpdated.textContent = "-";
    refs.summaryUsed.textContent = "-";
    refs.previewMeta.textContent = "No prompt selected";
    refs.promptPreview.textContent =
      "Choose a prompt from the library or create a new one to start building your shelf.";
    refs.titleInput.value = "";
    refs.folderInput.value = "";
    refs.tagsInput.value = "";
    refs.contentInput.value = "";
    refs.notesInput.value = "";
    refs.favoriteToggle.textContent = "Favorite";
    refs.archiveToggle.textContent = "Archive";
    refs.saveStatus.textContent = "Nothing selected.";
    return;
  }

  refs.detailTitle.textContent = displayTitle(prompt);
  refs.titleInput.value = prompt.title;
  refs.folderInput.value = prompt.folder;
  refs.tagsInput.value = prompt.tags.join(", ");
  refs.contentInput.value = getPromptBody(prompt);
  refs.notesInput.value = prompt.notes;
  refs.favoriteToggle.textContent = prompt.favorite ? "Favorited" : "Favorite";
  refs.archiveToggle.textContent = prompt.archived ? "Restore" : "Archive";
  syncDetailMeta(prompt);
  syncPreview(prompt);
  refs.saveStatus.textContent = `Saved locally · ${formatRelative(getUpdatedAt(prompt))}`;
}

function syncControls() {
  refs.searchInput.value = state.query;

  refs.viewNav.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === state.view);
  });

  refs.filterChips.querySelectorAll("[data-sort]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.sort === state.sort);
  });
}

function syncDetailMeta(prompt) {
  refs.summaryFolder.textContent = displayFolder(prompt.folder);
  refs.summaryUpdated.textContent = formatLongDate(getUpdatedAt(prompt));
  refs.summaryUsed.textContent = prompt.lastUsedAt
    ? formatRelative(prompt.lastUsedAt)
    : "Never copied";
  refs.previewMeta.textContent = prompt.favorite
    ? "Pinned favorite"
    : prompt.archived
      ? "Stored in archive"
      : `${prompt.useCount || 0} uses`;
  refs.detailTitle.textContent = displayTitle(prompt);
}

function syncPreview(prompt) {
  const sections = [
    `Title: ${displayTitle(prompt)}`,
    `Collection: ${displayFolder(prompt.folder)}`,
    `Tags: ${prompt.tags.length ? prompt.tags.join(", ") : "None"}`,
    "",
    getPromptBody(prompt).trim() || "No prompt text yet.",
  ];

  if (prompt.notes.trim()) {
    sections.push("", "Notes:", prompt.notes.trim());
  }

  refs.promptPreview.textContent = sections.join("\n");
}

function setDetailDisabled(disabled) {
  [
    refs.titleInput,
    refs.folderInput,
    refs.tagsInput,
    refs.contentInput,
    refs.notesInput,
    refs.favoriteToggle,
    refs.archiveToggle,
    refs.copyPromptTop,
    refs.copyPromptButton,
    refs.duplicatePromptTop,
    refs.duplicatePromptButton,
    refs.deletePromptButton,
  ].forEach((element) => {
    element.disabled = disabled;
  });
}

function handleKeyboardShortcuts(event) {
  const isEditing = ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName);

  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    refs.searchInput.focus();
    refs.searchInput.select();
    showToast("Search focused.");
    return;
  }

  if (event.key === "/" && !isEditing) {
    event.preventDefault();
    refs.searchInput.focus();
    showToast("Search focused.");
    return;
  }

  if (event.key === "Escape") {
    if (!refs.restoreModal.hidden) {
      closeRestorePreview();
      return;
    }

    if (!refs.settingsModal.hidden) {
      closeSettings();
      return;
    }

    if (!isEditing && hasActiveFilters()) {
      clearFilters();
      showToast("Filters cleared.");
      return;
    }

    if (document.activeElement === refs.searchInput && state.query) {
      clearFilters();
      showToast("Filters cleared.");
    }
    document.activeElement?.blur();
    return;
  }

  if (isEditing || event.metaKey || event.ctrlKey || event.altKey) {
    return;
  }

  if (event.key.toLowerCase() === "n") {
    event.preventDefault();
    createPrompt();
  }

  if (event.key.toLowerCase() === "f") {
    event.preventDefault();
    toggleFavorite();
  }

  if (event.key.toLowerCase() === "c") {
    event.preventDefault();
    copySelectedPrompt();
  }
}

function getSelectedPrompt() {
  return state.prompts.find((prompt) => prompt.id === state.selectedId) || null;
}

function getVisiblePrompts() {
  const query = state.query.trim().toLowerCase();
  let prompts = [...state.prompts];

  prompts = prompts.filter((prompt) => {
    if (state.view === "archive") {
      return prompt.archived;
    }
    return !prompt.archived;
  });

  if (state.view === "favorites") {
    prompts = prompts.filter((prompt) => prompt.favorite);
  }

  if (state.view === "recent") {
    prompts = prompts.filter((prompt) => isRecent(prompt.lastUsedAt));
  }

  if (state.activeCollection !== "all") {
    prompts = prompts.filter(
      (prompt) => prompt.folder.toLowerCase() === state.activeCollection.toLowerCase()
    );
  }

  if (state.activeTag !== "all") {
    prompts = prompts.filter((prompt) =>
      prompt.tags.some((tag) => tag.toLowerCase() === state.activeTag.toLowerCase())
    );
  }

  if (query) {
    prompts = prompts.filter((prompt) => buildSearchBlob(prompt).includes(query));
  }

  prompts.sort((left, right) => comparePrompts(left, right, state.sort));
  return prompts;
}

function getCollections() {
  const counts = new Map();

  state.prompts.forEach((prompt) => {
    if (prompt.archived) {
      return;
    }

    const name = displayFolder(prompt.folder);
    counts.set(name, (counts.get(name) || 0) + 1);
  });

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function getTags() {
  const counts = new Map();

  state.prompts.forEach((prompt) => {
    if (prompt.archived) {
      return;
    }

    prompt.tags.forEach((tag) => {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    });
  });

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
}

function getVisibleCollectionCount() {
  const activePrompts = state.prompts.filter((prompt) => !prompt.archived);
  return activePrompts.length;
}

function createCollectionButton(label, value, count) {
  const button = document.createElement("button");
  button.className = "collection-button";
  button.type = "button";
  button.dataset.collection = value;
  button.classList.toggle("is-active", state.activeCollection === value);

  const text = document.createElement("span");
  text.textContent = label;

  const pill = document.createElement("span");
  pill.className = "count-pill";
  pill.textContent = String(count);

  button.append(text, pill);
  return button;
}

function createTagButton(label, value, count) {
  const button = document.createElement("button");
  button.className = "tag-filter-button";
  button.type = "button";
  button.dataset.tag = value;
  button.classList.toggle("is-active", state.activeTag === value);

  const text = document.createElement("span");
  text.textContent = label;

  const pill = document.createElement("span");
  pill.className = "count-pill";
  pill.textContent = String(count);

  button.append(text, pill);
  return button;
}

function createEmptyStateContent() {
  const fragment = document.createDocumentFragment();
  const heading = document.createElement("h3");
  const copy = document.createElement("p");
  const actions = document.createElement("div");
  const newButton = document.createElement("button");

  actions.className = "empty-actions";
  newButton.className = "primary-button";
  newButton.type = "button";
  newButton.textContent = "New Prompt";
  newButton.addEventListener("click", createPrompt);

  if (!state.prompts.length) {
    heading.textContent = "Your prompt library is empty.";
    copy.textContent =
      "Create a reusable prompt, or import a JSON backup from another browser. New installs include a few samples to show the workflow.";
  } else if (hasActiveFilters()) {
    heading.textContent = "No prompts match these filters.";
    copy.textContent =
      "Clear search, switch tags or collections, or create a prompt in the current workspace.";
  } else {
    heading.textContent = "No prompts in this view.";
    copy.textContent =
      "Favorites, recent prompts, and archive views fill up as you use the library.";
  }

  actions.append(newButton);

  if (hasActiveFilters()) {
    const clearButton = document.createElement("button");
    clearButton.className = "ghost-button";
    clearButton.type = "button";
    clearButton.textContent = "Clear Filters";
    clearButton.addEventListener("click", clearFilters);
    actions.append(clearButton);
  }

  fragment.append(heading, copy, actions);
  return fragment;
}

function createStatusChip(text, variant) {
  const chip = document.createElement("span");
  chip.className = `status-chip ${variant}`;
  chip.textContent = text;
  return chip;
}

function createSummaryRow(label, value) {
  const row = document.createElement("div");
  row.className = "summary-row";
  const labelElement = document.createElement("span");
  const valueElement = document.createElement("strong");
  labelElement.textContent = label;
  valueElement.textContent = String(value);
  row.append(labelElement, valueElement);
  return row;
}

function createSummaryNote(label, value) {
  const note = document.createElement("div");
  note.className = "summary-note";
  const labelElement = document.createElement("span");
  const valueElement = document.createElement("p");
  labelElement.textContent = label;
  valueElement.textContent = value;
  note.append(labelElement, valueElement);
  return note;
}

function comparePrompts(left, right, sortMode) {
  if (sortMode === "alphabetical") {
    return displayTitle(left).localeCompare(displayTitle(right));
  }

  if (sortMode === "created") {
    return new Date(getCreatedAt(right)) - new Date(getCreatedAt(left));
  }

  if (sortMode === "used") {
    return new Date(right.lastUsedAt || 0) - new Date(left.lastUsedAt || 0);
  }

  return new Date(getUpdatedAt(right)) - new Date(getUpdatedAt(left));
}

function buildLibraryTitle(count) {
  const names = {
    all: "Active prompts",
    favorites: "Favorite prompts",
    recent: "Recently used prompts",
    archive: "Archived prompts",
  };

  const base = names[state.view] || "Prompt library";
  if (state.activeCollection !== "all") {
    return `${state.activeCollection} collection`;
  }
  if (state.activeTag !== "all") {
    return `#${state.activeTag} prompts`;
  }
  return `${base} (${count})`;
}

function buildResultSummary(count) {
  const parts = [`${count} prompt${count === 1 ? "" : "s"}`];

  if (state.activeCollection !== "all") {
    parts.push(`in ${state.activeCollection}`);
  }

  if (state.activeTag !== "all") {
    parts.push(`tagged ${state.activeTag}`);
  }

  if (state.query.trim()) {
    parts.push(`matching "${state.query.trim()}"`);
  }

  return parts.join(" ");
}

function hasActiveFilters() {
  return (
    state.view !== "all" ||
    state.activeCollection !== "all" ||
    state.activeTag !== "all" ||
    state.query.trim() !== "" ||
    state.sort !== "updated"
  );
}

function displayTitle(prompt) {
  return prompt.title.trim() || "Untitled Prompt";
}

function buildRestorePreview(result) {
  return buildImportPreview(result);
}

function getPromptBody(prompt) {
  return typeof prompt.body === "string" ? prompt.body : prompt.content || "";
}

function getUpdatedAt(prompt) {
  return prompt.updated_at || prompt.updatedAt;
}

function getCreatedAt(prompt) {
  return prompt.created_at || prompt.createdAt;
}

function touchPrompt(prompt) {
  const now = new Date().toISOString();
  prompt.updated_at = now;
  prompt.updatedAt = now;
  prompt.version = PROMPT_MODEL_VERSION;
}

function displayFolder(folder) {
  return typeof folder === "string" && folder.trim() ? folder.trim() : "Workspace";
}

function buildSearchBlob(prompt) {
  return [
    prompt.title,
    prompt.folder,
    getPromptBody(prompt),
    prompt.notes,
    prompt.tags.join(" "),
  ]
    .join(" ")
    .toLowerCase();
}

function buildImportSummary(action, importedCount, skippedCount, sanitizedCount) {
  const parts = [`${action} ${importedCount} prompt${importedCount === 1 ? "" : "s"}.`];

  if (skippedCount) {
    parts.push(`${skippedCount} invalid prompt${skippedCount === 1 ? "" : "s"} skipped.`);
  }

  if (sanitizedCount) {
    parts.push(`${sanitizedCount} prompt${sanitizedCount === 1 ? "" : "s"} cleaned up.`);
  }

  return parts.join(" ");
}

function parseTags(value) {
  return normalizeTags(value);
}

function isRecent(dateString) {
  if (!dateString) {
    return false;
  }

  const diff = Date.now() - new Date(dateString).getTime();
  return diff <= RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

function formatRelative(dateString) {
  if (!dateString) {
    return "never";
  }

  const diffMs = Date.now() - new Date(dateString).getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60000));

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days}d ago`;
  }

  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function formatLongDate(dateString) {
  if (!dateString) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function isValidDate(value) {
  return typeof value === "string" && !Number.isNaN(new Date(value).getTime());
}

function buildCopyPayload(prompt) {
  const lines = [getPromptBody(prompt).trim()];

  if (prompt.notes.trim()) {
    lines.push("", `Notes: ${prompt.notes.trim()}`);
  }

  return lines.join("\n");
}

function fallbackCopy(value) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.append(textarea);
  textarea.select();
  let copied = false;

  try {
    copied = document.execCommand("copy");
  } catch (error) {
    copied = false;
  }

  textarea.remove();
  return copied;
}

function loadPrompts() {
  const result = storageAdapter.loadState({ defaultPrompts: structuredClone(seedPrompts) });
  storageAvailable = result.storageAvailable;
  return result.prompts;
}

function persistPrompts() {
  const result = storageAdapter.saveState(state.prompts);
  if (!result.ok) {
    storageAvailable = false;
    if (refs.saveStatus) {
      refs.saveStatus.textContent = "Unable to save locally.";
    }
    if (refs.storageStatus) {
      refs.storageStatus.textContent =
        "Local storage is unavailable. Export JSON before closing.";
    }
    if (refs.toast) {
      showToast("Local save failed. Export JSON to avoid data loss.");
    }
    return false;
  }

  storageAvailable = true;
  return true;
}

function updateStorageStatus() {
  if (!storageAvailable) {
    refs.storageStatus.textContent =
      "Local storage is unavailable. Export JSON before closing.";
    return;
  }

  refs.storageStatus.textContent = `${state.prompts.length} prompts saved locally in your browser.`;
}

function flashSaveState(message) {
  refs.saveStatus.textContent = message;
  showToast(message);
}

function showToast(message) {
  refs.toast.textContent = message;
  refs.toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    refs.toast.classList.remove("is-visible");
  }, 1800);
}

function buildId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `prompt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
