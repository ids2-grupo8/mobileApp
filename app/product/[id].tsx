import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import {
    type CatalogProduct,
    fetchCatalogProductById,
    findFallbackCatalogProductById,
    getFallbackCatalogProducts,
} from '@/services/catalog';
import { useCartStore } from '@/store/cart';

function formatPrice(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

function SkeletonBox({
  width,
  height,
  borderRadius = 10,
  color,
}: {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  color: string;
}) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.8, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{ width, height, borderRadius, backgroundColor: color, opacity }}
    />
  );
}

function ProductDetailSkeleton({ topInset, base, bg }: { topInset: number; base: string; bg: string }) {
  return (
    <View style={[s.root, { backgroundColor: bg, paddingTop: topInset }]}> 
      <View style={s.skeletonContent}>
        <SkeletonBox width={72} height={16} color={base} />
        <SkeletonBox width="100%" height={290} borderRadius={20} color={base} />
        <SkeletonBox width={90} height={28} borderRadius={14} color={base} />
        <SkeletonBox width="92%" height={34} borderRadius={8} color={base} />
        <SkeletonBox width={120} height={18} color={base} />
        <SkeletonBox width={160} height={40} borderRadius={8} color={base} />
        <SkeletonBox width="100%" height={120} borderRadius={16} color={base} />
        <SkeletonBox width="100%" height={52} borderRadius={14} color={base} />
      </View>
    </View>
  );
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const productId = id ?? '';

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const C = useTheme();
  const addItem = useCartStore((s) => s.addItem);

  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const fromApi = await fetchCatalogProductById(productId);
        if (fromApi) {
          if (mounted) setProduct(fromApi);
          return;
        }

        const fallback = findFallbackCatalogProductById(productId);
        if (fallback && mounted) {
          setProduct(fallback);
          return;
        }

        if (mounted) {
          setError('No encontramos ese producto o ya no esta disponible.');
        }
      } catch {
        const fallback = findFallbackCatalogProductById(productId);
        if (fallback && mounted) {
          setProduct(fallback);
        } else if (mounted) {
          setError('No pudimos cargar el detalle del producto.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (!productId) {
      setError('Producto invalido.');
      setLoading(false);
      return;
    }

    load();

    return () => {
      mounted = false;
    };
  }, [productId]);

  const related = useMemo(() => {
    if (!product) return [];
    return getFallbackCatalogProducts()
      .filter((p) => p.category === product.category && p.id !== product.id)
      .slice(0, 4);
  }, [product]);

  if (loading) {
    return <ProductDetailSkeleton topInset={insets.top} bg={C.bg} base={C.skeletonBase} />;
  }

  if (error || !product) {
    return (
      <View style={[s.loadingRoot, { backgroundColor: C.bg, paddingTop: insets.top }]}> 
        <Text style={[s.errorText, { color: C.red }]}>{error ?? 'Producto no disponible.'}</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[s.backBtn, { borderColor: C.accent }]}
          accessibilityRole="button">
          <Text style={[s.backBtnText, { color: C.accent }]}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: C.bg, paddingTop: insets.top }]}> 
      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 42 }]}
        showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.backRow}
          accessibilityRole="button">
          <MaterialIcons name="arrow-back" size={18} color={C.textSecondary} />
          <Text style={[s.backRowText, { color: C.textSecondary }]}>Volver</Text>
        </TouchableOpacity>

        <Image source={{ uri: product.imageUrl }} style={s.heroImage} contentFit="cover" />

        <View style={s.metaRow}>
          <View style={[s.categoryPill, { backgroundColor: C.accentBg, borderColor: C.accent }]}> 
            <Text style={[s.categoryPillText, { color: C.accentText }]}>{product.category}</Text>
          </View>
          <Text style={[s.stockText, { color: C.textSecondary }]}>Stock: {product.stock}</Text>
        </View>

        <Text style={[s.title, { color: C.textPrimary }]}>{product.title}</Text>
        <Text style={[s.seller, { color: C.textSecondary }]}>Vendido por {product.seller}</Text>
        <Text style={[s.price, { color: C.textPrimary }]}>{formatPrice(product.price)}</Text>

        <View style={[s.descCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[s.sectionTitle, { color: C.textPrimary }]}>Descripcion</Text>
          <Text style={[s.descText, { color: C.textSecondary }]}>
            {product.description ?? 'Este producto no tiene descripcion cargada por el vendedor.'}
          </Text>
        </View>

        <TouchableOpacity
          style={[s.buyBtn, { backgroundColor: C.accent }]}
          onPress={async () => {
            if (!product || adding) return;
            setAdding(true);
            try {
              await addItem(product, 1);
              Alert.alert('Carrito', 'Producto agregado al carrito.');
            } finally {
              setAdding(false);
            }
          }}
          accessibilityRole="button">
          <MaterialIcons name="add-shopping-cart" size={18} color="#0b0b0f" />
          <Text style={s.buyBtnText}>{adding ? 'Agregando...' : 'Agregar al carrito'}</Text>
        </TouchableOpacity>

        {related.length > 0 ? (
          <View style={s.relatedWrap}>
            <Text style={[s.sectionTitle, { color: C.textPrimary }]}>Relacionados</Text>
            {related.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[s.relatedRow, { backgroundColor: C.card, borderColor: C.border }]}
                onPress={() => router.replace(`/product/${item.id}`)}
                accessibilityRole="button">
                <Image source={{ uri: item.imageUrl }} style={s.relatedImage} contentFit="cover" />
                <View style={s.relatedBody}>
                  <Text style={[s.relatedTitle, { color: C.textPrimary }]} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={[s.relatedPrice, { color: C.textSecondary }]}>{formatPrice(item.price)}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={C.accent} />
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  skeletonContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
  },
  loadingRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  loadingText: {
    fontSize: 14,
  },
  errorText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 16,
  },
  backBtn: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  backRowText: {
    fontSize: 14,
    fontWeight: '500',
  },
  heroImage: {
    width: '100%',
    height: 290,
    borderRadius: 20,
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  categoryPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  stockText: {
    fontSize: 12,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    marginBottom: 6,
  },
  seller: {
    fontSize: 13,
    marginBottom: 10,
  },
  price: {
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 14,
  },
  descCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  descText: {
    fontSize: 14,
    lineHeight: 20,
  },
  buyBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  buyBtnText: {
    color: '#0b0b0f',
    fontSize: 15,
    fontWeight: '800',
  },
  relatedWrap: {
    gap: 10,
  },
  relatedRow: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  relatedImage: {
    width: 58,
    height: 58,
    borderRadius: 10,
  },
  relatedBody: {
    flex: 1,
  },
  relatedTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
  },
  relatedPrice: {
    fontSize: 12,
  },
});
