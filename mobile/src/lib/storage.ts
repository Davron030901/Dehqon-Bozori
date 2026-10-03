/**
 * The only module that touches device storage.
 *
 *   * The session token goes to SecureStore (Keychain / Keystore): it is a
 *     bearer credential, and a rooted phone's plain app storage is not a vault.
 *   * Everything else — language, favourites, the profile draft — is ordinary
 *     preference data and lives in AsyncStorage.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'dehqon_bozori_token';

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string | null): Promise<void> {
  try {
    if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    /* a device without a secure store simply stays signed out */
  }
}

export async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full — not worth crashing a screen over */
  }
}

export const KEYS = {
  language: 'db_language',
  favorites: 'db_favorites',
} as const;
