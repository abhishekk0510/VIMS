import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DrawerActions } from '@react-navigation/native';
import { invoiceService } from '../services/invoiceService';
import { Colors, STATUS_COLORS } from '../theme';

const fmt = (v) => v != null ? `₹${Number(v).toLocaleString('en-IN')}` : '₹0';

export default function FinanceHubScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await invoiceService.getExpenseSummary();
      setData(res.data.data || res.data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const statuses = ['PENDING_APPROVAL', 'APPROVED', 'PAID', 'REJECTED'];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={styles.menuBtn}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Finance Hub</Text>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      >
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
        ) : (
          <>
            <Text style={styles.sectionTitle}>Expense by Status</Text>
            {statuses.map((s) => {
              const sc = STATUS_COLORS[s] || STATUS_COLORS.DRAFT;
              const entry = data?.byStatus?.[s] || {};
              return (
                <View key={s} style={[styles.card, { borderLeftColor: sc.text, borderLeftWidth: 3 }]}>
                  <View style={styles.cardRow}>
                    <View style={[styles.badge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
                      <Text style={[styles.badgeText, { color: sc.text }]}>{s.replace(/_/g, ' ')}</Text>
                    </View>
                    <Text style={[styles.cardAmount, { color: sc.text }]}>{fmt(entry.totalAmount)}</Text>
                  </View>
                  <Text style={styles.cardCount}>{entry.count || 0} invoices</Text>
                </View>
              );
            })}

            {data?.totalAmount != null && (
              <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>Total Tracked Amount</Text>
                <Text style={styles.totalValue}>{fmt(data.totalAmount)}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 12 },
  menuBtn: { padding: 4 },
  menuIcon: { color: Colors.text, fontSize: 22 },
  title: { color: Colors.text, fontSize: 20, fontWeight: '700' },
  sectionTitle: { color: Colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },
  card: { backgroundColor: Colors.surface, borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  badge: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  cardAmount: { fontSize: 18, fontWeight: '800' },
  cardCount: { color: Colors.textMuted, fontSize: 12 },
  totalCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 20, marginTop: 8, borderWidth: 1, borderColor: Colors.primary + '44' },
  totalLabel: { color: Colors.textMuted, fontSize: 13, marginBottom: 6 },
  totalValue: { color: Colors.primary, fontSize: 28, fontWeight: '800' },
});
