import * as SecureStore from "expo-secure-store";

const DEVICE_ID_KEY = "device_id";
const PIN_ENABLED_KEY = "pin_enabled";

function createDeviceId() {
  const now = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2);
  return `dev_${now}_${rand}`;
}

export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existing) return existing;
  const generated = createDeviceId();
  await SecureStore.setItemAsync(DEVICE_ID_KEY, generated);
  return generated;
}

export async function setPinEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(PIN_ENABLED_KEY, enabled ? "1" : "0");
}

export async function getPinEnabled(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(PIN_ENABLED_KEY);
  return value === "1";
}
