import { USERS } from '@/constants/api';
import { ApiError, request } from './http';

export type UserData = {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
};

export async function getUserByEmail(email: string): Promise<UserData> {
  // GET /users/{user_email}
  return request<UserData>(USERS(`/${encodeURIComponent(email)}`), {
    method: 'GET',
    auth: true,
  });
}

export function toUserMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 404) return 'Usuario no encontrado.';
    if (err.status === 401) return 'Sesión expirada. Iniciá sesión nuevamente.';
    if (err.status >= 500) return 'Error del servidor. Intentá de nuevo en unos minutos.';
    return err.message;
  }
  if (err instanceof TypeError) return 'Sin conexión. Verificá tu red e intentá de nuevo.';
  return 'Ocurrió un error inesperado.';
}
