import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Fragment } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import {
  ReputationReviewRow,
  type ReputationReviewItem,
} from '@/components/reputation-review-card';
import type { ThemeColors } from '@/constants/colors';

type Props = {
  reviews: ReputationReviewItem[];
  totalCount: number;
  showSeeAll: boolean;
  onSeeAll: () => void;
  C: ThemeColors;
};

export default function ReputationReviewsPreviewPanel({
  reviews,
  totalCount,
  showSeeAll,
  onSeeAll,
  C,
}: Props) {
  return (
    <View
      style={[
        s.panel,
        { backgroundColor: C.glass, borderColor: C.glassBorder, shadowColor: C.shadowDark },
      ]}
    >
      {reviews.map((review, index) => (
        <Fragment key={review.id}>
          {index > 0 ? (
            <View style={[s.separator, { backgroundColor: C.glassBorder }]} />
          ) : null}
          <View style={s.reviewBlock}>
            <ReputationReviewRow review={review} C={C} />
          </View>
        </Fragment>
      ))}
      {showSeeAll ? (
        <>
          <View style={[s.separator, { backgroundColor: C.glassBorder }]} />
          <TouchableOpacity
            style={s.seeAllRow}
            onPress={onSeeAll}
            activeOpacity={0.75}
          >
            <Text style={[s.seeAllText, { color: C.accent }]}>
              Ver todas las calificaciones ({totalCount})
            </Text>
            <MaterialIcons name="chevron-right" size={20} color={C.accent} />
          </TouchableOpacity>
        </>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 4,
  },
  separator: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 },
  reviewBlock: { padding: 14 },
  seeAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  seeAllText: { fontSize: 14, fontWeight: '700' },
});
