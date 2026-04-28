(function attachPromptShelfModel(globalScope) {
  const EXPORT_VERSION = 2;
  const PROMPT_MODEL_VERSION = 2;
  const MAX_IMPORT_PROMPTS = 1000;
  const MAX_TEXT_LENGTH = 20000;
  const MAX_TITLE_LENGTH = 160;
  const MAX_FOLDER_LENGTH = 80;
  const MAX_TAG_LENGTH = 40;
  const MAX_TAGS = 12;

  function buildId() {
    const cryptoRef = globalScope.crypto;
    if (cryptoRef?.randomUUID) {
      return cryptoRef.randomUUID();
    }

    return `prompt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function normalizePrompt(prompt) {
    return normalizeImportedPrompt(prompt).prompt || createEmptyPromptSnapshot();
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

  function parseImportJson(text) {
    try {
      return normalizeImportedPrompts(JSON.parse(text));
    } catch (error) {
      return {
        ok: false,
        message: "Import failed: choose a valid JSON export.",
      };
    }
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

  function buildExportPayload(prompts) {
    const normalizedPrompts = prompts.map(serializePrompt);
    return {
      app: "Prompt Shelf",
      format: "prompt-shelf-backup",
      version: EXPORT_VERSION,
      schemaVersion: PROMPT_MODEL_VERSION,
      exportedAt: new Date().toISOString(),
      counts: {
        prompts: normalizedPrompts.length,
        archived: normalizedPrompts.filter((prompt) => prompt.archived).length,
        favorites: normalizedPrompts.filter((prompt) => prompt.favorite).length,
      },
      prompts: normalizedPrompts,
    };
  }

  function serializePrompt(prompt) {
    const normalized = normalizePrompt(prompt);
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

  function isValidDate(value) {
    return typeof value === "string" && !Number.isNaN(new Date(value).getTime());
  }

  const api = {
    EXPORT_VERSION,
    PROMPT_MODEL_VERSION,
    buildExportPayload,
    createEmptyPromptSnapshot,
    ensureUniquePromptIds,
    normalizeImportedPrompt,
    normalizeImportedPrompts,
    normalizePrompt,
    normalizeTags,
    parseImportJson,
    serializePrompt,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  globalScope.PromptShelfModel = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
