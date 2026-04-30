import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";

import { useTheme } from "@/hooks/use-theme";
import { useAuthStore } from "@/store/auth";

export default function ProfilePinScreen() {
  const router = useRouter();
  const C = useTheme();
  const { enrollPin, isLoading, error, clearError } = useAuthStore();
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const onSave = async () => {
    clearError();
    setLocalError(null);
    if (pin.length < 6) {
      setLocalError("El PIN debe tener al menos 6 dígitos.");
      return;
    }
    if (pin !== confirmPin) {
      setLocalError("Los PIN no coinciden.");
      return;
    }
    const ok = await enrollPin(pin);
    if (ok) router.back();
  };

  return (
    <View style={[s.root, { backgroundColor: C.bg }]}>
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
        secureTextEntry
      />
      <TextInput
        style={[s.input, { color: C.textPrimary, borderColor: C.glassBorder, backgroundColor: C.glass }]}
        value={confirmPin}
        onChangeText={(value) => setConfirmPin(value.replace(/[^\d]/g, ""))}
        placeholder="Confirmar PIN"
        placeholderTextColor={C.textMuted}
        keyboardType="number-pad"
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
  );
}

const s = StyleSheet.create({
  root: { flex: 1, padding: 24, justifyContent: "center", gap: 12 },
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
