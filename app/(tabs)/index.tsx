import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  type CatalogFetchOptions,
  type CatalogProduct,
  fetchCatalogCategories,
  fetchCatalogProducts,
  fetchRecommendedProducts,
} from '@/services/catalog';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';



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
};

// Reverse mapping: translated label → backend category code
const CATEGORY_CODES: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_TRANSLATIONS).map(([code, label]) => [label, code]),
);

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

// ─── Filter Modal ─────────────────────────────────────────────────────────────

function FilterModal({
  visible,
  categories,
  selectedCategories,
  minPrice,
  maxPrice,
  onApply,
  onClose,
}: {
  visible: boolean;
  categories: string[];
  selectedCategories: string[];
  minPrice: string;
  maxPrice: string;
  onApply: (nextCategories: string[], min: string, max: string) => void;
  onClose: () => void;
}) {
  const C = useTheme();
  const [localCategories, setLocalCategories] = useState<Set<string>>(new Set(selectedCategories));
  const [localMin, setLocalMin] = useState(minPrice);
  const [localMax, setLocalMax] = useState(maxPrice);

  useEffect(() => {
    if (visible) {
      setLocalCategories(new Set(selectedCategories));
      setLocalMin(minPrice);
      setLocalMax(maxPrice);
    }
  }, [visible, selectedCategories, minPrice, maxPrice]);

  const handleApply = () => {
    onApply(Array.from(localCategories), localMin, localMax);
    onClose();
  };

  const handleClear = () => {
    setLocalCategories(new Set());
    setLocalMin('');
    setLocalMax('');
    onApply([], '', '');
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

          <Text style={[s.filterLabel, { color: C.textSecondary }]}>Categorías</Text>
          <View style={s.modalCategoryWrap}>
            {categories
              .filter((cat) => cat !== 'Todos')
              .map((cat) => {
                const active = localCategories.has(cat);
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => {
                      setLocalCategories((prev) => {
                        const next = new Set(prev);
                        if (next.has(cat)) {
                          next.delete(cat);
                        } else {
                          next.add(cat);
                        }
                        return next;
                      });
                    }}
                    style={[
                      s.modalCategoryChip,
                      {
                        backgroundColor: active ? C.accentGlow : C.glass,
                        borderColor: active ? C.accent : C.glassBorder,
                      },
                    ]}>
                    <Text style={[s.modalCategoryChipText, { color: active ? C.accent : C.textSecondary }]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
          </View>

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

// ─── Sort Modal ──────────────────────────────────────────────────────────────

function SortModal({
  visible,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selected: string | null;
  onSelect: (s: string | null) => void;
  onClose: () => void;
}) {
  const C = useTheme();

  const pick = (value: string | null) => {
    onSelect(value);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.modalOverlay}>
        <TouchableOpacity style={s.modalBackdrop} onPress={onClose} activeOpacity={1} />
        <View style={[s.modalSheet, { backgroundColor: C.elevated, borderColor: C.glassBorder }]}>
          <View style={[s.modalHandle, { backgroundColor: C.glassBorder }]} />
          <Text style={[s.modalTitle, { color: C.textPrimary }]}>Ordenar resultados</Text>

          <TouchableOpacity onPress={() => pick(null)} style={s.sortOption}>
            <Text style={[s.sortOptionText, { color: selected === null ? C.accent : C.textPrimary }]}>Predeterminado</Text>
            <Text style={[s.sortOptionHint, { color: C.textSecondary }]}>Relevancia si buscás, sino más recientes</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => pick('price_asc')} style={s.sortOption}>
            <Text style={[s.sortOptionText, { color: selected === 'price_asc' ? C.accent : C.textPrimary }]}>Precio: menor primero</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => pick('price_desc')} style={s.sortOption}>
            <Text style={[s.sortOptionText, { color: selected === 'price_desc' ? C.accent : C.textPrimary }]}>Precio: mayor primero</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => pick('newest')} style={s.sortOption}>
            <Text style={[s.sortOptionText, { color: selected === 'newest' ? C.accent : C.textPrimary }]}>Más recientes</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo agregar el producto';
      Alert.alert('Error', msg);
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

  const loadProducts = async (searchTerm = query, sort = sortBy) => {
    setError(null);
    try {
      const options: CatalogFetchOptions = {};
      if (category.size > 0) {
        options.categories = Array.from(category).map(label => CATEGORY_CODES[label] ?? label);
      }
      const parsedMin = minPrice !== '' ? parseFloat(minPrice) : undefined;
      const parsedMax = maxPrice !== '' ? parseFloat(maxPrice) : undefined;
      if (parsedMin != null && !Number.isNaN(parsedMin)) options.priceMin = parsedMin;
      if (parsedMax != null && !Number.isNaN(parsedMax)) options.priceMax = parsedMax;

      const fromApi = await fetchCatalogProducts(
        searchTerm,
        options,
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
      setRefreshing(false);
    }
  };

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

  // CA4: Recomendaciones personalizadas cargadas desde el backend.
  // Se cargan asincrónicamente. Si no hay datos o falla, la sección no se muestra.
  const [recommendedProducts, setRecommendedProducts] = useState<CatalogProduct[]>([]);
  const [hasPersonalizedRecommendations, setHasPersonalizedRecommendations] = useState(false);

  useEffect(() => {
    // No mostramos recomendaciones cuando hay filtros activos
    // ni cuando el usuario no esta autenticado.
    if (hasActiveFilters || !user) {
      setRecommendedProducts([]);
      setHasPersonalizedRecommendations(false);
      return;
    }
    let cancelled = false;
    fetchRecommendedProducts(12).then((result) => {
      if (!cancelled) {
        setRecommendedProducts(result.items);
        setHasPersonalizedRecommendations(result.isPersonalized);
      }
    });
    return () => { cancelled = true; };
  }, [products, hasActiveFilters, user]);

  // Fetch categories from backend so all are always visible regardless of current filter
  const [backendCategories, setBackendCategories] = useState<string[]>([]);
  useEffect(() => {
    fetchCatalogCategories().then((cats) => setBackendCategories(cats));
  }, []);

  const categories = useMemo(() => {
    // Translate backend codes to display labels
    const labels = backendCategories.map(code => CATEGORY_TRANSLATIONS[code] ?? code);
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

  const orderedProducts = useMemo(
    () =>
      [...filteredProducts].sort((a, b) => {
        // Mantener recomendados en el listado pero mas abajo para
        // evitar repeticion visual inmediata entre secciones.
        const aRecommended = recommendedIds.has(a.id);
        const bRecommended = recommendedIds.has(b.id);
        if (aRecommended && !bRecommended) return 1;
        if (!aRecommended && bRecommended) return -1;

        if (a.isRecent && !b.isRecent) return -1;
        if (!a.isRecent && b.isRecent) return 1;
        return a.title.localeCompare(b.title, 'es');
      }),
    [filteredProducts, recommendedIds]
  );

  const leftCol = useMemo(
    () => orderedProducts.filter((_, i) => i % 2 === 0),
    [orderedProducts]
  );
  const rightCol = useMemo(
    () => orderedProducts.filter((_, i) => i % 2 === 1),
    [orderedProducts]
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

          {/* Sort button */}
          <TouchableOpacity
            onPress={() => setSortVisible(true)}
            style={[s.filterBtn, { backgroundColor: sortBy ? theme.accentGlow : theme.glass, borderColor: sortBy ? theme.accent : theme.glassBorder }]}
            accessibilityRole="button"
            accessibilityLabel="Abrir opciones de orden">
            <MaterialIcons name="sort" size={20} color={sortBy ? theme.accent : theme.textSecondary} />
            {sortBy && (
              <View style={[s.filterDot, { backgroundColor: theme.accent }]} />
            )}
          </TouchableOpacity>

          {hasActiveFilters && (
            <TouchableOpacity
              onPress={clearAllFilters}
              style={[s.filterBtn, { backgroundColor: theme.redBg, borderColor: theme.red }]}
              accessibilityRole="button"
              accessibilityLabel="Limpiar filtros">
              <MaterialIcons name="filter-alt-off" size={20} color={theme.red} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Active filter chips ── */}
        {(hasPriceFilter || hasCategoryFilter) && (
          <View style={s.chipRow}>
            {Array.from(category).map((cat) => (
              <View key={cat} style={[s.chip, { backgroundColor: theme.accentGlow, borderColor: theme.accent }]}>
                <Text style={[s.chipText, { color: theme.accent }]}>{cat}</Text>
                <TouchableOpacity
                  onPress={() =>
                    setCategory((prev) => {
                      const next = new Set(prev);
                      next.delete(cat);
                      return next;
                    })
                  }
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
                  <MaterialIcons name="close" size={13} color={theme.accent} />
                </TouchableOpacity>
              </View>
            ))}
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
                      onAddToCart={() => handleQuickAdd(product)}
                      {...cardThemeProps}
                    />
                  ))}
                </ScrollView>
              </>
            )}

            {/* ── Recommendations — CA4 (solo usuarios autenticados) ── */}
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
                      onAddToCart={() => handleQuickAdd(product)}
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
                      onAddToCart={() => handleQuickAdd(product)}
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
                      onAddToCart={() => handleQuickAdd(product)}
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
        categories={categories}
        selectedCategories={Array.from(category)}
        minPrice={minPrice}
        maxPrice={maxPrice}
        onApply={(nextCategories, min, max) => {
          setCategory(new Set(nextCategories));
          setMinPrice(min);
          setMaxPrice(max);
        }}
        onClose={() => setFilterVisible(false)}
      />
      <SortModal
        visible={sortVisible}
        selected={sortBy}
        onSelect={(s) => setSortBy(s)}
        onClose={() => setSortVisible(false)}
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
