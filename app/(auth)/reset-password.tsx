import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/hooks/use-theme";
import { useAuthStore } from "@/store/auth";

// ─── Validation ───────────────────────────────────────────────────────────────

type FieldErrors = { password?: string; confirm?: string };

function validate(password: string, confirm: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!password) {
    errors.password = "La contraseña es requerida.";
  } else if (password.length < 8) {
    errors.password = "Mínimo 8 caracteres.";
  } else if (!/[A-Z]/.test(password)) {
    errors.password = "Debe incluir al menos una mayúscula.";
  } else if (!/[a-z]/.test(password)) {
    errors.password = "Debe incluir al menos una minúscula.";
  } else if (!/[0-9]/.test(password)) {
    errors.password = "Debe incluir al menos un número.";
  }
  if (!confirm) {
    errors.confirm = "Confirmá tu contraseña.";
  } else if (password && confirm !== password) {
    errors.confirm = "Las contraseñas no coinciden.";
  }
  return errors;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ResetPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const C = useTheme();

  // Tokens and email arrive as route params injected by the deep link handler
  const { access_token, refresh_token, email } = useLocalSearchParams<{
    access_token: string;
    refresh_token: string;
    email: string;
  }>();

  const { resetPassword, forgotPassword, isLoading, error, clearError } =
    useAuthStore();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState({ password: false, confirm: false });
  const [succeeded, setSucceeded] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  const confirmRef = useRef<TextInput>(null);

  // Clean stored error when leaving the screen
  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  // If tokens are missing (direct navigation without a valid link), show an
  // actionable error state instead of a broken form.
  const missingTokens = !access_token || !refresh_token;

  const handleBlur = (field: "password" | "confirm") => {
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors(validate(password, confirm));
  };

  const handleSubmit = async () => {
    const errs = validate(password, confirm);
    setErrors(errs);
    setTouched({ password: true, confirm: true });
    if (Object.keys(errs).length > 0) return;

    const ok = await resetPassword({
      access_token: access_token as string,
      refresh_token: refresh_token as string,
      new_password: password,
      confirm_password: confirm,
    });

    if (ok) setSucceeded(true);
  };

  // ─── Success state ─────────────────────────────────────────────────────────
  if (succeeded) {
    return (
      <View style={[s.root, { paddingTop: insets.top, backgroundColor: C.bg }]}>
        <View style={[s.center, { paddingBottom: insets.bottom + 32 }]}>
          <Text style={[s.brand, { color: C.accentText }]}>Bazaar</Text>
          <View
            style={[
              s.successBox,
              {
                backgroundColor: C.accentBg,
                borderColor: "rgba(24,172,180,0.3)",
              },
            ]}
          >
            <Text style={[s.successTitle, { color: C.accentText }]}>
              ¡Contraseña actualizada!
            </Text>
            <Text style={[s.successText, { color: C.textSecondary }]}>
              Ya podés iniciar sesión con tu nueva contraseña.
            </Text>
          </View>
          <TouchableOpacity
            style={[s.btn, { backgroundColor: C.accent }]}
            onPress={() => router.replace("/(auth)/login")}
            accessibilityRole="button"
          >
            <Text style={s.btnText}>Ir al login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Invalid-link state (tokens missing or expired) ─────────────────────────
  if (missingTokens) {
    // If the resend already succeeded, show confirmation
    if (resendSent) {
      return (
        <View
          style={[s.root, { paddingTop: insets.top, backgroundColor: C.bg }]}
        >
          <View style={[s.center, { paddingBottom: insets.bottom + 32 }]}>
            <Text style={[s.brand, { color: C.accentText }]}>Bazaar</Text>
            <View
              style={[
                s.successBox,
                {
                  backgroundColor: C.accentBg,
                  borderColor: "rgba(24,172,180,0.3)",
                },
              ]}
            >
              <Text style={[s.successTitle, { color: C.accentText }]}>
                ¡Email enviado!
              </Text>
              <Text style={[s.successText, { color: C.textSecondary }]}>
                Si el email está registrado, recibirás un nuevo enlace en breve.
              </Text>
            </View>
            <TouchableOpacity
              style={[s.btn, { backgroundColor: C.accent }]}
              onPress={() => router.replace("/(auth)/login")}
              accessibilityRole="button"
            >
              <Text style={s.btnText}>Volver al login</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    const handleResend = async () => {
      if (!email) {
        // Sin email disponible, redirigir al formulario como fallback
        router.replace("/(auth)/forgot-password");
        return;
      }
      const ok = await forgotPassword(email);
      if (ok) setResendSent(true);
    };

    return (
      <View style={[s.root, { paddingTop: insets.top, backgroundColor: C.bg }]}>
        <View style={[s.center, { paddingBottom: insets.bottom + 32 }]}>
          <Text style={[s.brand, { color: C.accentText }]}>Bazaar</Text>
          <View
            style={[
              s.errorBox,
              { backgroundColor: C.redBg, borderColor: C.inputBorderError },
            ]}
          >
            <Text style={[s.errorBoxTitle, { color: C.red }]}>
              Enlace inválido
            </Text>
            <Text style={[s.errorBoxText, { color: C.textSecondary }]}>
              El enlace de recupero es inválido o ya expiró.
              {email
                ? " Te reenviaremos uno nuevo al instante."
                : " Solicitá uno nuevo desde la pantalla de login."}
            </Text>
          </View>

          {/* Error del servidor al reenviar */}
          {error ? (
            <View
              style={[
                s.serverError,
                { backgroundColor: C.redBg, borderColor: C.inputBorderError },
              ]}
            >
              <Text style={[s.serverErrorText, { color: C.red }]}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[
              s.btn,
              { backgroundColor: C.accent },
              isLoading && s.btnDisabled,
            ]}
            onPress={handleResend}
            disabled={isLoading}
            accessibilityRole="button"
          >
            {isLoading ? (
              <ActivityIndicator color="#403c30" size="small" />
            ) : (
              <Text style={s.btnText}>Solicitar nuevo enlace</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Main form ─────────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { paddingTop: insets.top, backgroundColor: C.bg }]}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            s.content,
            { paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={s.back} onPress={() => router.back()}>
            <Text style={[s.backText, { color: C.textSecondary }]}>
              ← Volver
            </Text>
          </TouchableOpacity>

          <Text style={[s.brand, { color: C.accentText }]}>Bazaar</Text>
          <Text style={[s.title, { color: C.textPrimary }]}>
            Nueva{"\n"}contraseña
          </Text>
          <Text style={[s.subtitle, { color: C.textSecondary }]}>
            Elegí una contraseña segura de al menos 8 caracteres, con mayúscula,
            minúscula y un número.
          </Text>

          {/* Server error banner */}
          {error ? (
            <View
              style={[
                s.serverError,
                { backgroundColor: C.redBg, borderColor: C.inputBorderError },
              ]}
            >
              <Text style={[s.serverErrorText, { color: C.red }]}>{error}</Text>
            </View>
          ) : null}

          {/* Nueva contraseña */}
          <View style={s.field}>
            <Text style={[s.label, { color: C.textSecondary }]}>
              Nueva contraseña
            </Text>
            <TextInput
              style={[
                s.input,
                {
                  backgroundColor: C.inputBg,
                  borderColor: C.inputBorder,
                  color: C.textPrimary,
                },
                touched.password && errors.password
                  ? { borderColor: C.inputBorderError }
                  : null,
              ]}
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                if (touched.password) setErrors(validate(v, confirm));
              }}
              onBlur={() => handleBlur("password")}
              placeholder="Mín. 8 car., mayúscula, minúscula y número"
              placeholderTextColor={C.textMuted}
              secureTextEntry
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
            />
            {touched.password && errors.password ? (
              <Text style={[s.errorText, { color: C.red }]}>
                {errors.password}
              </Text>
            ) : null}
          </View>

          {/* Confirm Password */}
          <View style={s.field}>
            <Text style={[s.label, { color: C.textSecondary }]}>
              Confirmar contraseña
            </Text>
            <TextInput
              ref={confirmRef}
              style={[
                s.input,
                {
                  backgroundColor: C.inputBg,
                  borderColor: C.inputBorder,
                  color: C.textPrimary,
                },
                touched.confirm && errors.confirm
                  ? { borderColor: C.inputBorderError }
                  : null,
              ]}
              value={confirm}
              onChangeText={(v) => {
                setConfirm(v);
                if (touched.confirm) setErrors(validate(password, v));
              }}
              onBlur={() => handleBlur("confirm")}
              placeholder="Repetí tu nueva contraseña"
              placeholderTextColor={C.textMuted}
              secureTextEntry
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
            {touched.confirm && errors.confirm ? (
              <Text style={[s.errorText, { color: C.red }]}>
                {errors.confirm}
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
              <Text style={s.btnText}>Cambiar contraseña</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingHorizontal: 28, paddingTop: 16 },
  center: { flex: 1, paddingHorizontal: 28, paddingTop: 32 },

  back: { marginBottom: 32 },
  backText: { fontSize: 15 },

  brand: { fontSize: 28, fontWeight: "800", marginBottom: 28 },
  title: { fontSize: 28, fontWeight: "700", lineHeight: 36, marginBottom: 12 },
  subtitle: { fontSize: 15, lineHeight: 22, marginBottom: 32 },

  serverError: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  serverErrorText: { fontSize: 14, lineHeight: 20 },

  field: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  errorText: { fontSize: 12, marginTop: 6 },

  btn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 16, fontWeight: "700", color: "#403c30" },

  // Success / error full-screen states
  successBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 20,
    marginBottom: 32,
  },
  successTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  successText: { fontSize: 15, lineHeight: 22 },

  errorBox: { borderWidth: 1, borderRadius: 14, padding: 20, marginBottom: 32 },
  errorBoxTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  errorBoxText: { fontSize: 15, lineHeight: 22 },
});
