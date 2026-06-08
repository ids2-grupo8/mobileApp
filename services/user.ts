import { USERS } from '@/constants/api';
import { ApiError, request, requestFileUpload } from './http';

export type UserData = {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  photo?: string | null;
  description?: string | null;
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

type PublicProduct = {
  id: string;
  title: string;
  description: string;
  category: string;
  image_urls: string[];
  old_price: number;
  price: number;
  actual_stock: number;
  status: string;
};

export type PublicUserProfileResponse = {
  data: {
    id: string;
    full_name: string;
    created_at: string;
    photo: string | null;
    description: string | null;
    products: PublicProduct[];
  };
};

export async function getUserByEmail(email: string): Promise<UserData> {
  const response = await request<UserProfileResponse>(USERS(`/profile`), {
    method: 'GET',
    auth: true,
  });
  return response.data;
}

export async function getUserProfile(): Promise<UserProfileResponse> {
  return request<UserProfileResponse>(USERS(`/profile`), {
    method: 'GET',
    auth: true,
  });
}

export async function getPublicUserProfile(email: string): Promise<PublicUserProfileResponse> {
  return request<PublicUserProfileResponse>(USERS(`/profile/public/${encodeURIComponent(email)}`), {
    method: 'GET',
    auth: false,
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
    if (err.status === 413) return 'La imagen es demasiado grande. Probá con una más liviana.';
    if (err.status === 415) return 'Formato de imagen no soportado. Usá JPG, PNG o WebP.';
    if (err.status === 422) return 'Algunos datos del perfil no son válidos. Revisalos e intentá de nuevo.';
    if (err.status >= 500) return 'Error del servidor. Intentá de nuevo en unos minutos.';
    return 'No pudimos actualizar tu perfil. Intentá de nuevo.';
  }
  if (err instanceof TypeError) return 'Sin conexión. Verificá tu red e intentá de nuevo.';
  return 'Ocurrió un error inesperado. Intentá de nuevo.';
}
