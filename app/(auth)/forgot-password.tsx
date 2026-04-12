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
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '@/store/auth';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { forgotPassword, isLoading, error } = useAuthStore();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [touched, setTouched] = useState(false);
  const [sent, setSent] = useState(false);

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
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.content, { paddingBottom: insets.bottom + 32 }]}>

          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <Text style={styles.backText}>← Volver</Text>
          </TouchableOpacity>

          <Text style={styles.brand}>Bazaar</Text>
          <Text style={styles.title}>¿Olvidaste tu{'\n'}contraseña?</Text>
          <Text style={styles.subtitle}>
            Ingresá tu email y te enviaremos un enlace para restablecerla.
          </Text>

          {sent ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>
                Si el email está registrado, recibirás el enlace en breve.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={[styles.input, touched && emailError && styles.inputError]}
                  value={email}
                  onChangeText={(v) => { setEmail(v); if (touched) setEmailError(validate(v)); }}
                  onBlur={() => { setTouched(true); setEmailError(validate(email)); }}
                  placeholder="tu@email.com"
                  placeholderTextColor="#555870"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="send"
                  onSubmitEditing={handleSubmit}
                />
                {touched && emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
              </View>

              <TouchableOpacity
                style={[styles.btn, isLoading && styles.btnDisabled]}
                onPress={handleSubmit}
                disabled={isLoading}
                accessibilityRole="button">
                {isLoading
                  ? <ActivityIndicator color="#0B0B0F" size="small" />
                  : <Text style={styles.btnText}>Enviar enlace</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B0B0F' },
  flex: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 16 },

  back: { marginBottom: 32 },
  backText: { color: '#8B8FA8', fontSize: 15 },

  brand: { fontSize: 28, fontWeight: '800', color: '#C5F135', marginBottom: 28 },
  title: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', lineHeight: 36, marginBottom: 12 },
  subtitle: { fontSize: 15, color: '#8B8FA8', lineHeight: 22, marginBottom: 36 },

  field: { marginBottom: 24 },
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

  btn: {
    backgroundColor: '#C5F135',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#0B0B0F' },

  successBox: {
    backgroundColor: 'rgba(197,241,53,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(197,241,53,0.3)',
    borderRadius: 12,
    padding: 16,
  },
  successText: { color: '#C5F135', fontSize: 15, lineHeight: 22 },
});
