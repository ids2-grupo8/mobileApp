import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/auth';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const C = useTheme();
  const { access_token, refresh_token } = useLocalSearchParams<{ access_token: string; refresh_token: string }>();
  const { resetPassword, isLoading, error, clearError } = useAuthStore();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [touchedP, setTouchedP] = useState(false);
  const [touchedC, setTouchedC] = useState(false);
  const [done, setDone] = useState(false);

  const validatePassword = (v: string) => {
    if (!v) return 'La contraseña es requerida.';
    if (v.length < 8) return 'Mínimo 8 caracteres.';
    if (!/[A-Z]/.test(v)) return 'Debe incluir al menos una mayúscula.';
    if (!/[a-z]/.test(v)) return 'Debe incluir al menos una minúscula.';
    if (!/[0-9]/.test(v)) return 'Debe incluir al menos un número.';
    return '';
  };

  const validateConfirm = (v: string, p: string) => {
    if (!v) return 'Confirmá la contraseña.';
    if (v !== p) return 'Las contraseñas no coinciden.';
    return '';
  };

  const handleSubmit = async () => {
    const pe = validatePassword(password);
    const ce = validateConfirm(confirm, password);
    setPasswordError(pe); setConfirmError(ce);
    setTouchedP(true); setTouchedC(true);
    if (pe || ce) return;
    if (!access_token || !refresh_token) return;
    clearError();
    await resetPassword(access_token, refresh_token, password);
    if (!useAuthStore.getState().error) setDone(true);
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
          <Text style={[s.title, { color: C.textPrimary }]}>{'Nueva\ncontraseña'}</Text>
          <Text style={[s.subtitle, { color: C.textSecondary }]}>Elegí una contraseña segura para tu cuenta.</Text>

          {done ? (
            <>
              <View style={[s.successBox, { backgroundColor: C.accentGlow, borderColor: C.accent }]}>
                <MaterialIcons name="check-circle-outline" size={20} color={C.accent} />
                <Text style={[s.successText, { color: C.accent }]}>¡Contraseña actualizada! Ya podés iniciar sesión.</Text>
              </View>
              <TouchableOpacity
                style={[s.btn, { backgroundColor: C.accent, shadowColor: C.accent, marginTop: 20 }]}
                onPress={() => router.replace('/(auth)/login')}
                accessibilityRole="button">
                <Text style={s.btnText}>Ir al login</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {error ? (
                <View style={[s.errorBox, { backgroundColor: C.redBg, borderColor: C.red }]}>
                  <MaterialIcons name="error-outline" size={18} color={C.red} />
                  <Text style={[s.errorBoxText, { color: C.red }]}>{error}</Text>
                </View>
              ) : null}

              <View style={s.field}>
                <Text style={[s.label, { color: C.textSecondary }]}>Nueva contraseña</Text>
                <View style={[s.inputWrap, { backgroundColor: C.glass, borderColor: touchedP && passwordError ? C.inputBorderError : C.glassBorder }]}>
                  <MaterialIcons name="lock-outline" size={18} color={C.textMuted} />
                  <TextInput
                    style={[s.input, { color: C.textPrimary }]}
                    value={password}
                    onChangeText={(v) => { setPassword(v); if (touchedP) setPasswordError(validatePassword(v)); }}
                    onBlur={() => { setTouchedP(true); setPasswordError(validatePassword(password)); }}
                    placeholder="Mínimo 8 caracteres"
                    placeholderTextColor={C.textMuted}
                    secureTextEntry returnKeyType="next" selectionColor={C.accent}
                  />
                </View>
                {touchedP && passwordError ? <Text style={[s.errorText, { color: C.red }]}>{passwordError}</Text> : null}
              </View>

              <View style={s.field}>
                <Text style={[s.label, { color: C.textSecondary }]}>Confirmá la contraseña</Text>
                <View style={[s.inputWrap, { backgroundColor: C.glass, borderColor: touchedC && confirmError ? C.inputBorderError : C.glassBorder }]}>
                  <MaterialIcons name="lock-outline" size={18} color={C.textMuted} />
                  <TextInput
                    style={[s.input, { color: C.textPrimary }]}
                    value={confirm}
                    onChangeText={(v) => { setConfirm(v); if (touchedC) setConfirmError(validateConfirm(v, password)); }}
                    onBlur={() => { setTouchedC(true); setConfirmError(validateConfirm(confirm, password)); }}
                    placeholder="Repetí la contraseña"
                    placeholderTextColor={C.textMuted}
                    secureTextEntry returnKeyType="done" onSubmitEditing={handleSubmit} selectionColor={C.accent}
                  />
                </View>
                {touchedC && confirmError ? <Text style={[s.errorText, { color: C.red }]}>{confirmError}</Text> : null}
              </View>

              <TouchableOpacity
                style={[s.btn, { backgroundColor: C.accent, shadowColor: C.accent }, isLoading && s.btnDisabled]}
                onPress={handleSubmit} disabled={isLoading} accessibilityRole="button">
                {isLoading ? <ActivityIndicator color="#050508" size="small" /> : <Text style={s.btnText}>Cambiar contraseña</Text>}
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
  errorBox: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 24, flexDirection: 'row', alignItems: 'center', gap: 10 },
  errorBoxText: { fontSize: 14, lineHeight: 20, flex: 1 },
  btn: { paddingVertical: 17, borderRadius: 16, alignItems: 'center', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 16, fontWeight: '800', color: '#050508' },
  successBox: { borderWidth: 1, borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12 },
  successText: { fontSize: 15, lineHeight: 22, flex: 1, fontWeight: '500' },
});
