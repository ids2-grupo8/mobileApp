import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useUserStore } from "@/store/user";
import { useTheme } from "@/hooks/use-theme";
import type { ThemeColors } from "@/constants/colors";

// ─── Toast ───────────────────────────────────────────────────────────────────

function Toast({
  message,
  visible,
  C,
}: {
  message: string;
  visible: boolean;
  C: ThemeColors;
}) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(1800),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, opacity]);

  return (
    <Animated.View style={[s.toastWrap, { opacity }]} pointerEvents="none">
      <View
        style={[
          s.toastPill,
          { backgroundColor: C.accentBg, borderColor: "rgba(197,241,53,0.3)" },
        ]}
      >
        <Text style={[s.toastText, { color: C.accentText }]}>{message}</Text>
      </View>
    </Animated.View>
  );
}

// ─── Avatar picker ───────────────────────────────────────────────────────────

function AvatarPicker({
  name,
  uri,
  onPick,
  C,
}: {
  name: string;
  uri?: string;
  onPick: () => void;
  C: ThemeColors;
}) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <TouchableOpacity
      style={s.avWrap}
      onPress={onPick}
      accessibilityLabel="Cambiar foto de perfil"
      accessibilityRole="button"
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={[s.avImage, { borderColor: C.accent }]}
        />
      ) : (
        <View
          style={[
            s.avPlaceholder,
            { backgroundColor: C.accentBg, borderColor: C.accent },
          ]}
        >
          <Text style={[s.avInitials, { color: C.accent }]}>{initials}</Text>
        </View>
      )}
      <View style={[s.avBadge, { backgroundColor: C.accent }]}>
        <Text style={s.avBadgeIcon}>⊕</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Field ───────────────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChangeText,
  onBlur,
  placeholder,
  error,
  multiline,
  autoCapitalize,
  returnKeyType,
  onSubmitEditing,
  C,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  onBlur?: () => void;
  placeholder: string;
  error?: string;
  multiline?: boolean;
  autoCapitalize?: "none" | "sentences" | "words";
  returnKeyType?: "next" | "done";
  onSubmitEditing?: () => void;
  C: ThemeColors;
}) {
  return (
    <View style={s.fieldWrap}>
      <Text style={[s.fieldLabel, { color: C.textSecondary }]}>{label}</Text>
      <TextInput
        style={[
          s.fieldInput,
          {
            backgroundColor: C.inputBg,
            borderColor: error ? C.inputBorderError : C.inputBorder,
            color: C.textPrimary,
          },
          multiline && s.fieldMultiline,
        ]}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor={C.textMuted}
        autoCapitalize={autoCapitalize ?? "sentences"}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        textAlignVertical={multiline ? "top" : "center"}
        selectionColor={C.accent}
      />
      {error ? (
        <Text style={[s.fieldError, { color: C.red }]}>{error}</Text>
      ) : null}
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const C = useTheme();
  const { profile, saving, updateProfile } = useUserStore();

  const [name, setName] = useState(profile?.name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [avatarUri, setAvatarUri] = useState<string | undefined>(
    profile?.avatarUrl,
  );
  const [nameError, setNameError] = useState("");
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setBio(profile.bio);
      setAvatarUri(profile.avatarUrl);
    }
  }, [profile]);

  const validateName = (v: string) => {
    if (!v.trim()) {
      setNameError("El nombre no puede estar vacío.");
      return false;
    }
    if (v.trim().length < 2) {
      setNameError("Mínimo 2 caracteres.");
      return false;
    }
    setNameError("");
    return true;
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permiso requerido",
        "Necesitamos acceso a la galería para cambiar tu foto.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!validateName(name)) return;
    await updateProfile({
      name: name.trim(),
      bio: bio.trim(),
      avatarUrl: avatarUri,
    });
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      router.back();
    }, 2400);
  };

  return (
    <View style={[s.root, { paddingTop: insets.top, backgroundColor: C.bg }]}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header bar */}
        <View style={[s.topBar, { borderBottomColor: C.border }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={s.backBtn}
            accessibilityRole="button"
          >
            <Text style={[s.backText, { color: C.textSecondary }]}>
              ← Volver
            </Text>
          </TouchableOpacity>
          <Text style={[s.topTitle, { color: C.textPrimary }]}>
            Editar perfil
          </Text>
          <View style={s.backBtn} />
        </View>

        <ScrollView
          contentContainerStyle={[
            s.scroll,
            { paddingBottom: insets.bottom + 40 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AvatarPicker
            name={name || profile?.name || "?"}
            uri={avatarUri}
            onPick={handlePickImage}
            C={C}
          />
          <Text style={[s.changePhotoLabel, { color: C.accentText }]}>
            Cambiar foto
          </Text>

          <View style={s.form}>
            <Field
              label="Nombre completo"
              value={name}
              onChangeText={(v) => {
                setName(v);
                if (nameError) validateName(v);
              }}
              onBlur={() => validateName(name)}
              placeholder="Tu nombre"
              error={nameError}
              autoCapitalize="words"
              returnKeyType="next"
              C={C}
            />
            <Field
              label="Descripción"
              value={bio}
              onChangeText={setBio}
              placeholder="Contá algo sobre vos o tu tienda"
              multiline
              C={C}
            />
          </View>

          <TouchableOpacity
            style={[
              s.saveBtn,
              { backgroundColor: C.accent },
              saving && s.saveBtnDisabled,
            ]}
            onPress={handleSave}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Guardar cambios"
          >
            {saving ? (
              <ActivityIndicator color="#0B0B0F" size="small" />
            ) : (
              <Text style={s.saveBtnText}>Guardar cambios</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Toast message="¡Perfil actualizado!" visible={showToast} C={C} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { width: 80 },
  backText: { fontSize: 14 },
  topTitle: { fontSize: 16, fontWeight: "700" },

  scroll: { paddingHorizontal: 24, paddingTop: 32 },
  changePhotoLabel: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 36,
  },

  form: { gap: 24 },

  saveBtn: {
    marginTop: 40,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: "700", color: "#0B0B0F" },

  // Toast
  toastWrap: {
    position: "absolute",
    bottom: 52,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 100,
  },
  toastPill: {
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 24,
  },
  toastText: { fontWeight: "600", fontSize: 14 },

  // Avatar
  avWrap: { width: 96, height: 96, alignSelf: "center", marginBottom: 10 },
  avImage: { width: 96, height: 96, borderRadius: 48, borderWidth: 2 },
  avPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avInitials: { fontSize: 32, fontWeight: "700" },
  avBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  avBadgeIcon: {
    fontSize: 18,
    color: "#0B0B0F",
    lineHeight: 22,
    fontWeight: "700",
  },

  // Field
  fieldWrap: { gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: "600" },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  fieldMultiline: { height: 110, paddingTop: 14 },
  fieldError: { fontSize: 12, marginTop: 2 },
});
