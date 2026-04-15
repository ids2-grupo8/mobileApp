import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: W, height: H } = Dimensions.get("window");

const IMAGES = [
  "https://picsum.photos/seed/baz-a/400/700",
  "https://picsum.photos/seed/baz-b/400/350",
  "https://picsum.photos/seed/baz-c/400/350",
  "https://picsum.photos/seed/baz-d/400/350",
];

// La landing siempre usa el tema oscuro — la imagen y el gradiente lo hacen natural.
export default function LandingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={s.container}>
      {/* Image grid */}
      <View style={s.grid}>
        <Image
          source={{ uri: IMAGES[0] }}
          style={s.imgLeft}
          contentFit="cover"
        />
        <View style={s.right}>
          <Image
            source={{ uri: IMAGES[1] }}
            style={s.imgRightTop}
            contentFit="cover"
          />
          <View style={s.rightBottom}>
            <Image
              source={{ uri: IMAGES[2] }}
              style={s.imgRightBL}
              contentFit="cover"
            />
            <Image
              source={{ uri: IMAGES[3] }}
              style={s.imgRightBR}
              contentFit="cover"
            />
          </View>
        </View>
      </View>

      {/* Gradient overlay */}
      <LinearGradient
        colors={["transparent", "rgba(11,11,15,0.6)", "#0b0b0f"]}
        locations={[0, 0.45, 0.78]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Bottom content */}
      <View style={[s.bottom, { paddingBottom: insets.bottom + 32 }]}>
        <Text style={s.brand}>Bazaar</Text>
        <Text style={s.tagline}>Discover Your Style, Elevated.</Text>

        <TouchableOpacity
          style={s.btn}
          onPress={() => router.push("/(auth)/login")}
          accessibilityRole="button"
          accessibilityLabel="Continuar"
        >
          <Text style={s.btnText}>Continuar</Text>
        </TouchableOpacity>

        <View style={s.row}>
          <Text style={s.sub}>¿No tenés cuenta? </Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
            <Text style={s.link}>Registrate</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0b0f" },

  grid: { flex: 1, flexDirection: "row", gap: 3 },
  imgLeft: { width: W * 0.5 - 1.5, height: H },
  right: { flex: 1, gap: 3 },
  imgRightTop: { flex: 1 },
  rightBottom: { flex: 1, flexDirection: "row", gap: 3 },
  imgRightBL: { flex: 1 },
  imgRightBR: { flex: 1 },

  bottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 28,
    alignItems: "center",
  },
  brand: {
    fontSize: 40,
    fontWeight: "800",
    color: "#f3f4f6",
    letterSpacing: 1,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 15,
    color: "#9ca3af",
    marginBottom: 36,
    letterSpacing: 0.3,
  },

  btn: {
    width: "100%",
    backgroundColor: "#18acb4",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 18,
  },
  btnText: { fontSize: 16, fontWeight: "700", color: "#0b0b0f" },

  row: { flexDirection: "row", alignItems: "center" },
  sub: { fontSize: 14, color: "#9ca3af" },
  link: { fontSize: 14, color: "#18acb4", fontWeight: "600" },
});
