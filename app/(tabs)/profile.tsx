import { useCallback, useEffect, useRef } from "react";
import {
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { useUserStore } from "@/store/user";
import { useAuthStore } from "@/store/auth";
import { useTheme } from "@/hooks/use-theme";
import { useThemeStore, type ThemeMode } from "@/store/theme";
import type { ThemeColors } from "@/constants/colors";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonBox({
  width,
  height,
  borderRadius = 8,
  style,
  skeletonColor,
}: {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: object;
  skeletonColor: string;
}) {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.85,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [opacity]);
  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: skeletonColor,
          opacity,
        },
        style,
      ]}
    />
  );
}

function ProfileSkeleton({ topPad, C }: { topPad: number; C: ThemeColors }) {
  return (
    <View style={[{ flex: 1, backgroundColor: C.bg, paddingHorizontal: 20, paddingTop: topPad }]}>
      {/* Mesh gradient header placeholder */}
      <SkeletonBox width="100%" height={180} borderRadius={24} style={{ marginBottom: 20 }} skeletonColor={C.skeletonBase} />
      <SkeletonBox width="100%" height={90} borderRadius={20} style={{ marginBottom: 12 }} skeletonColor={C.skeletonBase} />
      {[0, 1, 2, 3].map((i) => (
        <SkeletonBox key={i} width="100%" height={56} borderRadius={16} style={{ marginBottom: 10 }} skeletonColor={C.skeletonBase} />
      ))}
    </View>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, photoUrl, size = 80, C }: { name: string; photoUrl?: string; size?: number; C: ThemeColors }) {
  const initials = name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
  return (
    <View style={[s.avatarOuter, { width: size + 8, height: size + 8, borderRadius: (size + 8) / 2 }]}>
      {/* Glow ring */}
      <View style={[s.avatarGlow, {
        width: size + 8,
        height: size + 8,
        borderRadius: (size + 8) / 2,
        borderColor: C.accent,
        shadowColor: C.accent,
      }]} />
      {photoUrl ? (
        <Image
          source={{ uri: photoUrl }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      ) : (
        <View style={[s.avatarInner, {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: C.accentGlow,
        }]}>
          <Text style={[s.avatarText, { color: C.accent, fontSize: size * 0.32 }]}>{initials}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Stat ─────────────────────────────────────────────────────────────────────

function StatItem({
  value,
  label,
  C,
}: {
  value: string | number;
  label: string;
  C: ThemeColors;
}) {
  return (
    <View style={s.statItem}>
      <Text style={[s.statValue, { color: C.textPrimary }]}>{value}</Text>
      <Text style={[s.statLabel, { color: C.textMuted }]}>{label}</Text>
    </View>
  );
}

// ─── Menu row ─────────────────────────────────────────────────────────────────

type MenuRowProps = {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  label: string;
  onPress: () => void;
  danger?: boolean;
  badge?: number;
  rightLabel?: string;
  C: ThemeColors;
};

function MenuRow({ icon, label, onPress, danger = false, badge, rightLabel, C }: MenuRowProps) {
  const color   = danger ? C.red : C.textPrimary;
  const iconBg  = danger ? C.redBg : C.accentGlow;
  const iconClr = danger ? C.red : C.accent;

  return (
    <TouchableOpacity
      style={[s.mrRow, { backgroundColor: C.glass, borderColor: C.glassBorder }]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <View style={[s.mrIconWrap, { backgroundColor: iconBg }]}>
        <MaterialIcons name={icon} size={18} color={iconClr} />
      </View>
      <Text style={[s.mrLabel, { color }]}>{label}</Text>
      <View style={s.mrRight}>
        {rightLabel ? (
          <View style={[s.mrRightPill, { backgroundColor: C.glass, borderColor: C.glassBorder }]}>
            <Text style={[s.mrRightLabel, { color: C.textSecondary }]}>{rightLabel}</Text>
          </View>
        ) : null}
        {badge !== undefined && badge > 0 ? (
          <View style={[s.mrBadge, { backgroundColor: C.accent, shadowColor: C.accent }]}>
            <Text style={s.mrBadgeText}>{badge}</Text>
          </View>
        ) : null}
        {!danger && (
          <MaterialIcons name="chevron-right" size={20} color={C.textMuted} />
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

const THEME_LABELS: Record<ThemeMode, string> = {
  system: "Sistema",
  dark: "Oscuro",
  light: "Claro",
};

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const C = useTheme();
  const { profile, loading, fetchProfile } = useUserStore();
  const { isLoggedIn, logout, pinEnabled, loadPinAvailability } = useAuthStore();
  const { mode, toggle } = useThemeStore();

  useFocusEffect(
    useCallback(() => {
      if (!isLoggedIn) return;
      void fetchProfile();
      void loadPinAvailability();
    }, [fetchProfile, isLoggedIn, loadPinAvailability]),
  );

  if (!isLoggedIn) {
    return (
      <View style={[s.guestRoot, { backgroundColor: C.bg, paddingTop: insets.top + 24 }]}>
        <View style={[s.guestCard, { backgroundColor: C.glass, borderColor: C.glassBorder }]}>
          <View style={[s.guestIconWrap, { backgroundColor: C.accentGlow }]}>
            <MaterialIcons name="lock-outline" size={28} color={C.accent} />
          </View>
          <Text style={[s.guestTitle, { color: C.textPrimary }]}>Iniciá sesión para ver tu perfil</Text>
          <Text style={[s.guestDescription, { color: C.textSecondary }]}>
            Necesitás una sesión activa para acceder a tu cuenta y configuraciones.
          </Text>
          <TouchableOpacity
            style={[s.guestButton, { backgroundColor: C.accent }]}
            onPress={() => router.push("/(auth)/landing")}
            accessibilityRole="button"
            accessibilityLabel="Ir a iniciar sesión o registrarse">
            <Text style={s.guestButtonText}>Iniciar sesión o registrarme</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading || !profile) {
    return <ProfileSkeleton topPad={insets.top} C={C} />;
  }

  const publicationsCount = profile.publications.length;

  return (
    <View style={[s.root, { backgroundColor: C.bg }]}>
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 140 }]}
        showsVerticalScrollIndicator={false}>

        {/* ── Mesh Gradient Header ── */}
        <View style={[s.meshHeader, { paddingTop: insets.top + 16 }]}>
          <LinearGradient
            colors={[C.accentGlow, 'rgba(0,100,200,0.08)', C.bg]}
            locations={[0, 0.5, 1]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={s.meshGradient}
          />
          {/* Subtle secondary gradient for mesh effect */}
          <LinearGradient
            colors={['rgba(100,0,255,0.06)', 'transparent', 'rgba(0,229,160,0.04)']}
            locations={[0, 0.4, 1]}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={s.meshGradient}
          />

          {/* Edit button */}
          <View style={s.headerTopRow}>
            <Text style={[s.screenTitle, { color: C.textPrimary }]}>Mi perfil</Text>
            <TouchableOpacity
              style={[s.editBtn, { backgroundColor: C.glass, borderColor: C.glassBorder }]}
              onPress={() => router.push('/profile/edit')}
              accessibilityRole="button"
              accessibilityLabel="Editar perfil">
              <MaterialIcons name="edit" size={14} color={C.accent} />
              <Text style={[s.editBtnText, { color: C.accent }]}>Editar</Text>
            </TouchableOpacity>
          </View>

          {/* Avatar + info centered */}
          <View style={s.profileCenter}>
            <Avatar name={profile.name} photoUrl={profile.avatarUrl} C={C} />
            <Text style={[s.name, { color: C.textPrimary }]}>{profile.name}</Text>
            <Text style={[s.email, { color: C.textSecondary }]}>{profile.email}</Text>
            {profile.bio ? (
              <Text
                style={[s.bio, { color: C.textSecondary }]}
                numberOfLines={2}
              >
                {profile.bio}
              </Text>
            ) : (
              <Text
                style={[s.bio, { color: C.textMuted, fontStyle: "italic" }]}
              >
                Sin descripción.
              </Text>
            )}
          </View>
        </View>

        {/* ── Stats — glass card ── */}
        <View style={s.content}>
          <View style={[s.statsCard, { backgroundColor: C.glass, borderColor: C.glassBorder, shadowColor: C.shadowDark }]}>
            <StatItem value={publicationsCount} label="Publicaciones" C={C} />
            <View style={[s.statDivider, { backgroundColor: C.glassBorder }]} />
            <StatItem value={0} label="Wishlist" C={C} />
            <View style={[s.statDivider, { backgroundColor: C.glassBorder }]} />
            <StatItem value="—" label="Rating" C={C} />
            {/* Glass edge */}
            <LinearGradient
              colors={['rgba(255,255,255,0.08)', 'transparent']}
              locations={[0, 1]}
              style={s.statsGlassEdge}
              pointerEvents="none"
            />
          </View>

          {/* ── Mis compras ── */}
          <View style={s.section}>
            <Text style={[s.sectionLabel, { color: C.textMuted }]}>Mis compras</Text>
            <MenuRow
              icon="shopping-bag"
              label="Órdenes de compra"
              onPress={() => router.push('/orders/purchases')}
              C={C}
            />
          </View>

          {/* ── Mis ventas ── */}
          <View style={s.section}>
            <Text style={[s.sectionLabel, { color: C.textMuted }]}>Mis ventas</Text>
            <MenuRow
              icon="storefront"
              label="Órdenes de venta"
              onPress={() => router.push('/orders/sales')}
              C={C}
            />
            <MenuRow
              icon="inventory-2"
              label="Mis publicaciones"
              onPress={() => router.push('/profile/publications')}
              C={C}
            />
          </View>

          {/* ── Otros ── */}
          <View style={s.section}>
            <Text style={[s.sectionLabel, { color: C.textMuted }]}>Actividad</Text>
            <MenuRow icon="favorite-border"  label="Wishlist"          onPress={() => {}} C={C} />
          </View>

          {/* ── Preferencias ── */}
          <View style={s.section}>
            <Text style={[s.sectionLabel, { color: C.textMuted }]}>Preferencias</Text>
            <MenuRow
              icon="brightness-6"
              label="Tema"
              onPress={toggle}
              rightLabel={THEME_LABELS[mode]}
              C={C}
            />
            <MenuRow
              icon="pin"
              label={pinEnabled ? "Cambiar PIN de acceso" : "Configurar PIN de acceso"}
              onPress={() => router.push("/profile/pin")}
              C={C}
            />
          </View>

          {/* ── Cerrar sesión ── */}
          <View style={s.section}>
            <MenuRow icon="logout" label="Cerrar sesión" onPress={() => logout()} danger C={C} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:  { flex: 1 },
  scroll: {},
  guestRoot: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  guestCard: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 28,
    alignItems: "center",
  },
  guestIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  guestTitle: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  guestDescription: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 22,
  },
  guestButton: {
    minWidth: 170,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  guestButtonText: {
    color: "#050508",
    fontSize: 14,
    fontWeight: "700",
  },

  // ── Mesh gradient header ──
  meshHeader: {
    position: 'relative',
    paddingHorizontal: 20,
    paddingBottom: 28,
    overflow: 'hidden',
  },
  meshGradient: {
    ...StyleSheet.absoluteFillObject,
  },

  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 20,
  },
  editBtnText: { fontSize: 13, fontWeight: "600" },

  // ── Profile center ──
  profileCenter: {
    alignItems: 'center',
    gap: 6,
  },
  avatarOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarGlow: {
    position: 'absolute',
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  avatarInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontWeight: '800',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  email: {
    fontSize: 14,
    fontWeight: '400',
  },
  bio: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 280,
    marginTop: 2,
  },

  // ── Content ──
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },

  // ── Stats ──
  statsCard: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 20,
    marginBottom: 24,
    overflow: 'hidden',
    // Glass shadow
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  statItem:  { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  statLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase' },
  statDivider: { width: 1, marginVertical: 6 },
  statsGlassEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 30,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },

  // ── Sections ──
  section: { marginBottom: 16 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 4,
  },

  // ── Menu rows ──
  mrRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
    marginBottom: 8,
  },
  mrIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mrLabel: { flex: 1, fontSize: 15, fontWeight: '500', letterSpacing: -0.1 },
  mrRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mrRightPill: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  mrRightLabel: { fontSize: 12, fontWeight: '600' },
  mrBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    // Glow
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  mrBadgeText: { fontSize: 11, fontWeight: '700', color: '#050508' },
});
