import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import {
  type CatalogFetchOptions,
  type CatalogProduct,
  fetchCatalogCategories,
  fetchCatalogProducts,
  fetchMyProducts,
  fetchRecommendedProducts,
  getSellerDisplayName,
} from '@/services/catalog';
import { type ActiveCoupon, fetchActiveCoupons } from '@/services/checkout';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import { useNotificationsStore } from '@/store/notifications';



function formatPrice(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

const CATEGORY_TRANSLATIONS: Record<string, string> = {
  'Electronics': 'Electrónica',
  'Clothing':    'Ropa',
  'Books':       'Libros',
  'Home':        'Hogar',
  'Sports':      'Deportes',
};

// Reverse mapping: translated label → backend category code
const CATEGORY_CODES: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_TRANSLATIONS).map(([code, label]) => [label, code]),
);

const CATEGORY_ICONS: Record<string, string> = {
  Electronics: 'devices',
  Clothing: 'checkroom',
  Books: 'menu-book',
  Home: 'home',
  Sports: 'sports-soccer',
};

// ─── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({
  product,
  onPress,
  onAddToCart,
  compact = false,
  tall = false,
  isRecent = false,
  accent,
  accentGlow,
  textPrimary,
  textSecondary,
  glass,
  glassBorder,
  shadowAccent,
}: {
  product: CatalogProduct;
  onPress: () => void;
  onAddToCart?: () => void;
  compact?: boolean;
  tall?: boolean;
  isRecent?: boolean;
  accent: string;
  accentGlow: string;
  textPrimary: string;
  textSecondary: string;
  glass: string;
  glassBorder: string;
  shadowAccent: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, damping: 15, stiffness: 300 }).start();

  const handlePressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 200 }).start();

  const imageStyle = compact
    ? s.productImageCompact
    : tall
    ? s.productImageTall
    : s.productImageSquare;

  return (
    <Animated.View style={[{ transform: [{ scale }] }, compact && { width: 180 }]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        accessibilityRole="button"
        style={[
          s.productCard,
          {
            backgroundColor: glass,
            borderColor: glassBorder,
            shadowColor: shadowAccent,
          },
        ]}>

        {/* Image */}
        <View style={s.productImageWrap}>
          <Image source={{ uri: product.imageUrl }} style={imageStyle} contentFit="cover" />
          {isRecent && (
            <View style={[s.hotBadge, { backgroundColor: accentGlow, borderColor: 'transparent' }]}>
              <Text style={[s.hotBadgeText, { color: accent }]}>Nuevo</Text>
            </View>
          )}
        </View>

        {/* Body */}
        <View style={s.productBody}>
          <Text numberOfLines={2} style={[s.productTitle, { color: textPrimary }]}>
            {product.title}
          </Text>
          <Text style={[s.productPrice, { color: accent }]}>
            {formatPrice(product.price)}
          </Text>
        </View>

        {/* Add-to-cart button */}
        {onAddToCart && (
          <TouchableOpacity
            onPress={onAddToCart}
            style={[s.addBtn, { backgroundColor: accent }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Agregar al carrito">
            <MaterialIcons name="add" size={18} color="#0B0B0F" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}


// ─── Home Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string; category?: string }>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const addItem = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);
  const unreadNotifications = useNotificationsStore(
    (st) => st.notifications.filter((n) => !n.read).length,
  );
  const [ownProductIds, setOwnProductIds] = useState<Set<string>>(new Set());
  const [activePromo, setActivePromo] = useState<ActiveCoupon | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchActiveCoupons(1)
      .then((list) => {
        if (!mounted) return;
        setActivePromo(list.length > 0 ? list[0] : null);
      })
      .catch(() => {
        if (mounted) setActivePromo(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setOwnProductIds(new Set());
      return;
    }
    fetchMyProducts()
      .then((mine) => setOwnProductIds(new Set(mine.map((p) => p.id))))
      .catch(() => {});
  }, [user]);

  const isOwnProduct = (product: CatalogProduct) => {
    if (ownProductIds.has(product.id)) return true;
    const sellerEmail = product.sellerInfo?.email?.trim().toLowerCase();
    const userEmail = user?.email?.trim().toLowerCase();
    if (sellerEmail && userEmail && sellerEmail === userEmail) return true;
    const sellerId = product.sellerId;
    const userId = user?.id;
    if (sellerId && userId && sellerId === userId) return true;
    return false;
  };

  // CA5: Si el usuario no está logueado, le pedimos que inicie sesión
  // en vez de permitirle agregar al carrito.
  const handleQuickAdd = async (product: CatalogProduct) => {
    if (!user) {
      Alert.alert(
        'Iniciar sesión',
        'Necesitás iniciar sesión para agregar productos al carrito.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Iniciar sesión', onPress: () => router.push('/(auth)/login') },
        ],
      );
      return;
    }

    if (isOwnProduct(product)) {
      Alert.alert('Producto propio', 'No podés agregar al carrito un producto que vos mismo publicaste.');
      return;
    }

    const inCart = cartItems.find((i) => i.productId === product.id);
    const currentQty = inCart ? inCart.quantity : 0;
    const available = Math.max(0, product.stock - currentQty);

    if (available <= 0) {
      Alert.alert(
        'Sin stock',
        product.stock <= 0
          ? 'Este producto no tiene unidades disponibles. No se puede agregar al carrito.'
          : `Ya tenés en el carrito la cantidad máxima (${product.stock} ${product.stock === 1 ? 'unidad' : 'unidades'}). No hay más stock para agregar.`,
      );
      return;
    }

    try {
      await addItem(product, 1);
      const err = useCartStore.getState().error;
      if (err) {
        Alert.alert('No se pudo agregar al carrito', err);
        useCartStore.setState({ error: null });
        return;
      }
      Alert.alert('Agregado', 'Producto agregado al carrito');
    } catch {
      Alert.alert(
        'No se pudo agregar al carrito',
        'Ocurrió un problema al agregar el producto. Intentá de nuevo en unos segundos.',
      );
    }
  };

  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Set<string>>(new Set());
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortVisible, setSortVisible] = useState(false);
  const [recommendedProducts, setRecommendedProducts] = useState<CatalogProduct[]>([]);
  const [hasPersonalizedRecommendations, setHasPersonalizedRecommendations] = useState(false);
  const [backendCategories, setBackendCategories] = useState<string[]>([]);

  const openProduct = (product: CatalogProduct) => {
    router.push(`/product/${product.id}`);
  };

  // CA5: Si el usuario no está logueado, le pedimos que inicie sesión
  // en vez de permitirle publicar un producto.
  const createPublication = () => {
    if (!user) {
      Alert.alert(
        'Iniciar sesión',
        'Necesitás iniciar sesión para publicar productos.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Iniciar sesión', onPress: () => router.push('/(auth)/login') },
        ],
      );
      return;
    }
    router.push('/seller/publish');
  };

  const loadProducts = async (
    searchTerm = query,
    sort = sortBy,
    options?: { keepRefreshing?: boolean },
  ) => {
    setError(null);
    try {
      const fetchOptions: CatalogFetchOptions = {};
      if (category.size > 0) {
        fetchOptions.categories = Array.from(category).map((label) => CATEGORY_CODES[label] ?? label);
      }
      const parsedMin = minPrice !== '' ? parseFloat(minPrice) : undefined;
      const parsedMax = maxPrice !== '' ? parseFloat(maxPrice) : undefined;
      if (parsedMin != null && !Number.isNaN(parsedMin)) fetchOptions.priceMin = parsedMin;
      if (parsedMax != null && !Number.isNaN(parsedMax)) fetchOptions.priceMax = parsedMax;

      const fromApi = await fetchCatalogProducts(
        searchTerm,
        fetchOptions,
        undefined,
        undefined,
        sort ?? undefined,
      );
      setProducts(fromApi);
    } catch {
      setProducts([]);
      setError('No pudimos cargar productos. Intentá de nuevo.');
    } finally {
      setLoading(false);
      if (!options?.keepRefreshing) {
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    fetchCatalogCategories().then((cats) => setBackendCategories(cats));
  }, []);

  // Aceptamos ?q= y ?category= desde otras pantallas (p.ej. Explorar) para
  // precargar la búsqueda. La categoría llega como código backend (ej.
  // 'Electronics') y se traduce a label antes de meterla en el filtro.
  useEffect(() => {
    if (typeof params.q === 'string') {
      setQuery(params.q);
    }
    if (typeof params.category === 'string' && params.category.length > 0) {
      const label = CATEGORY_TRANSLATIONS[params.category] ?? params.category;
      setCategory(new Set([label]));
    }
  }, [params.q, params.category]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      setLoading(true);
      void loadProducts(query.trim(), sortBy);
    }, 350);

    return () => clearTimeout(debounce);
  }, [query, category, minPrice, maxPrice]);

  useEffect(() => {
    setLoading(true);
    void loadProducts(query.trim(), sortBy);
  }, [sortBy]);

  const hasActiveFilters = category.size > 0 || query.trim().length > 0 || minPrice !== '' || maxPrice !== '';
  const hasPriceFilter = minPrice !== '' || maxPrice !== '';
  const hasCategoryFilter = category.size > 0;

  const loadRecommendations = useCallback(async () => {
    if (!user || hasActiveFilters) {
      setRecommendedProducts([]);
      setHasPersonalizedRecommendations(false);
      return;
    }
    try {
      const { items, isPersonalized } = await fetchRecommendedProducts(10);
      setRecommendedProducts(items);
      setHasPersonalizedRecommendations(isPersonalized && items.length > 0);
    } catch {
      setRecommendedProducts([]);
      setHasPersonalizedRecommendations(false);
    }
  }, [user, hasActiveFilters]);

  useEffect(() => {
    void loadRecommendations();
  }, [loadRecommendations]);

  useFocusEffect(
    useCallback(() => {
      void loadRecommendations();
    }, [loadRecommendations]),
  );

  const refreshHome = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadProducts(query.trim(), sortBy, { keepRefreshing: true }),
        loadRecommendations(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [loadRecommendations, query, sortBy]);

  const clearAllFilters = () => {
    setCategory(new Set());
    setQuery('');
    setMinPrice('');
    setMaxPrice('');
  };

  const filteredProducts = useMemo(() => {
    const min = minPrice !== '' ? parseFloat(minPrice) : null;
    const max = maxPrice !== '' ? parseFloat(maxPrice) : null;
    const q = query.trim().toLowerCase();

    // Base filter: category + price
    let list = products.filter((p) => {
      const translatedCategory = CATEGORY_TRANSLATIONS[p.category] ?? p.category;
      const categoryMatch = category.size === 0 || category.has(translatedCategory);
      const priceMin = min === null || p.price >= min;
      const priceMax = max === null || p.price <= max;
      return categoryMatch && priceMin && priceMax;
    });

    // Keep only category + price filtering here. Ordering and relevance is handled by backend when possible.

    return list;
  }, [products, category, minPrice, maxPrice, query]);

  const recentProducts = useMemo(
    () => filteredProducts.filter((p) => p.isRecent),
    [filteredProducts]
  );

  const categories = useMemo(() => {
    const labels = backendCategories.map((code) => CATEGORY_TRANSLATIONS[code] ?? code);
    const fromProducts = products.map((p) => CATEGORY_TRANSLATIONS[p.category] ?? p.category);
    const merged = Array.from(new Set([...labels, ...fromProducts])).sort();
    return ['Todos', ...merged];
  }, [backendCategories, products]);

  const recommendedSectionProducts = useMemo(() => {
    const seen = new Set<string>();
    return recommendedProducts
      .filter((p) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      })
      .slice(0, 4);
  }, [recommendedProducts]);

  const recommendedIds = useMemo(
    () => new Set(recommendedSectionProducts.map((p) => p.id)),
    [recommendedSectionProducts]
  );

  const orderedProducts = useMemo(() => {
    if (sortBy === 'price_asc') {
      return [...filteredProducts].sort((a, b) => a.price - b.price);
    }
    if (sortBy === 'price_desc') {
      return [...filteredProducts].sort((a, b) => b.price - a.price);
    }
    if (sortBy === 'newest') {
      return filteredProducts;
    }

    return [...filteredProducts].sort((a, b) => {
      const aRecommended = recommendedIds.has(a.id);
      const bRecommended = recommendedIds.has(b.id);
      if (aRecommended && !bRecommended) return 1;
      if (!aRecommended && bRecommended) return -1;

      if (a.isRecent && !b.isRecent) return -1;
      if (!a.isRecent && b.isRecent) return 1;
      return a.title.localeCompare(b.title, 'es');
    });
  }, [filteredProducts, recommendedIds, sortBy]);

  const leftCol = useMemo(
    () => orderedProducts.filter((_, i) => i % 2 === 0),
    [orderedProducts]
  );
  const rightCol = useMemo(
    () => orderedProducts.filter((_, i) => i % 2 === 1),
    [orderedProducts]
  );

  const categoryShortcuts = useMemo(
    () =>
      backendCategories.map((code) => ({
        code,
        label: CATEGORY_TRANSLATIONS[code] ?? code,
        icon: CATEGORY_ICONS[code] ?? 'category',
      })),
    [backendCategories],
  );

  const featuredSellers = useMemo(() => {
    const byEmail = new Map<string, { email: string; name: string; photo: string | null; productCount: number }>();
    for (const p of products) {
      const info = p.sellerInfo;
      const email = info?.email?.trim();
      if (!email) continue;
      const existing = byEmail.get(email);
      if (existing) {
        existing.productCount += 1;
      } else {
        byEmail.set(email, {
          email,
          name: getSellerDisplayName(info),
          photo: info?.photo ?? null,
          productCount: 1,
        });
      }
    }
    return Array.from(byEmail.values())
      .sort((a, b) => b.productCount - a.productCount)
      .slice(0, 8);
  }, [products]);

  const cardThemeProps = {
    accent: theme.accent,
    accentGlow: theme.accentGlow,
    textPrimary: theme.textPrimary,
    textSecondary: theme.textSecondary,
    glass: theme.glass,
    glassBorder: theme.glassBorder,
    shadowAccent: theme.shadowAccent,
  };

  return (
    <View style={[s.root, { backgroundColor: theme.bg, paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[s.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 140 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { void refreshHome(); }}
            tintColor={theme.accent}
          />
        }>

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={[s.greeting, { color: theme.textSecondary }]}>
              {user?.name ? `Hola, ${user.name.split(' ')[0]} 👋` : 'Explorar'}
            </Text>
            <Text style={[s.title, { color: theme.textPrimary }]}>
              Catálogo
            </Text>
          </View>
          <View style={s.headerRight}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Notificaciones"
              style={[s.headerBtn, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}
              onPress={() => router.push('/(tabs)/notifications')}>
              <MaterialCommunityIcons name="bell-outline" size={20} color={theme.accent} />
              {unreadNotifications > 0 && (
                <View style={[s.cartBadge, { backgroundColor: theme.accent, borderColor: theme.bg }]}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#0B0B0F' }}>
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              style={[s.headerBtn, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}
              onPress={createPublication}>
              <MaterialIcons name="add" size={20} color={theme.accent} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Hero promo banner (sólo si hay cupón vigente, fetched on mount) ── */}
        {activePromo && (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              const expiresLabel = new Date(activePromo.end_date).toLocaleDateString('es-AR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              });
              Alert.alert(
                `Cupón ${activePromo.code}`,
                `Usá este código en el checkout y obtené ${Math.round(activePromo.discount_percentage)}% OFF en tu próxima compra. Válido hasta el ${expiresLabel}.`,
                [{ text: 'Entendido' }],
              );
            }}
            style={s.heroBannerWrap}
            accessibilityRole="button">
            <LinearGradient
              colors={[theme.accent, theme.accentDim]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.heroBanner}>
              <View style={s.heroBannerText}>
                <Text style={s.heroBannerKicker}>OFERTA LIMITADA</Text>
                <Text style={s.heroBannerTitle} numberOfLines={2}>
                  Aprovechá {Math.round(activePromo.discount_percentage)}% OFF
                </Text>
                <Text style={s.heroBannerSubtitle}>
                  Usá el código <Text style={s.heroBannerCode}>{activePromo.code}</Text> en el checkout
                </Text>
              </View>
              <View style={s.heroBannerIcon}>
                <MaterialIcons name="local-offer" size={28} color="#FFFFFF" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* ── Categorías (atajos circulares, estilo ML) ── */}
        {categoryShortcuts.length > 0 && (
          <View style={{ marginTop: 8, marginBottom: 4 }}>
            <View style={[s.sectionHeaderRow, { marginTop: 4 }]}>
              <Text style={[s.sectionTitle, { color: theme.textPrimary }]}>Categorías</Text>
              <View style={[s.sectionLine, { backgroundColor: theme.glassBorder }]} />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 14, paddingRight: 4, paddingVertical: 10 }}>
              {categoryShortcuts.map((cat) => (
                <TouchableOpacity
                  key={cat.code}
                  onPress={() => router.push({ pathname: '/(tabs)/explore', params: { category: cat.label } })}
                  style={s.catCircleWrap}
                  accessibilityRole="button">
                  <View style={[s.catCircle, { backgroundColor: theme.accentGlow, borderColor: theme.accent }]}>
                    <MaterialIcons
                      name={cat.icon as React.ComponentProps<typeof MaterialIcons>['name']}
                      size={28}
                      color={theme.accent}
                    />
                  </View>
                  <Text style={[s.catCircleLabel, { color: theme.textPrimary }]} numberOfLines={1}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Vendedores destacados ── */}
        {featuredSellers.length > 0 && (
          <View style={{ marginBottom: 8 }}>
            <View style={[s.sectionHeaderRow, { marginTop: 4 }]}>
              <Text style={[s.sectionTitle, { color: theme.textPrimary }]}>Vendedores destacados</Text>
              <View style={[s.sectionLine, { backgroundColor: theme.glassBorder }]} />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingRight: 4, paddingVertical: 6 }}>
              {featuredSellers.map((seller) => (
                <TouchableOpacity
                  key={seller.email}
                  onPress={() => router.push(`/seller/${encodeURIComponent(seller.email)}`)}
                  style={[s.sellerShortcut, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}
                  accessibilityRole="button">
                  <View style={[s.sellerShortcutAvatar, { backgroundColor: theme.accent }]}>
                    {seller.photo ? (
                      <Image source={{ uri: seller.photo }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    ) : (
                      <Text style={s.sellerShortcutInitial}>
                        {(seller.name || seller.email).charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <Text style={[s.sellerShortcutName, { color: theme.textPrimary }]} numberOfLines={1}>
                    {seller.name || seller.email}
                  </Text>
                  <Text style={[s.sellerShortcutMeta, { color: theme.textMuted }]} numberOfLines={1}>
                    {seller.productCount} {seller.productCount === 1 ? 'producto' : 'productos'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Content ── */}
        {loading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator color={theme.accent} size="large" />
            <Text style={[s.loadingText, { color: theme.textSecondary }]}>Cargando catálogo...</Text>
          </View>
        ) : error ? (
          <View style={[s.errorBox, { backgroundColor: theme.redBg, borderColor: theme.red }]}>
            <MaterialIcons name="error-outline" size={20} color={theme.red} />
            <Text style={[s.errorText, { color: theme.red }]}>{error}</Text>
            <TouchableOpacity
              onPress={() => loadProducts()}
              style={[s.retryBtn, { backgroundColor: theme.accentGlow, borderColor: theme.accent }]}>
              <Text style={[s.retryText, { color: theme.accent }]}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ── Recent products — CA1 ── */}
            {recentProducts.length > 0 && (
              <>
                <View style={[s.sectionHeaderRow, { marginTop: 12 }]}>
                  <View style={[s.sectionBadge, { backgroundColor: theme.accentGlow }]}>
                    <MaterialIcons name="fiber-new" size={16} color={theme.accent} />
                  </View>
                  <Text style={[s.sectionTitle, { color: theme.textPrimary }]}>Lo nuevo</Text>
                  <View style={[s.sectionLine, { backgroundColor: theme.glassBorder }]} />
                  <Text style={[s.sectionCount, { color: theme.textMuted }]}>
                    {recentProducts.length}
                  </Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.recentRow}>
                  {recentProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      compact
                      isRecent
                      onPress={() => openProduct(product)}
                      onAddToCart={isOwnProduct(product) ? undefined : () => handleQuickAdd(product)}
                      {...cardThemeProps}
                    />
                  ))}
                </ScrollView>
              </>
            )}

            {/* ── Recommendations — CA4: backend personalización (compras → vistas) ── */}
            {user && hasPersonalizedRecommendations && recommendedSectionProducts.length > 0 && (
              <>
                <View style={[s.sectionHeaderRow, { marginTop: 8 }]}>
                  <Text style={[s.sectionTitle, { color: theme.textPrimary }]}>Para vos</Text>
                  <View style={[s.sectionLine, { backgroundColor: theme.glassBorder }]} />
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.recentRow}>
                  {recommendedSectionProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      compact
                      onPress={() => openProduct(product)}
                      onAddToCart={isOwnProduct(product) ? undefined : () => handleQuickAdd(product)}
                      {...cardThemeProps}
                    />
                  ))}
                </ScrollView>
              </>
            )}

            {/* ── All products — 2-col staggered grid ── */}
            <View style={[s.sectionHeaderRow, { marginTop: 8 }]}>
              <Text style={[s.sectionTitle, { color: theme.textPrimary }]}>
                Todos los productos
              </Text>
              <Text style={[s.sectionMeta, { color: theme.textMuted }]}>
                {orderedProducts.length} resultados
              </Text>
            </View>

            {orderedProducts.length === 0 ? (
              <View style={s.emptyWrap}>
                <MaterialIcons name="search-off" size={40} color={theme.textMuted} />
                <Text style={[s.emptyText, { color: theme.textSecondary }]}>
                  No encontramos productos para tu búsqueda.
                </Text>
                {hasActiveFilters && (
                  <TouchableOpacity
                    onPress={clearAllFilters}
                    style={[s.retryBtn, { backgroundColor: theme.accentGlow, borderColor: theme.accent }]}>
                    <Text style={[s.retryText, { color: theme.accent }]}>
                      {query.trim().length > 0 ? 'Limpiar búsqueda' : 'Limpiar filtros'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={s.gridWrap}>
                {/* Left column */}
                <View style={s.gridCol}>
                  {leftCol.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onPress={() => openProduct(product)}
                      onAddToCart={isOwnProduct(product) ? undefined : () => handleQuickAdd(product)}
                      isRecent={product.isRecent}
                      {...cardThemeProps}
                    />
                  ))}
                </View>

                {/* Right column */}
                <View style={s.gridCol}>
                  {rightCol.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onPress={() => openProduct(product)}
                      onAddToCart={isOwnProduct(product) ? undefined : () => handleQuickAdd(product)}
                      isRecent={product.isRecent}
                      {...cardThemeProps}
                    />
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  headerLeft: { flex: 1 },
  headerRight: { flexDirection: 'row', gap: 10 },
  greeting: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    color: '#050508',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // ── Search ──
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  searchWrap: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: 0.1,
  },
  filterBtn: {
    width: 50,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  filterDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },

  // ── Hero promo banner ──
  heroBannerWrap: {
    marginTop: 4,
    marginBottom: 12,
    borderRadius: 20,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  heroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 14,
  },
  heroBannerText: { flex: 1, gap: 4 },
  heroBannerKicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.85)',
  },
  heroBannerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: '#FFFFFF',
  },
  heroBannerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.92)',
  },
  heroBannerCode: {
    fontWeight: '800',
    letterSpacing: 0.5,
    color: '#FFFFFF',
  },
  heroBannerIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  // ── Category shortcuts (circles, ML-style) ──
  catCircleWrap: {
    width: 72,
    alignItems: 'center',
    gap: 6,
  },
  catCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catCircleLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.1,
    textAlign: 'center',
  },

  // ── Featured sellers (carousel) ──
  sellerShortcut: {
    width: 130,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  sellerShortcutAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerShortcutInitial: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sellerShortcutName: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  sellerShortcutMeta: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },

  // ── Filter chips ──
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chipClear: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipClearText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // ── Section headers ──
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    marginLeft: 8,
  },
  sectionMeta: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '700',
    minWidth: 24,
    textAlign: 'right',
  },

  // ── Loading ──
  loadingWrap: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 14,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // ── Error ──
  errorBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginTop: 12,
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  retryBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 4,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // ── Recent row ──
  recentRow: {
    gap: 12,
    paddingBottom: 8,
    paddingRight: 4,
  },

  // ── 2-col staggered grid ──
  gridWrap: {
    flexDirection: 'row',
    gap: 12,
  },
  gridCol: {
    flex: 1,
    gap: 12,
  },

  // ── Product Card ──
  productCard: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 6,
  },
  productImageWrap: {
    position: 'relative',
  },
  productImageSquare: {
    width: '100%',
    aspectRatio: 1,
  },
  productImageTall: {
    width: '100%',
    aspectRatio: 3 / 4,
  },
  productImageCompact: {
    width: '100%',
    height: 140,
  },
  hotBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  hotBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  productBody: {
    padding: 12,
    gap: 3,
    paddingBottom: 42,
  },
  productTitle: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    letterSpacing: -0.1,
    height: 36,
  },
  productSeller: {
    fontSize: 11,
    fontWeight: '500',
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginTop: 2,
  },
  addBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },

  // ── Empty state ──
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },

  // ── Filter Modal ──
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    padding: 24,
    paddingBottom: 40,
    gap: 16,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  modalCategoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalCategoryChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  modalCategoryChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  priceInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    gap: 6,
  },
  priceCurrency: {
    fontSize: 16,
    fontWeight: '600',
  },
  priceField: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  sortOption: {
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderColor: '#00000010',
  },
  sortOptionText: {
    fontSize: 16,
    fontWeight: '700',
  },
  sortOptionHint: {
    fontSize: 12,
    marginTop: 4,
  },
  priceSep: {
    width: 16,
    height: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalBtnSecondary: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnSecondaryText: {
    fontSize: 15,
    fontWeight: '700',
  },
  modalBtnPrimary: {
    flex: 2,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnPrimaryText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#050508',
  },
});
