import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL = 'https://canteen-backend-xzko.onrender.com';
const PERIODS = [
  { value: 'weekly', label: 'Week' },
  { value: 'monthly', label: 'Month' },
  { value: 'quarterly', label: 'Quarter' },
  { value: 'yearly', label: 'Year' },
];

function money(value) {
  return `Rs ${Number(value || 0).toFixed(2)}`;
}

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function SectionTitle({ children }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export default function ReportsTab({ route }) {
  const token = route?.params?.userData?.access_token;
  const [period, setPeriod] = useState('monthly');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadReport = useCallback(async () => {
    if (!token) {
      Alert.alert('Authentication required', 'Please log in again to view reports.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/reports/sales?period=${period}`, {
        headers: { ['Authorization']: 'Bearer ' + token },
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.detail || 'Unable to load sales report.');
      setReport(result);
    } catch (error) {
      Alert.alert('Reports unavailable', error.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [period, token]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Sales Reports</Text>
        <Text style={styles.subtitle}>Cancelled orders are excluded from sales.</Text>

        <View style={styles.periods}>
          {PERIODS.map(option => (
            <Pressable
              key={option.value}
              onPress={() => setPeriod(option.value)}
              style={[styles.periodButton, period === option.value && styles.selectedPeriod]}
            >
              <Text style={styles.periodText}>{option.label}</Text>
            </Pressable>
          ))}
        </View>

        {loading && <Text style={styles.message}>Loading report...</Text>}
        {!loading && report && (
          <>
            <Text style={styles.reportLabel}>{report.label}</Text>
            <View style={styles.summary}>
              <Stat label="Revenue" value={money(report.summary.revenue)} />
              <Stat label="Orders" value={report.summary.orders} />
              <Stat label="Items sold" value={report.summary.items_sold} />
              <Stat label="Customers" value={report.summary.customers} />
              <Stat label="Collected" value={money(report.summary.collected)} />
              <Stat label="Pending" value={money(report.summary.pending)} />
            </View>

            <SectionTitle>Highlights</SectionTitle>
            <View style={styles.card}>
              <Text style={styles.row}>Best seller: {report.highlights.best_seller || '-'}</Text>
              <Text style={styles.row}>Top earner: {report.highlights.top_earner || '-'}</Text>
              <Text style={styles.row}>Busiest hour: {report.highlights.busiest_hour || '-'}</Text>
              <Text style={styles.row}>Best day: {report.highlights.best_day || '-'}</Text>
            </View>

            <SectionTitle>Sales breakdown</SectionTitle>
            {report.breakdown.map(bucket => (
              <View style={styles.rowCard} key={bucket.start}>
                <Text style={styles.rowTitle}>{bucket.label}</Text>
                <Text style={styles.rowValue}>{money(bucket.revenue)} · {bucket.orders} orders</Text>
              </View>
            ))}

            <SectionTitle>Items sold</SectionTitle>
            {report.items.slice(0, 10).map(item => (
              <View style={styles.rowCard} key={item.food_id}>
                <View style={styles.itemText}>
                  <Text style={styles.rowTitle}>{item.food}</Text>
                  <Text style={styles.meta}>{item.category} · {item.quantity} sold</Text>
                </View>
                <Text style={styles.rowValue}>{money(item.revenue)}</Text>
              </View>
            ))}

            <SectionTitle>Payment methods</SectionTitle>
            {report.payment_methods.map(method => (
              <View style={styles.rowCard} key={method.name}>
                <Text style={styles.rowTitle}>{method.name}</Text>
                <Text style={styles.rowValue}>{money(method.revenue)} · {method.orders} orders</Text>
              </View>
            ))}
          </>
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
  periods: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  periodButton: { borderWidth: 2, borderColor: '#111111', borderRadius: 6, padding: 10 },
  selectedPeriod: { backgroundColor: '#FFD43B' },
  periodText: { color: '#111111', fontWeight: '900' },
  reportLabel: { color: '#555555', fontWeight: '800', marginBottom: 8 },
  summary: {
    backgroundColor: '#FFD43B',
    borderWidth: 3,
    borderColor: '#111111',
    borderRadius: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 12,
  },
  stat: { width: '48%', marginBottom: 12 },
  statLabel: { color: '#555555', fontWeight: '700' },
  statValue: { color: '#111111', fontSize: 18, fontWeight: '900', marginTop: 3 },
  sectionTitle: { color: '#111111', fontSize: 19, fontWeight: '900', marginTop: 22, marginBottom: 8 },
  card: { backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#111111', padding: 12 },
  row: { color: '#333333', fontWeight: '700', marginBottom: 6 },
  rowCard: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#DDDDDD',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
  },
  rowTitle: { color: '#111111', fontWeight: '800', flex: 1 },
  rowValue: { color: '#444444', fontWeight: '700', textAlign: 'right' },
  itemText: { flex: 1 },
  meta: { color: '#666666', marginTop: 3 },
  message: { color: '#555555', fontSize: 16, marginTop: 20 },
});
