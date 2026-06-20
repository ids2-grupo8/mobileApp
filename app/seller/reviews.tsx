import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

import ReputationReviewCard from '@/components/reputation-review-card';
import { useTheme } from '@/hooks/use-theme';
import { fetchSellerReputation, type SellerReputation } from '@/services/reviews';

export default function SellerReviewsScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const C = useTheme();

  const [reputation, setReputation] = useState<SellerReputation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!email) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSellerReputation(email);
      setReputation(data);
    } catch {
      setError('No se pudieron cargar las calificaciones.');
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    void load();
  }, [load]);

  const count = reputation?.count ?? 0;

  return (
    <View style={[s.root, { backgroundColor: C.bg, paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={10}
          style={[s.iconBtn, { backgroundColor: C.glass, borderColor: C.glassBorder }]}>
          <MaterialIcons name="arrow-back" size={20} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: C.textPrimary }]}>Calificaciones</Text>
        <View style={s.iconBtnSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
        refreshControl={
          <RefreshControl refreshing={loading && !!reputation} onRefresh={load} tintColor={C.accent} />
        }>
        {loading && !reputation ? (
          <View style={s.center}>
            <ActivityIndicator color={C.accent} />
          </View>
        ) : error ? (
          <View style={s.center}>
            <Text style={[s.errorText, { color: C.textSecondary }]}>{error}</Text>
            <TouchableOpacity onPress={() => void load()} style={[s.retryBtn, { borderColor: C.glassBorder }]}>
              <Text style={[s.retryText, { color: C.accent }]}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : count === 0 ? (
          <View style={[s.emptyCard, { backgroundColor: C.glass, borderColor: C.glassBorder }]}>
            <MaterialIcons name="star-outline" size={32} color={C.textMuted} />
            <Text style={[s.emptyText, { color: C.textSecondary }]}>
              Este vendedor todavía no tiene calificaciones.
            </Text>
          </View>
        ) : (
          <>
            <Text style={[s.meta, { color: C.textMuted }]}>
              {count === 1 ? '1 calificación' : `${count} calificaciones`}
            </Text>
            <View style={s.list}>
              {reputation!.reviews.map((review) => (
                <ReputationReviewCard key={review.id} review={review} C={C} />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnSpacer: { width: 40, height: 40 },
  headerTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  scroll: { paddingHorizontal: 20, paddingTop: 8, gap: 12 },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 12 },
  errorText: { fontSize: 14, textAlign: 'center' },
  retryBtn: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 },
  retryText: { fontSize: 14, fontWeight: '600' },
  meta: { fontSize: 13, fontWeight: '600', marginBottom: 4, marginLeft: 4 },
  list: { gap: 12 },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    marginTop: 24,
  },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
