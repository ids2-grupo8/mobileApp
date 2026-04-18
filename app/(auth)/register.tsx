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
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/auth';

function validate(name: string, email: string, password: string) {
  const errors: { name?: string; email?: string; password?: string } = {};
  if (!name.trim() || name.trim().length < 2) errors.name = 'Ingresá tu nombre completo.';
  if (!email.trim()) errors.email = 'El email es requerido.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Email inválido.';
  if (!password) errors.password = 'La contraseña es requerida.';
  else if (password.length < 8) errors.password = 'Mínimo 8 caracteres.';
  else if (!/[A-Z]/.test(password)) errors.password = 'Debe incluir al menos una mayúscula.';
  else if (!/[a-z]/.test(password)) errors.password = 'Debe incluir al menos una minúscula.';
  else if (!/[0-9]/.test(password)) errors.password = 'Debe incluir al menos un número.';
  return errors;
}

export default function RegisterScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const C       = useTheme();
  const { register, isLoading, error, clearError } = useAuthStore();

  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors]     = useState<{ name?: string; email?: string; password?: string }>({});
  const [touched, setTouched]   = useState({ name: false, email: false, password: false });
  const [showPass, setShowPass] = useState(false);

  useEffect(() => { return () => clearError(); }, [clearError]);

  const handleBlur = (field: 'name' | 'email' | 'password') => {
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          <Text style={[s.brand, { color: C.accent }]}>Bazaar</Text>
          <Text style={[s.title, { color: C.textPrimary }]}>Crear cuenta</Text>
          <Text style={[s.subtitle, { color: C.textSecondary }]}>Empezá a comprar y vender hoy</Text>

          {error ? (
            <View style={[s.serverError, { backgroundColor: C.redBg, borderColor: C.red }]}>
              <MaterialIcons name="error-outline" size={18} color={C.red} />
              <Text style={[s.serverErrorText, { color: C.red }]}>{error}</Text>
            </View>
          ) : null}

          {/* Name */}
          <View style={s.field}>
            <Text style={[s.label, { color: C.textSecondary }]}>Nombre completo</Text>
            <View style={[
              s.inputWrap,
              { backgroundColor: C.glass, borderColor: touched.name && errors.name ? C.inputBorderError : C.glassBorder },
            ]}>
              <MaterialIcons name="person-outline" size={18} color={C.textMuted} />
              <TextInput
                style={[s.input, { color: C.textPrimary }]}
                value={name}
                onChangeText={(v) => { setName(v); if (touched.name) setErrors(validate(v, email, password)); }}
                onBlur={() => handleBlur('name')}
                placeholder="Juan Pérez"
                placeholderTextColor={C.textMuted}
                autoCapitalize="words"
                returnKeyType="next"
                selectionColor={C.accent}
              />
            </View>
            {touched.name && errors.name ? <Text style={[s.errorText, { color: C.red }]}>{errors.name}</Text> : null}
          </View>

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
                onChangeText={(v) => { setEmail(v); if (touched.email) setErrors(validate(name, v, password)); }}
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
            {touched.email && errors.email ? <Text style={[s.errorText, { color: C.red }]}>{errors.email}</Text> : null}
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
                onChangeText={(v) => { setPassword(v); if (touched.password) setErrors(validate(name, email, v)); }}
                onBlur={() => handleBlur('password')}
                placeholder="Mín. 8 car., mayúscula, minúscula y número"
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
            {touched.password && errors.password
              ? <Text style={[s.errorText, { color: C.red }]}>{errors.password}</Text>
              : null}
          </View>

          <TouchableOpacity
            style={[s.btn, { backgroundColor: C.accent, shadowColor: C.accent }, isLoading && s.btnDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
            accessibilityRole="button">
            {isLoading
              ? <ActivityIndicator color="#050508" size="small" />
              : <Text style={s.btnText}>Crear cuenta</Text>}
          </TouchableOpacity>

          <View style={s.row}>
            <Text style={[s.sub, { color: C.textSecondary }]}>¿Ya tenés cuenta? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={[s.link, { color: C.accent }]}>Iniciá sesión</Text>
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
  content: { paddingHorizontal: 28, paddingTop: 40 },

  brand:    { fontSize: 28, fontWeight: '800', marginBottom: 32, letterSpacing: -0.3 },
  title:    { fontSize: 30, fontWeight: '800', marginBottom: 6, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, marginBottom: 36, letterSpacing: 0.1 },

  serverError: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  serverErrorText: { fontSize: 14, lineHeight: 20, flex: 1 },

  field:     { marginBottom: 20 },
  label:     { fontSize: 13, fontWeight: '600', marginBottom: 8, letterSpacing: 0.1 },
  inputWrap: {
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
    height: 52,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  errorText: { fontSize: 12, marginTop: 6, marginLeft: 2 },

  btn: {
    paddingVertical: 17,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 28,
    marginTop: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText:     { fontSize: 16, fontWeight: '800', color: '#050508', letterSpacing: -0.2 },

  row:  { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  sub:  { fontSize: 14 },
  link: { fontSize: 14, fontWeight: '600' },
});
