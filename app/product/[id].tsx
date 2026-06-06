import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Linking from 'expo-linking';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    NativeScrollEvent,
    NativeSyntheticEvent,
  Platform,
    ScrollView,
    StyleSheet,
    Text,
  Share,
    TouchableOpacity,
    View,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ProductReputationSection from '@/components/product-reputation-section';
import type { ThemeColors } from '@/constants/colors';
import { useTheme } from '@/hooks/use-theme';
import {
    type CatalogProduct,
  getSellerDisplayName,
    fetchCatalogProductById,
    recordProductDetailView,
} from '@/services/catalog';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';

const { width: SCREEN_W } = Dimensions.get('window');
const HERO_H = SCREEN_W * 1.1;

const CATEGORY_LABELS: Record<string, string> = {
  Electronics: 'Electrónica',
  Clothing: 'Ropa',
  Books: 'Libros',
  Home: 'Hogar',
  Sports: 'Deportes',
};

const ATTRIBUTE_LABELS: Record<string, string> = {
  brand: 'Marca',
  model: 'Modelo',
  warranty_months: 'Garantía (meses)',
  size: 'Talle',
  color: 'Color',
  material: 'Material',
  author: 'Autor',
  publisher: 'Editorial',
  isbn: 'ISBN',
  genre: 'Género',
  language: 'Idioma',
  room_type: 'Ambiente',
  dimensions: 'Dimensiones',
  sport: 'Deporte',
};

const CATEGORY_ATTR_ORDER: Record<string, string[]> = {
  Electronics: ['brand', 'model', 'warranty_months'],
  Clothing: ['size', 'color', 'material'],
  Books: ['author', 'publisher', 'isbn', 'genre', 'language'],
  Home: ['brand', 'material', 'room_type', 'dimensions'],
  Sports: ['brand', 'sport', 'size', 'material'],
};

