import type { ProjectData, ProjectStorageItem } from '../types/project';

const DB_NAME = 'AquariumFilterSimCAD_DB';
const DB_VERSION = 1;
const PROJECTS_STORE = 'projects';
const APP_STATE_STORE = 'appState';
const DRAFT_KEY = 'autoSaveDraft';
const LAST_PROJECT_KEY = 'lastActiveProjectId';

let dbInstance: IDBDatabase | null = null;

/**
 * Initializes IndexedDB with stores for projects and application state.
 */
export async function initStorage(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return null;
  }

  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store 1: Saved Projects
        if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
          const store = db.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Store 2: Application State (Drafts, last active project)
        if (!db.objectStoreNames.contains(APP_STATE_STORE)) {
          db.createObjectStore(APP_STATE_STORE, { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        dbInstance = request.result;
        resolve(dbInstance);
      };

      request.onerror = () => {
        console.warn('IndexedDB initialization failed, falling back to localStorage.', request.error);
        resolve(null);
      };
    } catch (err) {
      console.warn('IndexedDB exception, falling back to localStorage.', err);
      resolve(null);
    }
  });
}

/**
 * Saves a project to IndexedDB (with localStorage fallback).
 */
export async function saveProjectToStorage(project: ProjectData): Promise<void> {
  const db = await initStorage();

  const item: ProjectStorageItem = {
    id: project.metadata.id,
    name: project.metadata.name,
    updatedAt: project.metadata.updatedAt,
    createdAt: project.metadata.createdAt,
    objectCount: project.objects.length,
    connectionCount: project.connections.length,
    data: project,
  };

  if (db) {
    return new Promise((resolve) => {
      const tx = db.transaction([PROJECTS_STORE], 'readwrite');
      const store = tx.objectStore(PROJECTS_STORE);
      const req = store.put(item);

      req.onsuccess = () => resolve();
      req.onerror = () => {
        // Fallback to localStorage
        saveToLocalStorage(item);
        resolve();
      };
    });
  } else {
    saveToLocalStorage(item);
  }
}

/**
 * Retrieves a project by ID.
 */
export async function getProjectFromStorage(id: string): Promise<ProjectData | null> {
  const db = await initStorage();

  if (db) {
    return new Promise((resolve) => {
      const tx = db.transaction([PROJECTS_STORE], 'readonly');
      const store = tx.objectStore(PROJECTS_STORE);
      const req = store.get(id);

      req.onsuccess = () => {
        const res = req.result as ProjectStorageItem | undefined;
        if (res && res.data) {
          resolve(res.data);
        } else {
          resolve(getFromLocalStorage(id));
        }
      };

      req.onerror = () => {
        resolve(getFromLocalStorage(id));
      };
    });
  }

  return getFromLocalStorage(id);
}

/**
 * Lists all saved projects, sorted by updatedAt descending.
 */
export async function listProjectsFromStorage(): Promise<ProjectStorageItem[]> {
  const db = await initStorage();

  if (db) {
    return new Promise((resolve) => {
      const tx = db.transaction([PROJECTS_STORE], 'readonly');
      const store = tx.objectStore(PROJECTS_STORE);
      const req = store.getAll();

      req.onsuccess = () => {
        const list = (req.result as ProjectStorageItem[]) || [];
        // Merge with any localStorage items
        const localItems = listFromLocalStorage();
        const mergedMap = new Map<string, ProjectStorageItem>();
        localItems.forEach((it) => mergedMap.set(it.id, it));
        list.forEach((it) => mergedMap.set(it.id, it));

        const sorted = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        resolve(sorted);
      };

      req.onerror = () => {
        resolve(listFromLocalStorage());
      };
    });
  }

  return listFromLocalStorage();
}

/**
 * Deletes a project by ID.
 */
