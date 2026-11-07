import { Alert, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import styles from '../../styles';
import home from '../../styles/screens/home';
import { AdminFoodCard } from '../../components/AdminDataCard';
import SearchBar from '../../components/SearchBar';

const API_URL = 'https://canteen-backend-xzko.onrender.com';

const EMPTY_FORM = {
  name: '',
  price: '',
  description: '',
  category: '',
  food_type: 'VEG',
  ingredients: '',
  avg_cooking_time_minutes: '10',
  image_url: '',
};

function FoodItemForm({ item, token, onSaved, onClose }) {
  const [form, setForm] = useState(item ? {
    name: item.name ?? '',
    price: String(item.price ?? ''),
    description: item.description ?? '',
    category: item.category ?? '',
    food_type: item.food_type ?? 'VEG',
    ingredients: (item.ingredients ?? []).join(', '),
    avg_cooking_time_minutes: String(item.avg_cooking_time_minutes ?? 10),
    image_url: item.image_url ?? '',
  } : EMPTY_FORM);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const [saving, setSaving] = useState(false);

  function updateField(field, value) {
    setForm(current => ({ ...current, [field]: value }));
  }

  function validate() {
    if (!form.name.trim() || !form.category.trim()) return 'Name and category are required.';
    if (!Number.isFinite(Number(form.price)) || Number(form.price) <= 0) return 'Price must be greater than zero.';
    const minutes = Number(form.avg_cooking_time_minutes);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 180) return 'Cooking time must be between 1 and 180 minutes.';
    return null;
  }

  async function chooseImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to choose a menu item image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      setSelectedImage(result.assets[0]);
      setImageRemoved(false);
    }
  }

  async function uploadImage(foodId, image) {
    const imageResponse = await fetch(image.uri);
    if (!imageResponse.ok) {
      throw new Error('The selected image could not be read from the device.');
    }
    const imageBlob = await imageResponse.blob();
    const formData = new FormData();
    formData.append('file', imageBlob, image.fileName || `food-${foodId}.jpg`);
    const response = await fetch(`${API_URL}/admin/items/${foodId}/image`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = typeof result?.detail === 'string' ? result.detail : 'The image could not be uploaded.';
      throw new Error(detail);
    }
    return result;
  }

  async function saveItem() {
    const validationError = validate();
    if (validationError) {
      Alert.alert('Check the form', validationError);
      return;
    }

    const payload = {
      name: form.name.trim(),
      price: Number(form.price),
      description: form.description.trim() || null,
      category: form.category.trim(),
      food_type: form.food_type,
      ingredients: form.ingredients.split(',').map(value => value.trim()).filter(Boolean),
      avg_cooking_time_minutes: Number(form.avg_cooking_time_minutes),
    };

    setSaving(true);
    try {
      const response = await fetch(
        item ? `${API_URL}/admin/items/${item.id}` : `${API_URL}/admin/items`,
        {
          method: item ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        const detail = typeof result?.detail === 'string' ? result.detail : 'The food item could not be saved.';
        throw new Error(detail);
      }
      let savedItem = result;
      if (selectedImage) {
        savedItem = await uploadImage(result.id, selectedImage);
      } else if (item && imageRemoved && item.image_url) {
        const imageResponse = await fetch(`${API_URL}/admin/items/${item.id}/image`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        const imageResult = await imageResponse.json().catch(() => null);
        if (!imageResponse.ok) {
          const detail = typeof imageResult?.detail === 'string' ? imageResult.detail : 'The image could not be removed.';
          throw new Error(detail);
        }
        savedItem = imageResult;
      }
      onSaved(savedItem);
    } catch (error) {
      Alert.alert('Unable to save item', error.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={home.overlay}>
      <View style={[home.popupForm, styles.adminForm]}>
        <ScrollView
          style={styles.adminFormScroll}
          contentContainerStyle={styles.adminFormContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          <View style={styles.formHeader}>
            <View>
              <Text style={styles.sectionKicker}>{item ? 'Edit menu item' : 'New menu item'}</Text>
              <Text style={styles.sectionTitle}>{item ? item.name : 'Add food'}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.adminCloseButton}>
              <Ionicons name="close" size={22} color="#111111" />
            </Pressable>
          </View>

          <Text style={styles.formInputLabel}>Name *</Text>
          <TextInput value={form.name} onChangeText={value => updateField('name', value)} style={styles.inputText} placeholder="Paneer wrap" placeholderTextColor="#666666" />
          <Text style={styles.formInputLabel}>Price (INR) *</Text>
          <TextInput value={form.price} onChangeText={value => updateField('price', value)} style={styles.inputText} placeholder="60" placeholderTextColor="#666666" keyboardType="decimal-pad" />
          <Text style={styles.formInputLabel}>Category *</Text>
          <TextInput value={form.category} onChangeText={value => updateField('category', value)} style={styles.inputText} placeholder="Snacks" placeholderTextColor="#666666" />
          <Text style={styles.formInputLabel}>Description</Text>
          <TextInput value={form.description} onChangeText={value => updateField('description', value)} style={[styles.inputText, styles.multilineInput]} placeholder="Short description" placeholderTextColor="#666666" multiline />
          <Text style={styles.formInputLabel}>Food type</Text>
          <View style={styles.formChoiceRow}>
            {['VEG', 'NON_VEG'].map(type => (
              <Pressable key={type} onPress={() => updateField('food_type', type)} style={[styles.formChoice, form.food_type === type && styles.formChoiceSelected]}>
                <Text style={styles.formChoiceText}>{type.replace('_', '-')}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.formInputLabel}>Ingredients (comma separated)</Text>
          <TextInput value={form.ingredients} onChangeText={value => updateField('ingredients', value)} style={styles.inputText} placeholder="Paneer, wrap, onion" placeholderTextColor="#666666" />
          <Text style={styles.formInputLabel}>Cooking time (minutes) *</Text>
          <TextInput value={form.avg_cooking_time_minutes} onChangeText={value => updateField('avg_cooking_time_minutes', value)} style={styles.inputText} placeholder="10" placeholderTextColor="#666666" keyboardType="number-pad" />

          <Text style={styles.formInputLabel}>Menu image</Text>
          {(selectedImage?.uri || (item?.image_url && !imageRemoved)) && (
            <Image
              source={{ uri: selectedImage?.uri || item.image_url }}
              style={styles.adminImagePreview}
              resizeMode="cover"
            />
          )}
          <View style={styles.imageActions}>
            <Pressable onPress={chooseImage} style={styles.imageActionButton}>
              <Ionicons name="image-outline" size={18} color="#111111" />
              <Text style={styles.imageActionText}>{selectedImage || item?.image_url ? 'Choose different image' : 'Choose image'}</Text>
            </Pressable>
            {(selectedImage || (item?.image_url && !imageRemoved)) && (
              <Pressable
                onPress={() => {
                  setSelectedImage(null);
                  setImageRemoved(true);
                }}
                style={styles.imageRemoveButton}
              >
                <Text style={styles.imageRemoveText}>Remove</Text>
              </Pressable>
            )}
          </View>
          <Text style={styles.formHint}>JPEG, PNG or WebP, up to 2 MB.</Text>
          <Text style={styles.formHint}>Stock and availability are managed by canteen staff.</Text>
          <Pressable onPress={saveItem} disabled={saving} style={[styles.button, saving && styles.buttonDisabled]}>
            <Text style={styles.buttonText}>{saving ? 'Saving...' : item ? 'Save changes' : 'Create item'}</Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}

export default function FoodItems({ route }) {
  const token = route?.params?.userData?.access_token;
  const [foodList, setFoodList] = useState([]);
  const [search, setSearch] = useState('');
  const [formItem, setFormItem] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const getFoodList = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/menu`);
      if (!response.ok) throw new Error('Unable to load food items.');
      setFoodList(await response.json());
    } catch (error) {
      Alert.alert('Unable to load menu', error.message || 'Please try again.');
    }
  }, []);

  useEffect(() => {
    getFoodList();
  }, [getFoodList]);

  function openCreateForm() {
    setFormItem(undefined);
    setShowForm(true);
  }

  function openEditForm(item) {
    setFormItem(item);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setFormItem(null);
  }

  function handleSaved(savedItem) {
    setFoodList(current => {
      const exists = current.some(item => item.id === savedItem.id);
      return exists ? current.map(item => item.id === savedItem.id ? savedItem : item) : [savedItem, ...current];
    });
    closeForm();
  }

  function deleteItem(item) {
    Alert.alert(
      'Delete food item?',
      `"${item.name}" will be removed from the menu. Past orders are not affected.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/admin/items/${item.id}`, {
                method: 'DELETE',
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });
              const result = await response.json().catch(() => null);
              if (!response.ok) {
                const detail = typeof result?.detail === 'string' ? result.detail : 'The food item could not be deleted.';
                throw new Error(detail);
              }
              setFoodList(current => current.filter(foodItem => foodItem.id !== item.id));
            } catch (error) {
              Alert.alert('Unable to delete item', error.message || 'Please try again.');
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={home.container} edges={['top', 'left', 'right']}>
      <View style={styles.defaultView}>
        {showForm && <FoodItemForm item={formItem} token={token} onSaved={handleSaved} onClose={closeForm} />}
        <Pressable onPress={openCreateForm} style={styles.addNewCard}>
          <Ionicons name="add-circle-outline" size={28} color="black" />
          <Text style={{ fontWeight: '900' }}>Add New Food Item</Text>
        </Pressable>
        <ScrollView>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search food or category..." />
          {foodList.filter(item => `${item.name} ${item.category} ${item.food_type}`.toLowerCase().includes(search.trim().toLowerCase())).map(item => (
            <AdminFoodCard key={item.id} item={item} onEdit={openEditForm} onDelete={deleteItem} />
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
