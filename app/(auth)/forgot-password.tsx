import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/hooks/use-theme";
import { useAuthStore } from "@/store/auth";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const C = useTheme();
  const { forgotPassword, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [touched, setTouched] = useState(false);
  const [sent, setSent] = useState(false);

  // Clean stored error when leaving the screen
  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const validate = (v: string) => {
    if (!v.trim()) return "El email es requerido.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Email inválido.";
    return "";
  };

  const handleSubmit = async () => {
    const err = validate(email);
    setEmailError(err);
    setTouched(true);
    if (err) return;
    // forgotPassword returns true on success, false on error.
    // Reading store.error after await is unreliable due to React batching.
    const ok = await forgotPassword(email.trim());
    if (ok) setSent(true);
  };

  return (
    <View style={[s.root, { paddingTop: insets.top, backgroundColor: C.bg }]}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[s.content, { paddingBottom: insets.bottom + 32 }]}>
          <TouchableOpacity style={s.back} onPress={() => router.back()}>
            <Text style={[s.backText, { color: C.textSecondary }]}>
              ← Volver
            </Text>
          </TouchableOpacity>

          <Text style={[s.brand, { color: C.accentText }]}>Bazaar</Text>
          <Text style={[s.title, { color: C.textPrimary }]}>
            ¿Olvidaste tu{"\n"}contraseña?
          </Text>
          <Text style={[s.subtitle, { color: C.textSecondary }]}>
            Ingresá tu email y te enviaremos un enlace para restablecerla.
          </Text>

          {sent ? (
            <View
              style={[
                s.successBox,
                {
                  backgroundColor: C.accentBg,
                  borderColor: "rgba(24,172,180,0.3)",
                },
              ]}
            >
              <Text style={[s.successText, { color: C.accentText }]}>
                Si el email está registrado, recibirás el enlace en breve.
              </Text>
            </View>
          ) : (
            <>
              <View style={s.field}>
                <Text style={[s.label, { color: C.textSecondary }]}>Email</Text>
                <TextInput
                  style={[
                    s.input,
                    {
                      backgroundColor: C.inputBg,
                      borderColor: C.inputBorder,
                      color: C.textPrimary,
                    },
                    touched && emailError
                      ? { borderColor: C.inputBorderError }
                      : null,
                  ]}
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    if (touched) setEmailError(validate(v));
                  }}
                  onBlur={() => {
                    setTouched(true);
                    setEmailError(validate(email));
                  }}
                  placeholder="tu@email.com"
                  placeholderTextColor={C.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="send"
                  onSubmitEditing={handleSubmit}
                />
                {touched && emailError ? (
                  <Text style={[s.errorText, { color: C.red }]}>
                    {emailError}
                  </Text>
                ) : null}
              </View>

              <TouchableOpacity
                style={[
                  s.btn,
                  { backgroundColor: C.accent },
                  isLoading && s.btnDisabled,
                ]}
                onPress={handleSubmit}
                disabled={isLoading}
                accessibilityRole="button"
              >
                {isLoading ? (
                  <ActivityIndicator color="#403c30" size="small" />
                ) : (
                  <Text style={s.btnText}>Enviar enlace</Text>
                )}
              </TouchableOpacity>

              {error ? (
                <Text style={[s.errorText, s.errorGeneral, { color: C.red }]}>
                  {error}
                </Text>
              ) : null}
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 16 },

  back: { marginBottom: 32 },
  backText: { fontSize: 15 },

  brand: { fontSize: 28, fontWeight: "800", marginBottom: 28 },
  title: { fontSize: 28, fontWeight: "700", lineHeight: 36, marginBottom: 12 },
  subtitle: { fontSize: 15, lineHeight: 22, marginBottom: 36 },

  field: { marginBottom: 24 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  errorText: { fontSize: 12, marginTop: 6 },
  errorGeneral: { textAlign: "center", marginTop: 14, fontSize: 13 },

  btn: { paddingVertical: 16, borderRadius: 14, alignItems: "center" },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 16, fontWeight: "700", color: "#403c30" },

  successBox: { borderWidth: 1, borderRadius: 12, padding: 16 },
  successText: { fontSize: 15, lineHeight: 22 },
});
