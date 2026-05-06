import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DrawerActions } from '@react-navigation/native';
import { invoiceService } from '../services/invoiceService';
import { Colors } from '../theme';

const fmt = (v) => v != null ? `₹${Number(v).toLocaleString('en-IN')}` : '—';
const fmtDays = (v) => v != null ? `${Number(v).toFixed(1)} days` : '—';

function MetricCard({ label, value, color, sublabel }) {
  return (
    <View style={[styles.metricCard, { borderTopColor: color, borderTopWidth: 3 }]}>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      {sublabel ? <Text style={styles.metricSub}>{sublabel}</Text> : null}
    </View>
  );
}

export default function CfoCommandScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await invoiceService.getDashboard();
      setData(res.data.data || res.data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={styles.menuBtn}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.title}>CFO Command</Text>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      >
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
        ) : (
          <>
            <Text style={styles.sectionTitle}>Financial KPIs</Text>
            <View style={styles.metricsGrid}>
              <MetricCard label="Total Amount" value={fmt(data?.totalAmount)} color={Colors.primary} />
              <MetricCard label="Pending Amount" value={fmt(data?.pendingAmount)} color={Colors.warning} sublabel="Awaiting approval" />
              <MetricCard label="Approved Amount" value={fmt(data?.approvedAmount)} color={Colors.success} sublabel="Ready for payment" />
              <MetricCard label="Paid Amount" value={fmt(data?.paidAmount)} color={Colors.cyan} sublabel="Settled" />
            </View>

            <Text style={styles.sectionTitle}>Invoice Metrics</Text>
            <View style={styles.metricsGrid}>
              <MetricCard label="Total Invoices" value={data?.totalInvoices ?? '—'} color={Colors.primary} />
              <MetricCard label="Pending" value={data?.pendingApproval ?? '—'} color={Colors.warning} />
              <MetricCard label="Approved" value={data?.approved ?? '—'} color={Colors.success} />
              <MetricCard label="Paid" value={data?.paid ?? '—'} color={Colors.cyan} />
            </View>

            {(data?.dso != null || data?.dpo != null || data?.ccc != null) && (
              <>
                <Text style={styles.sectionTitle}>Cash Conversion Metrics</Text>
                <View style={styles.metricsGrid}>
                  {data.dso != null && <MetricCard label="DSO" value={fmtDays(data.dso)} color={Colors.purple} sublabel="Days Sales Outstanding" />}
                  {data.dpo != null && <MetricCard label="DPO" value={fmtDays(data.dpo)} color={Colors.yellow} sublabel="Days Payable Outstanding" />}
                  {data.ccc != null && <MetricCard label="CCC" value={fmtDays(data.ccc)} color={Colors.cyan} sublabel="Cash Conversion Cycle" />}
                </View>
              </>
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
  sectionTitle: { color: Colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginTop: 20, marginBottom: 12 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: { flex: 1, minWidth: '44%', backgroundColor: Colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: Colors.border },
  metricValue: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  metricLabel: { color: Colors.textMuted, fontSize: 12, fontWeight: '500' },
  metricSub: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
});
