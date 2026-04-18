import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, Animated, Image, KeyboardAvoidingView,
  Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { useUserStore } from "@/store/user";
import { useTheme } from "@/hooks/use-theme";
import type { ThemeColors } from "@/constants/colors";

function Toast({ message, visible, C }: { message: string; visible: boolean; C: ThemeColors }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(1800),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, opacity]);
  return (
    <Animated.View style={[s.toastWrap, { opacity }]} pointerEvents="none">
      <View style={[s.toastPill, { backgroundColor: C.accentGlow, borderColor: C.accent }]}>
        <MaterialIcons name="check-circle" size={16} color={C.accent} />
        <Text style={[s.toastText, { color: C.accent }]}>{message}</Text>
      </View>
    </Animated.View>
  );
}

function AvatarPicker({ name, uri, onPick, C }: { name: string; uri?: string; onPick: () => void; C: ThemeColors }) {
  const initials = name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
  return (
    <TouchableOpacity style={s.avWrap} onPress={onPick} accessibilityLabel="Cambiar foto de perfil" accessibilityRole="button">
      {uri ? (
        <Image
          source={{ uri }}
          style={[s.avImage, { borderColor: C.accent }]}
        />
      ) : (
        <View style={[s.avPlaceholder, { backgroundColor: C.accentGlow, borderColor: C.accent }]}>
          <Text style={[s.avInitials, { color: C.accent }]}>{initials}</Text>
        </View>
      )}
      <View style={[s.avBadge, { backgroundColor: C.accent, shadowColor: C.accent }]}>
        <MaterialIcons name="camera-alt" size={14} color="#050508" />
      </View>
    </TouchableOpacity>
  );
}

function Field({ label, value, onChangeText, onBlur, placeholder, error, multiline, autoCapitalize, returnKeyType, onSubmitEditing, C }: {
  label: string; value: string; onChangeText: (v: string) => void; onBlur?: () => void;
  placeholder: string; error?: string; multiline?: boolean; autoCapitalize?: 'none' | 'sentences' | 'words';
  returnKeyType?: 'next' | 'done'; onSubmitEditing?: () => void; C: ThemeColors;
}) {
  return (
    <View style={s.fieldWrap}>
      <Text style={[s.fieldLabel, { color: C.textSecondary }]}>{label}</Text>
      <View style={[s.fieldInputWrap, { backgroundColor: C.glass, borderColor: error ? C.inputBorderError : C.glassBorder }, multiline && s.fieldMultiline]}>
        <TextInput
          style={[s.fieldInput, { color: C.textPrimary }, multiline && { height: 90, textAlignVertical: 'top' }]}
          value={value} onChangeText={onChangeText} onBlur={onBlur}
          placeholder={placeholder} placeholderTextColor={C.textMuted}
          autoCapitalize={autoCapitalize ?? 'sentences'} returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing} multiline={multiline} numberOfLines={multiline ? 4 : 1}
          selectionColor={C.accent}
        />
      </View>
      {error ? <Text style={[s.fieldError, { color: C.red }]}>{error}</Text> : null}
    </View>
  );
}

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const C = useTheme();
  const { profile, saving, updateProfile } = useUserStore();

  const [name, setName] = useState(profile?.name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [avatarUri, setAvatarUri] = useState<string | undefined>(profile?.avatarUrl);
  const [nameError, setNameError] = useState('');
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (profile) { setName(profile.name); setBio(profile.bio); setAvatarUri(profile.avatarUrl); }
  }, [profile]);

  const validateName = (v: string) => {
    if (!v.trim()) { setNameError('El nombre no puede estar vacío.'); return false; }
    if (v.trim().length < 2) { setNameError('Mínimo 2 caracteres.'); return false; }
    setNameError(''); return true;
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permiso requerido', 'Necesitamos acceso a la galería para cambiar tu foto.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled && result.assets[0]) { setAvatarUri(result.assets[0].uri); }
  };

  const handleSave = async () => {
    if (!validateName(name)) return;
    await updateProfile({
      name: name.trim(),
      bio: bio.trim(),
      avatarUrl: avatarUri,
    });
    setShowToast(true);
    setTimeout(() => { setShowToast(false); router.back(); }, 2400);
  };

  return (
    <View style={[s.root, { paddingTop: insets.top, backgroundColor: C.bg }]}>
      <View style={[s.topBar, { borderBottomColor: C.glassBorder }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} accessibilityRole="button">
          <View style={[s.backCircle, { backgroundColor: C.glass, borderColor: C.glassBorder }]}>
            <MaterialIcons name="arrow-back" size={20} color={C.textSecondary} />
          </View>
        </TouchableOpacity>
        <Text style={[s.topTitle, { color: C.textPrimary }]}>Editar perfil</Text>
        <View style={s.backBtn} />
      </View>

      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <AvatarPicker name={name || profile?.name || '?'} uri={avatarUri} onPick={handlePickImage} C={C} />
          <Text style={[s.changePhotoLabel, { color: C.accent }]}>Cambiar foto</Text>

          <View style={s.form}>
            <Field label="Nombre completo" value={name}
              onChangeText={(v) => { setName(v); if (nameError) validateName(v); }}
              onBlur={() => validateName(name)} placeholder="Tu nombre" error={nameError}
              autoCapitalize="words" returnKeyType="next" C={C} />
            <Field label="Descripción" value={bio} onChangeText={setBio}
              placeholder="Contá algo sobre vos o tu tienda" multiline C={C} />
          </View>

          <TouchableOpacity
            style={[s.saveBtn, { backgroundColor: C.accent, shadowColor: C.accent }, saving && s.saveBtnDisabled]}
            onPress={handleSave} disabled={saving} accessibilityRole="button" accessibilityLabel="Guardar cambios">
            {saving ? <ActivityIndicator color="#050508" size="small" /> : <Text style={s.saveBtnText}>Guardar cambios</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
      <Toast message="¡Perfil actualizado!" visible={showToast} C={C} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 }, flex: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { width: 44 },
  backCircle: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  scroll: { paddingHorizontal: 24, paddingTop: 32 },
  changePhotoLabel: { textAlign: 'center', fontSize: 13, fontWeight: '600', marginBottom: 36 },
  form: { gap: 24 },
  saveBtn: { marginTop: 40, borderRadius: 16, paddingVertical: 17, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: '#050508' },
  toastWrap: { position: 'absolute', bottom: 52, left: 0, right: 0, alignItems: 'center', zIndex: 100 },
  toastPill: { borderWidth: 1, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 8 },
  toastText: { fontWeight: '600', fontSize: 14 },
  avWrap: { width: 96, height: 96, alignSelf: 'center', marginBottom: 10 },
  avImage: { width: 96, height: 96, borderRadius: 48, borderWidth: 2 },
  avPlaceholder: { width: 96, height: 96, borderRadius: 48, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  avInitials: { fontSize: 32, fontWeight: '800' },
  avBadge: { position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  fieldWrap: { gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '600' },
  fieldInputWrap: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, justifyContent: 'center' },
  fieldInput: { fontSize: 16, paddingVertical: 14 },
  fieldMultiline: { minHeight: 110 },
  fieldError: { fontSize: 12, marginTop: 2 },
});
