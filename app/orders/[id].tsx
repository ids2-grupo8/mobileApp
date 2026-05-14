import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StatusPill } from '@/components/order-card';
import ReviewSection from '@/components/review-section';
import { useTheme } from '@/hooks/use-theme';
import { fetchCatalogProductById, type CatalogProduct } from '@/services/catalog';
import { useAuthStore } from '@/store/auth';
import { useOrdersStore } from '@/store/orders';

function formatPrice(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function OrderDetailScreen() {
  const C = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = Number(id);

  const { user } = useAuthStore();
  const { details, detailLoading, detailError, loadOrderDetail } = useOrdersStore();
  const order = Number.isFinite(orderId) ? details[orderId] : undefined;
  const loading = Number.isFinite(orderId) ? Boolean(detailLoading[orderId]) : false;
  const error = Number.isFinite(orderId) ? detailError[orderId] : null;

  const [productMap, setProductMap] = useState<Record<string, CatalogProduct | null>>({});

  useFocusEffect(
    useCallback(() => {
      if (!Number.isFinite(orderId)) return;
      void loadOrderDetail(orderId);
    }, [loadOrderDetail, orderId]),
  );

  useEffect(() => {
    if (!order) return;
    let cancelled = false;
    (async () => {
      const ids = Array.from(new Set(order.items.map((i) => i.product_id)));
      const missing = ids.filter((pid) => !(pid in productMap));
      if (missing.length === 0) return;
      const results = await Promise.all(
        missing.map(async (pid) => {
          try {
            return [pid, await fetchCatalogProductById(pid)] as const;
          } catch {
            return [pid, null] as const;
          }
        }),
      );
      if (cancelled) return;
      setProductMap((prev) => {
        const next = { ...prev };
        for (const [pid, prod] of results) next[pid] = prod;
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [order, productMap]);

  if (!Number.isFinite(orderId)) {
    return (
      <View style={[s.root, { backgroundColor: C.bg, paddingTop: insets.top }]}>
        <Header onBack={() => router.back()} title="Orden inválida" C={C} />
        <View style={s.emptyWrap}>
          <Text style={[s.emptyText, { color: C.textSecondary }]}>
            El identificador de la orden no es válido.
          </Text>
        </View>
      </View>
    );
  }

  const role: 'buyer' | 'seller' | null = order
    ? user?.email === order.buyer
      ? 'buyer'
      : user?.email === order.seller
        ? 'seller'
        : null
    : null;
  const counterpartyLabel = role === 'seller' ? 'Comprador' : 'Vendedor';
  const counterparty = order
    ? role === 'seller'
      ? order.buyer
      : order.seller
    : '';

  return (
    <View style={[s.root, { backgroundColor: C.bg, paddingTop: insets.top }]}>
      <Header onBack={() => router.back()} title={`Orden #${orderId}`} C={C} />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => loadOrderDetail(orderId)}
            tintColor={C.accent}
          />
        }>
        {loading && !order ? (
          <View style={s.emptyWrap}>
            <ActivityIndicator color={C.accent} />
          </View>
        ) : error && !order ? (
          <View style={s.emptyWrap}>
            <MaterialIcons name="error-outline" size={36} color={C.red} />
            <Text style={[s.emptyText, { color: C.textSecondary }]}>{error}</Text>
            <TouchableOpacity
              onPress={() => loadOrderDetail(orderId)}
              style={[s.retryBtn, { backgroundColor: C.accent }]}>
              <Text style={s.retryBtnText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : !order ? null : (
          <View style={s.content}>
            <View
              style={[
                s.summaryCard,
                { backgroundColor: C.glass, borderColor: C.glassBorder, shadowColor: C.shadowDark },
              ]}>
              <View style={s.row}>
                <Text style={[s.label, { color: C.textMuted }]}>Estado</Text>
                <StatusPill status={order.status} C={C} />
              </View>
              <View style={[s.divider, { backgroundColor: C.glassBorder }]} />
              <View style={s.row}>
                <Text style={[s.label, { color: C.textMuted }]}>Total</Text>
                <Text style={[s.totalValue, { color: C.accent }]}>
                  {formatPrice(order.total_amount)}
                </Text>
              </View>
              <View style={[s.divider, { backgroundColor: C.glassBorder }]} />
              <View style={s.row}>
                <Text style={[s.label, { color: C.textMuted }]}>{counterpartyLabel}</Text>
                <Text
                  style={[s.value, { color: C.textPrimary }]}
                  numberOfLines={1}
                  selectable>
                  {counterparty}
                </Text>
              </View>
            </View>

            {order.address && (
              <View
                style={[
                  s.section,
                  { backgroundColor: C.glass, borderColor: C.glassBorder, shadowColor: C.shadowDark },
                ]}>
                <Text style={[s.sectionTitle, { color: C.textPrimary }]}>
                  Dirección de envío
                </Text>
                <Text style={[s.value, { color: C.textPrimary }]}>{order.address.fullName}</Text>
                <Text style={[s.subValue, { color: C.textSecondary }]}>{order.address.street}</Text>
                <Text style={[s.subValue, { color: C.textSecondary }]}>
                  {order.address.city}{order.address.zip ? ` · CP ${order.address.zip}` : ''}
                </Text>
                {order.address.phone ? (
                  <Text style={[s.subValue, { color: C.textSecondary }]}>
                    Tel: {order.address.phone}
                  </Text>
                ) : null}
              </View>
            )}

            <View
              style={[
                s.section,
                { backgroundColor: C.glass, borderColor: C.glassBorder, shadowColor: C.shadowDark },
              ]}>
              <Text style={[s.sectionTitle, { color: C.textPrimary }]}>Productos</Text>
              <View style={{ gap: 12 }}>
                {order.items.map((item, idx) => {
                  const product = productMap[item.product_id];
                  return (
                    <View key={`${item.product_id}-${idx}`} style={s.itemRow}>
                      <View
                        style={[
                          s.itemThumbWrap,
                          { backgroundColor: C.elevated, borderColor: C.glassBorder },
                        ]}>
                        {product?.imageUrl ? (
                          <Image
                            source={{ uri: product.imageUrl }}
                            style={s.itemThumb}
                            contentFit="cover"
                          />
                        ) : (
                          <MaterialIcons name="inventory-2" size={20} color={C.textMuted} />
                        )}
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text
                          style={[s.itemTitle, { color: C.textPrimary }]}
                          numberOfLines={2}>
                          {product?.title ?? `Producto ${item.product_id}`}
                        </Text>
                        <Text style={[s.itemMeta, { color: C.textMuted }]}>
                          {item.quantity}× · {formatPrice(item.price)} c/u
                        </Text>
                      </View>
                      <Text style={[s.itemSubtotal, { color: C.textPrimary }]}>
                        {formatPrice(item.price * item.quantity)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {order.history && order.history.length > 0 && (
              <View
                style={[
                  s.section,
                  { backgroundColor: C.glass, borderColor: C.glassBorder, shadowColor: C.shadowDark },
                ]}>
                <Text style={[s.sectionTitle, { color: C.textPrimary }]}>
                  Historial de estado
                </Text>
                <View style={{ gap: 10 }}>
                  {[...order.history].reverse().map((entry, idx) => (
                    <View key={idx} style={s.historyRow}>
                      <StatusPill status={entry.status} C={C} />
                      <Text style={[s.historyDate, { color: C.textMuted }]}>
                        {formatTimestamp(entry.timestamp)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {order.status === 'delivered' && role === 'buyer' && (
              <ReviewSection order={order} productMap={productMap} C={C} />
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Header({
  onBack,
  title,
  C,
}: {
  onBack: () => void;
  title: string;
  C: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={s.header}>
      <TouchableOpacity
        onPress={onBack}
        hitSlop={10}
        style={[s.iconBtn, { backgroundColor: C.glass, borderColor: C.glassBorder }]}>
        <MaterialIcons name="arrow-back" size={20} color={C.textPrimary} />
      </TouchableOpacity>
      <Text style={[s.headerTitle, { color: C.textPrimary }]}>{title}</Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', letterSpacing: -0.3, textAlign: 'center' },
  scroll: { paddingHorizontal: 20, paddingTop: 4 },
  content: { gap: 16 },

  summaryCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  value: { fontSize: 14, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  subValue: { fontSize: 13, fontWeight: '500' },
  totalValue: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  divider: { height: 1 },

  section: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 4,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },

  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  historyDate: { fontSize: 12, fontWeight: '500' },

  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemThumbWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  itemThumb: { width: '100%', height: '100%' },
  itemTitle: { fontSize: 14, fontWeight: '600' },
  itemMeta: { fontSize: 12, fontWeight: '500' },
  itemSubtotal: { fontSize: 14, fontWeight: '700' },

  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 10 },
  emptyText: { fontSize: 13, textAlign: 'center', paddingHorizontal: 24 },
  retryBtn: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryBtnText: { color: '#050508', fontWeight: '700' },
});
