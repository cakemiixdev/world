const STORAGE_KEY = 'world-hop.progress.v1';
const PROGRESS_VERSION = 1;

function readIdSet(value, name) {
  if (!Array.isArray(value) || value.some((id) => typeof id !== 'string')) {
    throw new TypeError(`Saved ${name} must be an array of destination IDs.`);
  }
  return new Set(value);
}

export class ProgressStore {
  constructor(storage = globalThis.localStorage) {
    if (!storage || typeof storage.getItem !== 'function' ||
        typeof storage.setItem !== 'function' || typeof storage.removeItem !== 'function') {
      throw new TypeError('Browser storage is unavailable; field progress cannot be saved.');
    }
    this.storage = storage;
  }

  load() {
    let raw;
    try {
      raw = this.storage.getItem(STORAGE_KEY);
    } catch (error) {
      throw new Error(`Could not read saved field progress: ${error.message}`);
    }
    if (raw === null) {
      return {
        activeDestinations: new Set(),
        retrievedDestinations: new Set(),
        completedDestinations: new Set(),
        completedMinigames: new Set(),
        discoveredDestinations: new Set(),
        minigameRecords: {},
        fieldTokens: 0,
      };
    }

    let saved;
    try {
      saved = JSON.parse(raw);
    } catch (error) {
      throw new Error(`Saved field progress is invalid JSON: ${error.message}`);
    }
    if (!saved || saved.version !== PROGRESS_VERSION) {
      throw new Error('Saved field progress has an unsupported version.');
    }
    if (!Number.isSafeInteger(saved.fieldTokens) || saved.fieldTokens < 0) {
      throw new TypeError('Saved field token balance is invalid.');
    }

    const minigameRecords = saved.minigameRecords ?? {};
    if (!minigameRecords || typeof minigameRecords !== 'object' || Array.isArray(minigameRecords) ||
        Object.values(minigameRecords).some((time) => !Number.isFinite(time) || time < 0)) {
      throw new TypeError('Saved mini-game records are invalid.');
    }
    return {
      activeDestinations: readIdSet(saved.activeDestinations, 'active destinations'),
      retrievedDestinations: readIdSet(saved.retrievedDestinations, 'retrieved destinations'),
      completedDestinations: readIdSet(saved.completedDestinations, 'completed destinations'),
      completedMinigames: readIdSet(saved.completedMinigames ?? [], 'completed mini-games'),
      discoveredDestinations: readIdSet(saved.discoveredDestinations, 'discovered destinations'),
      minigameRecords,
      fieldTokens: saved.fieldTokens,
    };
  }

  save(progress) {
    const data = {
      version: PROGRESS_VERSION,
      activeDestinations: [...progress.activeDestinations],
      retrievedDestinations: [...progress.retrievedDestinations],
      completedDestinations: [...progress.completedDestinations],
      completedMinigames: [...(progress.completedMinigames ?? [])],
      discoveredDestinations: [...progress.discoveredDestinations],
      minigameRecords: progress.minigameRecords ?? {},
      fieldTokens: progress.fieldTokens,
    };
    if (!Number.isSafeInteger(data.fieldTokens) || data.fieldTokens < 0) {
      throw new TypeError('Field token balance must be a non-negative integer.');
    }
    if (!data.minigameRecords || typeof data.minigameRecords !== 'object' ||
        Array.isArray(data.minigameRecords) ||
        Object.values(data.minigameRecords).some((time) => !Number.isFinite(time) || time < 0)) {
      throw new TypeError('Mini-game records must be non-negative times.');
    }
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      throw new Error(`Could not save field progress: ${error.message}`);
    }
  }

  clear() {
    try {
      this.storage.removeItem(STORAGE_KEY);
    } catch (error) {
      throw new Error(`Could not clear saved field progress: ${error.message}`);
    }
  }
}