export async function deleteProjectFromStorage(id: string): Promise<void> {
  const db = await initStorage();

  if (db) {
    new Promise<void>((resolve) => {
      const tx = db.transaction([PROJECTS_STORE], 'readwrite');
      const store = tx.objectStore(PROJECTS_STORE);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }

  deleteFromLocalStorage(id);
}

/**
 * Saves an auto-saved draft of the current unsaved state.
 */
export async function saveDraftToStorage(project: ProjectData): Promise<void> {
  const db = await initStorage();

  if (db) {
    try {
      const tx = db.transaction([APP_STATE_STORE], 'readwrite');
      const store = tx.objectStore(APP_STATE_STORE);
      store.put({ key: DRAFT_KEY, data: project, savedAt: new Date().toISOString() });
    } catch {
      // Ignore background draft errors
    }
  }

  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(project));
  } catch {
    // Ignore storage quota
  }
}

/**
 * Retrieves the auto-saved draft if one exists.
 */
export async function getDraftFromStorage(): Promise<ProjectData | null> {
  const db = await initStorage();

  if (db) {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction([APP_STATE_STORE], 'readonly');
        const store = tx.objectStore(APP_STATE_STORE);
        const req = store.get(DRAFT_KEY);

        req.onsuccess = () => {
          if (req.result && req.result.data) {
            resolve(req.result.data);
          } else {
            resolve(getDraftFromLocalStorage());
          }
        };

        req.onerror = () => resolve(getDraftFromLocalStorage());
      } catch {
        resolve(getDraftFromLocalStorage());
      }
    });
  }

  return getDraftFromLocalStorage();
}

/**
 * Clears the auto-saved draft.
 */
export async function clearDraftFromStorage(): Promise<void> {
  const db = await initStorage();
  if (db) {
    try {
      const tx = db.transaction([APP_STATE_STORE], 'readwrite');
      const store = tx.objectStore(APP_STATE_STORE);
      store.delete(DRAFT_KEY);
    } catch {
      // Ignore
    }
  }
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Remembers the ID of the last active project.
 */
export async function setLastProjectId(id: string | null): Promise<void> {
  const db = await initStorage();
  if (db) {
    try {
      const tx = db.transaction([APP_STATE_STORE], 'readwrite');
      const store = tx.objectStore(APP_STATE_STORE);
      if (id) {
        store.put({ key: LAST_PROJECT_KEY, id });
      } else {
        store.delete(LAST_PROJECT_KEY);
      }
    } catch {
      // Ignore
    }
  }

  try {
    if (id) localStorage.setItem(LAST_PROJECT_KEY, id);
    else localStorage.removeItem(LAST_PROJECT_KEY);
  } catch {
    // Ignore
  }
}

export async function getLastProjectId(): Promise<string | null> {
  const db = await initStorage();
  if (db) {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction([APP_STATE_STORE], 'readonly');
        const store = tx.objectStore(APP_STATE_STORE);
        const req = store.get(LAST_PROJECT_KEY);
        req.onsuccess = () => {
          if (req.result && req.result.id) resolve(req.result.id);
          else resolve(localStorage.getItem(LAST_PROJECT_KEY));
        };
        req.onerror = () => resolve(localStorage.getItem(LAST_PROJECT_KEY));
      } catch {
        resolve(localStorage.getItem(LAST_PROJECT_KEY));
      }
    });
  }

  try {
    return localStorage.getItem(LAST_PROJECT_KEY);
  } catch {
    return null;
  }
}

// --------------------------------------------------------------------------
// LocalStorage Fallback Helpers
// --------------------------------------------------------------------------
const LS_PREFIX = 'aquarium_cad_proj_';

function saveToLocalStorage(item: ProjectStorageItem): void {
  try {
    localStorage.setItem(`${LS_PREFIX}${item.id}`, JSON.stringify(item));
  } catch (e) {
    console.warn('LocalStorage save failed:', e);
  }
}

function getFromLocalStorage(id: string): ProjectData | null {
  try {
    const raw = localStorage.getItem(`${LS_PREFIX}${id}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.data || null;
  } catch {
    return null;
  }
}

function listFromLocalStorage(): ProjectStorageItem[] {
  const items: ProjectStorageItem[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LS_PREFIX)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const item = JSON.parse(raw);
          if (item && item.id) items.push(item);
        }
      }
    }
  } catch {
    // Ignore
  }
  return items;
}

function deleteFromLocalStorage(id: string): void {
  try {
    localStorage.removeItem(`${LS_PREFIX}${id}`);
  } catch {
    // Ignore
  }
}

function getDraftFromLocalStorage(): ProjectData | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
