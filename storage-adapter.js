(function attachPromptShelfStorage(globalScope) {
  const STORAGE_KEY = "prompt-shelf-state-v1";
  const INDEXED_DB_NAME = "prompt-shelf-db";
  const INDEXED_DB_VERSION = 1;
  const INDEXED_DB_STORE = "state";
  const model = globalScope.PromptShelfModel || (typeof require === "function" ? require("./prompt-model.js") : null);

  function getStorageKey() {
    return STORAGE_KEY;
  }

  function isIndexedDBAvailable(options = {}) {
    const indexedDBFactory =
      Object.prototype.hasOwnProperty.call(options, "indexedDB")
        ? options.indexedDB
        : globalScope.indexedDB;

    return Boolean(indexedDBFactory && typeof indexedDBFactory.open === "function");
  }

  function createLocalStorageAdapter(options = {}) {
    const defaultStorage =
      Object.prototype.hasOwnProperty.call(options, "storage")
        ? options.storage
        : globalScope.localStorage;

    return {
      exportState,
      getStorageKey,
      importState,
      loadState(loadOptions = {}) {
        return loadLocalStorageState({
          ...loadOptions,
          storage: Object.prototype.hasOwnProperty.call(loadOptions, "storage")
            ? loadOptions.storage
            : defaultStorage,
        });
      },
      saveState(state, saveOptions = {}) {
        return saveLocalStorageState(state, {
          ...saveOptions,
          storage: Object.prototype.hasOwnProperty.call(saveOptions, "storage")
            ? saveOptions.storage
            : defaultStorage,
        });
      },
      storageType: "localStorage",
    };
  }

  function createIndexedDBAdapter(options = {}) {
    if (!isIndexedDBAvailable(options)) {
      return {
        ...createLocalStorageAdapter(options),
        indexedDBAvailable: false,
        storageType: "localStorage",
      };
    }

    const indexedDBFactory = Object.prototype.hasOwnProperty.call(options, "indexedDB")
      ? options.indexedDB
      : globalScope.indexedDB;
    const dbName = options.dbName || INDEXED_DB_NAME;

    return {
      exportState,
      getStorageKey,
      importState,
      indexedDBAvailable: true,
      async loadState(loadOptions = {}) {
        const fallbackPrompts = normalizeFallback(loadOptions.defaultPrompts || []);

        try {
          const record = await readIndexedDBRecord(indexedDBFactory, dbName);
          if (!record) {
            await writeIndexedDBRecord(indexedDBFactory, dbName, fallbackPrompts);
            return {
              ok: true,
              storageAvailable: true,
              prompts: fallbackPrompts,
              migrated: false,
            };
          }

          const prompts = normalizeStatePrompts(record.prompts);
          return {
            ok: true,
            storageAvailable: true,
            prompts,
            migrated: false,
          };
        } catch (error) {
          return {
            ok: false,
            storageAvailable: false,
            prompts: fallbackPrompts,
            migrated: false,
            error: "indexedDB unavailable",
          };
        }
      },
      async saveState(state) {
        const prompts = normalizeStatePrompts(state);

        try {
          await writeIndexedDBRecord(indexedDBFactory, dbName, prompts);
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
            error: "indexedDB save failed",
          };
        }
      },
      storageType: "indexedDB",
    };
  }

  async function migrateLocalStorageToIndexedDB(options = {}) {
    const localAdapter = createLocalStorageAdapter(options);
    const localState = localAdapter.loadState({
      defaultPrompts: options.defaultPrompts || [],
      storage: Object.prototype.hasOwnProperty.call(options, "storage")
        ? options.storage
        : undefined,
    });

    if (!localState.ok) {
      return {
        ok: false,
        migrated: false,
        localStoragePreserved: true,
        prompts: localState.prompts,
        error: localState.error || "localStorage read failed",
      };
    }

    if (!isIndexedDBAvailable(options)) {
      return {
        ok: false,
        migrated: false,
        localStoragePreserved: true,
        prompts: localState.prompts,
        error: "indexedDB unavailable",
      };
    }

    const indexedDBAdapter = createIndexedDBAdapter(options);
    const saved = await indexedDBAdapter.saveState(localState.prompts);

    return {
      ok: saved.ok,
      migrated: saved.ok,
      localStoragePreserved: true,
      prompts: saved.prompts,
      error: saved.error,
    };
  }

  function loadLocalStorageState(options = {}) {
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
      saveLocalStorageState(fallbackPrompts, { storage });
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
        saveLocalStorageState(prompts, { storage });
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

  function saveLocalStorageState(state, options = {}) {
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

  function openIndexedDB(indexedDBFactory, dbName) {
    return new Promise((resolve, reject) => {
      const request = indexedDBFactory.open(dbName, INDEXED_DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(INDEXED_DB_STORE)) {
          db.createObjectStore(INDEXED_DB_STORE, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("indexedDB open failed"));
    });
  }

  function closeIndexedDB(db) {
    if (db && typeof db.close === "function") {
      db.close();
    }
  }

  async function readIndexedDBRecord(indexedDBFactory, dbName) {
    const db = await openIndexedDB(indexedDBFactory, dbName);

    try {
      return await new Promise((resolve, reject) => {
        const transaction = db.transaction(INDEXED_DB_STORE, "readonly");
        const store = transaction.objectStore(INDEXED_DB_STORE);
        const request = store.get(STORAGE_KEY);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error || new Error("indexedDB read failed"));
      });
    } finally {
      closeIndexedDB(db);
    }
  }

  async function writeIndexedDBRecord(indexedDBFactory, dbName, prompts) {
    const db = await openIndexedDB(indexedDBFactory, dbName);

    try {
      await new Promise((resolve, reject) => {
        const transaction = db.transaction(INDEXED_DB_STORE, "readwrite");
        const store = transaction.objectStore(INDEXED_DB_STORE);
        const request = store.put({
          id: STORAGE_KEY,
          prompts: normalizeStatePrompts(prompts),
          updatedAt: new Date().toISOString(),
          schemaVersion: model.PROMPT_MODEL_VERSION,
        });

        request.onerror = () => reject(request.error || new Error("indexedDB write failed"));
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error || request.error || new Error("indexedDB transaction failed"));
      });
    } finally {
      closeIndexedDB(db);
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

  const localStorageAdapter = createLocalStorageAdapter();

  const api = {
    createIndexedDBAdapter,
    createLocalStorageAdapter,
    exportState,
    getStorageKey,
    importState,
    isIndexedDBAvailable,
    loadState: localStorageAdapter.loadState,
    migrateLocalStorageToIndexedDB,
    saveState: localStorageAdapter.saveState,
    storageType: "localStorage",
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  globalScope.PromptShelfStorage = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
