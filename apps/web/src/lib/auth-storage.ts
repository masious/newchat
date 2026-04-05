import { safeLocalStorage } from "./safe-local-storage";

const AUTH_STORAGE_KEY = "newchat.jwt";
let inMemoryToken: string | null = null;
const listeners = new Set<(token: string | null) => void>();

function notify(token: string | null) {
  listeners.forEach((listener) => listener(token));
}

export function getAuthToken() {
  if (typeof window === "undefined") {
    return inMemoryToken;
  }
  if (inMemoryToken) return inMemoryToken;
  const stored = safeLocalStorage.getItem(AUTH_STORAGE_KEY);
  inMemoryToken = stored;
  return inMemoryToken;
}

export function setAuthToken(token: string | null) {
  inMemoryToken = token;
  if (typeof window !== "undefined") {
    if (token) {
      safeLocalStorage.setItem(AUTH_STORAGE_KEY, token);
    } else {
      safeLocalStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }
  notify(inMemoryToken);
}

export function subscribeToAuthToken(listener: (token: string | null) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function clearAuthToken() {
  setAuthToken(null);
}
