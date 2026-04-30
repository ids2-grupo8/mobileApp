import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";

import { useTheme } from "@/hooks/use-theme";
import { useAuthStore } from "@/store/auth";

export default function PinLoginScreen() {
  const router = useRouter();
  const C = useTheme();
  const { loginWithPin, isLoading, error, clearError } = useAuthStore();
  const [pin, setPin] = useState("");

  const onSubmit = async () => {
    clearError();
    await loginWithPin(pin);
  };

  return (
    <View style={[s.root, { backgroundColor: C.bg }]}>
      <Text style={[s.title, { color: C.textPrimary }]}>Ingresá con PIN</Text>
      <Text style={[s.subtitle, { color: C.textSecondary }]}>
        Accedé rápido desde este dispositivo.
      </Text>

      {!!error && (
        <Text style={[s.error, { color: C.red }]}>{error}</Text>
      )}

      <TextInput
        style={[
          s.input,
          { color: C.textPrimary, borderColor: C.glassBorder, backgroundColor: C.glass },
        ]}
        value={pin}
        onChangeText={(value) => setPin(value.replace(/[^\d]/g, ""))}
        placeholder="PIN de 6 dígitos"
        placeholderTextColor={C.textMuted}
        keyboardType="number-pad"
        maxLength={12}
        secureTextEntry
      />

      <TouchableOpacity
        style={[s.button, { backgroundColor: C.accent }, isLoading && s.disabled]}
        onPress={onSubmit}
        disabled={isLoading || pin.length < 6}
      >
        {isLoading ? (
          <ActivityIndicator color="#403c30" size="small" />
        ) : (
          <Text style={s.buttonText}>Entrar con PIN</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
        <Text style={[s.link, { color: C.accentText }]}>Usar email y contraseña</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: "center", padding: 24, gap: 14 },
  title: { fontSize: 28, fontWeight: "800" },
  subtitle: { fontSize: 14, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    letterSpacing: 4,
  },
  button: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: { color: "#050508", fontWeight: "800", fontSize: 16 },
  link: { textAlign: "center", fontWeight: "600", marginTop: 8 },
  error: { fontSize: 13 },
  disabled: { opacity: 0.6 },
});
