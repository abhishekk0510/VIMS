import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { invoiceService } from '../services/invoiceService';
import { Colors, STATUS_COLORS } from '../theme';
import { format } from 'date-fns';

const STATUSES = [
  { key: 'ALL', label: 'All' },
  { key: 'DRAFT', label: 'Draft' },
  { key: 'PENDING_APPROVAL', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'PAID', label: 'Paid' },
  { key: 'REWORK_REQUIRED', label: 'Rework' },
];

const RISK_COLOR = { LOW: Colors.success, MEDIUM: Colors.warning, HIGH: Colors.danger };

export default function InvoiceListScreen({ route }) {
  const navigation = useNavigation();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(route?.params?.status || 'ALL');

  const load = useCallback(async () => {
    try {
      const params = {};
      if (status !== 'ALL') params.status = status;
      if (search.trim()) params.search = search.trim();
      const res = await invoiceService.getAll(params);
      setInvoices(res.data.data || res.data || []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [status, search]);

  useEffect(() => { load(); }, [load]);

  const renderItem = ({ item }) => {
    const sc = STATUS_COLORS[item.status] || STATUS_COLORS.DRAFT;
    const rc = RISK_COLOR[item.riskLevel];
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('InvoiceDetail', { id: item.id })}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.invoiceNum}>{item.invoiceNumber}</Text>
          <View style={[styles.badge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
            <Text style={[styles.badgeText, { color: sc.text }]}>
              {item.status?.replace(/_/g, ' ')}
            </Text>
          </View>
        </View>
        <Text style={styles.vendor}>{item.vendorName}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.amount}>
            ₹{Number(item.amount || 0).toLocaleString('en-IN')}
          </Text>
          <Text style={styles.date}>
            {item.invoiceDate
              ? format(new Date(item.invoiceDate), 'dd MMM yyyy')
              : '—'}
          </Text>
          {rc && item.riskLevel && (
            <View style={[styles.riskBadge, { backgroundColor: rc + '22', borderColor: rc }]}>
              <Text style={[styles.riskText, { color: rc }]}>{item.riskLevel}</Text>
            </View>
          )}
        </View>
        {item.description ? (
          <Text style={styles.desc} numberOfLines={1}>{item.description}</Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          style={styles.menuBtn}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Invoices</Text>
        {invoices.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{invoices.length}</Text>
          </View>
        )}
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by number, vendor..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={load}
          returnKeyType="search"
        />
      </View>

      {/* Status filters */}
      <FlatList
        horizontal
        data={STATUSES}
        keyExtractor={(s) => s.key}
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 8 }}
        renderItem={({ item: s }) => (
          <TouchableOpacity
            style={[styles.pill, s.key === status && styles.pillActive]}
            onPress={() => setStatus(s.key)}
          >
            <Text style={[styles.pillText, s.key === status && styles.pillTextActive]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={Colors.primary}
            />
          }
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📄</Text>
              <Text style={styles.emptyTitle}>No invoices found</Text>
              <Text style={styles.emptyHint}>Try adjusting the filters</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  menuBtn: { padding: 4 },
  menuIcon: { color: Colors.text, fontSize: 22 },
  title: { color: Colors.text, fontSize: 20, fontWeight: '700', flex: 1 },
  countBadge: {
    backgroundColor: Colors.primary + '22',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  countText: { color: Colors.primary, fontSize: 12, fontWeight: '700' },
  searchWrap: { paddingHorizontal: 16, paddingTop: 12 },
  searchInput: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    color: Colors.text,
    fontSize: 14,
  },
  filterRow: { maxHeight: 52 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pillText: { color: Colors.textMuted, fontSize: 13, fontWeight: '500' },
  pillTextActive: { color: '#fff', fontWeight: '600' },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  invoiceNum: { color: Colors.text, fontWeight: '700', fontSize: 14 },
  badge: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  vendor: { color: Colors.textMuted, fontSize: 13, marginBottom: 10 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  amount: { color: Colors.text, fontWeight: '700', fontSize: 15, flex: 1 },
  date: { color: Colors.textMuted, fontSize: 12 },
  riskBadge: {
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  riskText: { fontSize: 10, fontWeight: '700' },
  desc: { color: Colors.textMuted, fontSize: 12, marginTop: 8 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 52, marginBottom: 12 },
  emptyTitle: { color: Colors.textSecondary, fontSize: 16, fontWeight: '600' },
  emptyHint: { color: Colors.textMuted, fontSize: 13, marginTop: 4 },
});
