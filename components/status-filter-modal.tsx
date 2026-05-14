import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { statusTone } from '@/components/order-card';
import type { ThemeColors } from '@/constants/colors';
import type { OrderStatus } from '@/services/orders';

type FilterOption = { label: string; value: OrderStatus | undefined };

export const STATUS_FILTERS: FilterOption[] = [
  { label: 'Todos', value: undefined },
  { label: 'Pago pendiente', value: 'payment pending' },
  { label: 'Pago confirmado', value: 'payment confirmed' },
  { label: 'Preparándose', value: 'processing' },
  { label: 'Enviada', value: 'shipped' },
  { label: 'Entregada', value: 'delivered' },
  { label: 'Pago rechazado', value: 'payment rejected' },
  { label: 'Cancelada', value: 'canceled' },
];

function dotColor(value: OrderStatus | undefined, C: ThemeColors): string {
  if (!value) return C.textMuted;
  switch (statusTone(value)) {
    case 'positive': return C.accent;
    case 'negative': return C.red;
    case 'pending': return C.textSecondary;
    default: return C.textMuted;
  }
}

type Props = {
  visible: boolean;
  onClose: () => void;
  selectedStatus: OrderStatus | undefined;
  onSelect: (status: OrderStatus | undefined) => void;
  C: ThemeColors;
};

export default function StatusFilterModal({ visible, onClose, selectedStatus, onSelect, C }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <View
          style={[s.sheet, { backgroundColor: C.elevated, borderColor: C.glassBorder }]}
          onStartShouldSetResponder={() => true}>
          <View style={[s.handle, { backgroundColor: C.glassBorder }]} />
          <Text style={[s.title, { color: C.textPrimary }]}>Filtrar por estado</Text>

          {STATUS_FILTERS.map((f, idx) => {
            const active = selectedStatus === f.value;
            return (
              <View key={f.label}>
                {idx > 0 && <View style={[s.divider, { backgroundColor: C.glassBorder }]} />}
                <TouchableOpacity
                  onPress={() => { onSelect(f.value); onClose(); }}
                  style={s.row}
                  activeOpacity={0.7}>
                  <View style={[s.dot, { backgroundColor: dotColor(f.value, C) }]} />
                  <Text
                    style={[
                      s.rowLabel,
                      { color: active ? C.textPrimary : C.textSecondary },
                      active && s.rowLabelActive,
                    ]}>
                    {f.label}
                  </Text>
                  {active && <MaterialIcons name="check" size={18} color={C.accent} />}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 12,
    paddingBottom: 36,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  divider: { height: 1, marginHorizontal: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    gap: 14,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  rowLabel: { flex: 1, fontSize: 14, fontWeight: '500' },
  rowLabelActive: { fontWeight: '700' },
});
