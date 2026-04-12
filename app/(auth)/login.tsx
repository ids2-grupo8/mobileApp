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
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '@/store/auth';

function validate(email: string, password: string) {
  const errors: { email?: string; password?: string } = {};
  if (!email.trim()) errors.email = 'El email es requerido.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.email = 'Ingresá un email válido.';
  if (!password) errors.password = 'La contraseña es requerida.';
  else if (password.length < 8) errors.password = 'Mínimo 8 caracteres.';
  return errors;
}

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [touched, setTouched] = useState({ email: false, password: false });

  useEffect(() => {
    return () => clearError();
  }, [clearError]);

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
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* Header */}
          <Text style={styles.brand}>Bazaar</Text>
          <Text style={styles.title}>Iniciá sesión</Text>
          <Text style={styles.subtitle}>Bienvenido de nuevo</Text>

          {/* Server error */}
          {error ? (
            <View style={styles.serverError}>
              <Text style={styles.serverErrorText}>{error}</Text>
            </View>
          ) : null}

          {/* Email */}
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, touched.email && errors.email && styles.inputError]}
              value={email}
              onChangeText={(v) => { setEmail(v); if (touched.email) setErrors(validate(v, password)); }}
              onBlur={() => handleBlur('email')}
              placeholder="tu@email.com"
              placeholderTextColor="#555870"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
            {touched.email && errors.email ? (
              <Text style={styles.errorText}>{errors.email}</Text>
            ) : null}
          </View>

          {/* Password */}
          <View style={styles.field}>
            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={[styles.input, touched.password && errors.password && styles.inputError]}
              value={password}
              onChangeText={(v) => { setPassword(v); if (touched.password) setErrors(validate(email, v)); }}
              onBlur={() => handleBlur('password')}
              placeholder="Mínimo 8 caracteres"
              placeholderTextColor="#555870"
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
            {touched.password && errors.password ? (
              <Text style={styles.errorText}>{errors.password}</Text>
            ) : null}
          </View>

          {/* Forgot password */}
          <TouchableOpacity
            style={styles.forgotWrap}
            onPress={() => router.push('/(auth)/forgot-password')}>
            <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.btn, isLoading && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
            accessibilityRole="button">
            {isLoading
              ? <ActivityIndicator color="#0B0B0F" size="small" />
              : <Text style={styles.btnText}>Iniciar sesión</Text>}
          </TouchableOpacity>

          {/* Register link */}
          <View style={styles.row}>
            <Text style={styles.sub}>¿No tenés cuenta? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/register')}>
              <Text style={styles.link}>Registrate</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B0B0F' },
  flex: { flex: 1 },
  content: { paddingHorizontal: 28, paddingTop: 32 },

  brand: { fontSize: 28, fontWeight: '800', color: '#C5F135', marginBottom: 28 },
  title: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#8B8FA8', marginBottom: 32 },

  serverError: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.3)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  serverErrorText: { color: '#F87171', fontSize: 14, lineHeight: 20 },

  field: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#8B8FA8', marginBottom: 8 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#FFFFFF',
  },
  inputError: { borderColor: 'rgba(248,113,113,0.5)' },
  errorText: { color: '#F87171', fontSize: 12, marginTop: 6 },

  forgotWrap: { alignSelf: 'flex-end', marginBottom: 28 },
  forgotText: { fontSize: 13, color: '#C5F135', fontWeight: '600' },

  btn: {
    backgroundColor: '#C5F135',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#0B0B0F' },

  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  sub: { fontSize: 14, color: '#8B8FA8' },
  link: { fontSize: 14, color: '#C5F135', fontWeight: '600' },
});
