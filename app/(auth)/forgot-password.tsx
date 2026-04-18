import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
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

export default function ForgotPasswordScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const C       = useTheme();
  const { forgotPassword, isLoading, error } = useAuthStore();

  const [email, setEmail]           = useState('');
  const [emailError, setEmailError] = useState('');
  const [touched, setTouched]       = useState(false);
  const [sent, setSent]             = useState(false);

  const validate = (v: string) => {
    if (!v.trim()) return 'El email es requerido.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Email inválido.';
    return '';
  };

  const handleSubmit = async () => {
    const err = validate(email);
    setEmailError(err);
    setTouched(true);
    if (err) return;
    await forgotPassword(email.trim());
    if (!error) setSent(true);
  };

  return (
    <View style={[s.root, { paddingTop: insets.top, backgroundColor: C.bg }]}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[s.content, { paddingBottom: insets.bottom + 32 }]}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} accessibilityRole="button">
            <View style={[s.backCircle, { backgroundColor: C.glass, borderColor: C.glassBorder }]}>
              <MaterialIcons name="arrow-back" size={20} color={C.textSecondary} />
            </View>
          </TouchableOpacity>

          <Text style={[s.brand, { color: C.accent }]}>Bazaar</Text>
          <Text style={[s.title, { color: C.textPrimary }]}>{'¿Olvidaste tu\ncontraseña?'}</Text>
          <Text style={[s.subtitle, { color: C.textSecondary }]}>
            Ingresá tu email y te enviaremos un enlace para restablecerla.
          </Text>

          {sent ? (
            <View style={[s.successBox, { backgroundColor: C.accentGlow, borderColor: C.accent }]}>
              <MaterialIcons name="check-circle-outline" size={20} color={C.accent} />
              <Text style={[s.successText, { color: C.accent }]}>
                Si el email está registrado, recibirás el enlace en breve.
              </Text>
            </View>
          ) : (
            <>
              <View style={s.field}>
                <Text style={[s.label, { color: C.textSecondary }]}>Email</Text>
                <View style={[s.inputWrap, { backgroundColor: C.glass, borderColor: touched && emailError ? C.inputBorderError : C.glassBorder }]}>
                  <MaterialIcons name="mail-outline" size={18} color={C.textMuted} />
                  <TextInput
                    style={[s.input, { color: C.textPrimary }]}
                    value={email}
                    onChangeText={(v) => { setEmail(v); if (touched) setEmailError(validate(v)); }}
                    onBlur={() => { setTouched(true); setEmailError(validate(email)); }}
                    placeholder="tu@email.com"
                    placeholderTextColor={C.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="send"
                    onSubmitEditing={handleSubmit}
                    selectionColor={C.accent}
                  />
                </View>
                {touched && emailError ? <Text style={[s.errorText, { color: C.red }]}>{emailError}</Text> : null}
              </View>
              <TouchableOpacity
                style={[s.btn, { backgroundColor: C.accent, shadowColor: C.accent }, isLoading && s.btnDisabled]}
                onPress={handleSubmit}
                disabled={isLoading}
                accessibilityRole="button">
                {isLoading ? <ActivityIndicator color="#050508" size="small" /> : <Text style={s.btnText}>Enviar enlace</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 }, flex: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 16 },
  backBtn: { marginBottom: 32 },
  backCircle: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  brand: { fontSize: 28, fontWeight: '800', marginBottom: 32, letterSpacing: -0.3 },
  title: { fontSize: 30, fontWeight: '800', lineHeight: 38, marginBottom: 12, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, lineHeight: 22, marginBottom: 36 },
  field: { marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  inputWrap: { borderWidth: 1, borderRadius: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10, height: 52 },
  input: { flex: 1, fontSize: 16, height: '100%' },
  errorText: { fontSize: 12, marginTop: 6 },
  btn: { paddingVertical: 17, borderRadius: 16, alignItems: 'center', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 16, fontWeight: '800', color: '#050508' },
  successBox: { borderWidth: 1, borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12 },
  successText: { fontSize: 15, lineHeight: 22, flex: 1, fontWeight: '500' },
});
