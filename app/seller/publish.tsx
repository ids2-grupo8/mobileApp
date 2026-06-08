import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/colors';
import { useTheme } from '@/hooks/use-theme';
import {
  type CreateProductData,
  createProductRequest,
  fetchCatalogProductById,
  updateProductRequest,
} from '@/services/catalog';
import { useAuthStore } from '@/store/auth';

const CATEGORIES = ['Electronics', 'Clothing', 'Books', 'Home', 'Sports'] as const;
const CATEGORY_LABELS: Record<(typeof CATEGORIES)[number], string> = {
  Electronics: 'Electrónica',
  Clothing: 'Ropa',
  Books: 'Libros',
  Home: 'Hogar',
  Sports: 'Deportes',
};

const THUMB_SIZE = 90;
const THUMB_GAP = 10;
const SLOT_W = THUMB_SIZE + THUMB_GAP;
const MAX_IMAGES = 8;

type ManagedImage = { uri: string; isRemote: boolean };
type Errors = Partial<Record<'images' | 'title' | 'description' | 'price' | 'stock' | 'category' | 'brand' | 'model' | 'warranty_months' | 'size' | 'color' | 'material' | 'author' | 'publisher' | 'isbn' | 'genre' | 'language' | 'room_type' | 'dimensions' | 'sport', string>>;

const triggerHapticMedium = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
const triggerHapticLight = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

