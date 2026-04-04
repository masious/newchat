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
  const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
  inMemoryToken = stored;
  return inMemoryToken;
}

export function setAuthToken(token: string | null) {
  inMemoryToken = token;
  if (typeof window !== "undefined") {
    if (token) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
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
