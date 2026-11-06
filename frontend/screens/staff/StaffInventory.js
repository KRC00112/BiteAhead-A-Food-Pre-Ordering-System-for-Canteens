import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SearchBar from '../../components/SearchBar';

const API_URL = 'https://canteen-backend-xzko.onrender.com';

function InventoryCard({ item, token, onSaved }) {
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [saving, setSaving] = useState(false);

  async function saveInventory(available = item.available) {
    const nextQuantity = Number(quantity);
    if (!Number.isInteger(nextQuantity) || nextQuantity < 0 || nextQuantity > 10000) {
      Alert.alert('Invalid quantity', 'Enter a whole number between 0 and 10,000.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/staff/inventory/${item.food_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ['Authorization']: 'Bearer ' + token,
        },
        body: JSON.stringify({ quantity: nextQuantity, available }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.detail || 'Unable to update inventory.');
      setQuantity(String(result.quantity));
      onSaved(result);
    } catch (error) {
      Alert.alert('Inventory update failed', error.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.food}</Text>
          <Text style={styles.meta}>{item.category} · {item.food_type}</Text>
        </View>
        <Text style={[styles.status, item.available ? styles.inStock : styles.unavailable]}>
          {item.available ? item.stock_status : 'UNAVAILABLE'}
        </Text>
      </View>

      <View style={styles.stats}>
        <Text style={styles.stat}>Ordered (24h): {item.ordered_last_24h}</Text>
      </View>

      <View style={styles.controls}>
        <TextInput
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="number-pad"
          style={styles.quantityInput}
          accessibilityLabel={`${item.food} stock quantity`}
        />
        <Pressable
          disabled={saving}
          onPress={() => saveInventory(item.available)}
          style={styles.saveButton}
        >
          <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Save stock'}</Text>
        </Pressable>
      </View>

      <Pressable
        disabled={saving}
        onPress={() => saveInventory(!item.available)}
        style={styles.availabilityButton}
      >
        <Text style={styles.availabilityText}>
          {item.available ? 'Mark unavailable' : 'Mark available'}
        </Text>
      </Pressable>
    </View>
  );
}

export default function StaffInventory({ route }) {
  const token = route?.params?.userData?.access_token;
  const [inventory, setInventory] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const loadInventory = useCallback(async () => {
    if (!token) {
      Alert.alert('Authentication required', 'Please log in again to manage inventory.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/staff/inventory`, {
        headers: { ['Authorization']: 'Bearer ' + token },
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.detail || 'Unable to load inventory.');
      setInventory(result);
    } catch (error) {
      Alert.alert('Inventory unavailable', error.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => {
    loadInventory();
  }, [loadInventory]));

  function updateItem(updated) {
    setInventory(current => current.map(item => (
      item.food_id === updated.food_id ? updated : item
    )));
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Inventory</Text>
        <Text style={styles.subtitle}>Update stock and availability for each food item.</Text>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search inventory..." />
        {loading && <Text style={styles.message}>Loading inventory...</Text>}
        {!loading && inventory.filter(item => `${item.food} ${item.category} ${item.food_type}`.toLowerCase().includes(search.trim().toLowerCase())).map(item => (
          <InventoryCard key={item.food_id} item={item} token={token} onSaved={updateItem} />
        ))}
        {!loading && inventory.length === 0 && (
          <Text style={styles.message}>No food items found.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF8E7' },
  content: { padding: 16, paddingBottom: 32 },
  title: { color: '#111111', fontSize: 28, fontWeight: '900' },
  subtitle: { color: '#555555', marginTop: 4, marginBottom: 16 },
  message: { color: '#555555', fontSize: 16, marginTop: 20 },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#111111',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  itemInfo: { flex: 1 },
  itemName: { color: '#111111', fontSize: 18, fontWeight: '900' },
  meta: { color: '#666666', marginTop: 3 },
  status: { fontWeight: '900', fontSize: 12, textAlign: 'right' },
  inStock: { color: '#16803C' },
  unavailable: { color: '#C0392B' },
  stats: { flexDirection: 'row', gap: 16, marginTop: 12 },
  stat: { color: '#555555', fontSize: 13 },
  controls: { flexDirection: 'row', gap: 8, marginTop: 14 },
  quantityInput: {
    borderWidth: 2,
    borderColor: '#111111',
    borderRadius: 5,
    color: '#111111',
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    paddingHorizontal: 10,
  },
  saveButton: {
    backgroundColor: '#FFD43B',
    borderWidth: 2,
    borderColor: '#111111',
    borderRadius: 5,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  buttonText: { color: '#111111', fontWeight: '900' },
  availabilityButton: {
    borderWidth: 2,
    borderColor: '#111111',
    borderRadius: 5,
    marginTop: 8,
    padding: 10,
    alignItems: 'center',
  },
  availabilityText: { color: '#111111', fontWeight: '800' },
});
