const API_GATEWAY = 'http://34.151.224.181';

/**
 * Construye la URL del API Gateway dado el servicio y el path local.
 *
 * Mapeo:
 *   /api/v1/auth/login  →  http://35.247.247.86/users/auth/login
 *   /api/v1/profile     →  http://35.247.247.86/users/profile
 *
 * @param service  Nombre del microservicio (ej: 'users', 'products', 'orders')
 * @param path     Path sin prefijo /api/v1 (ej: '/auth/login')
 */
export function apiUrl(service: string, path: string) {
  if (!path || path === '') {
    return `${API_GATEWAY}/${service}`;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_GATEWAY}/${service}${cleanPath}`.replace(/\/$/, '');
}

export const USERS = (path: string) => apiUrl('users', path);
export const CATALOG = (path: string) => apiUrl('products', path);
export const CHECKOUT = (path: string) => apiUrl('checkout', path);
