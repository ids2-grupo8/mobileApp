import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
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

// ─── Liquid Glass Product Card ────────────────────────────────────────────────

function ProductCard({
  product,
  onPress,
  compact = false,
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
  compact?: boolean;
  accent: string;
  accentGlow: string;
  textPrimary: string;
  textSecondary: string;
  glass: string;
  glassBorder: string;
  shadowAccent: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      damping: 15,
      stiffness: 300,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      damping: 12,
      stiffness: 200,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        accessibilityRole="button"
        style={[
          s.productCard,
          {
            width: compact ? 220 : '100%',
            backgroundColor: glass,
            borderColor: glassBorder,
            shadowColor: shadowAccent,
          },
        ]}>
        {/* Image — edge-to-edge */}
        <View style={s.productImageWrap}>
          <Image source={{ uri: product.imageUrl }} style={s.productImage} contentFit="cover" />
          {/* Category badge floating on image */}
          <View style={[s.categoryBadge, { backgroundColor: 'rgba(0,0,0,0.55)', borderColor: 'rgba(255,255,255,0.12)' }]}>
            <Text style={[s.categoryBadgeText, { color: accent }]}>{product.category}</Text>
          </View>
        </View>

        {/* Glass body */}
        <View style={s.productBody}>
          <Text numberOfLines={2} style={[s.productTitle, { color: textPrimary }]}>
            {product.title}
          </Text>
          <Text style={[s.productSeller, { color: textSecondary }]}>
            {product.seller}
          </Text>

          <View style={s.productBottomRow}>
            <Text style={[s.productPrice, { color: textPrimary }]}>
              {formatPrice(product.price)}
            </Text>
            <View style={[s.stockPill, { backgroundColor: accentGlow }]}>
              <Text style={[s.stockText, { color: accent }]}>
                {product.stock} disp.
              </Text>
            </View>
          </View>
        </View>

        {/* Glass edge highlight — top light refraction */}
        <LinearGradient
          colors={['rgba(255,255,255,0.12)', 'transparent', 'transparent']}
          locations={[0, 0.3, 1]}
          style={s.cardGlassEdge}
          pointerEvents="none"
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Home Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const cartCount = useCartStore((s) => s.totalItems());

  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('Todos');

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

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return products.filter((p) => {
      const categoryMatch = category === 'Todos' || p.category === category;
      const queryMatch =
        !normalizedQuery ||
        p.title.toLowerCase().includes(normalizedQuery) ||
        p.seller.toLowerCase().includes(normalizedQuery);
      return categoryMatch && queryMatch;
    });
  }, [products, query, category]);

  const recentProducts = useMemo(
    () => filteredProducts.filter((p) => p.isRecent),
    [filteredProducts]
  );

  const categories = useMemo<CategoryFilter[]>(() => {
    const dynamic = Array.from(new Set(products.map((p) => p.category))).sort();
    return ['Todos', ...dynamic];
  }, [products]);

  return (
    <View style={[s.root, { backgroundColor: theme.bg, paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[s.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 140 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadProducts();
            }}
            tintColor={theme.accent}
          />
        }>

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={[s.greeting, { color: theme.textSecondary }]}>
              Hola{user?.name ? `, ${user.name.split(' ')[0]}` : ''} 👋
            </Text>
            <Text style={[s.title, { color: theme.textPrimary }]}>
              Explorar
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

        {/* ── Search bar — glass material ── */}
        <View
          style={[
            s.searchWrap,
            { backgroundColor: theme.glass, borderColor: theme.glassBorder },
          ]}>
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

        {/* ── Category chips — glass floating ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.categoryRow}>
          {categories.map((item) => {
            const active = item === category;
            return (
              <TouchableOpacity
                key={item}
                onPress={() => setCategory(item)}
                accessibilityRole="button"
                style={[
                  s.categoryChip,
                  {
                    backgroundColor: active ? theme.accentGlow : theme.glass,
                    borderColor: active ? theme.accent : theme.glassBorder,
                  },
                ]}>
                <Text
                  style={[
                    s.categoryText,
                    { color: active ? theme.accent : theme.textSecondary },
                  ]}>
                  {item}
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
            {/* ── Recent Products — horizontal scroll ── */}
            {recentProducts.length > 0 && (
              <>
                <View style={s.sectionHeader}>
                  <Text style={[s.sectionTitle, { color: theme.textPrimary }]}>
                    Recientes
                  </Text>
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
                      onPress={() => openProduct(product)}
                      accent={theme.accent}
                      accentGlow={theme.accentGlow}
                      textPrimary={theme.textPrimary}
                      textSecondary={theme.textSecondary}
                      glass={theme.glass}
                      glassBorder={theme.glassBorder}
                      shadowAccent={theme.shadowAccent}
                    />
                  ))}
                </ScrollView>
              </>
            )}

            {/* ── All products — vertical list ── */}
            <View style={s.sectionHeader}>
              <Text style={[s.sectionTitle, { color: theme.textPrimary }]}>
                Todos los productos
              </Text>
              <Text style={[s.sectionMeta, { color: theme.textMuted }]}>
                {filteredProducts.length}
              </Text>
            </View>

            <View style={s.listWrap}>
              {filteredProducts.length === 0 ? (
                <View style={s.emptyWrap}>
                  <MaterialIcons name="search-off" size={40} color={theme.textMuted} />
                  <Text style={[s.emptyText, { color: theme.textSecondary }]}>
                    No encontramos productos para tu búsqueda.
                  </Text>
                </View>
              ) : (
                filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onPress={() => openProduct(product)}
                    accent={theme.accent}
                    accentGlow={theme.accentGlow}
                    textPrimary={theme.textPrimary}
                    textSecondary={theme.textSecondary}
                    glass={theme.glass}
                    glassBorder={theme.glassBorder}
                    shadowAccent={theme.shadowAccent}
                  />
                ))
              )}
            </View>
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
    // Subtle glass shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },

  // ── Search ──
  searchWrap: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    height: 50,
    // Glass shadow
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

  // ── Categories ──
  categoryRow: {
    paddingBottom: 16,
    gap: 8,
  },
  categoryChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
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

  // ── Sections ──
  sectionHeader: {
    marginTop: 8,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sectionLine: {
    flex: 1,
    height: 1,
  },
  sectionMeta: {
    fontSize: 13,
    fontWeight: '600',
  },

  // ── Product lists ──
  recentRow: {
    gap: 12,
    paddingBottom: 8,
    paddingRight: 4,
  },
  listWrap: {
    gap: 14,
  },

  // ── Product Card ──
  productCard: {
    borderWidth: 1,
    borderRadius: 20,
    overflow: 'hidden',
    // Spatial shadow
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 8,
  },
  productImageWrap: {
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: 160,
  },
  categoryBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  productBody: {
    padding: 14,
    gap: 4,
  },
  productTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  productSeller: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  productBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  stockPill: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  stockText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardGlassEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
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
});
