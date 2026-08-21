import axios from "axios";

const PLATFORM_KEY_STORAGE = "oplata_platform_key";

export function getPlatformKey(): string | null {
  return localStorage.getItem(PLATFORM_KEY_STORAGE);
}

export function setPlatformKey(key: string) {
  localStorage.setItem(PLATFORM_KEY_STORAGE, key);
}

export function clearPlatformKey() {
  localStorage.removeItem(PLATFORM_KEY_STORAGE);
}

export const platformClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3001",
});

platformClient.interceptors.request.use((config) => {
  const key = getPlatformKey();
  if (key) {
    config.headers.set("x-platform-key", key);
  }
  return config;
});
