import * as SecureStore from "expo-secure-store";

import { USERS } from "@/constants/api";

const TOKEN_KEY = "access_token";
const REFRESH_KEY = "refresh_token";

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

export async function getAccessToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_KEY);
}

export async function saveTokens(accessToken: string, refreshToken?: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
  if (refreshToken) await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}

// ---------------------------------------------------------------------------
// Session refresh
//
// Cuando un request autenticado recibe 401, intentamos renovar la sesión una
// única vez contra POST /users/auth/refresh y reintentamos el request. Si la
// renovación falla (refresh token vencido/ausente), se limpian los tokens y se
// notifica al auth store para que cierre la sesión.
// ---------------------------------------------------------------------------

let sessionExpiredHandler: (() => void) | null = null;

/** El auth store registra acá qué hacer cuando la sesión expira de verdad. */
export function setSessionExpiredHandler(handler: (() => void) | null) {
  sessionExpiredHandler = handler;
}

let refreshInFlight: Promise<boolean> | null = null;

async function doRefreshSession(): Promise<boolean> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(USERS("/auth/refresh"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return false;
    const json = (await res.json()) as {
      token?: { access_token?: string; refresh_token?: string };
    };
    if (!json.token?.access_token) return false;
    await saveTokens(json.token.access_token, json.token.refresh_token);
    return true;
  } catch {
    return false;
  }
}

/** Single-flight: N requests con 401 simultáneos disparan un solo refresh. */
function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = doRefreshSession().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/**
 * Ejecuta el fetch y, ante un 401 en un request autenticado, renueva la sesión
 * y reintenta una única vez. `execute` reconstruye los headers en cada intento
 * para tomar el access token nuevo.
 */
async function fetchWithSessionRetry(
  execute: () => Promise<Response>,
  auth: boolean,
): Promise<Response> {
  let res = await execute();
  if (auth && res.status === 401) {
    if (await refreshSession()) {
      res = await execute();
    } else {
      await clearTokens();
      sessionExpiredHandler?.();
    }
  }
  return res;
}

// ---------------------------------------------------------------------------
// API error
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ---------------------------------------------------------------------------
// Base request
// ---------------------------------------------------------------------------

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean; // include Bearer token (default true)
  headers?: Record<string, string>;
  /** When true, failed responses do not log to console.error (caller handles UX). */
  silent?: boolean;
};

export async function request<T = unknown>(
  url: string,
  {
    method = "GET",
    body,
    auth = true,
    headers: customHeaders = {},
    silent = false,
  }: RequestOptions = {},
): Promise<T> {
  const execute = async (): Promise<Response> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...customHeaders,
    };

    if (auth) {
      const token = await getAccessToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;
      else console.warn('[HTTP] No token available but auth: true');
    }

    console.log(`[HTTP] ${method} ${url}`, { auth, hasToken: !!headers["Authorization"] });

    return fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  const res = await fetchWithSessionRetry(execute, auth);

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = { message: text };
  }

  if (!res.ok) {
    if (!silent) {
      console.error(
        `[API] ${method} ${url} → ${res.status}`,
        JSON.stringify(json),
      );
    }
    const j = json as {
      message?: string;
      error?: string;
      detail?: string;
      title?: string;
    };
    const message =
      j.detail ?? j.message ?? j.error ?? j.title ?? `Error ${res.status}`;
    throw new ApiError(res.status, message, json);
  }

  return json as T;
}

export type ImageFile = {
  uri: string;
  name: string;
  type: string;
};

export async function requestFileUpload<T = unknown>(
  url: string,
  {
    method = 'POST',
    fileField = 'file',
    file,
    extraFields,
    auth = true,
  }: {
    method?: 'POST' | 'PUT' | 'PATCH';
    fileField?: string;
    file: ImageFile;
    extraFields?: Record<string, string>;
    auth?: boolean;
  }
): Promise<T> {
  const formData = new FormData();
  formData.append(fileField, { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
  if (extraFields) {
    for (const [key, value] of Object.entries(extraFields)) {
      formData.append(key, value);
    }
  }

  const execute = async (): Promise<Response> => {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (auth) {
      const token = await getAccessToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, { method, headers, body: formData });
  };

  const res = await fetchWithSessionRetry(execute, auth);

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = { message: text };
  }

  if (!res.ok) {
    console.error(`[API] ${method} ${url} → ${res.status}`, JSON.stringify(json));
    const j = json as { message?: string; error?: string; detail?: string; title?: string };
    const message = j.detail ?? j.message ?? j.error ?? j.title ?? `Error ${res.status}`;
    throw new ApiError(res.status, message, json);
  }

  return json as T;
}

export async function requestFormData<T = unknown>(
  url: string,
  {
    method = 'POST',
    fields,
    images,
    auth = true,
  }: {
    method?: 'POST' | 'PUT' | 'PATCH';
    fields: Record<string, string>;
    images: ImageFile[];
    auth?: boolean;
  }
): Promise<T> {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  for (const img of images) {
    formData.append('images', { uri: img.uri, name: img.name, type: img.type } as unknown as Blob);
  }

  const execute = async (): Promise<Response> => {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (auth) {
      const token = await getAccessToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, { method, headers, body: formData });
  };

  const res = await fetchWithSessionRetry(execute, auth);

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = { message: text };
  }

  if (!res.ok) {
    console.error(`[API] ${method} ${url} → ${res.status}`, JSON.stringify(json));
    const j = json as { message?: string; error?: string; detail?: string; title?: string };
    const message = j.detail ?? j.message ?? j.error ?? j.title ?? `Error ${res.status}`;
    throw new ApiError(res.status, message, json);
  }

  return json as T;
}
