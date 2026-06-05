/**
 * @deprecated Reemplazado por el backend (product-service):
 * POST /products/{id}/recent-detail-view + GET /products/recommendations/context.
 * Este módulo ya no se usa en la app; se mantiene solo por referencia histórica.
 */

import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'browse_history_v1';
const MAX_ENTRIES = 50;

export type BrowseEntry = {
  productId: string;
  category: string;
  viewedAt: number;
};

async function readEntries(): Promise<BrowseEntry[]> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is BrowseEntry =>
        e != null &&
        typeof e === 'object' &&
        typeof e.productId === 'string' &&
        typeof e.category === 'string' &&
        typeof e.viewedAt === 'number',
    );
  } catch {
    return [];
  }
}

async function writeEntries(entries: BrowseEntry[]): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // historial es nice-to-have
  }
}

export async function recordBrowseView(productId: string, category: string): Promise<void> {
  if (!productId || !category) return;
  const entries = await readEntries();
  const next: BrowseEntry[] = [
    { productId, category, viewedAt: Date.now() },
    ...entries.filter((e) => e.productId !== productId),
  ];
  await writeEntries(next);
}

export async function getBrowseHistory(): Promise<BrowseEntry[]> {
  return readEntries();
}

/**
 * Devuelve las categorías ordenadas por cantidad de vistas (desc).
 * Empates se rompen por la vista más reciente.
 */
export async function getTopBrowsedCategories(): Promise<string[]> {
  const entries = await readEntries();
  if (entries.length === 0) return [];
  const counts = new Map<string, { count: number; lastViewed: number }>();
  for (const e of entries) {
    const prev = counts.get(e.category);
    if (prev) {
      counts.set(e.category, {
        count: prev.count + 1,
        lastViewed: Math.max(prev.lastViewed, e.viewedAt),
      });
    } else {
      counts.set(e.category, { count: 1, lastViewed: e.viewedAt });
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => {
      if (b[1].count !== a[1].count) return b[1].count - a[1].count;
      return b[1].lastViewed - a[1].lastViewed;
    })
    .map(([category]) => category);
}

export async function getViewedProductIds(): Promise<Set<string>> {
  const entries = await readEntries();
  return new Set(entries.map((e) => e.productId));
}

export async function clearBrowseHistory(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
  } catch {
    // ignore
  }
}
