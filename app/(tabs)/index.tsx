import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import {
    type CatalogProduct,
    fetchCatalogProducts,
} from '@/services/catalog';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';

type CategoryFilter = 'Todos' | string;

function formatPrice(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

const CATEGORY_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  'Todos':         'apps',
  'Electrónica':   'laptop',
  'Tecnología':    'devices',
  'Ropa':          'style',
  'Indumentaria':  'style',
  'Hogar':         'home',
  'Muebles':       'weekend',
  'Deportes':      'fitness-center',
  'Gaming':        'sports-esports',
  'Juegos':        'sports-esports',
  'Libros':        'book',
  'Música':        'music-note',
  'Alimentos':     'restaurant',
  'Salud':         'local-hospital',
  'Belleza':       'face',
  'Mascotas':      'pets',
  'Autos':         'directions-car',
  'Arte':          'palette',
  'Jardín':        'nature',
  'Juguetes':      'toys',
  'Moda':          'style',
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
          <Text style={[s.productSeller, { color: textSecondary }]} numberOfLines={1}>
            {product.seller}
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

// ─── Filter Modal ─────────────────────────────────────────────────────────────

function FilterModal({
  visible,
  minPrice,
  maxPrice,
  onApply,
  onClose,
}: {
  visible: boolean;
  minPrice: string;
  maxPrice: string;
  onApply: (min: string, max: string) => void;
  onClose: () => void;
}) {
  const C = useTheme();
  const [localMin, setLocalMin] = useState(minPrice);
  const [localMax, setLocalMax] = useState(maxPrice);

  useEffect(() => {
    if (visible) {
      setLocalMin(minPrice);
      setLocalMax(maxPrice);
    }
  }, [visible, minPrice, maxPrice]);

  const handleApply = () => {
    onApply(localMin, localMax);
    onClose();
  };

  const handleClear = () => {
    setLocalMin('');
    setLocalMax('');
    onApply('', '');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.modalOverlay}>
        <TouchableOpacity style={s.modalBackdrop} onPress={onClose} activeOpacity={1} />
        <View style={[s.modalSheet, { backgroundColor: C.elevated, borderColor: C.glassBorder }]}>
          <View style={[s.modalHandle, { backgroundColor: C.glassBorder }]} />
          <Text style={[s.modalTitle, { color: C.textPrimary }]}>Filtros</Text>

          <Text style={[s.filterLabel, { color: C.textSecondary }]}>Rango de precio</Text>
          <View style={s.priceRow}>
            <View style={[s.priceInput, { backgroundColor: C.glass, borderColor: C.glassBorder }]}>
              <Text style={[s.priceCurrency, { color: C.textMuted }]}>$</Text>
              <TextInput
                value={localMin}
                onChangeText={setLocalMin}
                placeholder="Mínimo"
                placeholderTextColor={C.textMuted}
                style={[s.priceField, { color: C.textPrimary }]}
                keyboardType="numeric"
                selectionColor={C.accent}
              />
            </View>
            <View style={[s.priceSep, { backgroundColor: C.glassBorder }]} />
            <View style={[s.priceInput, { backgroundColor: C.glass, borderColor: C.glassBorder }]}>
              <Text style={[s.priceCurrency, { color: C.textMuted }]}>$</Text>
              <TextInput
                value={localMax}
                onChangeText={setLocalMax}
                placeholder="Máximo"
                placeholderTextColor={C.textMuted}
                style={[s.priceField, { color: C.textPrimary }]}
                keyboardType="numeric"
                selectionColor={C.accent}
              />
            </View>
          </View>

          <View style={s.modalActions}>
            <TouchableOpacity
              style={[s.modalBtnSecondary, { backgroundColor: C.glass, borderColor: C.glassBorder }]}
              onPress={handleClear}>
              <Text style={[s.modalBtnSecondaryText, { color: C.textSecondary }]}>Limpiar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.modalBtnPrimary, { backgroundColor: C.accent }]}
              onPress={handleApply}>
              <Text style={s.modalBtnPrimaryText}>Aplicar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Home Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const cartCount = useCartStore((s) => s.totalItems());
  const addItem = useCartStore((s) => s.addItem);

  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('Todos');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);

  const openProduct = (product: CatalogProduct) => {
    router.push(`/product/${product.id}`);
  };

  const createPublication = () => {
    router.push('/seller/publish');
  };

  const loadProducts = async () => {
    setError(null);
    try {
      const fromApi = await fetchCatalogProducts();
      setProducts(fromApi);
    } catch {
      setProducts([]);
      setError('No pudimos cargar productos. Intentá de nuevo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const hasActiveFilters = category !== 'Todos' || query.trim().length > 0 || minPrice !== '' || maxPrice !== '';
  const hasPriceFilter = minPrice !== '' || maxPrice !== '';

  const clearAllFilters = () => {
    setCategory('Todos');
    setQuery('');
    setMinPrice('');
    setMaxPrice('');
  };

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const min = minPrice !== '' ? parseFloat(minPrice) : null;
    const max = maxPrice !== '' ? parseFloat(maxPrice) : null;

    return products.filter((p) => {
      const categoryMatch = category === 'Todos' || p.category === category;
      const queryMatch =
        !normalizedQuery ||
        p.title.toLowerCase().includes(normalizedQuery) ||
        p.seller.toLowerCase().includes(normalizedQuery);
      const priceMin = min === null || p.price >= min;
      const priceMax = max === null || p.price <= max;
      return categoryMatch && queryMatch && priceMin && priceMax;
    });
  }, [products, query, category, minPrice, maxPrice]);

  const recentProducts = useMemo(
    () => filteredProducts.filter((p) => p.isRecent),
    [filteredProducts]
  );

  // Recommended: top 6 by price descending (premium items) — shown only to logged-in users
  const recommendedProducts = useMemo(() => {
    if (!user) return [];
    return [...products]
      .sort((a, b) => b.price - a.price)
      .slice(0, 6);
  }, [products, user]);

  const categories = useMemo<CategoryFilter[]>(() => {
    const dynamic = Array.from(new Set(products.map((p) => p.category))).sort();
    return ['Todos', ...dynamic];
  }, [products]);

  const leftCol = useMemo(
    () => filteredProducts.filter((_, i) => i % 2 === 0),
    [filteredProducts]
  );
  const rightCol = useMemo(
    () => filteredProducts.filter((_, i) => i % 2 === 1),
    [filteredProducts]
  );

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
            onRefresh={() => { setRefreshing(true); loadProducts(); }}
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
              style={[s.headerBtn, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}
              onPress={createPublication}>
              <MaterialIcons name="add" size={20} color={theme.accent} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Search bar + filter button ── */}
        <View style={s.searchRow}>
          <View style={[s.searchWrap, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}>
            <MaterialIcons name="search" size={20} color={theme.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar productos, vendedores..."
              placeholderTextColor={theme.textMuted}
              style={[s.searchInput, { color: theme.textPrimary }]}
              selectionColor={theme.accent}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <MaterialIcons name="close" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter button */}
          <TouchableOpacity
            onPress={() => setFilterVisible(true)}
            style={[
              s.filterBtn,
              {
                backgroundColor: hasPriceFilter ? theme.accentGlow : theme.glass,
                borderColor: hasPriceFilter ? theme.accent : theme.glassBorder,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Abrir filtros">
            <MaterialIcons
              name="tune"
              size={20}
              color={hasPriceFilter ? theme.accent : theme.textSecondary}
            />
            {hasPriceFilter && (
              <View style={[s.filterDot, { backgroundColor: theme.accent }]} />
            )}
          </TouchableOpacity>
        </View>

        {/* ── Active filter chips ── */}
        {hasActiveFilters && (
          <View style={s.chipRow}>
            {category !== 'Todos' && (
              <View style={[s.chip, { backgroundColor: theme.accentGlow, borderColor: theme.accent }]}>
                <Text style={[s.chipText, { color: theme.accent }]}>{category}</Text>
                <TouchableOpacity onPress={() => setCategory('Todos')} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
                  <MaterialIcons name="close" size={13} color={theme.accent} />
                </TouchableOpacity>
              </View>
            )}
            {minPrice !== '' && (
              <View style={[s.chip, { backgroundColor: theme.accentGlow, borderColor: theme.accent }]}>
                <Text style={[s.chipText, { color: theme.accent }]}>Desde ${minPrice}</Text>
                <TouchableOpacity onPress={() => setMinPrice('')} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
                  <MaterialIcons name="close" size={13} color={theme.accent} />
                </TouchableOpacity>
              </View>
            )}
            {maxPrice !== '' && (
              <View style={[s.chip, { backgroundColor: theme.accentGlow, borderColor: theme.accent }]}>
                <Text style={[s.chipText, { color: theme.accent }]}>Hasta ${maxPrice}</Text>
                <TouchableOpacity onPress={() => setMaxPrice('')} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
                  <MaterialIcons name="close" size={13} color={theme.accent} />
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity
              onPress={clearAllFilters}
              style={[s.chipClear, { backgroundColor: theme.redBg, borderColor: theme.red }]}>
              <Text style={[s.chipClearText, { color: theme.red }]}>Limpiar todo</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Category tiles ── */}
        <View style={s.sectionHeaderRow}>
          <Text style={[s.sectionTitle, { color: theme.textPrimary }]}>
            Categorías
          </Text>
          {category !== 'Todos' && (
            <TouchableOpacity onPress={() => setCategory('Todos')}>
              <Text style={[s.seeAllText, { color: theme.accent }]}>Ver todos</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.categoryTileRow}>
          {categories.map((cat) => {
            const active = cat === category;
            const iconName: keyof typeof MaterialIcons.glyphMap =
              CATEGORY_ICONS[cat] ?? 'label';
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setCategory(cat)}
                accessibilityRole="button"
                style={[
                  s.categoryTile,
                  {
                    backgroundColor: active ? theme.accentGlow : theme.glass,
                    borderColor: active ? theme.accent : theme.glassBorder,
                  },
                ]}>
                <MaterialIcons
                  name={iconName}
                  size={22}
                  color={active ? theme.accent : theme.textSecondary}
                />
                <Text
                  style={[s.categoryTileText, { color: active ? theme.accent : theme.textSecondary }]}
                  numberOfLines={1}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

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
              onPress={loadProducts}
              style={[s.retryBtn, { backgroundColor: theme.accentGlow, borderColor: theme.accent }]}>
              <Text style={[s.retryText, { color: theme.accent }]}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ── Recent products — CA1 ── */}
            {recentProducts.length > 0 && (
              <>
                <View style={[s.sectionHeaderRow, { marginTop: 8 }]}>
                  <Text style={[s.sectionTitle, { color: theme.textPrimary }]}>Recientes</Text>
                  <View style={[s.sectionLine, { backgroundColor: theme.glassBorder }]} />
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
                      onAddToCart={() => addItem(product)}
                      {...cardThemeProps}
                    />
                  ))}
                </ScrollView>
              </>
            )}

            {/* ── Recommendations — CA4 (solo usuarios autenticados) ── */}
            {recommendedProducts.length > 0 && !hasActiveFilters && (
              <>
                <View style={[s.sectionHeaderRow, { marginTop: 8 }]}>
                  <Text style={[s.sectionTitle, { color: theme.textPrimary }]}>Para vos</Text>
                  <View style={[s.sectionLine, { backgroundColor: theme.glassBorder }]} />
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.recentRow}>
                  {recommendedProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      compact
                      onPress={() => openProduct(product)}
                      onAddToCart={() => addItem(product)}
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
                {filteredProducts.length} resultados
              </Text>
            </View>

            {filteredProducts.length === 0 ? (
              <View style={s.emptyWrap}>
                <MaterialIcons name="search-off" size={40} color={theme.textMuted} />
                <Text style={[s.emptyText, { color: theme.textSecondary }]}>
                  No encontramos productos para tu búsqueda.
                </Text>
                {hasActiveFilters && (
                  <TouchableOpacity
                    onPress={clearAllFilters}
                    style={[s.retryBtn, { backgroundColor: theme.accentGlow, borderColor: theme.accent }]}>
                    <Text style={[s.retryText, { color: theme.accent }]}>Limpiar filtros</Text>
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
                      onAddToCart={() => addItem(product)}
                      isRecent={product.isRecent}
                      {...cardThemeProps}
                    />
                  ))}
                </View>

                {/* Right column — offset for staggered look */}
                <View style={[s.gridCol, { marginTop: 32 }]}>
                  {rightCol.map((product, i) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      tall={i % 2 === 0}
                      onPress={() => openProduct(product)}
                      onAddToCart={() => addItem(product)}
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

      {/* ── Filter Modal ── */}
      <FilterModal
        visible={filterVisible}
        minPrice={minPrice}
        maxPrice={maxPrice}
        onApply={(min, max) => { setMinPrice(min); setMaxPrice(max); }}
        onClose={() => setFilterVisible(false)}
      />
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

  // ── Category tiles ──
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  categoryTileRow: {
    gap: 10,
    paddingBottom: 20,
    paddingRight: 4,
  },
  categoryTile: {
    width: 60,
    height: 68,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  categoryTileText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.1,
    textAlign: 'center',
  },

  // ── Section headers ──
  sectionLine: {
    flex: 1,
    height: 1,
    marginLeft: 8,
  },
  sectionMeta: {
    fontSize: 13,
    fontWeight: '600',
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
