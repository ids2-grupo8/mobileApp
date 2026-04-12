import { USERS } from '@/constants/api';
import { ApiError, request, saveTokens } from './http';

// ─── Tipos que reflejan exactamente la API ───────────────────────────────────

type UserData = {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
};

type LoginResponse = {
  data: UserData;
  token: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
};

type RegisterResponse = {
  data: UserData;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
};

// ─── Requests ────────────────────────────────────────────────────────────────

export async function loginRequest(
  email: string,
  password: string
): Promise<AuthUser> {
  const res = await request<LoginResponse>(USERS('/auth/login'), {
    method: 'POST',
    body: { email, password },
    auth: false,
  });
  await saveTokens(res.token.access_token, res.token.refresh_token);
  return {
    id: res.data.id,
    email: res.data.email,
    name: res.data.full_name,
  };
}

export async function registerRequest(
  name: string,
  email: string,
  password: string
): Promise<AuthUser> {
  // El register solo crea el usuario; el token se obtiene haciendo login a continuación
  await request<RegisterResponse>(USERS('/auth/register'), {
    method: 'POST',
    body: { full_name: name, email, password },
    auth: false,
  });
  return loginRequest(email, password);
}

export async function forgotPasswordRequest(email: string): Promise<void> {
  await request(USERS('/auth/forgot-password'), {
    method: 'POST',
    body: { email },
    auth: false,
  });
}

// ─── Manejo de errores ───────────────────────────────────────────────────────

export function toUserMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return 'Credenciales inválidas. Verificá tu email y contraseña.';
    if (err.status === 409) return 'Ya existe una cuenta con ese email.';
    if (err.status === 403) return 'Tu cuenta está suspendida. Contactá soporte.';
    if (err.status >= 500) return 'Error del servidor. Intentá de nuevo en unos minutos.';
    return err.message;
  }
  if (err instanceof TypeError) {
    console.error('[API] Network error:', err.message);
    return 'Sin conexión. Verificá tu red e intentá de nuevo.';
  }
  console.error('[API] Unexpected error:', err);
  return 'Ocurrió un error inesperado.';
}
