import { useEffect, useRef } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { useUserStore } from '@/store/user';
import { useAuthStore } from '@/store/auth';

// ─── Paleta ──────────────────────────────────────────────────────────────────
const C = {
  bg: '#0B0B0F',
  elevated: '#141418',
  card: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.07)',
  accent: '#C5F135',
  accentBg: 'rgba(197,241,53,0.12)',
  textPrimary: '#FFFFFF',
  textSecondary: '#8B8FA8',
  textMuted: '#555870',
  red: '#F87171',
  redBg: 'rgba(239,68,68,0.12)',
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonBox({ width, height, borderRadius = 8, style }: {
  width: number | `${number}%`; height: number; borderRadius?: number; style?: object;
}) {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.85, duration: 700, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, [opacity]);
  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: 'rgba(255,255,255,0.08)', opacity }, style]}
    />
  );
}

function ProfileSkeleton({ topPad }: { topPad: number }) {
  return (
    <View style={[sk.root, { paddingTop: topPad + 24 }]}>
      <View style={sk.userCard}>
        <SkeletonBox width={72} height={72} borderRadius={36} />
        <View style={{ gap: 8, flex: 1 }}>
          <SkeletonBox width={140} height={16} />
          <SkeletonBox width={180} height={12} />
          <SkeletonBox width={120} height={12} />
        </View>
      </View>
      <SkeletonBox width="100%" height={72} borderRadius={16} style={{ marginBottom: 12 }} />
      {[0, 1, 2, 3].map((i) => (
        <SkeletonBox key={i} width="100%" height={52} borderRadius={14} style={{ marginBottom: 8 }} />
      ))}
    </View>
  );
}

const sk = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 20 },
  userCard: { flexDirection: 'row', gap: 16, alignItems: 'center', marginBottom: 24 },
});

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, size = 72 }: { name: string; size?: number }) {
  const initials = name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
  return (
    <View style={[av.wrap, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[av.initials, { fontSize: size * 0.34 }]}>{initials}</Text>
    </View>
  );
}

const av = StyleSheet.create({
  wrap: {
    backgroundColor: C.accentBg,
    borderWidth: 2,
    borderColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { color: C.accent, fontWeight: '700' },
});

// ─── Stat ─────────────────────────────────────────────────────────────────────

function StatItem({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={st.item}>
      <Text style={st.value}>{value}</Text>
      <Text style={st.label}>{label}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  item: { flex: 1, alignItems: 'center', gap: 2 },
  value: { fontSize: 18, fontWeight: '700', color: C.textPrimary },
  label: { fontSize: 11, color: C.textSecondary, fontWeight: '500' },
});

// ─── Menu row ─────────────────────────────────────────────────────────────────

type MenuRowProps = {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  onPress: () => void;
  danger?: boolean;
  badge?: number;
};

function MenuRow({ icon, label, onPress, danger = false, badge }: MenuRowProps) {
  const color = danger ? C.red : C.textPrimary;
  const iconBg = danger ? C.redBg : C.card;
  const iconColor = danger ? C.red : C.accent;

  return (
    <TouchableOpacity style={mr.row} onPress={onPress} accessibilityRole="button">
      <View style={[mr.iconWrap, { backgroundColor: iconBg }]}>
        <MaterialIcons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={[mr.label, { color }]}>{label}</Text>
      <View style={mr.right}>
        {badge !== undefined && badge > 0 ? (
          <View style={mr.badge}>
            <Text style={mr.badgeText}>{badge}</Text>
          </View>
        ) : null}
        {!danger && (
          <MaterialIcons name="chevron-right" size={20} color={C.textMuted} />
        )}
      </View>
    </TouchableOpacity>
  );
}

const mr = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
    marginBottom: 8,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1, fontSize: 15, fontWeight: '500' },
  right: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: {
    backgroundColor: C.accent,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#0B0B0F' },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, loading, fetchProfile } = useUserStore();
  const { logout } = useAuthStore();

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  if (loading || !profile) {
    return <ProfileSkeleton topPad={insets.top} />;
  }

  const activeCount = profile.publications.filter((p) => p.stock > 0).length;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}>

        {/* ── Título ── */}
        <View style={s.titleRow}>
          <Text style={s.screenTitle}>Mi perfil</Text>
          <TouchableOpacity
            style={s.editBtn}
            onPress={() => router.push('/profile/edit')}
            accessibilityRole="button"
            accessibilityLabel="Editar perfil">
            <MaterialIcons name="edit" size={14} color={C.accent} />
            <Text style={s.editBtnText}>Editar</Text>
          </TouchableOpacity>
        </View>

        {/* ── User card ── */}
        <View style={s.userCard}>
          <Avatar name={profile.name} />
          <View style={s.userInfo}>
            <Text style={s.name}>{profile.name}</Text>
            <Text style={s.email}>{profile.email}</Text>
            {profile.bio ? (
              <Text style={s.bio} numberOfLines={2}>{profile.bio}</Text>
            ) : (
              <Text style={[s.bio, s.bioMuted]}>Sin descripción.</Text>
            )}
          </View>
        </View>

        {/* ── Stats ── */}
        <View style={s.statsCard}>
          <StatItem value={activeCount} label="Publicaciones" />
          <View style={s.statDivider} />
          <StatItem value={0} label="Wishlist" />
          <View style={s.statDivider} />
          <StatItem value="—" label="Rating" />
        </View>

        {/* ── Menú ── */}
        <View style={s.section}>
          <MenuRow
            icon="inventory-2"
            label="Mis publicaciones"
            onPress={() => {}}
          />
          <MenuRow
            icon="favorite-border"
            label="Wishlist"
            onPress={() => {}}
          />
          <MenuRow
            icon="notifications-none"
            label="Notificaciones"
            onPress={() => {}}
          />
        </View>

        {/* ── Cerrar sesión ── */}
        <View style={s.section}>
          <MenuRow
            icon="logout"
            label="Cerrar sesión"
            onPress={() => logout()}
            danger
          />
        </View>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 20 },

  // Título
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 28,
    paddingBottom: 20,
  },
  screenTitle: { fontSize: 24, fontWeight: '700', color: C.textPrimary },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: C.accent,
    borderRadius: 20,
  },
  editBtnText: { fontSize: 13, fontWeight: '600', color: C.accent },

  // User card
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  userInfo: { flex: 1, gap: 3 },
  name: { fontSize: 16, fontWeight: '700', color: C.textPrimary },
  email: { fontSize: 13, color: C.textSecondary },
  bio: { fontSize: 13, color: C.textSecondary, lineHeight: 18, marginTop: 2 },
  bioMuted: { color: C.textMuted, fontStyle: 'italic' },

  // Stats
  statsCard: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    paddingVertical: 18,
    marginBottom: 20,
  },
  statDivider: {
    width: 1,
    backgroundColor: C.border,
    marginVertical: 4,
  },

  // Sections
  section: { marginBottom: 12 },
});
