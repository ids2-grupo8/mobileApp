import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

export async function getAccessToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
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
// API error
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ---------------------------------------------------------------------------
// Base request
// ---------------------------------------------------------------------------

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean; // incluir Bearer token (default true)
};

export async function request<T = unknown>(
  url: string,
  { method = 'GET', body, auth = true }: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (auth) {
    const token = await getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

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
