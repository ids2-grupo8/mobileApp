import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import SellerReputationSection from '@/components/seller-reputation-section';
import { useTheme } from '@/hooks/use-theme';
import { getPublicUserProfile } from '@/services/user';
import type { ThemeColors } from '@/constants/colors';

const { width: SCREEN_W } = Dimensions.get('window');
const PRODUCT_GAP = 12;
const PRODUCT_W = (SCREEN_W - 40 - PRODUCT_GAP) / 2;

type NormalizedProduct = {
  id: string;
  name: string;
  price: number;
  actual_stock: number;
  image_urls: string[];
  status: string;
};

function normalizeProducts(raw: unknown): NormalizedProduct[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item: Record<string, unknown>) => {
    const d = (item && typeof item === 'object' && 'data' in item && item.data && typeof item.data === 'object')
      ? item.data as Record<string, unknown>
      : item;
    return {
      id: String(d._id ?? d.id ?? ''),
      name: String(d.name ?? d.title ?? ''),
      price: Number(d.price ?? 0),
      actual_stock: Number(d.actual_stock ?? 0),
      image_urls: Array.isArray(d.image_urls) ? d.image_urls as string[] : [],
      status: String(d.status ?? 'available'),
    };
  }).filter((p) => p.id !== '');
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function formatPrice(n: number): string {
  return `$${n.toLocaleString('es-AR')}`;
}

/* ── Skeleton ─────────────────────────────────────────────────────────────── */

function SkeletonBox({
  width,
  height,
  borderRadius = 8,
  style,
  color,
}: {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: object;
  color: string;
}) {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.85, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [opacity]);
  return <Animated.View style={[{ width, height, borderRadius, backgroundColor: color, opacity }, style]} />;
}

function ProfileSkeleton({ topPad, C }: { topPad: number; C: ThemeColors }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingHorizontal: 20, paddingTop: topPad + 60 }}>
      <View style={{ alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <SkeletonBox width={90} height={90} borderRadius={45} color={C.skeletonBase} />
        <SkeletonBox width={160} height={20} borderRadius={10} color={C.skeletonBase} />
        <SkeletonBox width={220} height={14} borderRadius={7} color={C.skeletonBase} />
      </View>
      <SkeletonBox width="100%" height={120} borderRadius={20} style={{ marginBottom: 20 }} color={C.skeletonBase} />
      <SkeletonBox width="100%" height={180} borderRadius={20} color={C.skeletonBase} />
    </View>
  );
}

/* ── Product Card ─────────────────────────────────────────────────────────── */

