import * as Storage from "./secure-storage";

const DEVICE_ID_KEY = "device_id";
const PIN_ENABLED_KEY = "pin_enabled";

function createDeviceId() {
  const now = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2);
  return `dev_${now}_${rand}`;
}

export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await Storage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const generated = createDeviceId();
  await Storage.setItem(DEVICE_ID_KEY, generated);
  return generated;
}

export async function setPinEnabled(enabled: boolean): Promise<void> {
  await Storage.setItem(PIN_ENABLED_KEY, enabled ? "1" : "0");
}

export async function getPinEnabled(): Promise<boolean> {
  const value = await Storage.getItem(PIN_ENABLED_KEY);
  return value === "1";
}
