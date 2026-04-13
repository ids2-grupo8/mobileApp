import { CATALOG } from '@/constants/api';
import { request } from './http';

export type CatalogProduct = {
  id: string;
  title: string;
  price: number;
  stock: number;
  imageUrl: string;
  seller: string;
  category: string;
  description?: string;
  isRecent?: boolean;
};

type RawProduct = Record<string, unknown>;

const DEFAULT_IMAGE = 'https://picsum.photos/seed/bazaar-default/900/900';

const FALLBACK_PRODUCTS: CatalogProduct[] = [
  {
    id: 'p1',
    title: 'Auriculares Noise Cancelling X2',
    price: 128000,
    stock: 4,
    imageUrl: 'https://picsum.photos/seed/bazaar-audio/900/900',
    seller: 'TecnoHub',
    category: 'Audio',
    description: 'Auriculares over-ear con cancelacion activa de ruido y hasta 30h de bateria.',
    isRecent: true,
  },
  {
    id: 'p2',
    title: 'Silla Ergonomica Pro Mesh',
    price: 219000,
    stock: 2,
    imageUrl: 'https://picsum.photos/seed/bazaar-home/900/900',
    seller: 'CasaLab',
    category: 'Hogar',
    description: 'Soporte lumbar regulable, apoyabrazos 3D y respaldo transpirable.',
    isRecent: true,
  },
  {
    id: 'p3',
    title: 'Teclado Mecanico 75% RGB',
    price: 89000,
    stock: 9,
    imageUrl: 'https://picsum.photos/seed/bazaar-gaming/900/900',
    seller: 'GG Store',
    category: 'Gaming',
    description: 'Switches lineales hot-swap, keycaps PBT y conexion USB-C.',
    isRecent: true,
  },
  {
    id: 'p4',
    title: 'Campera Urbana Unisex',
    price: 67000,
    stock: 6,
    imageUrl: 'https://picsum.photos/seed/bazaar-fashion/900/900',
    seller: 'ModoSur',
    category: 'Moda',
    description: 'Tela repelente al agua y corte relajado para uso diario.',
  },
  {
    id: 'p6',
    title: 'Lampara LED de Escritorio',
    price: 25000,
    stock: 13,
    imageUrl: 'https://picsum.photos/seed/bazaar-lamp/900/900',
    seller: 'CasaLab',
    category: 'Hogar',
    description: 'Luz regulable en tres temperaturas y base antideslizante.',
  },
];

function asNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function pickImage(raw: RawProduct): string {
  const direct =
    asString(raw.imageUrl) ||
    asString(raw.image_url) ||
    asString(raw.thumbnail) ||
    asString(raw.photo_url);

  if (direct) return direct;

  const images = raw.images;
  if (Array.isArray(images) && images.length > 0) {
    const first = images[0];
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object') {
      const maybeUrl = asString((first as RawProduct).url) || asString((first as RawProduct).image_url);
      if (maybeUrl) return maybeUrl;
    }
  }

  return DEFAULT_IMAGE;
}

function isRecentFromDate(raw: RawProduct): boolean {
  const createdAt = asString(raw.created_at) || asString(raw.createdAt);
  if (!createdAt) return false;

  const parsed = Date.parse(createdAt);
  if (Number.isNaN(parsed)) return false;

  const days = (Date.now() - parsed) / (1000 * 60 * 60 * 24);
  return days <= 14;
}

function normalizeProduct(raw: RawProduct): CatalogProduct | null {
  const id = asString(raw.id) || asString(raw.product_id) || asString(raw.uuid);
  const title = asString(raw.title) || asString(raw.name);

  if (!id || !title) return null;

  const stock = asNumber(raw.stock ?? raw.quantity ?? raw.available_stock);
  const enabledRaw = raw.enabled ?? raw.is_enabled ?? raw.active;
  const enabled = typeof enabledRaw === 'boolean' ? enabledRaw : true;

  const sellerObj = raw.seller && typeof raw.seller === 'object' ? (raw.seller as RawProduct) : null;
  const categoryObj = raw.category && typeof raw.category === 'object' ? (raw.category as RawProduct) : null;

  return {
    id,
    title,
    price: asNumber(raw.price ?? raw.amount),
    stock,
    imageUrl: pickImage(raw),
    seller: asString(sellerObj?.name ?? raw.seller_name ?? raw.seller) || 'Vendedor',
    category: asString(categoryObj?.name ?? raw.category_name ?? raw.category) || 'General',
    description: asString(raw.description) || undefined,
    isRecent: isRecentFromDate(raw),
    ...(enabled ? {} : { stock: 0 }),
  };
}

function extractCollection(payload: unknown): unknown[] | null {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return null;

  const root = payload as Record<string, unknown>;
  const direct = root.data ?? root.products ?? root.items ?? root.results;

  if (Array.isArray(direct)) return direct;
  if (direct && typeof direct === 'object') {
    const nested = direct as Record<string, unknown>;
    if (Array.isArray(nested.products)) return nested.products;
    if (Array.isArray(nested.items)) return nested.items;
    if (Array.isArray(nested.results)) return nested.results;
  }

  return null;
}

function filterVisible(products: CatalogProduct[]): CatalogProduct[] {
  return products.filter((p) => p.stock > 0);
}

export function getFallbackCatalogProducts(): CatalogProduct[] {
  return filterVisible(FALLBACK_PRODUCTS);
}

export function findFallbackCatalogProductById(id: string): CatalogProduct | null {
  return getFallbackCatalogProducts().find((p) => p.id === id) ?? null;
}

export async function fetchCatalogProducts(): Promise<CatalogProduct[]> {
  const payload = await request<unknown>(CATALOG('/products'), { method: 'GET', auth: false });
  const collection = extractCollection(payload);

  if (!collection) {
    throw new Error('Respuesta de catalogo invalida.');
  }

  const normalized = collection
    .map((item) => (item && typeof item === 'object' ? normalizeProduct(item as RawProduct) : null))
    .filter((item): item is CatalogProduct => item !== null);

  return filterVisible(normalized);
}

export async function fetchCatalogProductById(id: string): Promise<CatalogProduct | null> {
  const products = await fetchCatalogProducts();
  return products.find((p) => p.id === id) ?? null;
}
