/**
 * Platform-agnostic key/value storage.
 *
 * Native (iOS/Android): expo-secure-store (Keychain / Keystore).
 * Web (PWA):            window.localStorage — required because SecureStore is
 *                        unsupported on web. Tokens stored here are subject to
 *                        the usual browser-storage caveats; for an academic
 *                        deliverable this is acceptable.
 */

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const isWeb = Platform.OS === 'web';

function webGet(key: string): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return window.localStorage.getItem(key);
}

function webSet(key: string, value: string) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.setItem(key, value);
}

function webDelete(key: string) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.removeItem(key);
}

export async function getItem(key: string): Promise<string | null> {
  if (isWeb) return webGet(key);
  return SecureStore.getItemAsync(key);
}

export async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    webSet(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteItem(key: string): Promise<void> {
  if (isWeb) {
    webDelete(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
