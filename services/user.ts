import { USERS } from '@/constants/api';
import { ApiError, request, requestFileUpload } from './http';

export type UserData = {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
};

type UserProfileResponse = {
  data: {
    id: string;
    email: string;
    full_name: string;
    created_at: string;
    photo: string | null;
    description: string | null;
  };
};

export async function getUserByEmail(email: string): Promise<UserData> {
  return request<UserData>(USERS(`/${encodeURIComponent(email)}`), {
    method: 'GET',
    auth: true,
  });
}

export async function getUserProfile(email: string): Promise<UserProfileResponse> {
  return request<UserProfileResponse>(USERS(`/profile/${encodeURIComponent(email)}`), {
    method: 'GET',
    auth: true,
  });
}

function inferMimeType(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

export async function uploadProfilePhoto(uri: string): Promise<UserProfileResponse> {
  const fileName = uri.split('/').pop() ?? 'photo.jpg';
  const mimeType = inferMimeType(uri);
  return requestFileUpload<UserProfileResponse>(USERS('/profile/upload'), {
    file: { uri, name: fileName, type: mimeType },
  });
}

export async function updateUserProfile(data: {
  full_name?: string;
  description?: string;
}): Promise<UserProfileResponse> {
  return request<UserProfileResponse>(USERS('/profile'), {
    method: 'PUT',
    body: data,
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
