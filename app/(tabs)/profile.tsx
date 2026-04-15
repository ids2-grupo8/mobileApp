import { useEffect, useRef } from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

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
  const sk = {
    root: {
      flex: 1,
      backgroundColor: C.bg,
      paddingHorizontal: 20,
      paddingTop: topPad + 24,
    },
    userCard: {
      flexDirection: "row" as const,
      gap: 16,
      alignItems: "center" as const,
      marginBottom: 24,
    },
  };
  return (
    <View style={sk.root}>
      <View style={sk.userCard}>
        <SkeletonBox
          width={72}
          height={72}
          borderRadius={36}
          skeletonColor={C.skeletonBase}
        />
        <View style={{ gap: 8, flex: 1 }}>
          <SkeletonBox width={140} height={16} skeletonColor={C.skeletonBase} />
          <SkeletonBox width={180} height={12} skeletonColor={C.skeletonBase} />
          <SkeletonBox width={120} height={12} skeletonColor={C.skeletonBase} />
        </View>
      </View>
      <SkeletonBox
        width="100%"
        height={72}
        borderRadius={16}
        style={{ marginBottom: 12 }}
        skeletonColor={C.skeletonBase}
      />
      {[0, 1, 2, 3].map((i) => (
        <SkeletonBox
          key={i}
          width="100%"
          height={52}
          borderRadius={14}
          style={{ marginBottom: 8 }}
          skeletonColor={C.skeletonBase}
        />
      ))}
    </View>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({
  name,
  size = 72,
  C,
}: {
  name: string;
  size?: number;
  C: ThemeColors;
}) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: C.accentBg,
        borderWidth: 2,
        borderColor: C.accent,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{ color: C.accent, fontWeight: "700", fontSize: size * 0.34 }}
      >
        {initials}
      </Text>
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
      <Text style={[s.statLabel, { color: C.textSecondary }]}>{label}</Text>
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

function MenuRow({
  icon,
  label,
  onPress,
  danger = false,
  badge,
  rightLabel,
  C,
}: MenuRowProps) {
  const color = danger ? C.red : C.textPrimary;
  const iconBg = danger ? C.redBg : C.card;
  const iconClr = danger ? C.red : C.accent;

  return (
    <TouchableOpacity
      style={[s.mrRow, { backgroundColor: C.card, borderColor: C.border }]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <View style={[s.mrIconWrap, { backgroundColor: iconBg }]}>
        <MaterialIcons name={icon} size={18} color={iconClr} />
      </View>
      <Text style={[s.mrLabel, { color }]}>{label}</Text>
      <View style={s.mrRight}>
        {rightLabel ? (
          <Text style={[s.mrRightLabel, { color: C.textMuted }]}>
            {rightLabel}
          </Text>
        ) : null}
        {badge !== undefined && badge > 0 ? (
          <View style={[s.mrBadge, { backgroundColor: C.accent }]}>
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
  const { logout } = useAuthStore();
  const { mode, toggle } = useThemeStore();

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (loading || !profile) {
    return <ProfileSkeleton topPad={insets.top} C={C} />;
  }

  const activeCount = profile.publications.filter((p) => p.stock > 0).length;

  return (
    <View style={[s.root, { paddingTop: insets.top, backgroundColor: C.bg }]}>
      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Título ── */}
        <View style={s.titleRow}>
          <Text style={[s.screenTitle, { color: C.textPrimary }]}>
            Mi perfil
          </Text>
          <TouchableOpacity
            style={[s.editBtn, { borderColor: C.accent }]}
            onPress={() => router.push("/profile/edit")}
            accessibilityRole="button"
            accessibilityLabel="Editar perfil"
          >
            <MaterialIcons name="edit" size={14} color={C.accent} />
            <Text style={[s.editBtnText, { color: C.accent }]}>Editar</Text>
          </TouchableOpacity>
        </View>

        {/* ── User card ── */}
        <View
          style={[
            s.userCard,
            { backgroundColor: C.card, borderColor: C.border },
          ]}
        >
          <Avatar name={profile.name} C={C} />
          <View style={s.userInfo}>
            <Text style={[s.name, { color: C.textPrimary }]}>
              {profile.name}
            </Text>
            <Text style={[s.email, { color: C.textSecondary }]}>
              {profile.email}
            </Text>
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

        {/* ── Stats ── */}
        <View
          style={[
            s.statsCard,
            { backgroundColor: C.card, borderColor: C.border },
          ]}
        >
          <StatItem value={activeCount} label="Publicaciones" C={C} />
          <View style={[s.statDivider, { backgroundColor: C.border }]} />
          <StatItem value={0} label="Wishlist" C={C} />
          <View style={[s.statDivider, { backgroundColor: C.border }]} />
          <StatItem value="—" label="Rating" C={C} />
        </View>

        {/* ── Menú ── */}
        <View style={s.section}>
          <MenuRow
            icon="inventory-2"
            label="Mis publicaciones"
            onPress={() => {}}
            C={C}
          />
          <MenuRow
            icon="favorite-border"
            label="Wishlist"
            onPress={() => {}}
            C={C}
          />
          <MenuRow
            icon="notifications-none"
            label="Notificaciones"
            onPress={() => {}}
            C={C}
          />
        </View>

        {/* ── Preferencias ── */}
        <View style={s.section}>
          <MenuRow
            icon="brightness-6"
            label="Tema"
            onPress={toggle}
            rightLabel={THEME_LABELS[mode]}
            C={C}
          />
        </View>

        {/* ── Cerrar sesión ── */}
        <View style={s.section}>
          <MenuRow
            icon="logout"
            label="Cerrar sesión"
            onPress={() => logout()}
            danger
            C={C}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 28,
    paddingBottom: 20,
  },
  screenTitle: { fontSize: 24, fontWeight: "700" },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderRadius: 20,
  },
  editBtnText: { fontSize: 13, fontWeight: "600" },

  userCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  userInfo: { flex: 1, gap: 3 },
  name: { fontSize: 16, fontWeight: "700" },
  email: { fontSize: 13 },
  bio: { fontSize: 13, lineHeight: 18, marginTop: 2 },

  statsCard: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 18,
    marginBottom: 20,
  },
  statItem: { flex: 1, alignItems: "center", gap: 2 },
  statValue: { fontSize: 18, fontWeight: "700" },
  statLabel: { fontSize: 11, fontWeight: "500" },
  statDivider: { width: 1, marginVertical: 4 },

  section: { marginBottom: 12 },

  mrRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
    marginBottom: 8,
  },
  mrIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  mrLabel: { flex: 1, fontSize: 15, fontWeight: "500" },
  mrRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  mrRightLabel: { fontSize: 13 },
  mrBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  mrBadgeText: { fontSize: 11, fontWeight: "700", color: "#0B0B0F" },
});
