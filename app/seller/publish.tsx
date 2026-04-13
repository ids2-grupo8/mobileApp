import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
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

export default function PublishProductScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const C = useTheme();

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [description, setDescription] = useState('');

  const onSubmit = () => {
    if (!title.trim() || !price.trim() || !stock.trim()) {
      Alert.alert('Campos incompletos', 'Completá título, precio y stock para continuar.');
      return;
    }

    Alert.alert(
      'Próximo paso',
      'La publicación al backend se habilitará cuando el flujo de vendedor esté conectado.',
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  return (
    <View style={[s.root, { backgroundColor: C.bg, paddingTop: insets.top }]}> 
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={s.backRow} onPress={() => router.back()} accessibilityRole="button">
            <MaterialIcons name="arrow-back" size={18} color={C.textSecondary} />
            <Text style={[s.backText, { color: C.textSecondary }]}>Volver</Text>
          </TouchableOpacity>

          <Text style={[s.title, { color: C.textPrimary }]}>Publicar producto</Text>
          <Text style={[s.subtitle, { color: C.textSecondary }]}>Cargá los datos básicos de tu publicación.</Text>

          <View style={s.field}>
            <Text style={[s.label, { color: C.textSecondary }]}>Título</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Ej: Teclado Mecánico 75%"
              placeholderTextColor={C.textMuted}
              style={[s.input, { backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.textPrimary }]}
            />
          </View>

          <View style={s.row}>
            <View style={[s.field, s.half]}>
              <Text style={[s.label, { color: C.textSecondary }]}>Precio</Text>
              <TextInput
                value={price}
                onChangeText={setPrice}
                placeholder="89000"
                placeholderTextColor={C.textMuted}
                keyboardType="numeric"
                style={[s.input, { backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.textPrimary }]}
              />
            </View>

            <View style={[s.field, s.half]}>
              <Text style={[s.label, { color: C.textSecondary }]}>Stock</Text>
              <TextInput
                value={stock}
                onChangeText={setStock}
                placeholder="10"
                placeholderTextColor={C.textMuted}
                keyboardType="numeric"
                style={[s.input, { backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.textPrimary }]}
              />
            </View>
          </View>

          <View style={s.field}>
            <Text style={[s.label, { color: C.textSecondary }]}>Descripción</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Contá detalles, estado y especificaciones"
              placeholderTextColor={C.textMuted}
              multiline
              textAlignVertical="top"
              style={[
                s.input,
                s.textarea,
                { backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.textPrimary },
              ]}
            />
          </View>

          <TouchableOpacity style={[s.submit, { backgroundColor: C.accent }]} onPress={onSubmit} accessibilityRole="button">
            <MaterialIcons name="publish" size={18} color="#0b0b0f" />
            <Text style={s.submitText}>Guardar borrador</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  backText: {
    fontSize: 14,
    fontWeight: '500',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  field: {
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  half: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 46,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  textarea: {
    minHeight: 130,
    paddingTop: 12,
  },
  submit: {
    marginTop: 10,
    borderRadius: 14,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitText: {
    color: '#0b0b0f',
    fontSize: 15,
    fontWeight: '800',
  },
});
