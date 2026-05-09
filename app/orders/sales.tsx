import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
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

import OrderCard from '@/components/order-card';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/auth';
import { useOrdersStore } from '@/store/orders';

export default function SalesScreen() {
  const C = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isLoggedIn } = useAuthStore();
  const { sales, salesState, salesError, loadSales } = useOrdersStore();

  useFocusEffect(
    useCallback(() => {
      if (!isLoggedIn) return;
      void loadSales();
    }, [isLoggedIn, loadSales]),
  );

  const refreshing = salesState === 'loading';

  return (
    <View style={[s.root, { backgroundColor: C.bg, paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={10}
          style={[s.iconBtn, { backgroundColor: C.glass, borderColor: C.glassBorder }]}>
          <MaterialIcons name="arrow-back" size={20} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: C.textPrimary }]}>Mis ventas</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadSales()}
            tintColor={C.accent}
          />
        }>
        {salesState === 'loading' && sales.length === 0 ? (
          <View style={s.emptyWrap}>
            <ActivityIndicator color={C.accent} />
          </View>
        ) : salesState === 'error' ? (
          <View style={s.emptyWrap}>
            <MaterialIcons name="error-outline" size={36} color={C.red} />
            <Text style={[s.emptyText, { color: C.textSecondary }]}>
              {salesError ?? 'No se pudieron cargar las ventas.'}
            </Text>
            <TouchableOpacity
              onPress={() => loadSales()}
              style={[s.retryBtn, { backgroundColor: C.accent }]}>
              <Text style={s.retryBtnText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : sales.length === 0 ? (
          <View style={s.emptyWrap}>
            <MaterialIcons name="storefront" size={48} color={C.textMuted} />
            <Text style={[s.emptyTitle, { color: C.textPrimary }]}>
              Todavía no tenés ventas
            </Text>
            <Text style={[s.emptyText, { color: C.textSecondary }]}>
              Las órdenes en las que aparezcas como vendedor se mostrarán acá.
            </Text>
          </View>
        ) : (
          <View style={s.list}>
            {sales.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                role="seller"
                C={C}
                onPress={() =>
                  router.push({ pathname: '/orders/[id]', params: { id: String(order.id) } })
                }
              />
            ))}
          </View>
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
  list: { gap: 12 },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyText: { fontSize: 13, textAlign: 'center', paddingHorizontal: 24 },
  retryBtn: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryBtnText: { color: '#050508', fontWeight: '700' },
});
