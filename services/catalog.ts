import { CATALOG, USERS } from '@/constants/api';
import { ImageFile, request, requestFormData } from './http';
import type { PublicUserProfileResponse } from './user';

type BaseCreateProductData = {
  name: string;
  description: string;
  price: number;
  actual_stock: number;
  images: ImageFile[];
};

export type SellerInfo = {
  id?: string;
  email?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  photo?: string | null;
  description?: string | null;
};

export function getSellerDisplayName(seller?: SellerInfo): string {
  if (!seller) return 'Vendedor';

  const fullName = seller.full_name?.trim();
  if (fullName) return fullName;

  const combinedName = [seller.first_name, seller.last_name]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(' ')
    .trim();
  if (combinedName) return combinedName;

  const fallbackName = seller.first_name?.trim() || seller.last_name?.trim();
  if (fallbackName) return fallbackName;

  return seller.email?.trim() || 'Vendedor';
}

export type CreateProductData =
  | (BaseCreateProductData & {
      category: 'Electronics';
      brand: string;
      model: string;
      warranty_months: number;
    })
  | (BaseCreateProductData & {
      category: 'Clothing';
      size: string;
      color: string;
      material: string;
    });

export type CatalogProduct = {
  id: string;
  title: string;
  price: number;
  stock: number;
  imageUrl: string;
  images: string[];
  seller: string;
  sellerInfo?: SellerInfo;
  sellerId?: string;
  category: string;
  description?: string;
  isRecent?: boolean;
  attributes?: Record<string, unknown>;
  originalStock?: number;
  status?: 'available' | 'disabled' | 'out_of_stock';
  enabled?: boolean;
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

function pickAllImages(raw: RawProduct): string[] {
  const urls: string[] = [];

  const addIfValid = (url: string) => {
    if (url && !urls.includes(url)) urls.push(url);
  };

  const direct =
    asString(raw.imageUrl) ||
    asString(raw.image_url) ||
    asString(raw.thumbnail) ||
    asString(raw.photo_url);
  if (direct) addIfValid(direct);

  const imageUrls = raw.image_urls;
  if (Array.isArray(imageUrls)) {
    imageUrls.forEach((u) => { if (typeof u === 'string') addIfValid(u); });
  }

  const images = raw.images;
  if (Array.isArray(images)) {
    images.forEach((item) => {
      if (typeof item === 'string') { addIfValid(item); return; }
      if (item && typeof item === 'object') {
        const maybeUrl = asString((item as RawProduct).url) || asString((item as RawProduct).image_url);
        if (maybeUrl) addIfValid(maybeUrl);
      }
    });
  }

  return urls;
}

function pickImage(raw: RawProduct): string {
  const all = pickAllImages(raw);
  return all[0] ?? DEFAULT_IMAGE;
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
  const allImages = pickAllImages(product);
  const imageUrl = allImages[0] ?? DEFAULT_IMAGE;
  const sellerInfo = sellerObj
    ? {
        id: asString(sellerObj.id ?? sellerObj._id) || undefined,
        email: asString(sellerObj.email) || undefined,
        full_name: asString(sellerObj.full_name ?? sellerObj.name) || undefined,
        first_name: asString(sellerObj.first_name) || undefined,
        last_name: asString(sellerObj.last_name) || undefined,
        photo: asString(sellerObj.photo) || undefined,
        description: asString(sellerObj.description) || undefined,
      }
    : asString(product.user_email)
    ? { email: asString(product.user_email) }
    : undefined;

  return {
    id,
    title,
    price: asNumber(product.price ?? product.amount),
    stock,
    imageUrl,
    images: allImages.length > 0 ? allImages : [imageUrl].filter(Boolean),
    seller: getSellerDisplayName(sellerInfo),
    sellerInfo,
    sellerId: asString(sellerObj?.id ?? sellerObj?._id ?? product.seller_id) || undefined,
    category: asString(categoryObj?.name ?? product.category_name ?? product.category) || 'General',
    description: asString(product.description) || undefined,
    isRecent: isRecentFromDate(product),
    attributes: product.attributes && typeof product.attributes === 'object' ? (product.attributes as Record<string, unknown>) : undefined,
    status: statusRaw as 'available' | 'disabled' | 'out_of_stock',
    enabled,
    originalStock: stock,
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


export async function fetchCatalogProducts(searchQuery?: string, page?: number, perPage?: number): Promise<CatalogProduct[]> {
  const normalizedQuery = searchQuery?.trim();
  const base = normalizedQuery && normalizedQuery.length > 0
    ? `/products?q=${encodeURIComponent(normalizedQuery)}`
    : '/products';
  const params: string[] = [];
  if (page !== undefined && page !== null) params.push(`page=${encodeURIComponent(String(page))}`);
  if (perPage !== undefined && perPage !== null) params.push(`per_page=${encodeURIComponent(String(perPage))}`);
  const queryString = params.length > 0 ? `${base}&${params.join('&')}` : base;
  const endpoint = CATALOG(queryString);

  const payload = await request<unknown>(endpoint, { method: 'GET', auth: false });

  // Support paginated response shape: { items: [...], total, page, per_page }
  if (payload && typeof payload === 'object' && Array.isArray((payload as any).items)) {
    const items = (payload as any).items as unknown[];
    const normalized = items
      .map((item) => (item && typeof item === 'object' ? normalizeProduct(item as RawProduct) : null))
      .filter((item): item is CatalogProduct => item !== null);
    return filterVisible(normalized);
  }

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

export async function fetchMyProducts(): Promise<CatalogProduct[]> {
  const payload = await request<PublicUserProfileResponse>(USERS(`/profile`), {
    method: 'GET',
    auth: true,
  });

  return payload.data.products
    .map((item) => (item && typeof item === 'object' ? normalizeProduct(item as RawProduct) : null))
    .filter((item): item is CatalogProduct => item !== null);
}

export async function fetchProductsBySellerEmail(email: string): Promise<CatalogProduct[]> {
  const payload = await request<PublicUserProfileResponse>(USERS(`/profile/public/${encodeURIComponent(email)}`), {
    method: 'GET',
    auth: false,
  });

  return payload.data.products
    .map((item) => (item && typeof item === 'object' ? normalizeProduct(item as RawProduct) : null))
    .filter((item): item is CatalogProduct => item !== null);
}

export async function createProductRequest(data: CreateProductData): Promise<void> {
  // POST /products  — multipart/form-data: product_data (JSON string) + images (files)
  const productData = JSON.stringify({
    name: data.name,
    description: data.description,
    price: data.price,
    actual_stock: data.actual_stock,
    category: data.category,
    ...(data.category === 'Electronics'
      ? {
          brand: data.brand,
          model: data.model,
          warranty_months: data.warranty_months,
        }
      : {
          size: data.size,
          color: data.color,
          material: data.material,
        }),
  });

  await requestFormData(CATALOG('/products'), {
    method: 'POST',
    fields: { product_data: productData },
    images: data.images,
    auth: true,
  });
}

export async function updateProductRequest(
  productId: string,
  data: CreateProductData,
  existingImageUrls: string[],
): Promise<void> {
  const productData = JSON.stringify({
    name: data.name,
    description: data.description,
    price: data.price,
    actual_stock: data.actual_stock,
    category: data.category,
    ...(data.category === 'Electronics'
      ? {
          brand: data.brand,
          model: data.model,
          warranty_months: data.warranty_months,
        }
      : {
          size: data.size,
          color: data.color,
          material: data.material,
        }),
  });

  await requestFormData(CATALOG(`/products/${encodeURIComponent(productId)}`), {
    method: 'PUT',
    fields: {
      product_data: productData,
      existing_image_urls: JSON.stringify(existingImageUrls),
    },
    images: data.images,
    auth: true,
  });
}

export async function updateProductStock(productId: string, stock: number): Promise<void> {
  // PATCH /products/{product_id}/stock  — update stock only
  await requestFormData(CATALOG(`/products/${encodeURIComponent(productId)}/stock`), {
    method: 'PATCH',
    fields: { stock_update: stock.toString() },
    images: [],
    auth: true,
  });
}

export async function toggleProductStatus(productId: string): Promise<void> {
  await request(CATALOG(`/products/${encodeURIComponent(productId)}/toggle-status`), {
    method: 'PATCH',
    auth: true,
  });
}
