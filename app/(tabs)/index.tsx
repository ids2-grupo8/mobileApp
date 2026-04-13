import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
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
    getFallbackCatalogProducts,
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

function ProductCard({
  product,
  onPress,
  compact = false,
  accent,
  textPrimary,
  textSecondary,
  card,
  border,
  muted,
}: {
  product: CatalogProduct;
  onPress: () => void;
  compact?: boolean;
  accent: string;
  textPrimary: string;
  textSecondary: string;
  card: string;
  border: string;
  muted: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      style={[
        s.productCard,
        {
          width: compact ? 240 : '100%',
          backgroundColor: card,
          borderColor: border,
        },
      ]}>
      <Image source={{ uri: product.imageUrl }} style={s.productImage} contentFit="cover" />

      <View style={s.productBody}>
        <View style={s.productTopRow}>
          <Text style={[s.productCategory, { color: accent }]}>{product.category}</Text>
          <Text style={[s.stock, { color: muted }]}>Stock: {product.stock}</Text>
        </View>

        <Text numberOfLines={2} style={[s.productTitle, { color: textPrimary }]}>
          {product.title}
        </Text>
        <Text style={[s.productSeller, { color: textSecondary }]}>Vendido por {product.seller}</Text>

        <View style={s.productBottomRow}>
          <Text style={[s.productPrice, { color: textPrimary }]}>{formatPrice(product.price)}</Text>
          <MaterialIcons name="chevron-right" size={20} color={accent} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

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
  const [notice, setNotice] = useState<string | null>(null);
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
    setNotice(null);
    try {
      const fromApi = await fetchCatalogProducts();
      setProducts(fromApi);
    } catch {
      const fallback = getFallbackCatalogProducts();
      if (fallback.length > 0) {
        setProducts(fallback);
        setNotice('Mostrando catálogo temporal mientras se conecta el backend de productos.');
      } else {
        setProducts([]);
        setError('No pudimos cargar productos. Intentá de nuevo.');
      }
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
        contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 108 }]}
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
        <View style={s.header}>
          <View>
            <Text style={[s.greeting, { color: theme.textSecondary }]}>Hola{user?.name ? `, ${user.name.split(' ')[0]}` : ''}</Text>
            <Text style={[s.title, { color: theme.textPrimary }]}>Descubrí productos recientes</Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            style={[s.sellBtn, { borderColor: theme.accent }]}
            onPress={createPublication}>
            <MaterialIcons name="add" size={16} color={theme.accent} />
            <Text style={[s.sellBtnText, { color: theme.accent }]}>Publicar</Text>
            {cartCount > 0 ? (
              <View style={[s.cartBadge, { backgroundColor: theme.accent }]}> 
                <Text style={s.cartBadgeText}>{cartCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>

        <View
          style={[
            s.searchWrap,
            { backgroundColor: theme.inputBg, borderColor: theme.inputBorder },
          ]}>
          <MaterialIcons name="search" size={20} color={theme.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar por producto o vendedor"
            placeholderTextColor={theme.textMuted}
            style={[s.searchInput, { color: theme.textPrimary }]}
          />
        </View>

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
                    backgroundColor: active ? theme.accentBg : theme.card,
                    borderColor: active ? theme.accent : theme.border,
                  },
                ]}>
                <Text
                  style={[
                    s.categoryText,
                    { color: active ? theme.accentText : theme.textSecondary },
                  ]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {notice ? (
          <View style={[s.noticeBox, { backgroundColor: theme.accentBg, borderColor: theme.accent }]}> 
            <Text style={[s.noticeText, { color: theme.accentText }]}>{notice}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator color={theme.accent} size="large" />
            <Text style={[s.loadingText, { color: theme.textSecondary }]}>Cargando catálogo...</Text>
          </View>
        ) : error ? (
          <View style={[s.errorBox, { backgroundColor: theme.redBg, borderColor: theme.inputBorderError }]}>
            <Text style={[s.errorText, { color: theme.red }]}>{error}</Text>
            <TouchableOpacity onPress={loadProducts} style={s.retryBtn}>
              <Text style={[s.retryText, { color: theme.accentText }]}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={s.sectionHeader}>
              <Text style={[s.sectionTitle, { color: theme.textPrimary }]}>Recientes</Text>
            </View>

            {recentProducts.length === 0 ? (
              <Text style={[s.emptyText, { color: theme.textSecondary }]}>No hay productos recientes para estos filtros.</Text>
            ) : (
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
                    textPrimary={theme.textPrimary}
                    textSecondary={theme.textSecondary}
                    card={theme.card}
                    border={theme.border}
                    muted={theme.textMuted}
                  />
                ))}
              </ScrollView>
            )}

            <View style={s.sectionHeader}>
              <Text style={[s.sectionTitle, { color: theme.textPrimary }]}>Todos los productos</Text>
              <Text style={[s.sectionMeta, { color: theme.textSecondary }]}>{filteredProducts.length} resultados</Text>
            </View>

            <View style={s.listWrap}>
              {filteredProducts.length === 0 ? (
                <Text style={[s.emptyText, { color: theme.textSecondary }]}>No encontramos productos para tu búsqueda.</Text>
              ) : (
                filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onPress={() => openProduct(product)}
                    accent={theme.accent}
                    textPrimary={theme.textPrimary}
                    textSecondary={theme.textSecondary}
                    card={theme.card}
                    border={theme.border}
                    muted={theme.textMuted}
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

const s = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 18,
  },
  greeting: {
    fontSize: 13,
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 32,
    maxWidth: 240,
  },
  sellBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sellBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  cartBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  cartBadgeText: {
    color: '#0b0b0f',
    fontSize: 10,
    fontWeight: '800',
  },
  searchWrap: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    height: 46,
    fontSize: 15,
  },
  categoryRow: {
    paddingBottom: 10,
    gap: 8,
  },
  categoryChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  noticeBox: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  loadingWrap: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
  },
  retryBtn: {
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeader: {
    marginTop: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionMeta: {
    fontSize: 12,
    fontWeight: '500',
  },
  recentRow: {
    gap: 10,
    paddingBottom: 4,
  },
  listWrap: {
    gap: 10,
  },
  productCard: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: 140,
  },
  productBody: {
    padding: 12,
  },
  productTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  productCategory: {
    fontSize: 11,
    fontWeight: '700',
  },
  stock: {
    fontSize: 11,
  },
  productTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 6,
  },
  productSeller: {
    fontSize: 12,
    marginBottom: 10,
  },
  productBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productPrice: {
    fontSize: 17,
    fontWeight: '800',
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
});
