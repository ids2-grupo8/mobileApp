import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  type SellerInfo,
  fetchCatalogCategories,
  fetchCatalogProducts,
  fetchRecommendedProducts,
  getSellerDisplayName,
} from '@/services/catalog';
import { useAuthStore } from '@/store/auth';

const RECENT_KEY  = 'explore_recent_searches_v1';
const RECENT_MAX  = 8;

const CATEGORY_TRANSLATIONS: Record<string, string> = {
  Electronics: 'Electrónica',
  Clothing: 'Ropa',
  Books: 'Libros',
  Home: 'Hogar',
  Sports: 'Deportes',
};

const CATEGORY_ICONS: Record<string, string> = {
  Electronics: 'devices',
  Clothing: 'checkroom',
  Books: 'menu-book',
  Home: 'home',
  Sports: 'sports-soccer',
};

type FeaturedSeller = {
  email: string;
  name: string;
  photo?: string | null;
  productCount: number;
};

async function loadRecent(): Promise<string[]> {
  try {
    const raw = await SecureStore.getItemAsync(RECENT_KEY);
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
    await SecureStore.setItemAsync(RECENT_KEY, JSON.stringify(items.slice(0, RECENT_MAX)));
  } catch {
    // ignoramos: el historial es nice-to-have
  }
}

