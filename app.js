const STORAGE_KEY = "prompt-shelf-state-v1";
const EXPORT_VERSION = 2;
const PROMPT_MODEL_VERSION = 2;
const RECENT_WINDOW_DAYS = 21;
const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
const MAX_IMPORT_PROMPTS = 1000;
const MAX_TEXT_LENGTH = 20000;
const MAX_TITLE_LENGTH = 160;
const MAX_FOLDER_LENGTH = 80;
const MAX_TAG_LENGTH = 40;
const MAX_TAGS = 12;

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
  refs.importFileInput = document.getElementById("importFileInput");
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
  refs.importFileInput.addEventListener("change", importLibrary);
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
  const payload = buildExportPayload();
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
    const parsed = JSON.parse(importedText);
    const result = normalizeImportedPrompts(parsed);

    if (!result.ok) {
      showToast(result.message);
      return;
    }

    const { prompts: imported, skipped, sanitized } = result;
    const mode = window.prompt(
      `Import ${imported.length} prompt${imported.length === 1 ? "" : "s"}.\n\nType IMPORT to add them as copies.\nType REPLACE to overwrite the current local library.`
    );
    const normalizedMode = mode?.trim().toUpperCase();

    if (!["IMPORT", "REPLACE"].includes(normalizedMode)) {
      showToast("Import cancelled. No local data changed.");
      return;
    }

    const now = new Date().toISOString();
    if (normalizedMode === "REPLACE") {
      state.prompts = ensureUniquePromptIds(imported.map(normalizePromptModel));
    } else {
      state.prompts = [
        ...imported.map((prompt) => normalizePromptModel({
          ...prompt,
          id: buildId(),
          title: `${displayTitle(prompt)} Import`,
          body: getPromptBody(prompt),
          content: getPromptBody(prompt),
          createdAt: now,
          updatedAt: now,
          created_at: now,
          updated_at: now,
          version: PROMPT_MODEL_VERSION,
        })),
        ...state.prompts,
      ];
    }

    state.view = "all";
    state.activeCollection = "all";
    state.activeTag = "all";
    state.query = "";
    const saved = persistPrompts();
    ensureSelection(true);
    renderAll();
    flashSaveState(
      saved
        ? normalizedMode === "REPLACE"
          ? buildImportSummary("Replaced library with", imported.length, skipped, sanitized)
          : buildImportSummary("Added", imported.length, skipped, sanitized)
        : "Import loaded, but not saved locally."
    );
  } catch (error) {
    showToast("Import failed: choose a valid JSON export.");
  }
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

function normalizeImportedPrompts(parsed) {
  const candidates = Array.isArray(parsed) ? parsed : parsed?.prompts;

  if (!Array.isArray(candidates)) {
    return {
      ok: false,
      message: "Import failed: expected a prompts array.",
    };
  }

  if (!candidates.length) {
    return {
      ok: false,
      message: "Import failed: the prompts array is empty.",
    };
  }

  if (candidates.length > MAX_IMPORT_PROMPTS) {
    return {
      ok: false,
      message: `Import failed: limit is ${MAX_IMPORT_PROMPTS} prompts per file.`,
    };
  }

  const normalized = [];
  let skipped = 0;
  let sanitized = 0;

  candidates.forEach((candidate) => {
    const result = normalizeImportedPrompt(candidate);
    if (!result.prompt) {
      skipped += 1;
      return;
    }

    if (result.sanitized) {
      sanitized += 1;
    }
    normalized.push(result.prompt);
  });

  if (!normalized.length) {
    return {
      ok: false,
      message: "Import failed: no valid prompts found.",
    };
  }

  const duplicateIds = countDuplicateIds(normalized);

  return {
    ok: true,
    prompts: ensureUniquePromptIds(normalized),
    skipped,
    sanitized: sanitized + duplicateIds,
  };
}

function normalizePrompt(prompt) {
  return normalizeImportedPrompt(prompt).prompt || createEmptyPromptSnapshot();
}