function ProductCard({ item, C, onPress }: { item: NormalizedProduct; C: ThemeColors; onPress: () => void }) {
  const img = item.image_urls?.[0];
  return (
    <TouchableOpacity
      style={[s.productCard, { backgroundColor: C.glass, borderColor: C.glassBorder }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {img ? (
        <Image source={{ uri: img }} style={s.productImg} contentFit="cover" />
      ) : (
        <View style={[s.productImg, { backgroundColor: C.skeletonBase, alignItems: 'center', justifyContent: 'center' }]}>
          <MaterialIcons name="image" size={28} color={C.textMuted} />
        </View>
      )}
      <View style={s.productInfo}>
        <Text style={[s.productTitle, { color: C.textPrimary }]} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={[s.productPrice, { color: C.accent }]}>{formatPrice(item.price)}</Text>
      </View>
    </TouchableOpacity>
  );
}

/* ── Screen ───────────────────────────────────────────────────────────────── */

export default function SellerPublicProfileScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const C = useTheme();

  type ProfileData = {
    id: string;
    full_name: string;
    created_at: string;
    photo: string | null;
    description: string | null;
    products: NormalizedProduct[];
  };

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reputationSummary, setReputationSummary] = useState<{
    average_score: number | null;
    count: number;
  } | null>(null);

  useEffect(() => {
    if (!email) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setReputationSummary(null);
    getPublicUserProfile(email)
      .then((res) => {
        if (!cancelled) {
          const d = res.data;
          setProfile({
            ...d,
            products: normalizeProducts(d.products),
          });
        }
      })
      .catch(() => {
        if (!cancelled) setError('No se pudo cargar el perfil.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [email]);

  const handleReputationSummary = useCallback(
    (summary: { average_score: number | null; count: number }) => {
      setReputationSummary(summary);
    },
    [],
  );

  if (loading) {
    return (
      <View style={[s.root, { backgroundColor: C.bg }]}>
        <ProfileSkeleton topPad={insets.top} C={C} />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={[s.root, { backgroundColor: C.bg }]}>
        <View style={[s.errorRoot, { paddingTop: insets.top + 60 }]}>
          <MaterialIcons name="person-off" size={48} color={C.textMuted} />
          <Text style={[s.errorTitle, { color: C.textPrimary }]}>Perfil no disponible</Text>
          <Text style={[s.errorText, { color: C.textSecondary }]}>
            {error ?? 'No pudimos encontrar este vendedor.'}
          </Text>
          <TouchableOpacity
            style={[s.errorBtn, { borderColor: C.glassBorder }]}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={18} color={C.accent} />
            <Text style={[s.errorBtnText, { color: C.accent }]}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const initials = getInitials(profile.full_name || 'V');
  const activeProducts = profile.products?.filter((p) => p.status !== 'disabled' && p.actual_stock > 0) ?? [];

  return (
    <View style={[s.root, { backgroundColor: C.bg }]}>
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header with gradient ── */}
        <View style={[s.meshHeader, { paddingTop: insets.top + 16 }]}>
          <LinearGradient
            colors={[C.accentGlow, 'rgba(0,100,200,0.08)', C.bg]}
            locations={[0, 0.5, 1]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <LinearGradient
            colors={['rgba(100,0,255,0.06)', 'transparent', 'rgba(0,229,160,0.04)']}
            locations={[0, 0.4, 1]}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Back button */}
          <TouchableOpacity
            style={[s.backBtn, { backgroundColor: C.glass, borderColor: C.glassBorder }]}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={20} color={C.textPrimary} />
          </TouchableOpacity>

          {/* Avatar + Name */}
          <View style={s.profileCenter}>
            {profile.photo ? (
              <View style={s.avatarOuter}>
                <View style={[s.avatarGlow, { borderColor: C.accent, shadowColor: C.accent }]} />
                <Image source={{ uri: profile.photo }} style={s.avatarImg} contentFit="cover" />
              </View>
            ) : (
              <View style={s.avatarOuter}>
                <View style={[s.avatarGlow, { borderColor: C.accent, shadowColor: C.accent }]} />
                <View style={[s.avatarFallback, { backgroundColor: C.accentGlow }]}>
                  <Text style={[s.avatarInitials, { color: C.accent }]}>{initials}</Text>
                </View>
              </View>
            )}
            <Text style={[s.name, { color: C.textPrimary }]}>{profile.full_name}</Text>
            {profile.description ? (
              <Text style={[s.bio, { color: C.textSecondary }]} numberOfLines={4}>
                {profile.description}
              </Text>
            ) : null}
          </View>
        </View>

        {/* ── Stats ── */}
        <View style={s.content}>
          <View style={[s.statsCard, { backgroundColor: C.glass, borderColor: C.glassBorder, shadowColor: C.shadowDark }]}>
            <View style={s.statItem}>
              <Text style={[s.statValue, { color: C.textPrimary }]}>{activeProducts.length}</Text>
              <Text style={[s.statLabel, { color: C.textMuted }]}>Publicaciones</Text>
            </View>
            <View style={[s.statDivider, { backgroundColor: C.glassBorder }]} />
            <View style={s.statItem}>
              {reputationSummary && reputationSummary.count > 0 && reputationSummary.average_score !== null ? (
                <>
                  <Text style={[s.statValue, { color: C.textPrimary }]}>
                    {reputationSummary.average_score.toFixed(1)}
                  </Text>
                  <Text style={[s.statLabel, { color: C.textMuted }]}>
                    {reputationSummary.count === 1
                      ? '1 reseña'
                      : `${reputationSummary.count} reseñas`}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[s.statValue, { color: C.textPrimary }]}>—</Text>
                  <Text style={[s.statLabel, { color: C.textMuted }]}>Reputación</Text>
                </>
              )}
            </View>
            <LinearGradient
              colors={['rgba(255,255,255,0.08)', 'transparent']}
              locations={[0, 1]}
              style={s.statsGlassEdge}
              pointerEvents="none"
            />
          </View>

          {/* ── Reputación ── */}
          <SellerReputationSection email={email} C={C} onSummary={handleReputationSummary} />

          {/* ── Products ── */}
          <Text style={[s.sectionLabel, { color: C.textMuted }]}>Publicaciones</Text>

          {activeProducts.length === 0 ? (
            <View style={[s.emptyCard, { backgroundColor: C.glass, borderColor: C.glassBorder }]}>
              <MaterialIcons name="storefront" size={32} color={C.textMuted} />
              <Text style={[s.emptyText, { color: C.textSecondary }]}>
                Este vendedor aún no tiene publicaciones activas.
              </Text>
            </View>
          ) : (
            <View style={s.productsGrid}>
              {activeProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  item={p}
                  C={C}
                  onPress={() => router.push(`/product/${p.id}`)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/* ── Styles ────────────────────────────────────────────────────────────────── */

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: {},

  /* Error */
  errorRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 },
  errorTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  errorText: { fontSize: 14, lineHeight: 22, textAlign: 'center' },
  errorBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 16, paddingHorizontal: 24, paddingVertical: 12, marginTop: 4 },
  errorBtnText: { fontSize: 14, fontWeight: '700' },

  /* Header */
  meshHeader: { position: 'relative', paddingHorizontal: 20, paddingBottom: 28, overflow: 'hidden' },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },

  /* Profile */
  profileCenter: { alignItems: 'center', gap: 6 },
  avatarOuter: { width: 98, height: 98, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  avatarGlow: {
    position: 'absolute', width: 98, height: 98, borderRadius: 49,
    borderWidth: 2, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  avatarImg: { width: 90, height: 90, borderRadius: 45 },
  avatarFallback: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontSize: 30, fontWeight: '800' },
  name: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  bio: { fontSize: 13, lineHeight: 18, textAlign: 'center', maxWidth: 300, marginTop: 2 },

  /* Stats */
  content: { paddingHorizontal: 20, paddingTop: 24 },
  statsCard: {
    flexDirection: 'row', borderWidth: 1, borderRadius: 20, paddingVertical: 20, marginBottom: 24, overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 6,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  statLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase' },
  statDivider: { width: 1, marginVertical: 6 },
  statsGlassEdge: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 30,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },

  /* Section */
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 14, marginLeft: 4 },

  /* Empty state */
  emptyCard: {
    borderWidth: 1, borderRadius: 20, padding: 28, alignItems: 'center', gap: 12,
  },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  /* Products grid */
  productsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: PRODUCT_GAP },
  productCard: { width: PRODUCT_W, borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  productImg: { width: '100%', height: PRODUCT_W, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  productInfo: { padding: 10, gap: 4 },
  productTitle: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  productPrice: { fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
});
