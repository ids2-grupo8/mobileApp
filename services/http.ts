import * as SecureStore from "expo-secure-store";

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
};

export async function request<T = unknown>(
  url: string,
  { method = "GET", body, auth = true, headers: customHeaders = {} }: RequestOptions = {},
): Promise<T> {
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
    console.error(
      `[API] ${method} ${url} → ${res.status}`,
      JSON.stringify(json),
    );
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
  const headers: Record<string, string> = { Accept: 'application/json' };

  if (auth) {
    const token = await getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const formData = new FormData();
  formData.append(fileField, { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
  if (extraFields) {
    for (const [key, value] of Object.entries(extraFields)) {
      formData.append(key, value);
    }
  }

  const res = await fetch(url, { method, headers, body: formData });

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
  const headers: Record<string, string> = { Accept: 'application/json' };

  if (auth) {
    const token = await getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  for (const img of images) {
    formData.append('images', { uri: img.uri, name: img.name, type: img.type } as unknown as Blob);
  }

  const res = await fetch(url, { method, headers, body: formData });

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