function normalizePromptModel(prompt) {
  return normalizeImportedPrompt(prompt).prompt || createEmptyPromptSnapshot();
}

function normalizeImportedPrompt(prompt) {
  if (!prompt || typeof prompt !== "object" || Array.isArray(prompt)) {
    return { prompt: null, sanitized: false };
  }

  const now = new Date().toISOString();
  const title = normalizeTextField(prompt.title, MAX_TITLE_LENGTH);
  const folder = normalizeTextField(prompt.folder, MAX_FOLDER_LENGTH) || "Workspace";
  const body = normalizeTextField(prompt.body ?? prompt.content, MAX_TEXT_LENGTH);
  const notes = normalizeTextField(prompt.notes, MAX_TEXT_LENGTH);
  const tags = normalizeTags(prompt.tags);
  const useCount = normalizeUseCount(prompt.useCount);
  const createdAt = isValidDate(prompt.created_at)
    ? prompt.created_at
    : isValidDate(prompt.createdAt)
      ? prompt.createdAt
      : now;
  const updatedAt = isValidDate(prompt.updated_at)
    ? prompt.updated_at
    : isValidDate(prompt.updatedAt)
      ? prompt.updatedAt
      : now;
  const lastUsedAt = isValidDate(prompt.lastUsedAt) ? prompt.lastUsedAt : null;

  const normalized = {
    id: normalizeId(prompt.id),
    title,
    body,
    folder,
    tags,
    favorite: prompt.favorite === true,
    archived: prompt.archived === true,
    version: normalizeVersion(prompt.version),
    useCount,
    content: body,
    notes,
    created_at: createdAt,
    updated_at: updatedAt,
    createdAt,
    updatedAt,
    lastUsedAt,
  };

  if (!normalized.title && !normalized.body && !normalized.notes) {
    return { prompt: null, sanitized: false };
  }

  return {
    prompt: normalized,
    sanitized: didSanitizePrompt(prompt, normalized),
  };
}

function createEmptyPromptSnapshot() {
  const now = new Date().toISOString();
  return {
    id: buildId(),
    title: "",
    body: "",
    folder: "Workspace",
    tags: [],
    favorite: false,
    archived: false,
    version: PROMPT_MODEL_VERSION,
    useCount: 0,
    content: "",
    notes: "",
    created_at: now,
    updated_at: now,
    createdAt: now,
    updatedAt: now,
    lastUsedAt: null,
  };
}

function normalizeId(value) {
  return typeof value === "string" && value.trim() ? value.trim() : buildId();
}

function normalizeVersion(value) {
  const version = Number(value);
  if (!Number.isFinite(version) || version < 1) {
    return PROMPT_MODEL_VERSION;
  }

  return Math.max(PROMPT_MODEL_VERSION, Math.floor(version));
}

function normalizeTextField(value, maxLength) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

function normalizeTags(value) {
  const rawTags = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  const seen = new Set();
  const tags = [];

  rawTags.forEach((tag) => {
    if (typeof tag !== "string") {
      return;
    }

    const normalized = tag.trim().slice(0, MAX_TAG_LENGTH);
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) {
      return;
    }

    seen.add(key);
    tags.push(normalized);
  });

  return tags.slice(0, MAX_TAGS);
}

function normalizeUseCount(value) {
  const useCount = Number(value);
  if (!Number.isFinite(useCount) || useCount <= 0) {
    return 0;
  }

  return Math.min(Math.floor(useCount), 999999);
}