function deriveFeaturedSellers(products: CatalogProduct[]): FeaturedSeller[] {
  const byEmail = new Map<string, FeaturedSeller>();
  for (const p of products) {
    const info: SellerInfo | undefined = p.sellerInfo;
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
}

function SkeletonCard({
  pulse,
  glass,
  glassBorder,
  skeleton,
}: {
  pulse: Animated.Value;
  glass: string;
  glassBorder: string;
  skeleton: string;
}) {
  return (
    <View style={[s.recCard, { backgroundColor: glass, borderColor: glassBorder }]}>
      <Animated.View style={[s.recImage, { backgroundColor: skeleton, opacity: pulse }]} />
      <View style={s.recBody}>
        <Animated.View style={[s.skelLine, { width: '90%', backgroundColor: skeleton, opacity: pulse }]} />
        <Animated.View style={[s.skelLine, { width: '60%', backgroundColor: skeleton, opacity: pulse }]} />
        <Animated.View style={[s.skelPrice, { backgroundColor: skeleton, opacity: pulse }]} />
      </View>
    </View>
  );
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ExploreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const C = useTheme();
  const user = useAuthStore((st) => st.user);

  const [query, setQuery] = useState('');
  const [recents, setRecents] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [sellers, setSellers] = useState<FeaturedSeller[]>([]);
  const [recommended, setRecommended] = useState<CatalogProduct[]>([]);
  const [recommendedPersonalized, setRecommendedPersonalized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const refreshAll = useCallback(async () => {
    const [recentList, cats, products, recs] = await Promise.all([
      loadRecent(),
      fetchCatalogCategories().catch(() => []),
      fetchCatalogProducts().catch(() => []),
      user
        ? fetchRecommendedProducts(10).catch(() => ({ items: [], source: 'global' as const, isPersonalized: false }))
        : Promise.resolve({ items: [], source: 'global' as const, isPersonalized: false }),
    ]);
    setRecents(recentList);
    setCategories(cats);
    setSellers(deriveFeaturedSellers(products));
    setRecommended(recs.items);
    setRecommendedPersonalized(recs.isPersonalized);
  }, [user]);

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

  const goToHomeWithQuery = async (term: string) => {
    const trimmed = term.trim();
    if (trimmed.length === 0) return;
    const next = [trimmed, ...recents.filter((r) => r.toLowerCase() !== trimmed.toLowerCase())].slice(0, RECENT_MAX);
    setRecents(next);
    void saveRecent(next);
    router.push({ pathname: '/(tabs)', params: { q: trimmed } });
  };

  const goToHomeWithCategory = (code: string) => {
    router.push({ pathname: '/(tabs)', params: { category: code } });
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

  const translatedCategories = useMemo(
    () => categories.map((code) => ({ code, label: CATEGORY_TRANSLATIONS[code] ?? code, icon: CATEGORY_ICONS[code] ?? 'category' })),
    [categories]
  );

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

        {/* Search bar — submit lleva a Home con el query aplicado */}
        <View style={[s.searchWrap, { backgroundColor: C.glass, borderColor: C.glassBorder }]}>
          <MaterialIcons name="search" size={20} color={C.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="¿Qué estás buscando?"
            placeholderTextColor={C.textMuted}
            style={[s.searchInput, { color: C.textPrimary }]}
            selectionColor={C.accent}
            returnKeyType="search"
            onSubmitEditing={() => {
              const term = query.trim();
              if (term.length > 0) {
                setQuery('');
                void goToHomeWithQuery(term);
              }
            }}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <MaterialIcons name="close" size={18} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator color={C.accent} size="large" />
          </View>
        ) : (
          <>
            {/* Recientes */}
            {recents.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionHeader}>
                  <Text style={[s.sectionTitle, { color: C.textPrimary }]}>Búsquedas recientes</Text>
                  <TouchableOpacity onPress={clearRecents} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Text style={[s.sectionAction, { color: C.textSecondary }]}>Limpiar</Text>
                  </TouchableOpacity>
                </View>
                <View style={s.chipsWrap}>
                  {recents.map((term) => (
                    <View
                      key={term}
                      style={[s.recentChip, { backgroundColor: C.glass, borderColor: C.glassBorder }]}>
                      <TouchableOpacity
                        onPress={() => goToHomeWithQuery(term)}
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
            )}

            {/* Recomendaciones — siempre visible. Si no hay recs reales,
                mostramos un placeholder "Próximamente" en vez de un skeleton
                (que se confundiría con loading). */}
            <View style={s.section}>
              <Text style={[s.sectionTitle, { color: C.textPrimary, marginBottom: 14 }]}>
                Recomendado para vos
              </Text>
              {user && recommendedPersonalized && recommended.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.recRow}>
                  {recommended.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => router.push(`/product/${p.id}`)}
                      style={[
                        s.recCard,
                        { backgroundColor: C.glass, borderColor: C.glassBorder, shadowColor: C.shadowAccent },
                      ]}
                      accessibilityRole="button">
                      <Image source={{ uri: p.imageUrl }} style={s.recImage} contentFit="cover" />
                      <View style={s.recBody}>
                        <Text numberOfLines={2} style={[s.recTitle, { color: C.textPrimary }]}>
                          {p.title}
                        </Text>
                        <Text style={[s.recPrice, { color: C.accent }]}>{formatPrice(p.price)}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <View style={s.recSkeletonWrap}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.recRow}>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <SkeletonCard
                        key={i}
                        pulse={pulse}
                        glass={C.glass}
                        glassBorder={C.glassBorder}
                        skeleton={C.glassBorder}
                      />
                    ))}
                    <TouchableOpacity
                      onPress={() => router.push('/(tabs)')}
                      style={[
                        s.recMoreCard,
                        { backgroundColor: C.accentGlow, borderColor: C.accent, shadowColor: C.accent },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Ver más productos">
                      <View style={[s.recMoreIconWrap, { backgroundColor: C.accent }]}>
                        <MaterialIcons name="arrow-forward" size={22} color="#0B0B0F" />
                      </View>
                      <Text style={[s.recMoreText, { color: C.accent }]}>Ver más</Text>
                      <Text style={[s.recMoreHint, { color: C.textSecondary }]}>
                        Próximamente personalizado
                      </Text>
                    </TouchableOpacity>
                  </ScrollView>

                  {/* Overlay gris con badge "Próximamente". pointerEvents="none" para
                      no bloquear el scroll del carrusel ni el tap en "Ver más". */}
                  <View pointerEvents="none" style={s.recOverlay}>
                    <View style={[s.recOverlayBadge, { backgroundColor: C.accent, shadowColor: C.accent }]}>
                      <MaterialIcons name="schedule" size={14} color="#0B0B0F" />
                      <Text style={s.recOverlayBadgeText}>Próximamente</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>


            {/* Categorías */}
            {translatedCategories.length > 0 && (
              <View style={s.section}>
                <Text style={[s.sectionTitle, { color: C.textPrimary, marginBottom: 14 }]}>
                  Explorar por categoría
                </Text>
                <View style={s.catGrid}>
                  {translatedCategories.map((cat) => (
                    <TouchableOpacity
                      key={cat.code}
                      onPress={() => goToHomeWithCategory(cat.code)}
                      style={[
                        s.catTile,
                        { backgroundColor: C.glass, borderColor: C.glassBorder, shadowColor: C.shadowDark },
                      ]}
                      accessibilityRole="button">
                      <View style={[s.catIconWrap, { backgroundColor: C.accentGlow }]}>
                        <MaterialIcons
                          name={cat.icon as React.ComponentProps<typeof MaterialIcons>['name']}
                          size={28}
                          color={C.accent}
                        />
                      </View>
                      <Text style={[s.catLabel, { color: C.textPrimary }]} numberOfLines={1}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Vendedores destacados */}
            {sellers.length > 0 && (
              <View style={s.section}>
                <Text style={[s.sectionTitle, { color: C.textPrimary, marginBottom: 14 }]}>
                  Vendedores destacados
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.sellersRow}>
                  {sellers.map((seller) => (
                    <TouchableOpacity
                      key={seller.email}
                      onPress={() => router.push(`/seller/${encodeURIComponent(seller.email)}`)}
                      style={[
                        s.sellerCard,
                        { backgroundColor: C.glass, borderColor: C.glassBorder, shadowColor: C.shadowDark },
                      ]}
                      accessibilityRole="button">
                      <View style={[s.sellerAvatarWrap, { borderColor: C.accent }]}>
                        {seller.photo ? (
                          <Image source={{ uri: seller.photo }} style={s.sellerAvatar} contentFit="cover" />
                        ) : (
                          <View style={[s.sellerAvatarFallback, { backgroundColor: C.accentGlow }]}>
                            <Text style={[s.sellerAvatarInitial, { color: C.accent }]}>
                              {seller.name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={[s.sellerName, { color: C.textPrimary }]} numberOfLines={1}>
                        {seller.name}
                      </Text>
                      <Text style={[s.sellerMeta, { color: C.textSecondary }]} numberOfLines={1}>
                        {seller.productCount} {seller.productCount === 1 ? 'producto' : 'productos'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {recents.length === 0 && translatedCategories.length === 0 && sellers.length === 0 && (
              <View style={s.emptyWrap}>
                <MaterialIcons name="explore" size={40} color={C.textMuted} />
                <Text style={[s.emptyText, { color: C.textSecondary }]}>
                  Todavía no hay nada para explorar. Buscá algo para empezar.
                </Text>
              </View>
            )}
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
    paddingTop: 20,
  },

  header: {
    marginBottom: 18,
  },
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

  searchWrap: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    marginBottom: 24,
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

  section: { marginBottom: 28 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sectionAction: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Recientes
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
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
  recentChipMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  recentChipText: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },

  // Categorías
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  catTile: {
    width: '47.5%',
    aspectRatio: 1.6,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    justifyContent: 'space-between',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 4,
  },
  catIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catLabel: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  // Recomendaciones
  recRow: {
    gap: 12,
    paddingRight: 4,
    paddingBottom: 8,
  },
  recCard: {
    width: 160,
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 5,
  },
  recImage: {
    width: '100%',
    height: 120,
  },
  recBody: {
    padding: 12,
    gap: 4,
  },
  recTitle: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    letterSpacing: -0.1,
    height: 36,
  },
  recPrice: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  // Wrapper para overlay sobre el carrusel skeleton
  recSkeletonWrap: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
  },
  recOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,14,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recOverlayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  recOverlayBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#0B0B0F',
  },
  // Skeleton lines dentro de la card
  skelLine: {
    height: 10,
    borderRadius: 5,
    marginBottom: 6,
  },
  skelPrice: {
    height: 14,
    width: '40%',
    borderRadius: 6,
    marginTop: 4,
  },
  // Tile "Ver más" al final del carrusel
  recMoreCard: {
    width: 130,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 5,
  },
  recMoreIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recMoreText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  recMoreHint: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },

  // Vendedores
  sellersRow: {
    gap: 12,
    paddingRight: 4,
    paddingBottom: 8,
  },
  sellerCard: {
    width: 130,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 3,
  },
  sellerAvatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    overflow: 'hidden',
  },
  sellerAvatar: { width: '100%', height: '100%' },
  sellerAvatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerAvatarInitial: {
    fontSize: 24,
    fontWeight: '800',
  },
  sellerName: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  sellerMeta: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },

  loadingWrap: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyWrap: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
