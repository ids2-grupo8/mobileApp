import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: W, height: H } = Dimensions.get('window');

const IMAGES = [
  'https://picsum.photos/seed/baz-a/400/700',
  'https://picsum.photos/seed/baz-b/400/350',
  'https://picsum.photos/seed/baz-c/400/350',
  'https://picsum.photos/seed/baz-d/400/350',
];

export default function LandingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* Image grid */}
      <View style={styles.grid}>
        {/* Left — tall */}
        <Image source={{ uri: IMAGES[0] }} style={styles.imgLeft} contentFit="cover" />

        {/* Right — stacked */}
        <View style={styles.right}>
          <Image source={{ uri: IMAGES[1] }} style={styles.imgRightTop} contentFit="cover" />
          <View style={styles.rightBottom}>
            <Image source={{ uri: IMAGES[2] }} style={styles.imgRightBL} contentFit="cover" />
            <Image source={{ uri: IMAGES[3] }} style={styles.imgRightBR} contentFit="cover" />
          </View>
        </View>
      </View>

      {/* Gradient overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(11,11,15,0.6)', '#0B0B0F']}
        locations={[0, 0.45, 0.78]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Bottom content */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 32 }]}>
        <Text style={styles.brand}>Bazaar</Text>
        <Text style={styles.tagline}>Discover Your Style, Elevated.</Text>

        <TouchableOpacity
          style={styles.btn}
          onPress={() => router.push('/(auth)/login')}
          accessibilityRole="button"
          accessibilityLabel="Continuar">
          <Text style={styles.btnText}>Continuar</Text>
        </TouchableOpacity>

        <View style={styles.row}>
          <Text style={styles.sub}>¿No tenés cuenta? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={[styles.sub, styles.link]}>Registrate</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0F' },

  // Grid
  grid: { flex: 1, flexDirection: 'row', gap: 3 },
  imgLeft: { width: W * 0.5 - 1.5, height: H },
  right: { flex: 1, gap: 3 },
  imgRightTop: { flex: 1 },
  rightBottom: { flex: 1, flexDirection: 'row', gap: 3 },
  imgRightBL: { flex: 1 },
  imgRightBR: { flex: 1 },

  // Bottom
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  brand: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 15,
    color: '#8B8FA8',
    marginBottom: 36,
    letterSpacing: 0.3,
  },
  btn: {
    width: '100%',
    backgroundColor: '#C5F135',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 18,
  },
  btnText: { fontSize: 16, fontWeight: '700', color: '#0B0B0F' },
  row: { flexDirection: 'row', alignItems: 'center' },
  sub: { fontSize: 14, color: '#8B8FA8' },
  link: { color: '#C5F135', fontWeight: '600' },
});
