import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    NativeScrollEvent,
    NativeSyntheticEvent,
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

function ProductDetailSkeleton({ bg, base }: { bg: string; base: string }) {
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

// ─── Image Gallery ────────────────────────────────────────────────────────────

function ImageGallery({
  images,
  topInset,
  bg,
  onBack,
}: {
  images: string[];
  topInset: number;
  bg: string;
  onBack: () => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    setActiveIndex(index);
  };

  return (
    <View style={s.heroWrap}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={{ width: SCREEN_W, height: HERO_H }}>
        {images.map((uri, i) => (
          <Image
            key={i}
            source={{ uri }}
            style={{ width: SCREEN_W, height: HERO_H }}
            contentFit="cover"
          />
        ))}
      </ScrollView>

      {/* Gradient mask */}
      <LinearGradient
        colors={['transparent', 'transparent', bg]}
        locations={[0, 0.55, 1]}
        style={s.heroGradient}
        pointerEvents="none"
      />

      {/* Floating glass buttons */}
      <View style={[s.heroOverlay, { top: topInset + 8 }]}>
        <TouchableOpacity
          onPress={onBack}
          style={[s.glassBtn, { width: 44, height: 44, borderRadius: 22 }]}
          accessibilityRole="button">
          <MaterialIcons name="arrow-back" size={20} color="#F0F2F5" />
        </TouchableOpacity>
        <View style={s.heroOverlayRight}>
          <TouchableOpacity
            style={[s.glassBtn, { width: 44, height: 44, borderRadius: 22 }]}
            onPress={() => {}}
            accessibilityRole="button">
            <MaterialIcons name="share" size={20} color="#F0F2F5" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.glassBtn, { width: 44, height: 44, borderRadius: 22 }]}
            onPress={() => {}}
            accessibilityRole="button">
            <MaterialIcons name="favorite-border" size={20} color="#F0F2F5" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Page dots — only when multiple images */}
      {images.length > 1 && (
        <View style={s.dotRow}>
          {images.map((_, i) => (
            <View
              key={i}
              style={[
                s.dot,
                i === activeIndex ? s.dotActive : s.dotInactive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
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
  const [networkError, setNetworkError] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setNetworkError(false);

      try {
        const fromApi = await fetchCatalogProductById(productId);
        if (mounted) setProduct(fromApi);
      } catch {
        if (mounted) setNetworkError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (!productId) {
      setLoading(false);
      return;
    }

    load();

    return () => {
      mounted = false;
    };
  }, [productId]);

  if (loading) {
    return <ProductDetailSkeleton bg={C.bg} base={C.skeletonBase} />;
  }

  // Network / unknown error
  if (networkError) {
    return (
      <View style={[s.errorRoot, { backgroundColor: C.bg, paddingTop: insets.top }]}>
        <MaterialIcons name="wifi-off" size={48} color={C.textMuted} />
        <Text style={[s.errorTitle, { color: C.textPrimary }]}>Sin conexión</Text>
        <Text style={[s.errorText, { color: C.textSecondary }]}>
          No pudimos cargar el producto. Verificá tu conexión e intentá de nuevo.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[s.errorBtn, { backgroundColor: C.glass, borderColor: C.glassBorder }]}
          accessibilityRole="button">
          <Text style={[s.errorBtnText, { color: C.accent }]}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Product not found / disabled — CA-F4
  if (!product) {
    return (
      <View style={[s.errorRoot, { backgroundColor: C.bg, paddingTop: insets.top }]}>
        <MaterialIcons name="inventory-2" size={56} color={C.textMuted} />
        <Text style={[s.errorTitle, { color: C.textPrimary }]}>Producto no disponible</Text>
        <Text style={[s.errorText, { color: C.textSecondary }]}>
          Este producto fue deshabilitado o ya no existe en el catálogo.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[s.errorBtn, { backgroundColor: C.accentGlow, borderColor: C.accent }]}
          accessibilityRole="button">
          <MaterialIcons name="arrow-back" size={16} color={C.accent} />
          <Text style={[s.errorBtnText, { color: C.accent }]}>Volver al catálogo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const outOfStock = product.stock === 0;
  const images = product.images?.length > 0 ? product.images : [product.imageUrl].filter(Boolean);

  return (
    <View style={[s.root, { backgroundColor: C.bg }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}>

        {/* ── Gallery — CA-F2 ── */}
        <ImageGallery
          images={images}
          topInset={insets.top}
          bg={C.bg}
          onBack={() => router.back()}
        />

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

            {/* Stock label / badge — CA-F3 */}
            {outOfStock ? (
              <View style={[s.outOfStockBadge, { backgroundColor: C.redBg, borderColor: C.red }]}>
                <Text style={[s.outOfStockText, { color: C.red }]}>Sin stock</Text>
              </View>
            ) : (
              <Text style={[s.stockLabel, { color: C.textMuted }]}>Stock: {product.stock}</Text>
            )}
          </View>

          <Text style={[s.price, { color: C.textPrimary }]}>{formatPrice(product.price)}</Text>
        </View>

        {/* ── Description card ── */}
        <View style={s.descSection}>
          <View style={[s.descCard, { backgroundColor: C.glass, borderColor: C.glassBorder }]}>
            <Text style={[s.descTitle, { color: C.textPrimary }]}>Descripción</Text>
            <Text style={[s.descText, { color: C.textSecondary }]}>
              {product.description ?? 'Este producto no tiene descripción cargada por el vendedor.'}
            </Text>
            <LinearGradient
              colors={['rgba(255,255,255,0.10)', 'transparent', 'transparent']}
              locations={[0, 0.2, 1]}
              style={s.descGlassEdge}
              pointerEvents="none"
            />
          </View>
        </View>

      </ScrollView>

      {/* ── Sticky Action Bar — CA-F3 disabled when out of stock ── */}
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
            style={[
              s.actionBtn,
              { backgroundColor: outOfStock ? C.glass : C.accent, shadowColor: outOfStock ? 'transparent' : C.accent },
              (outOfStock || adding) && s.actionBtnDisabled,
            ]}
            onPress={async () => {
              if (!product || adding || outOfStock) return;
              setAdding(true);
              try {
                await addItem(product, 1);
                Alert.alert('Carrito', 'Producto agregado al carrito.');
              } finally {
                setAdding(false);
              }
            }}
            disabled={outOfStock || adding}
            accessibilityRole="button">
            {outOfStock ? (
              <>
                <MaterialIcons name="remove-shopping-cart" size={18} color={C.textMuted} />
                <Text style={[s.actionBtnText, { color: C.textMuted }]}>Sin stock</Text>
              </>
            ) : (
              <>
                <MaterialIcons name="add-shopping-cart" size={18} color="#050508" />
                <Text style={s.actionBtnText}>{adding ? 'Agregando...' : 'Agregar'}</Text>
              </>
            )}
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
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  errorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 4,
  },
  errorBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // ── Hero / Gallery ──
  heroWrap: {
    position: 'relative',
    height: HERO_H,
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

  // ── Dots ──
  dotRow: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 20,
    backgroundColor: '#FFFFFF',
  },
  dotInactive: {
    width: 6,
    backgroundColor: 'rgba(255,255,255,0.40)',
  },

  // ── Glass floating button ──
  glassBtn: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
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
  outOfStockBadge: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  outOfStockText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  actionBtnDisabled: {
    opacity: 0.6,
  },
  actionBtnText: {
    color: '#050508',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
