import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GOOGLE_OAUTH_URL } from "@/services/auth";
import { ENABLE_PIN_LOGIN } from "@/constants/features";
import { useTheme } from "@/hooks/use-theme";
import { useAuthStore } from "@/store/auth";

function validate(email: string, password: string) {
  const errors: { email?: string; password?: string } = {};
  if (!email.trim()) errors.email = "El email es requerido.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.email = "Ingresá un email válido.";
  if (!password) errors.password = "La contraseña es requerida.";
  else if (password.length < 8) errors.password = "Mínimo 8 caracteres.";
  return errors;
}

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const C = useTheme();
  const { login, googleLogin, isLoading, error, clearError, suggestPinLink, dismissPinLink } = useAuthStore();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors]     = useState<{ email?: string; password?: string }>({});
  const [touched, setTouched]   = useState({ email: false, password: false });
  const [showPass, setShowPass] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const effectiveError = oauthError ?? error;
  const isSuspendedError = Boolean(
    effectiveError && effectiveError.toLowerCase().includes("suspendida"),
  );

  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const handleBlur = (field: "email" | "password") => {
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors(validate(email, password));
  };

  const handleSubmit = async () => {
    setOauthError(null);
    const errs = validate(email, password);
    setErrors(errs);
    setTouched({ email: true, password: true });
    if (Object.keys(errs).length > 0) return;
    await login(email.trim(), password);
    const { suggestPinLink: suggest, dismissPinLink: dismiss, isLoggedIn } = useAuthStore.getState();
    if (isLoggedIn && suggest) {
      dismiss();
      Alert.alert(
        "Vincular PIN",
        "Este dispositivo ya tiene cuentas con PIN. ¿Querés configurar PIN para esta cuenta también?",
        [
          { text: "Ahora no", style: "cancel" },
          { text: "Configurar PIN", onPress: () => router.push("/profile/pin") },
        ],
      );
    }
  };

  const handleGoogleLogin = async () => {
    setOauthError(null);
    clearError();
    setGoogleLoading(true);
    try {
      // openAuthSessionAsync returns the full redirect URL as its result.
      // In Expo Go, Linking.addEventListener does NOT fire for custom schemes
      // (mobileapp:// is not registered), so we parse the tokens here directly.
      const result = await WebBrowser.openAuthSessionAsync(
        GOOGLE_OAUTH_URL,
        "mobileapp://",
      );

      if (result.type !== "success" || !result.url) return;

      const hashIndex = result.url.indexOf("#");
      if (hashIndex === -1) return;

      const params = new URLSearchParams(result.url.slice(hashIndex + 1));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const oauthErrorCode = params.get("error");
      const oauthErrorDescription = params.get("error_description");

      if (oauthErrorCode || oauthErrorDescription) {
        const normalized = (oauthErrorDescription ?? oauthErrorCode ?? "").toLowerCase();
        if (
          normalized.includes("banned") ||
          normalized.includes("blocked") ||
          normalized.includes("suspend")
        ) {
          setOauthError("Tu cuenta está suspendida. Contactá soporte.");
        } else {
          setOauthError(
            "No se pudo iniciar sesión con Google. Intentá nuevamente o usá email y contraseña.",
          );
        }
        return;
      }

      if (accessToken && refreshToken) {
        await googleLogin(accessToken, refreshToken);
        return;
      }
      setOauthError(
        "No se pudo completar el inicio de sesión con Google. Intentá nuevamente.",
      );
    } catch {
      setOauthError(
        "No se pudo iniciar sesión con Google. Intentá nuevamente o usá email y contraseña.",
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <View style={[s.root, { paddingTop: insets.top, backgroundColor: C.bg }]}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={[
            s.content,
            { paddingBottom: insets.bottom + 16 },
          ]}>

          <Text style={[s.brand, { color: C.accent }]}>Bazaar</Text>
          <Text style={[s.title, { color: C.textPrimary }]}>Iniciá sesión</Text>
          <Text style={[s.subtitle, { color: C.textSecondary }]}>
            Bienvenido de nuevo
          </Text>

          {effectiveError ? (
            <View style={[s.serverError, { backgroundColor: C.redBg, borderColor: C.red }]}>
              <MaterialIcons
                name={isSuspendedError ? "block" : "error-outline"}
                size={18}
                color={C.red}
              />
              <View style={s.serverErrorCopy}>
                {isSuspendedError ? (
                  <Text style={[s.serverErrorTitle, { color: C.red }]}>
                    Cuenta suspendida
                  </Text>
                ) : null}
                <Text style={[s.serverErrorText, { color: C.red }]}>{effectiveError}</Text>
              </View>
            </View>
          ) : null}

          {/* Email */}
          <View style={s.field}>
            <Text style={[s.label, { color: C.textSecondary }]}>Email</Text>
            <View style={[
              s.inputWrap,
              { backgroundColor: C.glass, borderColor: touched.email && errors.email ? C.inputBorderError : C.glassBorder },
            ]}>
              <MaterialIcons name="mail-outline" size={18} color={C.textMuted} />
              <TextInput
                style={[s.input, { color: C.textPrimary }]}
                value={email}
                onChangeText={(v) => { setEmail(v); if (touched.email) setErrors(validate(v, password)); }}
                onBlur={() => handleBlur('email')}
                placeholder="tu@email.com"
                placeholderTextColor={C.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                selectionColor={C.accent}
              />
            </View>
            {touched.email && errors.email ? (
              <Text style={[s.errorText, { color: C.red }]}>
                {errors.email}
              </Text>
            ) : null}
          </View>

          {/* Password */}
          <View style={s.field}>
            <Text style={[s.label, { color: C.textSecondary }]}>Contraseña</Text>
            <View style={[
              s.inputWrap,
              { backgroundColor: C.glass, borderColor: touched.password && errors.password ? C.inputBorderError : C.glassBorder },
            ]}>
              <MaterialIcons name="lock-outline" size={18} color={C.textMuted} />
              <TextInput
                style={[s.input, { color: C.textPrimary }]}
                value={password}
                onChangeText={(v) => { setPassword(v); if (touched.password) setErrors(validate(email, v)); }}
                onBlur={() => handleBlur('password')}
                placeholder="Mínimo 8 caracteres"
                placeholderTextColor={C.textMuted}
                secureTextEntry={!showPass}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                selectionColor={C.accent}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                <MaterialIcons name={showPass ? 'visibility-off' : 'visibility'} size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>
            {touched.password && errors.password ? (
              <Text style={[s.errorText, { color: C.red }]}>
                {errors.password}
              </Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={s.forgotWrap}
            onPress={() => router.push("/(auth)/forgot-password")}
          >
            <Text style={[s.forgotText, { color: C.accentText }]}>
              ¿Olvidaste tu contraseña?
            </Text>
          </TouchableOpacity>

          {ENABLE_PIN_LOGIN ? (
            <TouchableOpacity
              style={s.forgotWrap}
              onPress={() => router.push("/(auth)/pin-login" as never)}
            >
              <Text style={[s.forgotText, { color: C.accentText }]}>
                Ingresar con PIN
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[
              s.btn,
              { backgroundColor: C.accent },
              isLoading && s.btnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isLoading || googleLoading}
            accessibilityRole="button"
          >
            {isLoading ? (
              <ActivityIndicator color="#403c30" size="small" />
            ) : (
              <Text style={s.btnText}>Iniciar sesión</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={s.divider}>
            <View style={[s.dividerLine, { backgroundColor: C.inputBorder }]} />
            <Text style={[s.dividerText, { color: C.textMuted }]}>o</Text>
            <View style={[s.dividerLine, { backgroundColor: C.inputBorder }]} />
          </View>

          {/* Google */}
          <TouchableOpacity
            style={[
              s.googleBtn,
              { backgroundColor: C.inputBg, borderColor: C.inputBorder },
              googleLoading && s.btnDisabled,
            ]}
            onPress={handleGoogleLogin}
            disabled={isLoading || googleLoading}
            accessibilityRole="button"
          >
            {googleLoading ? (
              <ActivityIndicator color={C.textPrimary} size="small" />
            ) : (
              <>
                <Text style={s.googleIcon}>G</Text>
                <Text style={[s.googleText, { color: C.textPrimary }]}>
                  Continuar con Google
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={s.row}>
            <Text style={[s.sub, { color: C.textSecondary }]}>
              ¿No tenés cuenta?{" "}
            </Text>
            <TouchableOpacity
              onPress={() => router.replace("/(auth)/register")}
            >
              <Text style={[s.link, { color: C.accentText }]}>Registrate</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1 },
  flex:    { flex: 1 },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 16, justifyContent: 'center' },

  brand:    { fontSize: 24, fontWeight: '800', marginBottom: 14, letterSpacing: -0.3 },
  title:    { fontSize: 26, fontWeight: '800', marginBottom: 4, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginBottom: 20, letterSpacing: 0.1 },

  serverError: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  serverErrorText: { fontSize: 13, lineHeight: 18, flex: 1 },
  serverErrorCopy: { flex: 1 },
  serverErrorTitle: { fontSize: 13, fontWeight: "700", marginBottom: 2 },

  field:     { marginBottom: 12 },
  label:     { fontSize: 13, fontWeight: '600', marginBottom: 6, letterSpacing: 0.1 },
  inputWrap: {
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
    height: 48,
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  errorText: { fontSize: 12, marginTop: 4, marginLeft: 2 },

  forgotWrap: { alignSelf: 'flex-end', marginBottom: 14 },
  forgotText: { fontSize: 13, fontWeight: '600' },

  btn: {
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 14,
    // Glow
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText:     { fontSize: 16, fontWeight: '800', color: '#050508', letterSpacing: -0.2 },

  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 10,
  },
  googleIcon: {
    fontSize: 16,
    fontWeight: "800",
    color: "#4285F4",
  },
  googleText: { fontSize: 15, fontWeight: "600" },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13, fontWeight: '500' },
  row: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  sub: { fontSize: 14 },
  link: { fontSize: 14, fontWeight: '700' },
});