function formatPrice(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

function getInitials(name?: string) {
  if (!name) return 'V';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, visible, accentGlow, accent, elevated, glassBorder, shadowDark, textPrimary }: {
  message: string; visible: boolean;
  accentGlow: string; accent: string; elevated: string;
  glassBorder: string; shadowDark: string; textPrimary: string;
}) {
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    scale.setValue(0.85);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 260 }),
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  }, [visible, scale, opacity]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[ts.wrap, { opacity, transform: [{ scale }] }]}
      pointerEvents="none">
      <View style={[ts.card, { backgroundColor: elevated, borderColor: glassBorder, shadowColor: shadowDark }]}>
        <View style={[ts.iconWrap, { backgroundColor: accentGlow }]}>
          <MaterialIcons name="check" size={32} color={accent} />
        </View>
        <Text style={[ts.text, { color: textPrimary }]}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const ts = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  card: { borderWidth: 1, paddingHorizontal: 40, paddingVertical: 32, borderRadius: 32, alignItems: 'center', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 30, elevation: 12 },
  iconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  text: { fontWeight: '700', fontSize: 18, letterSpacing: -0.3 },
});

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
  onShare,
}: {
  images: string[];
  topInset: number;
  bg: string;
  onBack: () => void;
  onShare: () => void;
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
            onPress={onShare}
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
  const cartItems = useCartStore((s) => s.items);

  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [networkError, setNetworkError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [qty, setQty] = useState(1);
  const [showToast, setShowToast] = useState(false);
  const authUser = useAuthStore((s) => s.user);
  const viewerEmail = useAuthStore((s) => s.user?.email)?.trim();

  const shareProduct = async () => {
    if (!productId) return;

    const shareUrl = Linking.createURL(`/product/${encodeURIComponent(productId)}`);
    const sharePayload =
      Platform.OS === 'ios'
        ? { url: shareUrl }
        : { message: shareUrl };

    try {
      await Share.share({
        title: product?.title ?? 'Producto',
        ...sharePayload,
      });
    } catch {
      Alert.alert('Compartir', 'No se pudo abrir la opción para compartir.');
    }
  };

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setNetworkError(false);

      try {
        const fromApi = await fetchCatalogProductById(productId);
        if (mounted) setProduct(fromApi);
        if (mounted && fromApi) {
          if (viewerEmail) {
            void recordProductDetailView(productId, viewerEmail).catch(() => {
              /* no UI impact */
            });
          }
        }
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
  }, [productId, viewerEmail]);

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
  const sellerEmailNorm = product.sellerInfo?.email?.trim().toLowerCase();
  const viewerEmailNorm = authUser?.email?.trim().toLowerCase();
  const emailMatch = !!sellerEmailNorm && !!viewerEmailNorm && sellerEmailNorm === viewerEmailNorm;
  const idMatch = !!product.sellerId && !!authUser?.id && product.sellerId === authUser.id;
  const isOwnProduct = emailMatch || idMatch;
  const cannotBuy = outOfStock || isOwnProduct;

  const attrRows: { label: string; value: string }[] = (() => {
    const attrs = product.attributes;
    if (!attrs) return [];
    const order = CATEGORY_ATTR_ORDER[product.category] ?? Object.keys(attrs);
    return order
      .filter((key) => attrs[key] != null && String(attrs[key]).trim() !== '')
      .map((key) => ({ label: ATTRIBUTE_LABELS[key] ?? key, value: String(attrs[key]) }));
  })();

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
          onShare={shareProduct}
        />

        {/* ── Product Info ── */}
        <View style={s.infoSection}>
          {/* Category pill */}
          <View style={[s.categoryPill, { backgroundColor: C.accentGlow, borderColor: C.accent }]}>
            <Text style={[s.categoryPillText, { color: C.accent }]}>{CATEGORY_LABELS[product.category] ?? product.category}</Text>
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

        {/* ── Especificaciones ── */}
        {attrRows.length > 0 && (
          <View style={s.attrsSection}>
            <View style={[s.attrsCard, { backgroundColor: C.glass, borderColor: C.glassBorder }]}>
              <Text style={[s.attrsTitle, { color: C.textPrimary }]}>Especificaciones</Text>
              {attrRows.map(({ label, value }, i) => (
                <View
                  key={label}
                  style={[s.attrRow, i < attrRows.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.glassBorder }]}>
                  <Text style={[s.attrLabel, { color: C.textSecondary }]}>{label}</Text>
                  <Text style={[s.attrValue, { color: C.textPrimary }]}>{value}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={s.sellerSection}>
          <TouchableOpacity
            style={[s.sellerCard, { backgroundColor: C.glass, borderColor: C.glassBorder }]}
            activeOpacity={0.75}
            onPress={() => {
              const sellerEmail = product.sellerInfo?.email;
              if (sellerEmail) router.push(`/seller/${encodeURIComponent(sellerEmail)}`);
            }}
          >
            <View style={s.sellerCardHeader}>
              <Text style={[s.sellerSectionTitle, { color: C.textPrimary }]}>Vendedor</Text>
              {product.sellerInfo?.email ? (
                <MaterialIcons name="chevron-right" size={20} color={C.textMuted} />
              ) : null}
            </View>
            <View style={s.sellerProfileRow}>
              {product.sellerInfo?.photo ? (
                <Image source={{ uri: product.sellerInfo.photo }} style={s.sellerPhoto} contentFit="cover" />
              ) : (
                <View style={[s.sellerPhotoFallback, { backgroundColor: C.accentGlow, borderColor: C.accent }]}>
                    <Text style={[s.sellerPhotoFallbackText, { color: C.accent }]}>{getInitials(getSellerDisplayName(product.sellerInfo))}</Text>
                </View>
              )}

              <View style={s.sellerProfileText}>
                  <Text style={[s.sellerProfileName, { color: C.textPrimary }]}>{getSellerDisplayName(product.sellerInfo) ?? product.seller}</Text>
                {product.sellerInfo?.email ? (
                  <Text style={[s.sellerProfileMeta, { color: C.textSecondary }]}>{product.sellerInfo.email}</Text>
                ) : null}
                {product.sellerInfo?.description ? (
                  <Text style={[s.sellerProfileBio, { color: C.textSecondary }]} numberOfLines={3}>
                    {product.sellerInfo.description}
                  </Text>
                ) : null}
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <ProductReputationSection productId={productId} C={C} />

      </ScrollView>

      {/* ── Sticky Action Bar ── */}
      <View style={[s.actionBar, { paddingBottom: insets.bottom + 8, backgroundColor: C.bg }]}>
        <LinearGradient
          colors={['transparent', C.bg]}
          locations={[0, 1]}
          style={s.actionBarGradient}
          pointerEvents="none"
        />
        <View style={[s.actionBarInner, { backgroundColor: C.elevated, borderColor: C.glassBorder }]}>
          <View style={s.actionBarLeft}>
            <Text style={[s.actionBarLabel, { color: C.textSecondary }]}>Precio</Text>
            <Text
              style={[s.actionBarPrice, { color: C.textPrimary }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}>
              {formatPrice(product.price * qty)}
            </Text>
          </View>

          {!cannotBuy && (
            <View style={[s.qtySelector, { backgroundColor: C.glass, borderColor: C.glassBorder }]}>
              <TouchableOpacity
                onPress={() => setQty((q) => Math.max(1, q - 1))}
                style={s.qtyBtn}
                accessibilityRole="button">
                <MaterialIcons name="remove" size={16} color={C.textPrimary} />
              </TouchableOpacity>
              <Text style={[s.qtyText, { color: C.textPrimary }]}>{qty}</Text>
              <TouchableOpacity
                onPress={() => setQty((q) => Math.min(product.stock, q + 1))}
                style={s.qtyBtn}
                accessibilityRole="button">
                <MaterialIcons name="add" size={16} color={C.textPrimary} />
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={[
              s.actionBtn,
              { backgroundColor: cannotBuy ? C.glass : C.accent },
              (cannotBuy || adding) && s.actionBtnDisabled,
            ]}
            onPress={async () => {
              if (!product || adding || cannotBuy) return;
              if (!authUser?.email) {
                Alert.alert(
                  'Iniciar sesión',
                  'Para agregar productos al carrito necesitás iniciar sesión.',
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

              const qtyToAdd = Math.min(qty, available);

              setAdding(true);
              try {
                await addItem(product, qtyToAdd);
                const err = useCartStore.getState().error;
                if (err) {
                  Alert.alert('No se pudo agregar al carrito', err);
                  useCartStore.setState({ error: null });
                  return;
                }
                setShowToast(true);
                setTimeout(() => {
                  setShowToast(false);
                }, 2000);
              } finally {
                setAdding(false);
              }
            }}
            disabled={cannotBuy || adding}
            accessibilityRole="button">
            {isOwnProduct ? (
              <>
                <MaterialIcons name="storefront" size={18} color={C.textMuted} />
                <Text style={[s.actionBtnText, { color: C.textMuted }]}>Es tu producto</Text>
              </>
            ) : outOfStock ? (
              <>
                <MaterialIcons name="remove-shopping-cart" size={18} color={C.textMuted} />
                <Text style={[s.actionBtnText, { color: C.textMuted }]}>Sin stock</Text>
              </>
            ) : (
              <>
                {adding ? (
                  <ActivityIndicator size="small" color="#050508" style={s.actionBtnSpinner} />
                ) : (
                  <MaterialIcons name="add-shopping-cart" size={18} color="#050508" />
                )}
                <Text style={s.actionBtnText}>Agregar</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Toast
        message="¡Agregado al carrito!"
        visible={showToast}
        accentGlow={C.accentGlow}
        accent={C.accent}
        elevated={C.elevated}
        glassBorder={C.glassBorder}
        shadowDark={C.shadowDark}
        textPrimary={C.textPrimary}
      />
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

  // ── Attributes ──
  attrsSection: {
    paddingHorizontal: 20,
    marginTop: 18,
  },
  attrsCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    gap: 0,
  },
  attrsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  attrRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  attrLabel: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  attrValue: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },

  // ── Seller ──
  sellerSection: {
    paddingHorizontal: 20,
    marginTop: 18,
  },
  sellerCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    gap: 14,
  },
  sellerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sellerSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sellerProfileRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  sellerPhoto: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  sellerPhotoFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerPhotoFallbackText: {
    fontSize: 18,
    fontWeight: '800',
  },
  sellerProfileText: {
    flex: 1,
    gap: 4,
  },
  sellerProfileName: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sellerProfileMeta: {
    fontSize: 13,
  },
  sellerProfileBio: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 2,
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
    gap: 10,
  },
  actionBarLeft: {
    gap: 2,
    flexShrink: 1,
    minWidth: 0,
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
  qtySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  qtyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  qtyText: {
    fontSize: 15,
    fontWeight: '700',
    minWidth: 22,
    textAlign: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  actionBtnDisabled: {
    opacity: 0.6,
  },
  actionBtnSpinner: {
    width: 18,
    height: 18,
  },
  actionBtnText: {
    color: '#050508',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
