import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
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
} from '@/services/catalog';
import { useCartStore } from '@/store/cart';

const { width: SCREEN_W } = Dimensions.get('window');
const HERO_H = SCREEN_W * 1.1;

function formatPrice(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

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
    <View style={[s.root, { backgroundColor: bg }]}>
      <SkeletonBox width="100%" height={HERO_H} borderRadius={0} color={base} />
      <View style={[s.skeletonBody, { paddingTop: 20 }]}>
        <SkeletonBox width={100} height={28} borderRadius={14} color={base} />
        <SkeletonBox width="90%" height={30} borderRadius={8} color={base} />
        <SkeletonBox width={140} height={16} color={base} />
        <SkeletonBox width={180} height={38} borderRadius={8} color={base} />
        <SkeletonBox width="100%" height={120} borderRadius={16} color={base} />
      </View>
    </View>
  );
}

// ─── Floating Glass Button ────────────────────────────────────────────────────

function GlassButton({
  icon,
  onPress,
  size = 44,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  onPress: () => void;
  size?: number;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[s.glassBtn, { width: size, height: size, borderRadius: size / 2 }]}
      accessibilityRole="button">
      <MaterialIcons name={icon} size={20} color="#F0F2F5" />
    </TouchableOpacity>
  );
}

// ─── Related Product Row ──────────────────────────────────────────────────────

