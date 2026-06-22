import { StyleSheet, Text, View } from 'react-native';

import StarRating from '@/components/star-rating';
import type { ThemeColors } from '@/constants/colors';

export type ReputationReviewItem = {
  id: number;
  score: number;
  comment: string | null;
  created_at: string | null;
};

export function formatReviewDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function ReputationReviewRow({
  review,
  C,
}: {
  review: ReputationReviewItem;
  C: ThemeColors;
}) {
  const dateText = formatReviewDate(review.created_at);
  return (
    <View style={s.reviewRow}>
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

export default function ReputationReviewCard({
  review,
  C,
}: {
  review: ReputationReviewItem;
  C: ThemeColors;
}) {
  return (
    <View style={[s.reviewCard, { backgroundColor: C.glass, borderColor: C.glassBorder }]}>
      <View style={s.reviewCardInner}>
        <ReputationReviewRow review={review} C={C} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  reviewCard: {
    borderWidth: 1,
    borderRadius: 16,
  },
  reviewCardInner: { padding: 14 },
  reviewRow: { gap: 8 },
  reviewComment: { fontSize: 14, lineHeight: 20 },
  reviewMeta: { fontSize: 11, fontWeight: '500' },
});
