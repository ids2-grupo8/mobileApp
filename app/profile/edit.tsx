import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUserStore } from '@/store/user';

// ─── Paleta ─────────────────────────────────────────────────────────────────
const C = {
  bg: '#0B0B0F',
  card: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.07)',
  accent: '#C5F135',
  accentBg: 'rgba(197,241,53,0.12)',
  textPrimary: '#FFFFFF',
  textSecondary: '#8B8FA8',
  textMuted: '#555870',
  red: '#F87171',
  inputBg: 'rgba(255,255,255,0.05)',
  inputBorder: 'rgba(255,255,255,0.07)',
  inputBorderError: 'rgba(248,113,113,0.5)',
};

// ─── Toast ───────────────────────────────────────────────────────────────────

function Toast({ message, visible }: { message: string; visible: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(1800),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, opacity]);

  return (
    <Animated.View style={[t.wrap, { opacity }]} pointerEvents="none">
      <View style={t.pill}>
        <Text style={t.text}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const t = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 52,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  pill: {
    backgroundColor: C.accentBg,
    borderWidth: 1,
    borderColor: 'rgba(197,241,53,0.3)',
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 24,
  },
  text: { color: C.accent, fontWeight: '600', fontSize: 14 },
});

// ─── Avatar picker ───────────────────────────────────────────────────────────

function AvatarPicker({
  name,
  uri,
  onPick,
}: {
  name: string;
  uri?: string;
  onPick: () => void;
}) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <TouchableOpacity
      style={av.wrap}
      onPress={onPick}
      accessibilityLabel="Cambiar foto de perfil"
      accessibilityRole="button">
      {uri ? (
        <Image source={{ uri }} style={av.image} />
      ) : (
        <View style={av.placeholder}>
          <Text style={av.initials}>{initials}</Text>
        </View>
      )}
      {/* Camera badge */}
      <View style={av.badge}>
        <Text style={av.badgeIcon}>⊕</Text>
      </View>
    </TouchableOpacity>
  );
}

const av = StyleSheet.create({
  wrap: {
    width: 96,
    height: 96,
    alignSelf: 'center',
    marginBottom: 10,
  },
  image: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: C.accent,
  },
  placeholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: C.accentBg,
    borderWidth: 2,
    borderColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { color: C.accent, fontSize: 32, fontWeight: '700' },
  badge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeIcon: { fontSize: 18, color: '#0B0B0F', lineHeight: 22, fontWeight: '700' },
});

// ─── Field ───────────────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChangeText,
  onBlur,
  placeholder,
  error,
  multiline,
  autoCapitalize,
  returnKeyType,
  onSubmitEditing,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  onBlur?: () => void;
  placeholder: string;
  error?: string;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words';
  returnKeyType?: 'next' | 'done';
  onSubmitEditing?: () => void;
}) {
  return (
    <View style={f.wrap}>
      <Text style={f.label}>{label}</Text>
      <TextInput
        style={[
          f.input,
          multiline && f.multiline,
          error ? { borderColor: C.inputBorderError } : null,
        ]}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor={C.textMuted}
        autoCapitalize={autoCapitalize ?? 'sentences'}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
        selectionColor={C.accent}
      />
      {error ? <Text style={f.error}>{error}</Text> : null}
    </View>
  );
}

const f = StyleSheet.create({
  wrap: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: C.textSecondary },
  input: {
    backgroundColor: C.inputBg,
    borderWidth: 1,
    borderColor: C.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: C.textPrimary,
  },
  multiline: { height: 110, paddingTop: 14 },
  error: { fontSize: 12, color: C.red, marginTop: 2 },
});

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, saving, updateProfile } = useUserStore();

  const [name, setName] = useState(profile?.name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [avatarUri, setAvatarUri] = useState<string | undefined>(profile?.avatarUrl);
  const [nameError, setNameError] = useState('');
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setBio(profile.bio);
      setAvatarUri(profile.avatarUrl);
    }
  }, [profile]);

  const validateName = (v: string) => {
    if (!v.trim()) { setNameError('El nombre no puede estar vacío.'); return false; }
    if (v.trim().length < 2) { setNameError('Mínimo 2 caracteres.'); return false; }
    setNameError('');
    return true;
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a la galería para cambiar tu foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!validateName(name)) return;
    await updateProfile({ name: name.trim(), bio: bio.trim(), avatarUrl: avatarUri });
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      router.back();
    }, 2400);
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Header bar */}
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} accessibilityRole="button">
            <Text style={s.backText}>← Volver</Text>
          </TouchableOpacity>
          <Text style={s.topTitle}>Editar perfil</Text>
          <View style={s.backBtn} />
        </View>

        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* Avatar */}
          <AvatarPicker
            name={name || profile?.name || '?'}
            uri={avatarUri}
            onPick={handlePickImage}
          />
          <Text style={s.changePhotoLabel}>Cambiar foto</Text>

          {/* Form */}
          <View style={s.form}>
            <Field
              label="Nombre completo"
              value={name}
              onChangeText={(v) => { setName(v); if (nameError) validateName(v); }}
              onBlur={() => validateName(name)}
              placeholder="Tu nombre"
              error={nameError}
              autoCapitalize="words"
              returnKeyType="next"
            />
            <Field
              label="Descripción"
              value={bio}
              onChangeText={setBio}
              placeholder="Contá algo sobre vos o tu tienda"
              multiline
            />
          </View>

          {/* Save */}
          <TouchableOpacity
            style={[s.saveBtn, saving && s.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Guardar cambios">
            {saving
              ? <ActivityIndicator color="#0B0B0F" size="small" />
              : <Text style={s.saveBtnText}>Guardar cambios</Text>}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      <Toast message="¡Perfil actualizado!" visible={showToast} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: { width: 80 },
  backText: { fontSize: 14, color: C.textSecondary },
  topTitle: { fontSize: 16, fontWeight: '700', color: C.textPrimary },

  // Content
  scroll: { paddingHorizontal: 24, paddingTop: 32 },
  changePhotoLabel: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: C.accent,
    marginBottom: 36,
  },

  // Form
  form: { gap: 24 },

  // Save button
  saveBtn: {
    marginTop: 40,
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#0B0B0F' },
});
