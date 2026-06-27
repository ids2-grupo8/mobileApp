import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { type AppNotification, useNotificationsStore } from '@/store/notifications';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

const STATUS_ICON: Record<string, React.ComponentProps<typeof MaterialIcons>['name']> = {
  'payment confirmed': 'check-circle',
  'payment rejected':  'cancel',
  processing:          'inventory',
  shipped:             'local-shipping',
  delivered:           'done-all',
  canceled:            'block',
};

function NotificationItem({ item, onPress }: { item: AppNotification; onPress: () => void }) {
  const C = useTheme();
  const icon = STATUS_ICON[item.status];
  const isError = item.status === 'payment rejected' || item.status === 'canceled';

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        s.item,
        {
          backgroundColor: item.read ? C.elevated : C.card,
          borderColor: C.border,
          borderLeftColor: item.read ? C.border : (isError ? C.red : C.accent),
        },
      ]}
      activeOpacity={0.7}>
      <View
        style={[
          s.iconWrap,
          { backgroundColor: isError ? C.redBg : C.accentBg },
        ]}>
        {icon ? (
          <MaterialIcons
            name={icon}
            size={20}
            color={isError ? C.red : C.accent}
          />
        ) : (
          <MaterialCommunityIcons
            name="bell-outline"
            size={20}
            color={isError ? C.red : C.accent}
          />
        )}
      </View>

      <View style={s.content}>
        <View style={s.row}>
          <Text style={[s.title, { color: C.textPrimary }]} numberOfLines={1}>
            {item.title}
          </Text>
          {!item.read && (
            <View style={[s.dot, { backgroundColor: C.accent }]} />
          )}
        </View>
        <Text style={[s.body, { color: C.textSecondary }]} numberOfLines={2}>
          {item.body}
        </Text>
        <View style={s.meta}>
          <Text style={[s.metaText, { color: C.textMuted }]}>
            Orden #{item.orderId}
          </Text>
          <Text style={[s.metaText, { color: C.textMuted }]}>·</Text>
          <Text style={[s.metaText, { color: C.textMuted }]}>
            {timeAgo(item.createdAt)}
          </Text>
          <View
            style={[
              s.roleTag,
              { backgroundColor: item.role === 'buyer' ? C.accentBg : C.glass },
            ]}>
            <Text
              style={[
                s.roleText,
                { color: item.role === 'buyer' ? C.accent : C.textMuted },
              ]}>
              {item.role === 'buyer' ? 'Compra' : 'Venta'}
            </Text>
          </View>
        </View>
      </View>

      <MaterialIcons name="chevron-right" size={18} color={C.textMuted} />
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const C = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { notifications, markRead, markAllRead } = useNotificationsStore();

  const unread = notifications.filter((n) => !n.read).length;

  function handlePress(item: AppNotification) {
    markRead(item.id);
    router.push(`/orders/${item.orderId}`);
  }

  const isEmpty = notifications.length === 0;

  return (
    <View style={[s.container, { backgroundColor: C.bg, paddingTop: insets.top }]}>
      <View style={s.header}>
        <View style={s.iconBtnSpacer} />
        <View style={s.headerCenter}>
          <Text style={[s.heading, { color: C.textPrimary }]}>Notificaciones</Text>
          {!isEmpty && (
            <Text style={[s.subtitle, { color: C.textMuted }]}>
              {unread > 0 ? `${unread} sin leer` : 'Todo al día'}
            </Text>
          )}
        </View>
        {unread > 0 ? (
          <TouchableOpacity
            onPress={markAllRead}
            hitSlop={10}
            style={[s.markAllBtn, { backgroundColor: C.accentBg, borderColor: C.accent }]}
            accessibilityRole="button"
            accessibilityLabel="Marcar todas como leídas">
            <MaterialCommunityIcons name="check-all" size={18} color={C.accent} />
          </TouchableOpacity>
        ) : (
          <View style={s.iconBtnSpacer} />
        )}
      </View>

      {isEmpty ? (
        <View style={s.emptyWrap}>
          <View style={[s.emptyIconWrap, { backgroundColor: C.glass, borderColor: C.glassBorder }]}>
            <MaterialCommunityIcons name="bell-outline" size={56} color={C.textMuted} />
          </View>
          <Text style={[s.emptyTitle, { color: C.textPrimary }]}>Sin notificaciones</Text>
          <Text style={[s.emptyBody, { color: C.textSecondary }]}>
            Acá vas a ver los cambios de estado de tus órdenes.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            s.list,
            { paddingBottom: insets.bottom + 100 },
          ]}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <NotificationItem item={item} onPress={() => handlePress(item)} />
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  iconBtnSpacer: { width: 40, height: 40 },
  heading: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  markAllBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 14,
  },
  emptyIconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  list: {
    padding: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 3,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1, gap: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  metaText: {
    fontSize: 11,
  },
  roleTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  emptyBody: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
