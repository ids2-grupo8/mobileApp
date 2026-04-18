import { CATALOG } from '@/constants/api';
import { ImageFile, request, requestFormData } from './http';

export type CreateProductData = {
  name: string;
  description: string;
  price: number;
  actual_stock: number;
  category: string;
  images: ImageFile[];
};

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

const DEFAULT_IMAGE = '';

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

  // product-service returns image_urls: string[]
  const imageUrls = raw.image_urls;
  if (Array.isArray(imageUrls) && imageUrls.length > 0 && typeof imageUrls[0] === 'string') {
    return imageUrls[0];
  }

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
  // unwrap { data: {...} } wrapper returned by product-service list endpoint
  const product = raw.data && typeof raw.data === 'object' ? (raw.data as RawProduct) : raw;

  const id = asString(product.id) || asString(product._id) || asString(product.product_id) || asString(product.uuid);
  const title = asString(product.title) || asString(product.name);

  if (!id || !title) return null;

  // product-service uses actual_stock
  const stock = asNumber(product.actual_stock ?? product.stock ?? product.quantity ?? product.available_stock);
  const statusRaw = asString(product.status);
  const enabledRaw = product.enabled ?? product.is_enabled ?? product.active;
  const enabled =
    statusRaw === 'disabled' || statusRaw === 'out_of_stock'
      ? false
      : typeof enabledRaw === 'boolean'
        ? enabledRaw
        : true;

  const sellerObj = product.seller && typeof product.seller === 'object' ? (product.seller as RawProduct) : null;
  const categoryObj = product.category && typeof product.category === 'object' ? (product.category as RawProduct) : null;

  return {
    id,
    title,
    price: asNumber(product.price ?? product.amount),
    stock,
    imageUrl: pickImage(product),
    seller: asString(sellerObj?.name ?? product.seller_name ?? product.seller) || 'Vendedor',
    category: asString(categoryObj?.name ?? product.category_name ?? product.category) || 'General',
    description: asString(product.description) || undefined,
    isRecent: isRecentFromDate(product),
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
  // GET /products/{product_id}  — si falla, busca en el listado
  try {
    const raw = await request<RawProduct>(CATALOG(`/products/${encodeURIComponent(id)}`), {
      method: 'GET',
      auth: false,
    });
    return normalizeProduct(raw);
  } catch {
    try {
      const all = await fetchCatalogProducts();
      return all.find((p) => p.id === id) ?? null;
    } catch {
      return null;
    }
  }
}

export async function createProductRequest(data: CreateProductData): Promise<void> {
  // POST /products  — multipart/form-data: product_data (JSON string) + images (files)
  const productData = JSON.stringify({
    name: data.name,
    description: data.description,
    price: data.price,
    actual_stock: data.actual_stock,
    category: data.category,
    status: 'available',
  });

  await requestFormData(CATALOG('/products'), {
    method: 'POST',
    fields: { product_data: productData },
    images: data.images,
    auth: true,
  });
}
