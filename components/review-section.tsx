import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import StarRating from '@/components/star-rating';
import type { ThemeColors } from '@/constants/colors';
import type { CatalogProduct } from '@/services/catalog';
import type { OrderSummary } from '@/services/orders';
import {
  fetchOrderReviews,
  submitProductReview,
  submitSellerReview,
  type ReviewRecord,
} from '@/services/reviews';

// ─── Types ──────────────────────────────────────────────────────────────────

type FormState = {
  stars: number;
  comment: string;
  submitting: boolean;
  error: string | null;
};

function emptyForm(): FormState {
  return { stars: 0, comment: '', submitting: false, error: null };
}

type Props = {
  order: OrderSummary;
  productMap: Record<string, CatalogProduct | null>;
  C: ThemeColors;
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function ReviewSection({ order, productMap, C }: Props) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sellerReview, setSellerReview] = useState<ReviewRecord | null>(null);
  const [productReviews, setProductReviews] = useState<Record<string, ReviewRecord>>({});
  const [sellerForm, setSellerForm] = useState<FormState>(emptyForm());
  const [productForms, setProductForms] = useState<Record<string, FormState>>({});

  const uniqueProductIds = Array.from(new Set(order.items.map((i) => i.product_id)));

  useEffect(() => {
    void loadReviews();
  }, [order.id]);

  async function loadReviews() {
    setLoading(true);
    setLoadError(null);
    try {
      const reviews = await fetchOrderReviews(order.id);
      setSellerReview(reviews.find((r) => r.type === 'seller') ?? null);
      const byProduct: Record<string, ReviewRecord> = {};
      for (const r of reviews) {
        if (r.type === 'product' && r.product_id) byProduct[r.product_id] = r;
      }
      setProductReviews(byProduct);
    } catch {
      setLoadError('No se pudieron cargar las calificaciones.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitSeller() {
    if (sellerForm.stars === 0) {
      setSellerForm((f) => ({ ...f, error: 'Seleccioná al menos media estrella.' }));
      return;
    }
    setSellerForm((f) => ({ ...f, submitting: true, error: null }));
    try {
      const score = Math.round(sellerForm.stars * 2); // 0.5★ → 1, 5★ → 10
      await submitSellerReview(order.id, score, sellerForm.comment || undefined);
      setSellerReview({ order_id: order.id, score, comment: sellerForm.comment || undefined, type: 'seller' });
    } catch (e) {
      setSellerForm((f) => ({
        ...f,
        submitting: false,
        error: e instanceof Error ? e.message : 'Error al enviar la calificación.',
      }));
    }
  }

  async function handleSubmitProduct(productId: string) {
    const form = productForms[productId] ?? emptyForm();
    if (form.stars === 0) {
      setProductForms((prev) => ({
        ...prev,
        [productId]: { ...(prev[productId] ?? emptyForm()), error: 'Seleccioná al menos media estrella.' },
      }));
      return;
    }
    setProductForms((prev) => ({
      ...prev,
      [productId]: { ...(prev[productId] ?? emptyForm()), submitting: true, error: null },
    }));
    try {
      const score = Math.round(form.stars * 2);
      await submitProductReview(order.id, productId, score, form.comment || undefined);
      setProductReviews((prev) => ({
        ...prev,
        [productId]: { order_id: order.id, score, comment: form.comment || undefined, type: 'product', product_id: productId },
      }));
    } catch (e) {
      setProductForms((prev) => ({
        ...prev,
        [productId]: {
          ...(prev[productId] ?? emptyForm()),
          submitting: false,
          error: e instanceof Error ? e.message : 'Error al enviar la calificación.',
        },
      }));
    }
  }

  // ── Loading / error states ────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[s.card, { backgroundColor: C.glass, borderColor: C.glassBorder, alignItems: 'center' }]}>
        <ActivityIndicator color={C.accent} size="small" />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={[s.card, { backgroundColor: C.glass, borderColor: C.glassBorder }]}>
        <Text style={[s.errorText, { color: C.red }]}>{loadError}</Text>
        <TouchableOpacity
          onPress={() => void loadReviews()}
          style={[s.outlineBtn, { borderColor: C.glassBorder }]}>
          <Text style={[s.outlineBtnText, { color: C.textPrimary }]}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={{ gap: 12 }}>
      <Text style={[s.sectionHeader, { color: C.textPrimary }]}>Calificaciones</Text>

      {/* ── Seller review ─────────────────────────────────────────────────── */}
      <View style={[s.card, { backgroundColor: C.glass, borderColor: C.glassBorder }]}>
        <View style={s.cardHeader}>
          <MaterialIcons name="storefront" size={16} color={C.textMuted} />
          <Text style={[s.cardLabel, { color: C.textMuted }]}>VENDEDOR</Text>
        </View>
        <Text style={[s.counterparty, { color: C.textPrimary }]}>{order.seller}</Text>

        {sellerReview !== null ? (
          <ReviewedDisplay review={sellerReview} C={C} />
        ) : (
          <ReviewForm
            form={sellerForm}
            onStarsChange={(v) => setSellerForm((f) => ({ ...f, stars: v, error: null }))}
            onCommentChange={(t) => setSellerForm((f) => ({ ...f, comment: t }))}
            onSubmit={() => void handleSubmitSeller()}
            C={C}
          />
        )}
      </View>

      {/* ── Product reviews ───────────────────────────────────────────────── */}
      {uniqueProductIds.map((productId) => {
        const product = productMap[productId];
        const existing = productReviews[productId];
        const form = productForms[productId] ?? emptyForm();

        return (
          <View key={productId} style={[s.card, { backgroundColor: C.glass, borderColor: C.glassBorder }]}>
            <View style={s.cardHeader}>
              <MaterialIcons name="inventory-2" size={16} color={C.textMuted} />
              <Text style={[s.cardLabel, { color: C.textMuted }]}>PRODUCTO</Text>
            </View>
            <Text style={[s.counterparty, { color: C.textPrimary }]} numberOfLines={2}>
              {product?.title ?? `Producto ${productId}`}
            </Text>

            {existing ? (
              <ReviewedDisplay review={existing} C={C} />
            ) : (
              <ReviewForm
                form={form}
                onStarsChange={(v) =>
                  setProductForms((prev) => ({
                    ...prev,
                    [productId]: { ...(prev[productId] ?? emptyForm()), stars: v, error: null },
                  }))
                }
                onCommentChange={(t) =>
                  setProductForms((prev) => ({
                    ...prev,
                    [productId]: { ...(prev[productId] ?? emptyForm()), comment: t },
                  }))
                }
                onSubmit={() => void handleSubmitProduct(productId)}
                C={C}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function ReviewedDisplay({ review, C }: { review: ReviewRecord; C: ThemeColors }) {
  return (
    <View style={{ gap: 8 }}>
      <StarRating value={review.score / 2} size={26} />
      {review.comment ? (
        <Text style={[s.commentText, { color: C.textSecondary }]}>"{review.comment}"</Text>
      ) : null}
      <View style={[s.doneBadge, { backgroundColor: C.accentBg }]}>
        <MaterialIcons name="check-circle" size={13} color={C.accent} />
        <Text style={[s.doneBadgeText, { color: C.accent }]}>Calificado</Text>
      </View>
    </View>
  );
}

function ReviewForm({
  form,
  onStarsChange,
  onCommentChange,
  onSubmit,
  C,
}: {
  form: FormState;
  onStarsChange: (v: number) => void;
  onCommentChange: (t: string) => void;
  onSubmit: () => void;
  C: ThemeColors;
}) {
  return (
    <View style={{ gap: 12 }}>
      <StarRating value={form.stars} onChange={onStarsChange} size={36} />
      {form.stars > 0 && (
        <Text style={[s.starsLabel, { color: C.textSecondary }]}>
          {form.stars} {form.stars === 1 ? 'estrella' : 'estrellas'} · {Math.round(form.stars * 2)}/10
        </Text>
      )}
      <TextInput
        style={[s.input, { backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.textPrimary }]}
        placeholder="Comentario (opcional)"
        placeholderTextColor={C.textMuted}
        value={form.comment}
        onChangeText={onCommentChange}
        multiline
        numberOfLines={3}
        maxLength={500}
        textAlignVertical="top"
      />
      {form.error ? (
        <Text style={[s.errorText, { color: C.red }]}>{form.error}</Text>
      ) : null}
      <TouchableOpacity
        onPress={onSubmit}
        disabled={form.submitting}
        style={[s.submitBtn, { backgroundColor: C.accent }, form.submitting && s.btnDisabled]}>
        {form.submitting ? (
          <ActivityIndicator color="#050508" size="small" />
        ) : (
          <Text style={s.submitBtnText}>Enviar calificación</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  counterparty: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  starsLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: -6,
  },
  commentText: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 19,
  },
  doneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  doneBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 80,
    lineHeight: 20,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
  },
  submitBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  btnDisabled: { opacity: 0.6 },
  submitBtnText: {
    color: '#050508',
    fontSize: 14,
    fontWeight: '700',
  },
  outlineBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  outlineBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
