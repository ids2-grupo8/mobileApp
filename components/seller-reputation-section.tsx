import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import StarRating from '@/components/star-rating';
import type { ThemeColors } from '@/constants/colors';
import {
  fetchSellerReputation,
  type SellerReputation,
  type SellerReviewDetail,
} from '@/services/reviews';

type Props = {
  email: string;
  C: ThemeColors;
  /** Notifies the parent with the latest summary so it can update the Stats card. */
  onSummary?: (summary: { average_score: number | null; count: number }) => void;
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatReviewDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatAverage(avg: number | null): string {
  if (avg === null) return '—';
  return avg.toFixed(1);
}

function pluralizeReviews(count: number): string {
  return count === 1 ? '1 calificación' : `${count} calificaciones`;
}

// ─── Skeleton (matches SkeletonBox in seller/[email].tsx) ──────────────────

function SkeletonBox({
  width,
  height,
  borderRadius = 8,
  color,
  style,
}: {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  color: string;
  style?: object;
}) {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.85, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [opacity]);
  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: color, opacity }, style]}
    />
  );
}

function ReputationSkeleton({ C }: { C: ThemeColors }) {
  return (
    <View style={{ gap: 12 }}>
      <SkeletonBox width="100%" height={88} borderRadius={16} color={C.skeletonBase} />
      <SkeletonBox width="100%" height={92} borderRadius={16} color={C.skeletonBase} />
      <SkeletonBox width="100%" height={92} borderRadius={16} color={C.skeletonBase} />
    </View>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function SummaryCard({
  reputation,
  C,
}: {
  reputation: SellerReputation;
  C: ThemeColors;
}) {
  const stars = reputation.average_score !== null ? reputation.average_score / 2 : null;
  return (
    <View
      style={[
        s.summaryCard,
        { backgroundColor: C.glass, borderColor: C.glassBorder, shadowColor: C.shadowDark },
      ]}
    >
      <View style={s.summaryLeft}>
        <Text style={[s.summaryAvg, { color: C.textPrimary }]}>
          {formatAverage(stars)}
        </Text>
        <Text style={[s.summaryScale, { color: C.textMuted }]}>/ 5</Text>
      </View>
      <View style={s.summaryRight}>
        <StarRating value={stars} size={20} />
        <Text style={[s.summaryCount, { color: C.textSecondary }]}>
          {pluralizeReviews(reputation.count)}
        </Text>
      </View>
    </View>
  );
}

function EmptyState({ C }: { C: ThemeColors }) {
  return (
    <View style={[s.emptyCard, { backgroundColor: C.glass, borderColor: C.glassBorder }]}>
      <MaterialIcons name="star-outline" size={32} color={C.textMuted} />
      <Text style={[s.emptyText, { color: C.textSecondary }]}>
        Este vendedor todavía no tiene calificaciones.
      </Text>
    </View>
  );
}

function ReviewItem({
  review,
  C,
}: {
  review: SellerReviewDetail;
  C: ThemeColors;
}) {
  const dateText = formatReviewDate(review.created_at);
  return (
    <View style={[s.reviewCard, { backgroundColor: C.glass, borderColor: C.glassBorder }]}>
      <StarRating value={review.score / 2} size={18} />
      {review.comment ? (
        <Text style={[s.reviewComment, { color: C.textPrimary }]}>{review.comment}</Text>
      ) : null}
      {dateText ? (
        <Text style={[s.reviewMeta, { color: C.textMuted }]}>{dateText}</Text>
      ) : null}
    </View>
  );
}

function ErrorCard({
  message,
  onRetry,
  C,
}: {
  message: string;
  onRetry: () => void;
  C: ThemeColors;
}) {
  return (
    <View style={[s.errorCard, { backgroundColor: C.glass, borderColor: C.glassBorder }]}>
      <Text style={[s.errorText, { color: C.red }]}>{message}</Text>
      <TouchableOpacity
        style={[s.retryBtn, { borderColor: C.glassBorder }]}
        onPress={onRetry}
        activeOpacity={0.75}
      >
        <MaterialIcons name="refresh" size={16} color={C.textPrimary} />
        <Text style={[s.retryBtnText, { color: C.textPrimary }]}>Reintentar</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────

export default function SellerReputationSection({ email, C, onSummary }: Props) {
  const [reputation, setReputation] = useState<SellerReputation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!email) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchSellerReputation(email);
        if (cancelled) return;
        setReputation(data);
        onSummary?.({ average_score: data.average_score, count: data.count });
      } catch {
        if (!cancelled) setError('No se pudo cargar la reputación.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [email, onSummary]);

  const handleRetry = () => {
    setReputation(null);
    setError(null);
    setLoading(true);
    fetchSellerReputation(email)
      .then((data) => {
        setReputation(data);
        onSummary?.({ average_score: data.average_score, count: data.count });
      })
      .catch(() => setError('No se pudo cargar la reputación.'))
      .finally(() => setLoading(false));
  };

  return (
    <View style={s.root}>
      <Text style={[s.sectionLabel, { color: C.textMuted }]}>Reputación</Text>

      {loading ? (
        <ReputationSkeleton C={C} />
      ) : error ? (
        <ErrorCard message={error} onRetry={handleRetry} C={C} />
      ) : !reputation || reputation.count === 0 ? (
        <EmptyState C={C} />
      ) : (
        <View style={{ gap: 12 }}>
          <SummaryCard reputation={reputation} C={C} />
          {reputation.reviews.map((review) => (
            <ReviewItem key={review.id} review={review} C={C} />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { marginBottom: 24 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 14,
    marginLeft: 4,
  },

  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 4,
  },
  summaryLeft: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  summaryAvg: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  summaryScale: { fontSize: 14, fontWeight: '600' },
  summaryRight: { alignItems: 'flex-end', gap: 6 },
  summaryCount: { fontSize: 12, fontWeight: '500' },

  emptyCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  reviewCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  reviewComment: { fontSize: 14, lineHeight: 20 },
  reviewMeta: { fontSize: 11, fontWeight: '500' },

  errorCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  errorText: { fontSize: 13, fontWeight: '500' },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryBtnText: { fontSize: 13, fontWeight: '600' },
});
