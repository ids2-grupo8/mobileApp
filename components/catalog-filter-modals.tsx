import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export function FilterModal({
  visible,
  categories,
  selectedCategories,
  minPrice,
  maxPrice,
  onApply,
  onClose,
}: {
  visible: boolean;
  categories: string[];
  selectedCategories: string[];
  minPrice: string;
  maxPrice: string;
  onApply: (nextCategories: string[], min: string, max: string) => void;
  onClose: () => void;
}) {
  const C = useTheme();
  const [localCategories, setLocalCategories] = useState<Set<string>>(new Set(selectedCategories));
  const [localMin, setLocalMin] = useState(minPrice);
  const [localMax, setLocalMax] = useState(maxPrice);

  useEffect(() => {
    if (visible) {
      setLocalCategories(new Set(selectedCategories));
      setLocalMin(minPrice);
      setLocalMax(maxPrice);
    }
  }, [visible, selectedCategories, minPrice, maxPrice]);

  const handleApply = () => {
    onApply(Array.from(localCategories), localMin, localMax);
    onClose();
  };

  const handleClear = () => {
    setLocalCategories(new Set());
    setLocalMin('');
    setLocalMax('');
    onApply([], '', '');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.modalOverlay}>
        <TouchableOpacity style={s.modalBackdrop} onPress={onClose} activeOpacity={1} />
        <View style={[s.modalSheet, { backgroundColor: C.elevated, borderColor: C.glassBorder }]}>
          <View style={[s.modalHandle, { backgroundColor: C.glassBorder }]} />
          <Text style={[s.modalTitle, { color: C.textPrimary }]}>Filtros</Text>

          <Text style={[s.filterLabel, { color: C.textSecondary }]}>Categorías</Text>
          <View style={s.modalCategoryWrap}>
            {categories.map((cat) => {
              const active = localCategories.has(cat);
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() =>
                    setLocalCategories((prev) => {
                      const next = new Set(prev);
                      if (next.has(cat)) next.delete(cat);
                      else next.add(cat);
                      return next;
                    })
                  }
                  style={[
                    s.modalCategoryChip,
                    {
                      backgroundColor: active ? C.accentGlow : C.glass,
                      borderColor: active ? C.accent : C.glassBorder,
                    },
                  ]}>
                  <Text style={[s.modalCategoryChipText, { color: active ? C.accent : C.textSecondary }]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[s.filterLabel, { color: C.textSecondary }]}>Rango de precio</Text>
          <View style={s.priceRow}>
            <View style={[s.priceInput, { backgroundColor: C.glass, borderColor: C.glassBorder }]}>
              <Text style={[s.priceCurrency, { color: C.textMuted }]}>$</Text>
              <TextInput
                value={localMin}
                onChangeText={setLocalMin}
                placeholder="Mínimo"
                placeholderTextColor={C.textMuted}
                style={[s.priceField, { color: C.textPrimary }]}
                keyboardType="numeric"
                selectionColor={C.accent}
              />
            </View>
            <View style={[s.priceSep, { backgroundColor: C.glassBorder }]} />
            <View style={[s.priceInput, { backgroundColor: C.glass, borderColor: C.glassBorder }]}>
              <Text style={[s.priceCurrency, { color: C.textMuted }]}>$</Text>
              <TextInput
                value={localMax}
                onChangeText={setLocalMax}
                placeholder="Máximo"
                placeholderTextColor={C.textMuted}
                style={[s.priceField, { color: C.textPrimary }]}
                keyboardType="numeric"
                selectionColor={C.accent}
              />
            </View>
          </View>

          <View style={s.modalActions}>
            <TouchableOpacity
              style={[s.modalBtnSecondary, { backgroundColor: C.glass, borderColor: C.glassBorder }]}
              onPress={handleClear}>
              <Text style={[s.modalBtnSecondaryText, { color: C.textSecondary }]}>Limpiar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.modalBtnPrimary, { backgroundColor: C.accent }]}
              onPress={handleApply}>
              <Text style={s.modalBtnPrimaryText}>Aplicar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function SortModal({
  visible,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selected: string | null;
  onSelect: (s: string | null) => void;
  onClose: () => void;
}) {
  const C = useTheme();

  const pick = (value: string | null) => {
    onSelect(value);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.modalOverlay}>
        <TouchableOpacity style={s.modalBackdrop} onPress={onClose} activeOpacity={1} />
        <View style={[s.modalSheet, { backgroundColor: C.elevated, borderColor: C.glassBorder }]}>
          <View style={[s.modalHandle, { backgroundColor: C.glassBorder }]} />
          <Text style={[s.modalTitle, { color: C.textPrimary }]}>Ordenar resultados</Text>

          <TouchableOpacity onPress={() => pick(null)} style={s.sortOption}>
            <Text style={[s.sortOptionText, { color: selected === null ? C.accent : C.textPrimary }]}>Predeterminado</Text>
            <Text style={[s.sortOptionHint, { color: C.textSecondary }]}>Relevancia si buscás, sino más recientes</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => pick('price_asc')} style={s.sortOption}>
            <Text style={[s.sortOptionText, { color: selected === 'price_asc' ? C.accent : C.textPrimary }]}>Precio: menor primero</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => pick('price_desc')} style={s.sortOption}>
            <Text style={[s.sortOptionText, { color: selected === 'price_desc' ? C.accent : C.textPrimary }]}>Precio: mayor primero</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => pick('newest')} style={s.sortOption}>
            <Text style={[s.sortOptionText, { color: selected === 'newest' ? C.accent : C.textPrimary }]}>Más recientes</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    padding: 24,
    paddingBottom: 40,
    gap: 16,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3, marginBottom: 4 },
  filterLabel: { fontSize: 13, fontWeight: '600', letterSpacing: 0.2 },
  modalCategoryWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modalCategoryChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  modalCategoryChipText: { fontSize: 13, fontWeight: '600' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  priceInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    gap: 6,
  },
  priceCurrency: { fontSize: 16, fontWeight: '600' },
  priceField: { flex: 1, fontSize: 16, fontWeight: '500' },
  priceSep: { width: 16, height: 1 },
  sortOption: {
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderColor: '#00000010',
  },
  sortOptionText: { fontSize: 16, fontWeight: '700' },
  sortOptionHint: { fontSize: 12, marginTop: 4 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalBtnSecondary: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnSecondaryText: { fontSize: 15, fontWeight: '700' },
  modalBtnPrimary: { flex: 2, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  modalBtnPrimaryText: { fontSize: 15, fontWeight: '800', color: '#050508' },
});