function RelatedRow({
  item,
  onPress,
  glass,
  glassBorder,
  textPrimary,
  textSecondary,
  accent,
}: {
  item: CatalogProduct;
  onPress: () => void;
  glass: string;
  glassBorder: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
}) {
  return (
    <TouchableOpacity
      style={[s.relatedRow, { backgroundColor: glass, borderColor: glassBorder }]}
      onPress={onPress}
      accessibilityRole="button">
      <Image source={{ uri: item.imageUrl }} style={s.relatedImage} contentFit="cover" />
      <View style={s.relatedBody}>
        <Text style={[s.relatedTitle, { color: textPrimary }]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[s.relatedPrice, { color: textSecondary }]}>{formatPrice(item.price)}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={20} color={accent} />
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

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
        } else if (mounted) {
          setError('No encontramos ese producto o ya no esta disponible.');
        }
      } catch {
        if (mounted) setError('No pudimos cargar el detalle del producto.');
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


  if (loading) {
    return <ProductDetailSkeleton topInset={insets.top} bg={C.bg} base={C.skeletonBase} />;
  }

  if (error || !product) {
    return (
      <View style={[s.errorRoot, { backgroundColor: C.bg, paddingTop: insets.top }]}>
        <MaterialIcons name="error-outline" size={48} color={C.textMuted} />
        <Text style={[s.errorText, { color: C.red }]}>{error ?? 'Producto no disponible.'}</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[s.errorBtn, { backgroundColor: C.glass, borderColor: C.glassBorder }]}
          accessibilityRole="button">
          <Text style={[s.errorBtnText, { color: C.accent }]}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: C.bg }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}>

        {/* ── Hero Image — Full Bleed ── */}
        <View style={s.heroWrap}>
          <Image source={{ uri: product.imageUrl }} style={s.heroImage} contentFit="cover" />

          {/* Gradient mask — fuses image into background */}
          <LinearGradient
            colors={['transparent', 'transparent', C.bg]}
            locations={[0, 0.55, 1]}
            style={s.heroGradient}
            pointerEvents="none"
          />

          {/* Floating glass buttons over image */}
          <View style={[s.heroOverlay, { top: insets.top + 8 }]}>
            <GlassButton icon="arrow-back" onPress={() => router.back()} />
            <View style={s.heroOverlayRight}>
              <GlassButton icon="share" onPress={() => {}} />
              <GlassButton icon="favorite-border" onPress={() => {}} />
            </View>
          </View>
        </View>

        {/* ── Product Info ── */}
        <View style={s.infoSection}>
          {/* Category pill */}
          <View style={[s.categoryPill, { backgroundColor: C.accentGlow, borderColor: C.accent }]}>
            <Text style={[s.categoryPillText, { color: C.accent }]}>{product.category}</Text>
          </View>

          <Text style={[s.productTitle, { color: C.textPrimary }]}>{product.title}</Text>

          <View style={s.sellerRow}>
            <View style={[s.sellerAvatar, { backgroundColor: C.glass, borderColor: C.glassBorder }]}>
              <MaterialIcons name="storefront" size={14} color={C.accent} />
            </View>
            <Text style={[s.sellerName, { color: C.textSecondary }]}>{product.seller}</Text>
            <View style={s.sellerDot} />
            <Text style={[s.stockLabel, { color: C.textMuted }]}>Stock: {product.stock}</Text>
          </View>

          <Text style={[s.price, { color: C.textPrimary }]}>{formatPrice(product.price)}</Text>
        </View>

        {/* ── Description card — glass ── */}
        <View style={s.descSection}>
          <View style={[s.descCard, { backgroundColor: C.glass, borderColor: C.glassBorder }]}>
            <Text style={[s.descTitle, { color: C.textPrimary }]}>Descripción</Text>
            <Text style={[s.descText, { color: C.textSecondary }]}>
              {product.description ?? 'Este producto no tiene descripcion cargada por el vendedor.'}
            </Text>
            {/* Glass edge highlight */}
            <LinearGradient
              colors={['rgba(255,255,255,0.10)', 'transparent', 'transparent']}
              locations={[0, 0.2, 1]}
              style={s.descGlassEdge}
              pointerEvents="none"
            />
          </View>
        </View>

      </ScrollView>

      {/* ── Sticky Action Bar — Liquid Glass ── */}
      <View style={[s.actionBar, { paddingBottom: insets.bottom + 8 }]}>
        <LinearGradient
          colors={['transparent', C.bg]}
          locations={[0, 0.35]}
          style={s.actionBarGradient}
          pointerEvents="none"
        />
        <View style={[s.actionBarInner, { backgroundColor: C.glass, borderColor: C.glassBorder }]}>
          <View style={s.actionBarLeft}>
            <Text style={[s.actionBarLabel, { color: C.textSecondary }]}>Precio</Text>
            <Text style={[s.actionBarPrice, { color: C.textPrimary }]}>{formatPrice(product.price)}</Text>
          </View>
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: C.accent, shadowColor: C.accent }]}
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
            <MaterialIcons name="add-shopping-cart" size={18} color="#050508" />
            <Text style={s.actionBtnText}>{adding ? 'Agregando...' : 'Agregar'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },

  // ── Skeleton ──
  skeletonBody: {
    paddingHorizontal: 20,
    gap: 14,
  },

  // ── Error ──
  errorRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  errorBtn: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  errorBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // ── Hero ──
  heroWrap: {
    position: 'relative',
    height: HERO_H,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: HERO_H * 0.55,
  },
  heroOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroOverlayRight: {
    flexDirection: 'row',
    gap: 10,
  },

  // ── Glass floating button ──
  glassBtn: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    // Glass shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  // ── Info ──
  infoSection: {
    paddingHorizontal: 20,
    marginTop: -40,
    gap: 6,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 4,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  productTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  sellerAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerName: {
    fontSize: 13,
    fontWeight: '500',
  },
  sellerDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  stockLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  price: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 8,
  },

  // ── Description ──
  descSection: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  descCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    overflow: 'hidden',
  },
  descTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  descText: {
    fontSize: 14,
    lineHeight: 22,
  },
  descGlassEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 40,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },

  // ── Related ──
  relatedSection: {
    paddingHorizontal: 20,
    marginTop: 24,
    gap: 10,
  },
  relatedSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  relatedRow: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  relatedImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  relatedBody: {
    flex: 1,
  },
  relatedTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 3,
    letterSpacing: -0.1,
  },
  relatedPrice: {
    fontSize: 13,
    fontWeight: '500',
  },

  // ── Sticky Action Bar ──
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  actionBarGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -40,
    height: 40,
  },
  actionBarInner: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 20,
    paddingRight: 6,
    paddingVertical: 6,
    // Glass shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  actionBarLeft: {
    gap: 2,
  },
  actionBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  actionBarPrice: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    // Accent glow shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  actionBtnText: {
    color: '#050508',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
