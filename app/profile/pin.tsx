import { useEffect, useState } from "react";
import { ActivityIndicator, Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import { useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { useTheme } from "@/hooks/use-theme";
import { getRefreshToken } from "@/services/http";
import { useAuthStore } from "@/store/auth";

export default function ProfilePinScreen() {
  const router = useRouter();
  const C = useTheme();
  const { enrollPin, updatePin, pinEnabled, loadPinAvailability, isLoading, error, clearError } = useAuthStore();
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    void loadPinAvailability();
    return () => clearError();
  }, [loadPinAvailability, clearError]);

  const onSave = async () => {
    clearError();
    setLocalError(null);
    if (pin.length !== 6) {
      setLocalError("El PIN debe tener exactamente 6 dígitos.");
      return;
    }
    if (pin !== confirmPin) {
      setLocalError("Los PIN no coinciden.");
      return;
    }

    let ok: boolean;
    if (pinEnabled) {
      ok = await updatePin(pin);
    } else {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) {
        setLocalError("No se pudo obtener el token de refresco.");
        return;
      }
      ok = await enrollPin(pin, refreshToken);
    }

    if (ok) router.back();
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={[s.root, { backgroundColor: C.bg }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.title, { color: C.textPrimary }]}>Configurar PIN</Text>
      <Text style={[s.subtitle, { color: C.textSecondary }]}>
        El PIN queda ligado a este dispositivo.
      </Text>

      <TextInput
        style={[s.input, { color: C.textPrimary, borderColor: C.glassBorder, backgroundColor: C.glass }]}
        value={pin}
        onChangeText={(value) => setPin(value.replace(/[^\d]/g, ""))}
        placeholder="Nuevo PIN"
        placeholderTextColor={C.textMuted}
        keyboardType="number-pad"
        maxLength={6}
        secureTextEntry
      />
      <TextInput
        style={[s.input, { color: C.textPrimary, borderColor: C.glassBorder, backgroundColor: C.glass }]}
        value={confirmPin}
        onChangeText={(value) => setConfirmPin(value.replace(/[^\d]/g, ""))}
        placeholder="Confirmar PIN"
        placeholderTextColor={C.textMuted}
        keyboardType="number-pad"
        maxLength={6}
        secureTextEntry
      />

      {localError ? <Text style={[s.error, { color: C.red }]}>{localError}</Text> : null}
      {error ? <Text style={[s.error, { color: C.red }]}>{error}</Text> : null}

      <TouchableOpacity
        style={[s.button, { backgroundColor: C.accent }, isLoading && s.disabled]}
        onPress={onSave}
        disabled={isLoading}
      >
        {isLoading ? <ActivityIndicator color="#403c30" size="small" /> : <Text style={s.buttonText}>Guardar PIN</Text>}
      </TouchableOpacity>
      </View>
    </TouchableWithoutFeedback>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, padding: 24, justifyContent: "center", gap: 12 },
  backBtn: { position: "absolute", top: 56, left: 24 },
  title: { fontSize: 28, fontWeight: "800" },
  subtitle: { fontSize: 14, marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    letterSpacing: 3,
  },
  button: { borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 10 },
  buttonText: { color: "#050508", fontWeight: "800", fontSize: 16 },
  error: { fontSize: 13 },
  disabled: { opacity: 0.6 },
});
