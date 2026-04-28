(function attachPromptShelfStorage(globalScope) {
  const STORAGE_KEY = "prompt-shelf-state-v1";
  const model = globalScope.PromptShelfModel || (typeof require === "function" ? require("./prompt-model.js") : null);

  function getStorageKey() {
    return STORAGE_KEY;
  }

  function loadState(options = {}) {
    const fallbackPrompts = normalizeFallback(options.defaultPrompts || []);
    const storage = options.storage || globalScope.localStorage;

    let saved;
    try {
      saved = storage?.getItem(STORAGE_KEY);
    } catch (error) {
      return {
        ok: false,
        storageAvailable: false,
        prompts: fallbackPrompts,
        migrated: false,
        error: "storage unavailable",
      };
    }

    if (!saved) {
      saveState(fallbackPrompts, { storage });
      return {
        ok: true,
        storageAvailable: true,
        prompts: fallbackPrompts,
        migrated: false,
      };
    }

    try {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) {
        return {
          ok: false,
          storageAvailable: true,
          prompts: fallbackPrompts,
          migrated: false,
          error: "stored state is not an array",
        };
      }

      const prompts = model.ensureUniquePromptIds(parsed.map(model.normalizePrompt));
      const normalizedSnapshot = JSON.stringify(prompts);
      const migrated = normalizedSnapshot !== saved;
      if (migrated) {
        saveState(prompts, { storage });
      }

      return {
        ok: true,
        storageAvailable: true,
        prompts,
        migrated,
      };
    } catch (error) {
      return {
        ok: false,
        storageAvailable: true,
        prompts: fallbackPrompts,
        migrated: false,
        error: "stored state is corrupted",
      };
    }
  }

  function saveState(state, options = {}) {
    const storage = options.storage || globalScope.localStorage;
    const prompts = normalizeStatePrompts(state);

    try {
      storage?.setItem(STORAGE_KEY, JSON.stringify(prompts));
      return {
        ok: true,
        storageAvailable: true,
        prompts,
      };
    } catch (error) {
      return {
        ok: false,
        storageAvailable: false,
        prompts,
        error: "save failed",
      };
    }
  }

  function exportState(state) {
    return model.buildExportPayload(normalizeStatePrompts(state));
  }

  function importState(jsonText) {
    return model.parseImportJson(jsonText);
  }

  function normalizeStatePrompts(state) {
    const prompts = Array.isArray(state) ? state : state?.prompts;
    return model.ensureUniquePromptIds((prompts || []).map(model.normalizePrompt));
  }

  function normalizeFallback(prompts) {
    return model.ensureUniquePromptIds(prompts.map(model.normalizePrompt));
  }

  const api = {
    exportState,
    getStorageKey,
    importState,
    loadState,
    saveState,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  globalScope.PromptShelfStorage = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
