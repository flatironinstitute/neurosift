interface CachedItem {
  key: string;
  type: "group" | "dataset";
  data: unknown;
  timestamp: number;
}

const DB_NAME = "neurosift-hdf5-cache";
const DB_VERSION = 1;
const STORE_NAME = "hdf5-objects";
const MAX_CACHED_ITEMS = 1000; // Clear cache when this many items are stored

let db: IDBDatabase | undefined = undefined;

const initializeDb = async () => {
  return new Promise<void>((resolve, reject) => {
    if (db) {
      resolve();
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => {
      reject(new Error("Failed to open IndexedDB"));
    };
    request.onsuccess = (event: Event) => {
      const target = event.target as IDBOpenDBRequest;
      db = target.result;
      resolve();
    };
    request.onupgradeneeded = (event: Event) => {
      const target = event.target as IDBOpenDBRequest;
      const database = target.result;
      database.createObjectStore(STORE_NAME, { keyPath: "key" });
    };
  });
};

export const setCachedObject = async (
  url: string,
  path: string,
  type: "group" | "dataset",
  data: unknown,
): Promise<void> => {
  await initializeDb();
  if (!db) return;

  const key = `${url}:${path}`;
  const transaction = db.transaction(STORE_NAME, "readwrite");
  const store = transaction.objectStore(STORE_NAME);

  // First count total items
  const countRequest = store.count();
  await new Promise<void>((resolve, reject) => {
    countRequest.onsuccess = async () => {
      const count = countRequest.result;
      if (count >= MAX_CACHED_ITEMS) {
        // Clear the entire store if we exceed the limit
        store.clear();
      }
      // Now add the new item
      const item: CachedItem = {
        key,
        type,
        data,
        timestamp: Date.now(),
      };
      const request = store.put(item);
      request.onerror = () => reject(new Error("Failed to cache object"));
      request.onsuccess = () => resolve();
    };
    countRequest.onerror = () =>
      reject(new Error("Failed to count cached items"));
  });
};

export const getCachedObject = async (
  url: string,
  path: string,
  type: "group" | "dataset",
): Promise<unknown | undefined> => {
  await initializeDb();
  if (!db) return undefined;

  const key = `${url}:${path}`;
  const safeDb = db; // Create a stable reference that TypeScript can verify
  return new Promise((resolve, reject) => {
    const transaction = safeDb.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onerror = () => reject(new Error("Failed to get cached object"));
    request.onsuccess = () => {
      const result = request.result as CachedItem | undefined;
      if (!result || result.type !== type) {
        resolve(undefined);
        return;
      }
      resolve(result.data);
    };
  });
};
