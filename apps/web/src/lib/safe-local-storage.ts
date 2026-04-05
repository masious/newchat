const memoryStore = new Map<string, string>();
let available: boolean | null = null;

function checkAvailable(): boolean {
  if (available === null) {
    if (typeof window === "undefined") {
      available = false;
    } else {
      try {
        const testKey = "__newchat_storage_test__";
        window.localStorage.setItem(testKey, "1");
        window.localStorage.removeItem(testKey);
        available = true;
      } catch {
        available = false;
      }
    }
  }
  return available;
}

export const safeLocalStorage = {
  getItem(key: string): string | null {
    if (typeof window === "undefined") return null;
    if (!checkAvailable()) return memoryStore.get(key) ?? null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return memoryStore.get(key) ?? null;
    }
  },

  setItem(key: string, value: string): void {
    if (typeof window === "undefined") return;
    memoryStore.set(key, value);
    if (!checkAvailable()) return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // quota exceeded or storage disabled — in-memory fallback already set
    }
  },

  removeItem(key: string): void {
    if (typeof window === "undefined") return;
    memoryStore.delete(key);
    if (!checkAvailable()) return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // no-op
    }
  },
};
