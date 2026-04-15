import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
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

function validate(name: string, email: string, password: string) {
  const errors: { name?: string; email?: string; password?: string } = {};
  if (!name.trim() || name.trim().length < 2)
    errors.name = "Ingresá tu nombre completo.";
  if (!email.trim()) errors.email = "El email es requerido.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.email = "Email inválido.";
  if (!password) errors.password = "La contraseña es requerida.";
  else if (password.length < 8) errors.password = "Mínimo 8 caracteres.";
  else if (!/[A-Z]/.test(password))
    errors.password = "Debe incluir al menos una mayúscula.";
  else if (!/[a-z]/.test(password))
    errors.password = "Debe incluir al menos una minúscula.";
  else if (!/[0-9]/.test(password))
    errors.password = "Debe incluir al menos un número.";
  return errors;
}

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const C = useTheme();
  const { register, isLoading, error, clearError } = useAuthStore();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
  });

  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const handleBlur = (field: "name" | "email" | "password") => {
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors(validate(name, email, password));
  };

  const handleSubmit = async () => {
    const errs = validate(name, email, password);
    setErrors(errs);
    setTouched({ name: true, email: true, password: true });
    if (Object.keys(errs).length > 0) return;
    await register(name.trim(), email.trim(), password);
  };

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
          <Text style={[s.brand, { color: C.accentText }]}>Bazaar</Text>
          <Text style={[s.title, { color: C.textPrimary }]}>Crear cuenta</Text>
          <Text style={[s.subtitle, { color: C.textSecondary }]}>
            Empezá a comprar y vender hoy
          </Text>

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

          {/* Name */}
          <View style={s.field}>
            <Text style={[s.label, { color: C.textSecondary }]}>
              Nombre completo
            </Text>
            <TextInput
              style={[
                s.input,
                {
                  backgroundColor: C.inputBg,
                  borderColor: C.inputBorder,
                  color: C.textPrimary,
                },
                touched.name && errors.name
                  ? { borderColor: C.inputBorderError }
                  : null,
              ]}
              value={name}
              onChangeText={(v) => {
                setName(v);
                if (touched.name) setErrors(validate(v, email, password));
              }}
              onBlur={() => handleBlur("name")}
              placeholder="Juan Pérez"
              placeholderTextColor={C.textMuted}
              autoCapitalize="words"
              returnKeyType="next"
            />
            {touched.name && errors.name ? (
              <Text style={[s.errorText, { color: C.red }]}>{errors.name}</Text>
            ) : null}
          </View>

          {/* Email */}
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
                touched.email && errors.email
                  ? { borderColor: C.inputBorderError }
                  : null,
              ]}
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                if (touched.email) setErrors(validate(name, v, password));
              }}
              onBlur={() => handleBlur("email")}
              placeholder="tu@email.com"
              placeholderTextColor={C.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
            {touched.email && errors.email ? (
              <Text style={[s.errorText, { color: C.red }]}>
                {errors.email}
              </Text>
            ) : null}
          </View>

          {/* Password */}
          <View style={s.field}>
            <Text style={[s.label, { color: C.textSecondary }]}>
              Contraseña
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
                if (touched.password) setErrors(validate(name, email, v));
              }}
              onBlur={() => handleBlur("password")}
              placeholder="Mín. 8 car., mayúscula, minúscula y número"
              placeholderTextColor={C.textMuted}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
            {touched.password && errors.password ? (
              <Text style={[s.errorText, { color: C.red }]}>
                {errors.password}
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
              <Text style={s.btnText}>Crear cuenta</Text>
            )}
          </TouchableOpacity>

          <View style={s.row}>
            <Text style={[s.sub, { color: C.textSecondary }]}>
              ¿Ya tenés cuenta?{" "}
            </Text>
            <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
              <Text style={[s.link, { color: C.accentText }]}>
                Iniciá sesión
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingHorizontal: 28, paddingTop: 32 },

  brand: { fontSize: 28, fontWeight: "800", marginBottom: 28 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 4 },
  subtitle: { fontSize: 15, marginBottom: 32 },

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
    marginBottom: 24,
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 16, fontWeight: "700", color: "#403c30" },

  row: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  sub: { fontSize: 14 },
  link: { fontSize: 14, fontWeight: "600" },
});
