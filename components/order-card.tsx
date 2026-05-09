import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { ThemeColors } from '@/constants/colors';
import type { OrderSummary } from '@/services/orders';

function formatPrice(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

const STATUS_LABEL: Record<string, string> = {
  'payment pending': 'Pago pendiente',
  'payment confirmed': 'Pago confirmado',
  'payment rejected': 'Pago rechazado',
  canceled: 'Cancelada',
  processing: 'Preparándose',
  shipped: 'Enviada',
  delivered: 'Entregada',
};

export type OrderStatusTone = 'pending' | 'positive' | 'negative' | 'neutral';

export function statusTone(status: string): OrderStatusTone {
  switch (status) {
    case 'payment pending':
      return 'pending';
    case 'payment confirmed':
    case 'shipped':
    case 'delivered':
      return 'positive';
    case 'payment rejected':
    case 'canceled':
      return 'negative';
    default:
      return 'neutral';
  }
}

export function StatusPill({ status, C }: { status: string; C: ThemeColors }) {
  const tone = statusTone(status);
  const label = STATUS_LABEL[status] ?? status;

  const palette = (() => {
    switch (tone) {
      case 'positive':
        return { bg: C.accentGlow, border: C.accent, text: C.accent, dot: C.accent };
      case 'negative':
        return { bg: C.redBg, border: C.red, text: C.red, dot: C.red };
      case 'pending':
        return {
          bg: C.glass,
          border: C.glassBorder,
          text: C.textSecondary,
          dot: C.textSecondary,
        };
      default:
        return {
          bg: C.glass,
          border: C.glassBorder,
          text: C.textMuted,
          dot: C.textMuted,
        };
    }
  })();

  return (
    <View
      style={[
        s.pill,
        { backgroundColor: palette.bg, borderColor: palette.border },
      ]}>
      <View style={[s.pillDot, { backgroundColor: palette.dot }]} />
      <Text style={[s.pillText, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

type Props = {
  order: OrderSummary;
  role: 'buyer' | 'seller';
  C: ThemeColors;
  onPress: () => void;
};

export default function OrderCard({ order, role, C, onPress }: Props) {
  const counterparty = role === 'buyer' ? order.seller : order.buyer;
  const counterpartyLabel = role === 'buyer' ? 'Vendedor' : 'Comprador';
  const itemsCount = order.items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[s.card, { backgroundColor: C.glass, borderColor: C.glassBorder }]}>
      <View style={s.topRow}>
        <Text style={[s.orderId, { color: C.textPrimary }]}>Orden #{order.id}</Text>
        <StatusPill status={order.status} C={C} />
      </View>

      <View style={s.metaRow}>
        <View style={s.metaCell}>
          <Text style={[s.metaLabel, { color: C.textMuted }]}>{counterpartyLabel}</Text>
          <Text
            style={[s.metaValue, { color: C.textPrimary }]}
            numberOfLines={1}>
            {counterparty}
          </Text>
        </View>
        <View style={s.metaCell}>
          <Text style={[s.metaLabel, { color: C.textMuted }]}>Productos</Text>
          <Text style={[s.metaValue, { color: C.textPrimary }]}>
            {itemsCount} {itemsCount === 1 ? 'ítem' : 'ítems'}
          </Text>
        </View>
      </View>

      <View style={[s.divider, { backgroundColor: C.glassBorder }]} />

      <View style={s.bottomRow}>
        <Text style={[s.totalLabel, { color: C.textSecondary }]}>Total</Text>
        <View style={s.totalSide}>
          <Text style={[s.totalValue, { color: C.accent }]}>
            {formatPrice(order.total_amount)}
          </Text>
          <MaterialIcons name="chevron-right" size={20} color={C.textMuted} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  orderId: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  metaRow: { flexDirection: 'row', gap: 16 },
  metaCell: { flex: 1, gap: 2 },
  metaLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  metaValue: { fontSize: 13, fontWeight: '600' },
  divider: { height: 1 },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: { fontSize: 12, fontWeight: '600' },
  totalSide: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  totalValue: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },

  // Status pill
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
});