function didSanitizePrompt(original, normalized) {
  const originalId = typeof original.id === "string" ? original.id.trim() : "";
  const originalFolder = normalizeTextField(original.folder, MAX_FOLDER_LENGTH) || "Workspace";
  const originalTags = Array.isArray(original.tags)
    ? original.tags.filter((tag) => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean)
    : typeof original.tags === "string"
      ? original.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
      : [];

  return (
    originalId !== normalized.id ||
    normalizeTextField(original.title, MAX_TITLE_LENGTH) !== normalized.title ||
    originalFolder !== normalized.folder ||
    normalizeTextField(original.body ?? original.content, MAX_TEXT_LENGTH) !== normalized.body ||
    normalizeTextField(original.notes, MAX_TEXT_LENGTH) !== normalized.notes ||
    normalizeUseCount(original.useCount) !== normalized.useCount ||
    original.favorite !== normalized.favorite ||
    original.archived !== normalized.archived ||
    !isValidDate(original.created_at ?? original.createdAt) ||
    !isValidDate(original.updated_at ?? original.updatedAt) ||
    (original.lastUsedAt !== null && original.lastUsedAt !== undefined && !isValidDate(original.lastUsedAt)) ||
    originalTags.join("\u0000") !== normalized.tags.join("\u0000")
  );
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

function buildExportPayload() {
  const prompts = state.prompts.map(serializePrompt);
  return {
    app: "Prompt Shelf",
    format: "prompt-shelf-backup",
    version: EXPORT_VERSION,
    schemaVersion: PROMPT_MODEL_VERSION,
    exportedAt: new Date().toISOString(),
    counts: {
      prompts: prompts.length,
      archived: prompts.filter((prompt) => prompt.archived).length,
      favorites: prompts.filter((prompt) => prompt.favorite).length,
    },
    prompts,
  };
}

function serializePrompt(prompt) {
  const normalized = normalizePromptModel(prompt);
  return {
    id: normalized.id,
    title: normalized.title,
    body: normalized.body,
    tags: normalized.tags,
    folder: normalized.folder,
    favorite: normalized.favorite,
    created_at: normalized.created_at,
    updated_at: normalized.updated_at,
    version: normalized.version,
    archived: normalized.archived,
    content: normalized.body,
    notes: normalized.notes,
    useCount: normalized.useCount,
    createdAt: normalized.createdAt,
    updatedAt: normalized.updatedAt,
    lastUsedAt: normalized.lastUsedAt,
  };
}

function countDuplicateIds(prompts) {
  const seenIds = new Set();
  let duplicates = 0;

  prompts.forEach((prompt) => {
    if (seenIds.has(prompt.id)) {
      duplicates += 1;
      return;
    }

    seenIds.add(prompt.id);
  });

  return duplicates;
}

function ensureUniquePromptIds(prompts) {
  const seenIds = new Set();

  return prompts.map((prompt) => {
    if (!seenIds.has(prompt.id)) {
      seenIds.add(prompt.id);
      return prompt;
    }

    let uniqueId = buildId();
    while (seenIds.has(uniqueId)) {
      uniqueId = buildId();
    }

    const promptWithUniqueId = {
      ...prompt,
      id: uniqueId,
    };
    seenIds.add(promptWithUniqueId.id);
    return promptWithUniqueId;
  });
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
  let saved;

  try {
    saved = window.localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    storageAvailable = false;
    return structuredClone(seedPrompts);
  }

  if (!saved) {
    const seededPrompts = structuredClone(seedPrompts).map(normalizePromptModel);
    persistPromptSnapshot(seededPrompts);
    return seededPrompts;
  }

  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) {
      return structuredClone(seedPrompts);
    }

    const normalizedPrompts = ensureUniquePromptIds(parsed.map(normalizePrompt));
    const normalizedSnapshot = JSON.stringify(normalizedPrompts);

    if (normalizedSnapshot !== saved) {
      persistPromptSnapshot(normalizedPrompts);
    }

    return normalizedPrompts;
  } catch (error) {
    return structuredClone(seedPrompts);
  }
}

function persistPromptSnapshot(prompts) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
    storageAvailable = true;
    return true;
  } catch (error) {
    storageAvailable = false;
    return false;
  }
}

function persistPrompts() {
  if (!persistPromptSnapshot(state.prompts)) {
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
