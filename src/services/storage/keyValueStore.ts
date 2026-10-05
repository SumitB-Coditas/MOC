/** The subset of the Web Storage API the storage client relies on. */
export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>

/** In-memory store: used in tests and as a fallback when localStorage is unavailable. */
export function createMemoryStore(initial: Record<string, string> = {}): KeyValueStore {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, String(value))
    },
    removeItem: (key) => {
      data.delete(key)
    },
    key: (index) => [...data.keys()][index] ?? null,
    get length() {
      return data.size
    },
  }
}

const PROBE_KEY = '__cms_storage_probe__'

/**
 * Returns `window.localStorage` when it exists and accepts writes (it can throw in private
 * browsing or when disabled). Otherwise falls back to memory, so the app still runs; data
 * just won't survive a reload.
 */
export function resolveBrowserStore(): KeyValueStore {
  // Outside a browser (e.g. unit tests in Node), never touch Node's experimental localStorage.
  if (typeof window === 'undefined') return createMemoryStore()
  try {
    const store = globalThis.localStorage
    store.setItem(PROBE_KEY, PROBE_KEY)
    store.removeItem(PROBE_KEY)
    return store
  } catch {
    console.warn('[storage] localStorage is unavailable; using in-memory storage instead.')
    return createMemoryStore()
  }
}
