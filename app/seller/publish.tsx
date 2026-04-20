import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/colors';
import { useTheme } from '@/hooks/use-theme';
import {
  createProductRequest,
  fetchProductsBySellerEmail,
  updateProductRequest,
} from '@/services/catalog';
import { useAuthStore } from '@/store/auth';

const CATEGORIES = ['Electronics', 'Clothing'] as const;
const CATEGORY_LABELS: Record<(typeof CATEGORIES)[number], string> = {
  Electronics: 'Electrónica',
  Clothing: 'Ropa',
};

type ManagedImage = { uri: string; isRemote: boolean };
type Errors = Partial<Record<'images' | 'title' | 'description' | 'price' | 'stock' | 'category' | 'brand' | 'model' | 'warranty_months' | 'size' | 'color' | 'material', string>>;

function Toast({ message, visible, C }: { message: string; visible: boolean; C: ThemeColors }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;

    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [visible, opacity]);

  return (
    <Animated.View style={[s.toastWrap, { opacity }]} pointerEvents="none">
      <View style={[s.toastCard, { backgroundColor: C.glass, borderColor: C.glassBorder, shadowColor: C.shadowDark }] }>
        <View style={[s.toastIconWrap, { backgroundColor: C.accentGlow }]}>
          <MaterialIcons name="check" size={32} color={C.accent} />
        </View>
        <Text style={[s.toastText, { color: C.textPrimary }]}>{message}</Text>
      </View>
    </Animated.View>
  );
}