function Toast({ message, visible, C }: { message: string; visible: boolean; C: ThemeColors }) {
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    scale.setValue(0.85);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 260 }),
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  }, [visible, scale, opacity]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[s.toastWrap, { opacity, transform: [{ scale }] }]}
      pointerEvents="none">
      <View style={[s.toastCard, { backgroundColor: C.elevated, borderColor: C.glassBorder, shadowColor: C.shadowDark }]}>
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
      <View style={[s.catButton, { backgroundColor: C.glass, borderColor: value ? C.accent : C.glassBorder }]}>
        <TouchableOpacity
          style={s.catButtonMain}
          onPress={() => setOpen(true)}
          accessibilityRole="button">
          <Text style={[s.catButtonText, { color: value ? C.textPrimary : C.textMuted }]}>
            {value ? CATEGORY_LABELS[value as keyof typeof CATEGORY_LABELS] : 'Seleccioná una categoría'}
          </Text>
        </TouchableOpacity>
        {value ? (
          <TouchableOpacity
            onPress={() => onSelect('')}
            hitSlop={8}
            style={s.catClearBtn}
            accessibilityRole="button"
            accessibilityLabel="Quitar categoría">
            <MaterialIcons name="close" size={18} color={C.textSecondary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setOpen(true)} style={s.catChevron} accessibilityRole="button">
            <MaterialIcons name="expand-more" size={20} color={C.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={[s.modalSheet, { backgroundColor: C.elevated, borderColor: C.glassBorder }]}>
            <Text style={[s.modalTitle, { color: C.textPrimary }]}>Categoría</Text>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[s.modalOption, { borderColor: C.glassBorder }, cat === value && { backgroundColor: C.accentGlow }]}
                onPress={() => { onSelect(cat === value ? '' : cat); setOpen(false); }}
                accessibilityRole="button">
                <Text style={[s.modalOptionText, { color: cat === value ? C.accent : C.textPrimary }]}>
                  {CATEGORY_LABELS[cat]}
                </Text>
                {cat === value && <MaterialIcons name="check" size={16} color={C.accent} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function DraggableThumb({
  item,
  index,
  total,
  activeIdx,
  hoverIdx,
  dragTX,
  onRemove,
  onDrop,
  onDragStart,
  onDragEnd,
  C,
}: {
  item: ManagedImage;
  index: number;
  total: number;
  activeIdx: SharedValue<number>;
  hoverIdx: SharedValue<number>;
  dragTX: SharedValue<number>;
  onRemove: (i: number) => void;
  onDrop: (from: number, to: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  C: ThemeColors;
}) {
  const lastHover = useSharedValue(-1);

  const pan = Gesture.Pan()
    .activateAfterLongPress(300)
    .onStart(() => {
      activeIdx.value = index;
      hoverIdx.value = index;
      lastHover.value = index;
      dragTX.value = 0;
      runOnJS(triggerHapticMedium)();
      runOnJS(onDragStart)();
    })
    .onUpdate((e) => {
      dragTX.value = e.translationX;
      const rawPos = index * SLOT_W + e.translationX;
      const next = Math.max(0, Math.min(total - 1, Math.round(rawPos / SLOT_W)));
      if (next !== lastHover.value) {
        lastHover.value = next;
        runOnJS(triggerHapticLight)();
      }
      hoverIdx.value = next;
    })
    .onEnd(() => {
      const from = activeIdx.value;
      const to = hoverIdx.value;
      activeIdx.value = -1;
      hoverIdx.value = -1;
      dragTX.value = 0;
      runOnJS(onDragEnd)();
      if (from !== to) runOnJS(onDrop)(from, to);
    })
    .onFinalize(() => {
      activeIdx.value = -1;
      hoverIdx.value = -1;
      dragTX.value = 0;
      runOnJS(onDragEnd)();
    });

  const animStyle = useAnimatedStyle(() => {
    const isActive = activeIdx.value === index;
    if (isActive) {
      return {
        transform: [{ translateX: dragTX.value }, { scale: 1.08 }],
        zIndex: 100,
        opacity: 0.92,
        shadowOpacity: 0.5,
      };
    }

    const from = activeIdx.value;
    const to = hoverIdx.value;
    let shift = 0;
    if (from !== -1) {
      if (from < to && index > from && index <= to) shift = -SLOT_W;
      else if (from > to && index < from && index >= to) shift = SLOT_W;
    }

    return {
      transform: [{ translateX: withSpring(shift, { damping: 100, stiffness: 500, overshootClamping: true }) }, { scale: withSpring(1, { damping: 100, stiffness: 500, overshootClamping: true }) }],
      zIndex: 1,
      opacity: 1,
    };
  });

  return (
    <GestureDetector gesture={pan}>
      <ReAnimated.View style={[s.imgThumbWrap, animStyle]}>
        <Image
          source={{ uri: item.uri }}
          style={[s.imgThumb, { borderColor: index === 0 ? C.accent : C.glassBorder }]}
          contentFit="cover"
        />
        {index === 0 && (
          <View style={[s.mainBadge, { backgroundColor: C.accent }]}>
            <Text style={s.mainBadgeText}>Principal</Text>
          </View>
        )}
        <TouchableOpacity
          style={[s.removeBadge, { backgroundColor: C.red }]}
          onPress={() => onRemove(index)}
          accessibilityRole="button"
          accessibilityLabel="Eliminar imagen">
          <MaterialIcons name="close" size={12} color="#fff" />
        </TouchableOpacity>
        <View style={s.dragHint} pointerEvents="none">
          <MaterialIcons name="drag-indicator" size={14} color="rgba(255,255,255,0.55)" />
        </View>
      </ReAnimated.View>
    </GestureDetector>
  );
}

function ImageStrip({
  items,
  onAdd,
  onRemove,
  onReorder,
  C,
}: {
  items: ManagedImage[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  onReorder: (from: number, to: number) => void;
  C: ThemeColors;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const activeIdx = useSharedValue(-1);
  const hoverIdx = useSharedValue(-1);
  const dragTX = useSharedValue(0);

  return (
    <View>
      {items.length > 1 && (
        <Text style={[s.dragHintLabel, { color: C.textMuted }]}>Mantenés presionada una imagen para reordenar</Text>
      )}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.imgRow}
        scrollEnabled={!isDragging}>
        {items.map((item, i) => (
          <DraggableThumb
            key={`${item.uri}-${i}`}
            item={item}
            index={i}
            total={items.length}
            activeIdx={activeIdx}
            hoverIdx={hoverIdx}
            dragTX={dragTX}
            onRemove={onRemove}
            onDrop={onReorder}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={() => setIsDragging(false)}
            C={C}
          />
        ))}
        {items.length < MAX_IMAGES && (
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
    </View>
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
  attrs: Record<string, string>,
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
    if (!attrs.brand?.trim()) e.brand = 'La marca es obligatoria.';
    if (!attrs.model?.trim()) e.model = 'El modelo es obligatorio.';
    const warranty = parseInt(attrs.warranty_months ?? '', 10);
    if (!attrs.warranty_months?.trim()) e.warranty_months = 'La garantía es obligatoria.';
    else if (Number.isNaN(warranty) || warranty < 0) e.warranty_months = 'La garantía debe ser un número válido.';
  }
  if (category === 'Clothing') {
    if (!attrs.size?.trim()) e.size = 'El talle es obligatorio.';
    if (!attrs.color?.trim()) e.color = 'El color es obligatorio.';
    if (!attrs.material?.trim()) e.material = 'El material es obligatorio.';
  }
  if (category === 'Books') {
    if (!attrs.author?.trim()) e.author = 'El autor es obligatorio.';
    if (!attrs.publisher?.trim()) e.publisher = 'La editorial es obligatoria.';
    if (!attrs.isbn?.trim()) e.isbn = 'El ISBN es obligatorio.';
    if (!attrs.genre?.trim()) e.genre = 'El género es obligatorio.';
    if (!attrs.language?.trim()) e.language = 'El idioma es obligatorio.';
  }
  if (category === 'Home') {
    if (!attrs.brand?.trim()) e.brand = 'La marca es obligatoria.';
    if (!attrs.material?.trim()) e.material = 'El material es obligatorio.';
    if (!attrs.room_type?.trim()) e.room_type = 'El tipo de ambiente es obligatorio.';
    if (!attrs.dimensions?.trim()) e.dimensions = 'Las dimensiones son obligatorias.';
  }
  if (category === 'Sports') {
    if (!attrs.brand?.trim()) e.brand = 'La marca es obligatoria.';
    if (!attrs.sport?.trim()) e.sport = 'El deporte es obligatorio.';
    if (!attrs.size?.trim()) e.size = 'El talle/medida es obligatorio.';
    if (!attrs.material?.trim()) e.material = 'El material es obligatorio.';
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
  const [booksAuthor, setBooksAuthor] = useState('');
  const [booksPublisher, setBooksPublisher] = useState('');
  const [booksIsbn, setBooksIsbn] = useState('');
  const [booksGenre, setBooksGenre] = useState('');
  const [booksLanguage, setBooksLanguage] = useState('');
  const [homeBrand, setHomeBrand] = useState('');
  const [homeMaterial, setHomeMaterial] = useState('');
  const [homeRoomType, setHomeRoomType] = useState('');
  const [homeDimensions, setHomeDimensions] = useState('');
  const [sportsBrand, setSportsBrand] = useState('');
  const [sportsSport, setSportsSport] = useState('');
  const [sportsSize, setSportsSize] = useState('');
  const [sportsMaterial, setSportsMaterial] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [hydrating, setHydrating] = useState(isEditing);
  const [showToast, setShowToast] = useState(false);

  const touch = (field: string) => setTouched((t) => ({ ...t, [field]: true }));
  const revalidate = (field?: string) => {
    let attrs: Record<string, string> = {};
    if (category === 'Electronics') {
      attrs = { brand: electronicsBrand, model: electronicsModel, warranty_months: electronicsWarrantyMonths };
    } else if (category === 'Clothing') {
      attrs = { size: clothingSize, color: clothingColor, material: clothingMaterial };
    } else if (category === 'Books') {
      attrs = { author: booksAuthor, publisher: booksPublisher, isbn: booksIsbn, genre: booksGenre, language: booksLanguage };
    } else if (category === 'Home') {
      attrs = { brand: homeBrand, material: homeMaterial, room_type: homeRoomType, dimensions: homeDimensions };
    } else if (category === 'Sports') {
      attrs = { brand: sportsBrand, sport: sportsSport, size: sportsSize, material: sportsMaterial };
    }
    const e = validate(images, title, description, price, stock, category, attrs);
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
      if (!productId) {
        setHydrating(false);
        return;
      }

      setHydrating(true);
      try {
        const existing = await fetchCatalogProductById(productId);

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
        const validCats = new Set(['Electronics', 'Clothing', 'Books', 'Home', 'Sports']);
        setCategory(validCats.has(existing.category) ? existing.category : '');
        setImages((existing.images?.length > 0 ? existing.images : [existing.imageUrl].filter(Boolean)).map((uri) => ({ uri, isRemote: true })));

        setElectronicsBrand(''); setElectronicsModel(''); setElectronicsWarrantyMonths('');
        setClothingSize(''); setClothingColor(''); setClothingMaterial('');
        setBooksAuthor(''); setBooksPublisher(''); setBooksIsbn(''); setBooksGenre(''); setBooksLanguage('');
        setHomeBrand(''); setHomeMaterial(''); setHomeRoomType(''); setHomeDimensions('');
        setSportsBrand(''); setSportsSport(''); setSportsSize(''); setSportsMaterial('');

        const attrs = existing.attributes ?? {};
        if (existing.category === 'Electronics') {
          setElectronicsBrand(String(attrs.brand ?? ''));
          setElectronicsModel(String(attrs.model ?? ''));
          setElectronicsWarrantyMonths(String(attrs.warranty_months ?? ''));
        } else if (existing.category === 'Clothing') {
          setClothingSize(String(attrs.size ?? ''));
          setClothingColor(String(attrs.color ?? ''));
          setClothingMaterial(String(attrs.material ?? ''));
        } else if (existing.category === 'Books') {
          setBooksAuthor(String(attrs.author ?? ''));
          setBooksPublisher(String(attrs.publisher ?? ''));
          setBooksIsbn(String(attrs.isbn ?? ''));
          setBooksGenre(String(attrs.genre ?? ''));
          setBooksLanguage(String(attrs.language ?? ''));
        } else if (existing.category === 'Home') {
          setHomeBrand(String(attrs.brand ?? ''));
          setHomeMaterial(String(attrs.material ?? ''));
          setHomeRoomType(String(attrs.room_type ?? ''));
          setHomeDimensions(String(attrs.dimensions ?? ''));
        } else if (existing.category === 'Sports') {
          setSportsBrand(String(attrs.brand ?? ''));
          setSportsSport(String(attrs.sport ?? ''));
          setSportsSize(String(attrs.size ?? ''));
          setSportsMaterial(String(attrs.material ?? ''));
        }

        setErrors({});
        setTouched({});
      } catch {
        Alert.alert('No pudimos cargar el producto', 'Hubo un problema al traer los datos para editar. Intentá de nuevo en unos segundos.');
        router.back();
      } finally {
        if (active) setHydrating(false);
      }
    };

    loadProduct();

    return () => {
      active = false;
    };
  }, [isEditing, productId, router]);

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

  const handleReorderImage = (from: number, to: number) => {
    const next = [...images];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setImages(next);
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
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
        images: newImageFiles,
      };

      let fullPayload: CreateProductData;
      if (category === 'Electronics') {
        fullPayload = { ...basePayload, category: 'Electronics' as const, brand: electronicsBrand.trim(), model: electronicsModel.trim(), warranty_months: parseInt(electronicsWarrantyMonths, 10) };
      } else if (category === 'Books') {
        fullPayload = { ...basePayload, category: 'Books' as const, author: booksAuthor.trim(), publisher: booksPublisher.trim(), isbn: booksIsbn.trim(), genre: booksGenre.trim(), language: booksLanguage.trim() };
      } else if (category === 'Home') {
        fullPayload = { ...basePayload, category: 'Home' as const, brand: homeBrand.trim(), material: homeMaterial.trim(), room_type: homeRoomType.trim(), dimensions: homeDimensions.trim() };
      } else if (category === 'Sports') {
        fullPayload = { ...basePayload, category: 'Sports' as const, brand: sportsBrand.trim(), sport: sportsSport.trim(), size: sportsSize.trim(), material: sportsMaterial.trim() };
      } else {
        fullPayload = { ...basePayload, category: 'Clothing' as const, size: clothingSize.trim(), color: clothingColor.trim(), material: clothingMaterial.trim() };
      }

      if (isEditing && productId) {
        await updateProductRequest(productId, fullPayload, existingImageUrls);
      } else {
        await createProductRequest(fullPayload);
      }

      Keyboard.dismiss();
      setTimeout(() => {
        setShowToast(true);
        setTimeout(() => { setShowToast(false); router.back(); }, 2000);
      }, 350);
    } catch {
      Alert.alert(
        isEditing ? 'No pudimos actualizar el producto' : 'No pudimos publicar el producto',
        'Verificá los datos y tu conexión, y volvé a intentarlo en unos segundos.',
      );
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
    <View style={[s.root, { backgroundColor: C.bg, paddingTop: insets.top }]}>
      <View style={[s.topBar, { borderBottomColor: C.glassBorder }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} accessibilityRole="button">
          <View style={[s.backCircle, { backgroundColor: C.glass, borderColor: C.glassBorder }]}>
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
            <CategoryPicker
              value={category}
              onSelect={(v) => {
                setCategory(v);
                touch('category');
                setErrors((prev) => ({ ...prev, category: v ? undefined : 'Seleccioná una categoría.' }));
              }}
              C={C}
            />
            {touched.category && errors.category ? <Text style={[s.errorText, { color: C.red }]}>{errors.category}</Text> : null}
          </View>

          <View style={s.section}>
            <Text style={[s.sectionLabel, { color: C.textSecondary }]}>Imágenes<Text style={{ color: C.red }}> *</Text></Text>
            <ImageStrip items={images} onAdd={handleAddImage} onRemove={handleRemoveImage} onReorder={handleReorderImage} C={C} />
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

          {category === 'Books' && (
            <>
              <Field label="Autor" required value={booksAuthor}
                onChangeText={(v) => { setBooksAuthor(v); if (touched.author) revalidate('author'); }}
                onBlur={() => { touch('author'); revalidate('author'); }}
                placeholder="Ej: Gabriel García Márquez" error={touched.author ? errors.author : undefined} C={C} />
              <Field label="Editorial" required value={booksPublisher}
                onChangeText={(v) => { setBooksPublisher(v); if (touched.publisher) revalidate('publisher'); }}
                onBlur={() => { touch('publisher'); revalidate('publisher'); }}
                placeholder="Ej: Sudamericana" error={touched.publisher ? errors.publisher : undefined} C={C} />
              <Field label="ISBN" required value={booksIsbn}
                onChangeText={(v) => { setBooksIsbn(v); if (touched.isbn) revalidate('isbn'); }}
                onBlur={() => { touch('isbn'); revalidate('isbn'); }}
                placeholder="Ej: 978-950-07-0399-7" error={touched.isbn ? errors.isbn : undefined} C={C} />
              <Field label="Género" required value={booksGenre}
                onChangeText={(v) => { setBooksGenre(v); if (touched.genre) revalidate('genre'); }}
                onBlur={() => { touch('genre'); revalidate('genre'); }}
                placeholder="Ej: Novela" error={touched.genre ? errors.genre : undefined} C={C} />
              <Field label="Idioma" required value={booksLanguage}
                onChangeText={(v) => { setBooksLanguage(v); if (touched.language) revalidate('language'); }}
                onBlur={() => { touch('language'); revalidate('language'); }}
                placeholder="Ej: Español" error={touched.language ? errors.language : undefined} C={C} />
            </>
          )}

          {category === 'Home' && (
            <>
              <Field label="Marca" required value={homeBrand}
                onChangeText={(v) => { setHomeBrand(v); if (touched.brand) revalidate('brand'); }}
                onBlur={() => { touch('brand'); revalidate('brand'); }}
                placeholder="Ej: IKEA" error={touched.brand ? errors.brand : undefined} C={C} />
              <Field label="Material" required value={homeMaterial}
                onChangeText={(v) => { setHomeMaterial(v); if (touched.material) revalidate('material'); }}
                onBlur={() => { touch('material'); revalidate('material'); }}
                placeholder="Ej: Madera" error={touched.material ? errors.material : undefined} C={C} />
              <Field label="Ambiente" required value={homeRoomType}
                onChangeText={(v) => { setHomeRoomType(v); if (touched.room_type) revalidate('room_type'); }}
                onBlur={() => { touch('room_type'); revalidate('room_type'); }}
                placeholder="Ej: Dormitorio" error={touched.room_type ? errors.room_type : undefined} C={C} />
              <Field label="Dimensiones" required value={homeDimensions}
                onChangeText={(v) => { setHomeDimensions(v); if (touched.dimensions) revalidate('dimensions'); }}
                onBlur={() => { touch('dimensions'); revalidate('dimensions'); }}
                placeholder="Ej: 120cm x 60cm x 75cm" error={touched.dimensions ? errors.dimensions : undefined} C={C} />
            </>
          )}

          {category === 'Sports' && (
            <>
              <Field label="Marca" required value={sportsBrand}
                onChangeText={(v) => { setSportsBrand(v); if (touched.brand) revalidate('brand'); }}
                onBlur={() => { touch('brand'); revalidate('brand'); }}
                placeholder="Ej: Nike" error={touched.brand ? errors.brand : undefined} C={C} />
              <Field label="Deporte" required value={sportsSport}
                onChangeText={(v) => { setSportsSport(v); if (touched.sport) revalidate('sport'); }}
                onBlur={() => { touch('sport'); revalidate('sport'); }}
                placeholder="Ej: Fútbol" error={touched.sport ? errors.sport : undefined} C={C} />
              <Field label="Talle / Medida" required value={sportsSize}
                onChangeText={(v) => { setSportsSize(v); if (touched.size) revalidate('size'); }}
                onBlur={() => { touch('size'); revalidate('size'); }}
                placeholder="Ej: 42" error={touched.size ? errors.size : undefined} C={C} />
              <Field label="Material" required value={sportsMaterial}
                onChangeText={(v) => { setSportsMaterial(v); if (touched.material) revalidate('material'); }}
                onBlur={() => { touch('material'); revalidate('material'); }}
                placeholder="Ej: Cuero sintético" error={touched.material ? errors.material : undefined} C={C} />
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
  dragHintLabel: { fontSize: 11, marginBottom: 6 },
  imgRow: { flexDirection: 'row', gap: 10, paddingVertical: 4 },
  imgThumbWrap: { position: 'relative' },
  imgThumb: { width: 90, height: 90, borderRadius: 14, borderWidth: 2 },
  mainBadge: { position: 'absolute', top: 6, left: 6, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  mainBadgeText: { fontSize: 9, fontWeight: '800', color: '#050508' },
  removeBadge: { position: 'absolute', top: -5, right: -5, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dragHint: { position: 'absolute', bottom: 4, right: 4 },
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
  catButton: { height: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' },
  catButtonMain: { flex: 1, justifyContent: 'center' },
  catButtonText: { fontSize: 15 },
  catClearBtn: { paddingLeft: 8 },
  catChevron: { paddingLeft: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20, gap: 4 },
  modalTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  modalOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
  modalOptionText: { fontSize: 15 },
  submitBtn: { height: 54, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  submitDisabled: { opacity: 0.6 },
  submitText: { fontSize: 15, fontWeight: '800', color: '#050508' },
  toastWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  toastCard: { borderWidth: 1, paddingHorizontal: 40, paddingVertical: 32, borderRadius: 32, alignItems: 'center', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 30, elevation: 12 },
  toastIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  toastText: { fontWeight: '700', fontSize: 18, letterSpacing: -0.3 },
});
