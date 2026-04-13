import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/auth';

function validate(email: string, password: string) {
  const errors: { email?: string; password?: string } = {};
  if (!email.trim()) errors.email = 'El email es requerido.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Ingresá un email válido.';
  if (!password) errors.password = 'La contraseña es requerida.';
  else if (password.length < 8) errors.password = 'Mínimo 8 caracteres.';
  return errors;
}

export default function LoginScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const C       = useTheme();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors]     = useState<{ email?: string; password?: string }>({});
  const [touched, setTouched]   = useState({ email: false, password: false });

  useEffect(() => { return () => clearError(); }, [clearError]);

  const handleBlur = (field: 'email' | 'password') => {
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors(validate(email, password));
  };

  const handleSubmit = async () => {
    const errs = validate(email, password);
    setErrors(errs);
    setTouched({ email: true, password: true });
    if (Object.keys(errs).length > 0) return;
    await login(email.trim(), password);
  };

  return (
    <View style={[s.root, { paddingTop: insets.top, backgroundColor: C.bg }]}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          <Text style={[s.brand, { color: C.accentText }]}>Bazaar</Text>
          <Text style={[s.title, { color: C.textPrimary }]}>Iniciá sesión</Text>
          <Text style={[s.subtitle, { color: C.textSecondary }]}>Bienvenido de nuevo</Text>

          {error ? (
            <View style={[s.serverError, { backgroundColor: C.redBg, borderColor: C.inputBorderError }]}>
              <Text style={[s.serverErrorText, { color: C.red }]}>{error}</Text>
            </View>
          ) : null}

          {/* Email */}
          <View style={s.field}>
            <Text style={[s.label, { color: C.textSecondary }]}>Email</Text>
            <TextInput
              style={[
                s.input,
                { backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.textPrimary },
                touched.email && errors.email ? { borderColor: C.inputBorderError } : null,
              ]}
              value={email}
              onChangeText={(v) => { setEmail(v); if (touched.email) setErrors(validate(v, password)); }}
              onBlur={() => handleBlur('email')}
              placeholder="tu@email.com"
              placeholderTextColor={C.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
            {touched.email && errors.email ? (
              <Text style={[s.errorText, { color: C.red }]}>{errors.email}</Text>
            ) : null}
          </View>

          {/* Password */}
          <View style={s.field}>
            <Text style={[s.label, { color: C.textSecondary }]}>Contraseña</Text>
            <TextInput
              style={[
                s.input,
                { backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.textPrimary },
                touched.password && errors.password ? { borderColor: C.inputBorderError } : null,
              ]}
              value={password}
              onChangeText={(v) => { setPassword(v); if (touched.password) setErrors(validate(email, v)); }}
              onBlur={() => handleBlur('password')}
              placeholder="Mínimo 8 caracteres"
              placeholderTextColor={C.textMuted}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
            {touched.password && errors.password ? (
              <Text style={[s.errorText, { color: C.red }]}>{errors.password}</Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={s.forgotWrap}
            onPress={() => router.push('/(auth)/forgot-password')}>
            <Text style={[s.forgotText, { color: C.accentText }]}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.btn, { backgroundColor: C.accent }, isLoading && s.btnDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
            accessibilityRole="button">
            {isLoading
              ? <ActivityIndicator color="#403c30" size="small" />
              : <Text style={s.btnText}>Iniciar sesión</Text>}
          </TouchableOpacity>

          <View style={s.row}>
            <Text style={[s.sub, { color: C.textSecondary }]}>¿No tenés cuenta? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/register')}>
              <Text style={[s.link, { color: C.accentText }]}>Registrate</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1 },
  flex:    { flex: 1 },
  content: { paddingHorizontal: 28, paddingTop: 32 },

  brand:    { fontSize: 28, fontWeight: '800', marginBottom: 28 },
  title:    { fontSize: 28, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 15, marginBottom: 32 },

  serverError: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  serverErrorText: { fontSize: 14, lineHeight: 20 },

  field:     { marginBottom: 20 },
  label:     { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  errorText: { fontSize: 12, marginTop: 6 },

  forgotWrap: { alignSelf: 'flex-end', marginBottom: 28 },
  forgotText: { fontSize: 13, fontWeight: '600' },

  btn:         { paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginBottom: 24 },
  btnDisabled: { opacity: 0.6 },
  btnText:     { fontSize: 16, fontWeight: '700', color: '#403c30' },

  row:  { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  sub:  { fontSize: 14 },
  link: { fontSize: 14, fontWeight: '600' },
});