function CategoryPicker({ value, onSelect, C }: { value: string; onSelect: (v: string) => void; C: ThemeColors }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={[s.catButton, { backgroundColor: C.glass, borderColor: C.glassBorder }]}
        onPress={() => setOpen(true)}
        accessibilityRole="button">
        <Text style={[s.catButtonText, { color: value ? C.textPrimary : C.textMuted }]}>
          {value ? CATEGORY_LABELS[value as keyof typeof CATEGORY_LABELS] : 'Seleccioná una categoría'}
        </Text>
        <MaterialIcons name="expand-more" size={20} color={C.textSecondary} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={[s.modalSheet, { backgroundColor: C.elevated, borderColor: C.glassBorder }] }>
            <Text style={[s.modalTitle, { color: C.textPrimary }]}>Categoría</Text>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[s.modalOption, { borderColor: C.glassBorder }, cat === value && { backgroundColor: C.accentGlow }]}
                onPress={() => { onSelect(cat); setOpen(false); }}
                accessibilityRole="button">
                <Text style={[s.modalOptionText, { color: cat === value ? C.accent : C.textPrimary }]}>{CATEGORY_LABELS[cat]}</Text>
                {cat === value && <MaterialIcons name="check" size={16} color={C.accent} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function ImageStrip({ items, onAdd, onRemove, C }: { items: ManagedImage[]; onAdd: () => void; onRemove: (i: number) => void; C: ThemeColors }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.imgRow}>
      {items.map((item, i) => (
        <View key={`${item.uri}-${i}`} style={s.imgThumbWrap}>
          <Image source={{ uri: item.uri }} style={[s.imgThumb, { borderColor: i === 0 ? C.accent : C.glassBorder }]} contentFit="cover" />
          {i === 0 && (
            <View style={[s.mainBadge, { backgroundColor: C.accent }] }>
              <Text style={s.mainBadgeText}>Principal</Text>
            </View>
          )}
          <TouchableOpacity
            style={[s.removeBadge, { backgroundColor: C.red }]}
            onPress={() => onRemove(i)}
            accessibilityRole="button"
            accessibilityLabel="Eliminar imagen">
            <MaterialIcons name="close" size={12} color="#fff" />
          </TouchableOpacity>
        </View>
      ))}
      {items.length < 4 && (
        <TouchableOpacity
          style={[s.imgAdd, { borderColor: C.glassBorder, backgroundColor: C.glass }]}
          onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel="Agregar imagen">
          <MaterialIcons name="add-photo-alternate" size={24} color={C.textMuted} />
          <Text style={[s.imgAddLabel, { color: C.textMuted }]}>Agregar</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

function Field({ label, required, value, onChangeText, onBlur, placeholder, error, multiline, keyboardType, C }: {
  label: string; required?: boolean; value: string; onChangeText: (v: string) => void; onBlur?: () => void;
  placeholder: string; error?: string; multiline?: boolean; keyboardType?: 'default' | 'numeric'; C: ThemeColors;
}) {
  return (
    <View style={s.field}>
      <Text style={[s.label, { color: C.textSecondary }]}>{label}{required ? <Text style={{ color: C.red }}> *</Text> : null}</Text>
      <View style={[s.inputWrap, { backgroundColor: error ? C.redBg : C.glass, borderColor: error ? C.inputBorderError : C.glassBorder }, multiline && s.textarea]}>
        <TextInput
          style={[s.input, { color: C.textPrimary }, multiline && { height: 90, textAlignVertical: 'top' }]}
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          placeholder={placeholder}
          placeholderTextColor={C.textMuted}
          keyboardType={keyboardType ?? 'default'}
          multiline={multiline}
          returnKeyType={multiline ? undefined : 'next'}
          selectionColor={C.accent}
        />
      </View>
      {error ? <Text style={[s.errorText, { color: C.red }]}>{error}</Text> : null}
    </View>
  );
}

function validate(
  images: ManagedImage[],
  title: string,
  description: string,
  price: string,
  stock: string,
  category: string,
  electronicsBrand: string,
  electronicsModel: string,
  electronicsWarrantyMonths: string,
  clothingSize: string,
  clothingColor: string,
  clothingMaterial: string,
): Errors {
  const e: Errors = {};
  if (images.length === 0) e.images = 'Agregá al menos una imagen.';
  if (!title.trim()) e.title = 'El nombre es obligatorio.';
  if (!description.trim()) e.description = 'La descripción es obligatoria.';
  const p = parseFloat(price);
  if (!price.trim()) e.price = 'El precio es obligatorio.';
  else if (Number.isNaN(p) || p <= 0) e.price = 'El precio debe ser mayor a 0.';
  const st = parseInt(stock, 10);
  if (!stock.trim()) e.stock = 'El stock es obligatorio.';
  else if (Number.isNaN(st) || st < 0) e.stock = 'El stock no puede ser negativo.';
  if (!category) e.category = 'Seleccioná una categoría.';

  if (category === 'Electronics') {
    if (!electronicsBrand.trim()) e.brand = 'La marca es obligatoria.';
    if (!electronicsModel.trim()) e.model = 'El modelo es obligatorio.';
    const warranty = parseInt(electronicsWarrantyMonths, 10);
    if (!electronicsWarrantyMonths.trim()) e.warranty_months = 'La garantía es obligatoria.';
    else if (Number.isNaN(warranty) || warranty < 0) e.warranty_months = 'La garantía debe ser un número válido.';
  }

  if (category === 'Clothing') {
    if (!clothingSize.trim()) e.size = 'El talle es obligatorio.';
    if (!clothingColor.trim()) e.color = 'El color es obligatorio.';
    if (!clothingMaterial.trim()) e.material = 'El material es obligatorio.';
  }

  return e;
}

export default function PublishProductScreen() {
  const { id: productId } = useLocalSearchParams<{ id?: string }>();
  const isEditing = Boolean(productId);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const C = useTheme();
  const user = useAuthStore((state) => state.user);

  const [images, setImages] = useState<ManagedImage[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [category, setCategory] = useState('');
  const [electronicsBrand, setElectronicsBrand] = useState('');
  const [electronicsModel, setElectronicsModel] = useState('');
  const [electronicsWarrantyMonths, setElectronicsWarrantyMonths] = useState('');
  const [clothingSize, setClothingSize] = useState('');
  const [clothingColor, setClothingColor] = useState('');
  const [clothingMaterial, setClothingMaterial] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [hydrating, setHydrating] = useState(isEditing);
  const [showToast, setShowToast] = useState(false);

  const touch = (field: string) => setTouched((t) => ({ ...t, [field]: true }));
  const revalidate = (field?: string) => {
    const e = validate(
      images,
      title,
      description,
      price,
      stock,
      category,
      electronicsBrand,
      electronicsModel,
      electronicsWarrantyMonths,
      clothingSize,
      clothingColor,
      clothingMaterial,
    );
    if (field) setErrors((prev) => ({ ...prev, [field]: e[field as keyof Errors] }));
    else setErrors(e);
    return e;
  };

  useEffect(() => {
    if (!isEditing) {
      setHydrating(false);
      return;
    }

    let active = true;

    const loadProduct = async () => {
      if (!user?.email || !productId) {
        setHydrating(false);
        return;
      }

      setHydrating(true);
      try {
        const products = await fetchProductsBySellerEmail(user.email);
        const existing = products.find((item) => item.id === productId);

        if (!existing) {
          Alert.alert('Producto no encontrado', 'No pudimos cargar este producto para editarlo.');
          router.back();
          return;
        }

        if (!active) return;

        setTitle(existing.title ?? '');
        setDescription(existing.description ?? '');
        setPrice(String(existing.price ?? ''));
        setStock(String(existing.stock ?? ''));
        setCategory(existing.category === 'Electronics' || existing.category === 'Clothing' ? existing.category : '');
        setImages((existing.images?.length > 0 ? existing.images : [existing.imageUrl].filter(Boolean)).map((uri) => ({ uri, isRemote: true })));

        const attrs = existing.attributes ?? {};
        if (existing.category === 'Electronics') {
          setElectronicsBrand(String(attrs.brand ?? ''));
          setElectronicsModel(String(attrs.model ?? ''));
          setElectronicsWarrantyMonths(String(attrs.warranty_months ?? ''));
          setClothingSize('');
          setClothingColor('');
          setClothingMaterial('');
        } else if (existing.category === 'Clothing') {
          setClothingSize(String(attrs.size ?? ''));
          setClothingColor(String(attrs.color ?? ''));
          setClothingMaterial(String(attrs.material ?? ''));
          setElectronicsBrand('');
          setElectronicsModel('');
          setElectronicsWarrantyMonths('');
        }

        setErrors({});
        setTouched({});
      } catch {
        Alert.alert('Error', 'No pudimos cargar el producto para editar.');
        router.back();
      } finally {
        if (active) setHydrating(false);
      }
    };

    loadProduct();

    return () => {
      active = false;
    };
  }, [isEditing, productId, router, user?.email]);

  const handleAddImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a la galería.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]) {
      const next = [...images, { uri: result.assets[0].uri, isRemote: false }];
      setImages(next);
      if (touched.images) setErrors((prev) => ({ ...prev, images: next.length > 0 ? undefined : 'Agregá al menos una imagen.' }));
    }
  };

  const handleRemoveImage = (index: number) => {
    const next = images.filter((_, i) => i !== index);
    setImages(next);
    if (touched.images) setErrors((prev) => ({ ...prev, images: next.length === 0 ? 'Agregá al menos una imagen.' : undefined }));
  };

  const handleSubmit = async () => {
    setTouched({ images: true, title: true, description: true, price: true, stock: true, category: true });
    const e = revalidate();
    if (Object.values(e).some(Boolean)) return;

    setLoading(true);
    try {
      const newImageFiles = images
        .filter((item) => !item.isRemote)
        .map((item, i) => ({
          uri: item.uri,
          name: `image_${i}.jpg`,
          type: 'image/jpeg',
        }));
      const existingImageUrls = images.filter((item) => item.isRemote).map((item) => item.uri);
      const basePayload = {
        name: title.trim(),
        description: description.trim(),
        price: parseFloat(price),
        actual_stock: parseInt(stock, 10),
        category: category as 'Electronics' | 'Clothing',
        images: newImageFiles,
      };

      if (isEditing && productId) {
        await updateProductRequest(
          productId,
          category === 'Electronics'
            ? {
                ...basePayload,
                category: 'Electronics',
                brand: electronicsBrand.trim(),
                model: electronicsModel.trim(),
                warranty_months: parseInt(electronicsWarrantyMonths, 10),
              }
            : {
                ...basePayload,
                category: 'Clothing',
                size: clothingSize.trim(),
                color: clothingColor.trim(),
                material: clothingMaterial.trim(),
              },
          existingImageUrls,
        );
      } else {
        await createProductRequest(
          category === 'Electronics'
            ? {
                ...basePayload,
                category: 'Electronics',
                brand: electronicsBrand.trim(),
                model: electronicsModel.trim(),
                warranty_months: parseInt(electronicsWarrantyMonths, 10),
              }
            : {
                ...basePayload,
                category: 'Clothing',
                size: clothingSize.trim(),
                color: clothingColor.trim(),
                material: clothingMaterial.trim(),
              },
        );
      }

      setShowToast(true);
      setTimeout(() => { setShowToast(false); router.back(); }, 2000);
    } catch {
      Alert.alert('Error', isEditing ? 'No pudimos actualizar el producto. Intentá de nuevo.' : 'No pudimos publicar el producto. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (hydrating) {
    return (
      <View style={[s.root, { backgroundColor: C.bg, paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: C.bg, paddingTop: insets.top }] }>
      <View style={[s.topBar, { borderBottomColor: C.glassBorder }] }>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} accessibilityRole="button">
          <View style={[s.backCircle, { backgroundColor: C.glass, borderColor: C.glassBorder }] }>
            <MaterialIcons name="arrow-back" size={20} color={C.textSecondary} />
          </View>
        </TouchableOpacity>
        <Text style={[s.topTitle, { color: C.textPrimary }]}>{isEditing ? 'Editar producto' : 'Publicar producto'}</Text>
        <View style={s.backBtn} />
      </View>

      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Field label="Nombre del producto" required value={title}
            onChangeText={(v) => { setTitle(v); if (touched.title) revalidate('title'); }}
            onBlur={() => { touch('title'); revalidate('title'); }}
            placeholder="Ej: Sony WH-1000XM5" error={touched.title ? errors.title : undefined} C={C} />

          <Field label="Descripción" required value={description}
            onChangeText={(v) => { setDescription(v); if (touched.description) revalidate('description'); }}
            onBlur={() => { touch('description'); revalidate('description'); }}
            placeholder="Describí el producto..." error={touched.description ? errors.description : undefined} multiline C={C} />

          <View style={s.row}>
            <View style={s.half}>
              <Text style={[s.label, { color: C.textSecondary }]}>Precio<Text style={{ color: C.red }}> *</Text></Text>
              <View style={[s.priceWrap, {
                backgroundColor: touched.price && errors.price ? C.redBg : C.glass,
                borderColor: touched.price && errors.price ? C.inputBorderError : C.glassBorder,
              }]}>
                <Text style={[s.prefixSymbol, { color: C.textSecondary }]}>$</Text>
                <TextInput style={[s.priceInput, { color: C.textPrimary }]} value={price}
                  onChangeText={(v) => { setPrice(v); if (touched.price) revalidate('price'); }}
                  onBlur={() => { touch('price'); revalidate('price'); }}
                  placeholder="0.00" placeholderTextColor={C.textMuted} keyboardType="numeric" selectionColor={C.accent} />
              </View>
              {touched.price && errors.price ? <Text style={[s.errorText, { color: C.red }]}>{errors.price}</Text> : null}
            </View>
            <View style={s.half}>
              <Text style={[s.label, { color: C.textSecondary }]}>Stock inicial<Text style={{ color: C.red }}> *</Text></Text>
              <View style={[s.inputWrap, {
                backgroundColor: touched.stock && errors.stock ? C.redBg : C.glass,
                borderColor: touched.stock && errors.stock ? C.inputBorderError : C.glassBorder,
              }]}>
                <TextInput style={[s.input, { color: C.textPrimary }]} value={stock}
                  onChangeText={(v) => { setStock(v); if (touched.stock) revalidate('stock'); }}
                  onBlur={() => { touch('stock'); revalidate('stock'); }}
                  placeholder="0" placeholderTextColor={C.textMuted} keyboardType="numeric" selectionColor={C.accent} />
              </View>
              {touched.stock && errors.stock ? <Text style={[s.errorText, { color: C.red }]}>{errors.stock}</Text> : null}
            </View>
          </View>

          <View style={s.field}>
            <Text style={[s.label, { color: C.textSecondary }]}>Categoría<Text style={{ color: C.red }}> *</Text></Text>
            <CategoryPicker value={category} onSelect={(v) => { setCategory(v); touch('category'); setErrors((prev) => ({ ...prev, category: undefined })); }} C={C} />
            {touched.category && errors.category ? <Text style={[s.errorText, { color: C.red }]}>{errors.category}</Text> : null}
          </View>

          <View style={s.section}>
            <Text style={[s.sectionLabel, { color: C.textSecondary }]}>Imágenes<Text style={{ color: C.red }}> *</Text></Text>
            <ImageStrip items={images} onAdd={handleAddImage} onRemove={handleRemoveImage} C={C} />
            <Text style={[s.hint, { color: C.textMuted }]}>La primera imagen será la portada.</Text>
            {touched.images && errors.images ? <Text style={[s.errorText, { color: C.red }]}>{errors.images}</Text> : null}
          </View>

          {category === 'Electronics' && (
            <>
              <Field label="Marca" required value={electronicsBrand}
                onChangeText={(v) => { setElectronicsBrand(v); if (touched.brand) revalidate('brand'); }}
                onBlur={() => { touch('brand'); revalidate('brand'); }}
                placeholder="Ej: Amazon" error={touched.brand ? errors.brand : undefined} C={C} />
              <Field label="Modelo" required value={electronicsModel}
                onChangeText={(v) => { setElectronicsModel(v); if (touched.model) revalidate('model'); }}
                onBlur={() => { touch('model'); revalidate('model'); }}
                placeholder="Ej: Kindle Paperwhite" error={touched.model ? errors.model : undefined} C={C} />
              <Field label="Garantía (meses)" required value={electronicsWarrantyMonths}
                onChangeText={(v) => { setElectronicsWarrantyMonths(v); if (touched.warranty_months) revalidate('warranty_months'); }}
                onBlur={() => { touch('warranty_months'); revalidate('warranty_months'); }}
                placeholder="Ej: 12" error={touched.warranty_months ? errors.warranty_months : undefined} keyboardType="numeric" C={C} />
            </>
          )}

          {category === 'Clothing' && (
            <>
              <Field label="Talle" required value={clothingSize}
                onChangeText={(v) => { setClothingSize(v); if (touched.size) revalidate('size'); }}
                onBlur={() => { touch('size'); revalidate('size'); }}
                placeholder="Ej: M" error={touched.size ? errors.size : undefined} C={C} />
              <Field label="Color" required value={clothingColor}
                onChangeText={(v) => { setClothingColor(v); if (touched.color) revalidate('color'); }}
                onBlur={() => { touch('color'); revalidate('color'); }}
                placeholder="Ej: Negro" error={touched.color ? errors.color : undefined} C={C} />
              <Field label="Material" required value={clothingMaterial}
                onChangeText={(v) => { setClothingMaterial(v); if (touched.material) revalidate('material'); }}
                onBlur={() => { touch('material'); revalidate('material'); }}
                placeholder="Ej: Algodón" error={touched.material ? errors.material : undefined} C={C} />
            </>
          )}

          <TouchableOpacity style={[s.submitBtn, { backgroundColor: C.accent, shadowColor: C.accent }, loading && s.submitDisabled]}
            onPress={handleSubmit} disabled={loading} accessibilityRole="button">
            {loading ? <ActivityIndicator color="#050508" size="small" /> : (
              <><MaterialIcons name={isEditing ? 'save' : 'publish'} size={18} color="#050508" /><Text style={s.submitText}>{isEditing ? 'Guardar cambios' : 'Publicar producto'}</Text></>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
      <Toast message={isEditing ? '¡Producto actualizado!' : '¡Producto publicado!'} visible={showToast} C={C} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 }, flex: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { width: 44 },
  backCircle: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  content: { paddingHorizontal: 20, paddingTop: 20 },
  section: { marginBottom: 20 }, sectionLabel: { fontSize: 13, fontWeight: '600', marginBottom: 10 },
  hint: { fontSize: 11, marginTop: 6 },
  imgRow: { flexDirection: 'row', gap: 10, paddingVertical: 4 },
  imgThumbWrap: { position: 'relative' },
  imgThumb: { width: 90, height: 90, borderRadius: 14, borderWidth: 2 },
  mainBadge: { position: 'absolute', top: 6, left: 6, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  mainBadgeText: { fontSize: 9, fontWeight: '800', color: '#050508' },
  removeBadge: { position: 'absolute', top: -5, right: -5, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  imgAdd: { width: 90, height: 90, borderRadius: 14, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4 },
  imgAddLabel: { fontSize: 10, fontWeight: '600' },
  field: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  inputWrap: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, height: 52, justifyContent: 'center' },
  input: { fontSize: 15, height: '100%' },
  textarea: { height: 120, minHeight: 120, paddingVertical: 14 },
  errorText: { fontSize: 12, marginTop: 5 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 18 }, half: { flex: 1 },
  priceWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, height: 52, overflow: 'hidden' },
  prefixSymbol: { paddingLeft: 14, paddingRight: 6, fontSize: 16, fontWeight: '600' },
  priceInput: { flex: 1, height: '100%', fontSize: 15, paddingRight: 14, borderWidth: 0 },
  catButton: { height: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catButtonText: { fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20, gap: 4 },
  modalTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  modalOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
  modalOptionText: { fontSize: 15 },
  submitBtn: { height: 54, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  submitDisabled: { opacity: 0.6 },
  submitText: { fontSize: 15, fontWeight: '800', color: '#050508' },
  toastWrap: { position: 'absolute', top: -100, bottom: -100, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  toastCard: { borderWidth: 1, paddingHorizontal: 40, paddingVertical: 32, borderRadius: 32, alignItems: 'center', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 30, elevation: 12 },
  toastIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  toastText: { fontWeight: '700', fontSize: 18, letterSpacing: -0.3 },
});
