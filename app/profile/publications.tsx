import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { fetchProductsBySellerEmail, toggleProductStatus, type CatalogProduct } from '@/services/catalog';
import { useAuthStore } from '@/store/auth';

function formatPrice(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

function PublicationCard({
  product,
  onEdit,
  onOpen,
  onToggle,
  toggling,
  C,
}: {
  product: CatalogProduct;
  onEdit: () => void;
  onOpen: () => void;
  onToggle: () => void;
  toggling: boolean;
  C: ReturnType<typeof useTheme>;
}) {
  const isDisabled = product.status === 'disabled';
  const outOfStock = product.stock <= 0 && !isDisabled;

  return (
    <TouchableOpacity
      style={[
        s.card,
        { backgroundColor: C.glass, borderColor: C.glassBorder },
        isDisabled && { opacity: 0.6 },
      ]}
      onPress={onOpen}
      accessibilityRole="button">
      <Image source={{ uri: product.imageUrl }} style={s.thumb} contentFit="cover" />

      <View style={s.body}>
        <View style={s.topRow}>
          <View style={[s.badge, { backgroundColor: C.accentGlow, borderColor: C.accent }]}>
            <Text style={[s.badgeText, { color: C.accent }]}>{product.category}</Text>
          </View>
          {isDisabled ? (
            <View style={[s.statusBadge, { backgroundColor: C.redBg, borderColor: C.red }]}>
              <Text style={[s.statusBadgeText, { color: C.red }]}>Deshabilitada</Text>
            </View>
          ) : (
            <Text style={[s.status, { color: outOfStock ? C.red : C.textMuted }]}>
              {outOfStock ? 'Sin stock' : `Stock: ${product.stock}`}
            </Text>
          )}
        </View>

        <Text style={[s.title, { color: C.textPrimary }]} numberOfLines={2}>
          {product.title}
        </Text>
        <Text style={[s.price, { color: C.textPrimary }]}>{formatPrice(product.price)}</Text>

        <View style={s.actions}>
          <View style={s.actionRow}>
            <TouchableOpacity
              style={[s.editBtn, { backgroundColor: C.accent, shadowColor: C.accent, flex: 1 }]}
              onPress={onEdit}
              accessibilityRole="button">
              <MaterialIcons name="edit" size={16} color="#050508" />
              <Text style={s.editBtnText}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                s.toggleBtn,
                isDisabled
                  ? { backgroundColor: C.accentGlow, borderColor: C.accent }
                  : { backgroundColor: C.redBg, borderColor: C.red },
              ]}
              onPress={onToggle}
              disabled={toggling}
              accessibilityRole="button">
              {toggling ? (
                <ActivityIndicator size={16} color={isDisabled ? C.accent : C.red} />
              ) : (
                <>
                  <MaterialIcons
                    name={isDisabled ? 'visibility' : 'visibility-off'}
                    size={16}
                    color={isDisabled ? C.accent : C.red}
                  />
                  <Text style={[s.toggleBtnText, { color: isDisabled ? C.accent : C.red }]}>
                    {isDisabled ? 'Habilitar' : 'Deshabilitar'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function PublicationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const C = useTheme();
  const user = useAuthStore((state) => state.user);

  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadProducts = async () => {
    if (!user?.email) {
      setProducts([]);
      setError('No encontramos tu cuenta. Volvé a iniciar sesión.');
      setLoading(false);
      return;
    }

    try {
      setError(null);
        const list = await fetchProductsBySellerEmail(user.email);
      setProducts(list);
    } catch {
      setError('No pudimos cargar tus publicaciones. Intentá de nuevo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [user?.email]);

  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [user?.email]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
  };

  const handleToggle = async (product: CatalogProduct) => {
    const isDisabled = product.status === 'disabled';
    const action = isDisabled ? 'habilitar' : 'deshabilitar';

    Alert.alert(
      `${isDisabled ? 'Habilitar' : 'Deshabilitar'} publicación`,
      `¿Querés ${action} "${product.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: isDisabled ? 'Habilitar' : 'Deshabilitar',
          style: isDisabled ? 'default' : 'destructive',
          onPress: async () => {
            setTogglingId(product.id);
            try {
              await toggleProductStatus(product.id);
              await loadProducts();
            } catch {
              Alert.alert('Error', `No pudimos ${action} la publicación. Intentá de nuevo.`);
            } finally {
              setTogglingId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[s.root, { backgroundColor: C.bg, paddingTop: insets.top }] }>
      <View style={[s.header, { borderBottomColor: C.glassBorder }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} accessibilityRole="button">
          <View style={[s.backCircle, { backgroundColor: C.glass, borderColor: C.glassBorder }]}>
            <MaterialIcons name="arrow-back" size={20} color={C.textSecondary} />
          </View>
        </TouchableOpacity>
        <Text style={[s.titleScreen, { color: C.textPrimary }]}>Mis publicaciones</Text>
        <TouchableOpacity
          onPress={() => router.push('/seller/publish')}
          style={[s.newBtn, { backgroundColor: C.accent }]}
          accessibilityRole="button">
          <MaterialIcons name="add" size={18} color="#050508" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
          showsVerticalScrollIndicator={false}>
          {error ? (
            <View style={[s.emptyCard, { backgroundColor: C.glass, borderColor: C.glassBorder }] }>
              <MaterialIcons name="error-outline" size={44} color={C.textMuted} />
              <Text style={[s.emptyTitle, { color: C.textPrimary }]}>{error}</Text>
              <TouchableOpacity
                onPress={loadProducts}
                style={[s.retryBtn, { backgroundColor: C.accentGlow, borderColor: C.accent }]}
                accessibilityRole="button">
                <Text style={[s.retryText, { color: C.accent }]}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : products.length === 0 ? (
            <View style={[s.emptyCard, { backgroundColor: C.glass, borderColor: C.glassBorder }] }>
              <MaterialIcons name="inventory-2" size={44} color={C.textMuted} />
              <Text style={[s.emptyTitle, { color: C.textPrimary }]}>Todavía no tenés publicaciones</Text>
              <Text style={[s.emptyText, { color: C.textSecondary }]}>Creá tu primer producto para empezar a vender.</Text>
              <TouchableOpacity
                onPress={() => router.push('/seller/publish')}
                style={[s.publishBtn, { backgroundColor: C.accent }]}
                accessibilityRole="button">
                <Text style={s.publishBtnText}>Publicar producto</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.list}>
              {products.map((product) => (
                <PublicationCard
                  key={product.id}
                  product={product}
                  C={C}
                  onEdit={() => router.push({ pathname: '/seller/publish', params: { id: product.id } })}
                  onOpen={() => router.push({ pathname: '/seller/publish', params: { id: product.id } })}
                  onToggle={() => handleToggle(product)}
                  toggling={togglingId === product.id}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { width: 44 },
  backCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleScreen: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  newBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    gap: 14,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    gap: 14,
  },
  card: {
    borderWidth: 1,
    borderRadius: 22,
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    height: 180,
  },
  body: {
    padding: 16,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  status: {
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  price: {
    fontSize: 18,
    fontWeight: '800',
  },
  actions: {
    marginTop: 2,
    gap: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    paddingVertical: 12,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  editBtnText: {
    color: '#050508',
    fontSize: 14,
    fontWeight: '800',
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    marginTop: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  publishBtn: {
    marginTop: 6,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  publishBtnText: {
    color: '#050508',
    fontSize: 14,
    fontWeight: '800',
  },
  retryBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
