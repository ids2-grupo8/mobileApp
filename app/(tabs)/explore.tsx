import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from '@/services/secure-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

import { FilterModal, SortModal } from '@/components/catalog-filter-modals';
import { useTheme } from '@/hooks/use-theme';
import {
  type CatalogProduct,
  fetchCatalogCategories,
  fetchCatalogProducts,
  getSellerDisplayName,
} from '@/services/catalog';

const RECENT_KEY = 'explore_recent_searches_v1';
const RECENT_MAX = 8;

const CATEGORY_TRANSLATIONS: Record<string, string> = {
  Electronics: 'Electrónica',
  Clothing: 'Ropa',
  Books: 'Libros',
  Home: 'Hogar',
  Sports: 'Deportes',
};

async function loadRecent(): Promise<string[]> {
  try {
    const raw = await SecureStore.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s) => typeof s === 'string').slice(0, RECENT_MAX);
  } catch {
    return [];
  }
}

async function saveRecent(items: string[]) {
  try {
    await SecureStore.setItem(RECENT_KEY, JSON.stringify(items.slice(0, RECENT_MAX)));
  } catch {
    /* noop */
  }
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

const SORT_LABELS: Record<string, string> = {
  price_asc: 'Precio: menor primero',
  price_desc: 'Precio: mayor primero',
  newest: 'Más recientes',
};

export default function ExploreScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string; category?: string }>();
  const insets = useSafeAreaInsets();
  const C = useTheme();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 200);
    return () => clearTimeout(t);
  }, [query]);
  const [recents, setRecents] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtros + sort
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [filterVisible, setFilterVisible] = useState(false);
  const [sortVisible, setSortVisible] = useState(false);

  // Pre-cargar categoría/texto cuando Inicio nos manda un atajo.
  // Limpiamos el param después de consumirlo para que volver a tocar
  // el mismo atajo vuelva a disparar el efecto.
  useEffect(() => {
    if (typeof params.category === 'string' && params.category.length > 0) {
      const label = params.category;
      setSelectedCategories([label]);
      router.setParams({ category: undefined });
    }
    if (typeof params.q === 'string' && params.q.length > 0) {
      setQuery(params.q);
      setDebouncedQuery(params.q.trim());
      router.setParams({ q: undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.category, params.q]);

  const refreshAll = useCallback(async () => {
    const [recentList, cats, productList] = await Promise.all([
      loadRecent(),
      fetchCatalogCategories().catch(() => []),
      fetchCatalogProducts().catch(() => []),
    ]);
    setRecents(recentList);
    setCategories(cats);
    setProducts(productList);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await refreshAll();
      setLoading(false);
    })();
  }, [refreshAll]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  };

  // Persistir en recientes: lo dispara el submit del teclado o el tap a una recent chip
  const persistRecent = (term: string) => {
    const trimmed = term.trim();
    if (trimmed.length === 0) return;
    const next = [trimmed, ...recents.filter((r) => r.toLowerCase() !== trimmed.toLowerCase())].slice(0, RECENT_MAX);
    setRecents(next);
    void saveRecent(next);
  };

  const runSearch = (term: string) => {
    const trimmed = term.trim();
    if (trimmed.length === 0) return;
    setQuery(trimmed);
    setDebouncedQuery(trimmed);
    persistRecent(trimmed);
  };

  const removeRecent = async (term: string) => {
    const next = recents.filter((r) => r !== term);
    setRecents(next);
    void saveRecent(next);
  };

  const clearRecents = async () => {
    setRecents([]);
    void saveRecent([]);
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setMinPrice('');
    setMaxPrice('');
    setSortBy(null);
  };

  const translatedCategoryList = useMemo(
    () => categories.map((c) => CATEGORY_TRANSLATIONS[c] ?? c),
    [categories],
  );

  const hasPriceFilter = minPrice !== '' || maxPrice !== '';
  const hasActiveFilters = hasPriceFilter || selectedCategories.length > 0 || sortBy !== null;
  const hasQuery = debouncedQuery.trim().length > 0;
  const isShowingResults = hasQuery || hasActiveFilters;

  const searchResults = useMemo(() => {
    if (!isShowingResults) return [];
    const q = debouncedQuery.trim().toLowerCase();
    const min = minPrice !== '' ? parseFloat(minPrice) : null;
    const max = maxPrice !== '' ? parseFloat(maxPrice) : null;
    const catSet = new Set(selectedCategories);

    const filtered = products.filter((p) => {
      const title = (p.title ?? '').toLowerCase();
      const sellerName = (getSellerDisplayName(p.sellerInfo) ?? p.seller ?? '').toLowerCase();
      const translatedCat = CATEGORY_TRANSLATIONS[p.category] ?? p.category;
      const matchesQuery =
        q.length === 0 ||
        title.includes(q) ||
        sellerName.includes(q) ||
        translatedCat.toLowerCase().includes(q);
      const matchesCategory = catSet.size === 0 || catSet.has(translatedCat);
      const matchesMin = min === null || p.price >= min;
      const matchesMax = max === null || p.price <= max;
      return matchesQuery && matchesCategory && matchesMin && matchesMax;
    });

    if (sortBy === 'price_asc') return [...filtered].sort((a, b) => a.price - b.price);
    if (sortBy === 'price_desc') return [...filtered].sort((a, b) => b.price - a.price);
    return filtered;
  }, [products, debouncedQuery, selectedCategories, minPrice, maxPrice, sortBy, isShowingResults]);

  return (
    <View style={[s.root, { backgroundColor: C.bg, paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[s.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 140 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}>

        {/* Header */}
        <View style={s.header}>
          <Text style={[s.greeting, { color: C.textSecondary }]}>Descubrí</Text>
          <Text style={[s.title, { color: C.textPrimary }]}>Explorar</Text>
        </View>

        {/* Search bar */}
        <View style={s.searchRow}>
          <View style={[s.searchWrap, { backgroundColor: C.glass, borderColor: C.glassBorder }]}>
            <MaterialIcons name="search" size={20} color={C.textMuted} />
            <TextInput
              autoFocus
              value={query}
              onChangeText={(t) => {
                setQuery(t);
                if (t.trim().length === 0) setDebouncedQuery('');
              }}
              placeholder="¿Qué buscás?"
              placeholderTextColor={C.textMuted}
              style={[s.searchInput, { color: C.textPrimary }]}
              selectionColor={C.accent}
              returnKeyType="search"
              onSubmitEditing={() => void runSearch(query)}
            />
            {query.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setQuery('');
                  setDebouncedQuery('');
                }}>
                <MaterialIcons name="close" size={18} color={C.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter button — visible siempre */}
          <TouchableOpacity
            onPress={() => setFilterVisible(true)}
            style={[
              s.iconBtn,
              {
                backgroundColor: hasPriceFilter || selectedCategories.length > 0 ? C.accentGlow : C.glass,
                borderColor: hasPriceFilter || selectedCategories.length > 0 ? C.accent : C.glassBorder,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Abrir filtros">
            <MaterialIcons name="tune" size={20} color={hasPriceFilter || selectedCategories.length > 0 ? C.accent : C.textSecondary} />
          </TouchableOpacity>

          {/* Sort button */}
          <TouchableOpacity
            onPress={() => setSortVisible(true)}
            style={[
              s.iconBtn,
              {
                backgroundColor: sortBy ? C.accentGlow : C.glass,
                borderColor: sortBy ? C.accent : C.glassBorder,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Abrir orden">
            <MaterialIcons name="sort" size={20} color={sortBy ? C.accent : C.textSecondary} />
          </TouchableOpacity>

          {hasActiveFilters && (
            <TouchableOpacity
              onPress={clearAllFilters}
              style={[s.iconBtn, { backgroundColor: C.redBg, borderColor: C.red }]}
              accessibilityRole="button"
              accessibilityLabel="Limpiar filtros">
              <MaterialIcons name="filter-alt-off" size={20} color={C.red} />
            </TouchableOpacity>
          )}
        </View>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <View style={s.chipRow}>
            {selectedCategories.map((cat) => (
              <View key={cat} style={[s.chip, { backgroundColor: C.accentGlow, borderColor: C.accent }]}>
                <Text style={[s.chipText, { color: C.accent }]}>{cat}</Text>
                <TouchableOpacity
                  onPress={() => setSelectedCategories((prev) => prev.filter((c) => c !== cat))}
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
                  <MaterialIcons name="close" size={13} color={C.accent} />
                </TouchableOpacity>
              </View>
            ))}
            {minPrice !== '' && (
              <View style={[s.chip, { backgroundColor: C.accentGlow, borderColor: C.accent }]}>
                <Text style={[s.chipText, { color: C.accent }]}>Desde ${minPrice}</Text>
                <TouchableOpacity onPress={() => setMinPrice('')} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
                  <MaterialIcons name="close" size={13} color={C.accent} />
                </TouchableOpacity>
              </View>
            )}
            {maxPrice !== '' && (
              <View style={[s.chip, { backgroundColor: C.accentGlow, borderColor: C.accent }]}>
                <Text style={[s.chipText, { color: C.accent }]}>Hasta ${maxPrice}</Text>
                <TouchableOpacity onPress={() => setMaxPrice('')} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
                  <MaterialIcons name="close" size={13} color={C.accent} />
                </TouchableOpacity>
              </View>
            )}
            {sortBy && (
              <View style={[s.chip, { backgroundColor: C.accentGlow, borderColor: C.accent }]}>
                <Text style={[s.chipText, { color: C.accent }]}>{SORT_LABELS[sortBy] ?? sortBy}</Text>
                <TouchableOpacity onPress={() => setSortBy(null)} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
                  <MaterialIcons name="close" size={13} color={C.accent} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {loading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator color={C.accent} size="large" />
          </View>
        ) : isShowingResults ? (
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: C.textPrimary, marginBottom: 14 }]}>
              {searchResults.length} {searchResults.length === 1 ? 'resultado' : 'resultados'}
              {hasQuery ? ` para "${debouncedQuery}"` : ''}
            </Text>
            {searchResults.length === 0 ? (
              <View style={s.emptyWrap}>
                <MaterialIcons name="search-off" size={40} color={C.textMuted} />
                <Text style={[s.emptyText, { color: C.textSecondary }]}>
                  No encontramos productos para esa búsqueda.
                </Text>
              </View>
            ) : (
              <View style={s.resultsGrid}>
                {searchResults.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => router.push(`/product/${p.id}`)}
                    style={[s.resultCard, { backgroundColor: C.glass, borderColor: C.glassBorder }]}
                    accessibilityRole="button">
                    <Image source={{ uri: p.imageUrl }} style={s.resultImage} contentFit="cover" />
                    <View style={s.resultBody}>
                      <Text numberOfLines={2} style={[s.resultTitle, { color: C.textPrimary }]}>
                        {p.title}
                      </Text>
                      <Text style={[s.resultPrice, { color: C.accent }]}>
                        {formatPrice(p.price)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : (
          <>
            {/* Recientes */}
            {recents.length > 0 ? (
              <View style={s.section}>
                <View style={s.sectionHeader}>
                  <Text style={[s.sectionTitle, { color: C.textPrimary }]}>Búsquedas recientes</Text>
                  <TouchableOpacity onPress={clearRecents} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Text style={[s.sectionAction, { color: C.textSecondary }]}>Limpiar</Text>
                  </TouchableOpacity>
                </View>
                <View style={s.chipsWrap}>
                  {recents.map((term) => (
                    <View key={term} style={[s.recentChip, { backgroundColor: C.glass, borderColor: C.glassBorder }]}>
                      <TouchableOpacity
                        onPress={() => runSearch(term)}
                        style={s.recentChipMain}
                        accessibilityRole="button"
                        accessibilityLabel={`Buscar ${term}`}>
                        <MaterialIcons name="history" size={14} color={C.textMuted} />
                        <Text style={[s.recentChipText, { color: C.textPrimary }]} numberOfLines={1}>
                          {term}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => removeRecent(term)}
                        hitSlop={{ top: 6, bottom: 6, left: 4, right: 6 }}
                        accessibilityLabel={`Quitar ${term} de recientes`}>
                        <MaterialIcons name="close" size={14} color={C.textMuted} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <View style={s.emptyWrap}>
                <MaterialIcons name="search" size={40} color={C.textMuted} />
                <Text style={[s.emptyText, { color: C.textSecondary }]}>
                  Buscá productos por nombre, vendedor o categoría.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <FilterModal
        visible={filterVisible}
        categories={translatedCategoryList}
        selectedCategories={selectedCategories}
        minPrice={minPrice}
        maxPrice={maxPrice}
        onApply={(cats, min, max) => {
          setSelectedCategories(cats);
          setMinPrice(min);
          setMaxPrice(max);
        }}
        onClose={() => setFilterVisible(false)}
      />
      <SortModal
        visible={sortVisible}
        selected={sortBy}
        onSelect={setSortBy}
        onClose={() => setSortVisible(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },

  header: { marginBottom: 18 },
  greeting: { fontSize: 14, fontWeight: '500', marginBottom: 4, letterSpacing: 0.2 },
  title: { fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  searchWrap: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
  },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '400', letterSpacing: 0.1 },
  iconBtn: {
    width: 50,
    height: 50,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingLeft: 10,
    paddingRight: 8,
    paddingVertical: 5,
  },
  chipText: { fontSize: 12, fontWeight: '700' },

  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  sectionAction: { fontSize: 13, fontWeight: '600' },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingLeft: 12,
    paddingRight: 10,
    paddingVertical: 8,
    gap: 6,
    maxWidth: 220,
  },
  recentChipMain: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  recentChipText: { fontSize: 13, fontWeight: '600', flexShrink: 1 },

  loadingWrap: { paddingVertical: 60, alignItems: 'center' },
  emptyWrap: { paddingVertical: 60, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },

  resultsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  resultCard: { width: '47.5%', borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  resultImage: { width: '100%', height: 140 },
  resultBody: { padding: 12, gap: 6 },
  resultTitle: { fontSize: 13, fontWeight: '700', lineHeight: 18, letterSpacing: -0.1 },
  resultPrice: { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
});
