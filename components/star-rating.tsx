import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

type Props = {
  /** 0 = unrated, 0.5–5.0 in half-step increments */
  value: number;
  /** When provided the component is interactive */
  onChange?: (value: number) => void;
  size?: number;
  color?: string;
};

export default function StarRating({
  value,
  onChange,
  size = 32,
  color = '#FBBF24',
}: Props) {
  return (
    <View style={s.row}>
      {([1, 2, 3, 4, 5] as const).map((star) => {
        const filled = value >= star;
        const half = !filled && value >= star - 0.5;
        const name: 'star' | 'star-half' | 'star-border' = filled
          ? 'star'
          : half
            ? 'star-half'
            : 'star-border';
        const iconColor = filled || half ? color : 'rgba(251,191,36,0.22)';

        return (
          <View key={star} style={[s.starWrap, { width: size, height: size }]}>
            <MaterialIcons name={name} size={size} color={iconColor} />
            {onChange && (
              <>
                {/* Left half → half star */}
                <TouchableOpacity
                  style={{ position: 'absolute', top: 0, left: 0, width: size / 2, height: size }}
                  onPress={() => onChange(star - 0.5)}
                  activeOpacity={0.7}
                />
                {/* Right half → full star */}
                <TouchableOpacity
                  style={{ position: 'absolute', top: 0, right: 0, width: size / 2, height: size }}
                  onPress={() => onChange(star)}
                  activeOpacity={0.7}
                />
              </>
            )}
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  starWrap: { position: 'relative' },
});
