import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { invoiceService } from '../services/invoiceService';
import { Colors } from '../theme';

function KpiCard({ label, value, color, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.kpiCard, { borderLeftColor: color, borderLeftWidth: 3 }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Text style={[styles.kpiValue, { color }]}>{value ?? '—'}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const fmt = (v) =>
  v != null ? `₹${Number(v).toLocaleString('en-IN')}` : '₹0';

export default function DashboardScreen() {
  const { user, hasModule } = useAuth();
  const navigation = useNavigation();
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

  const openDrawer = () => navigation.dispatch(DrawerActions.openDrawer());
  const goInvoices = (status) => {
    if (hasModule('INVOICES')) navigation.navigate('Invoices', { status });
  };

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={openDrawer} style={styles.menuBtn}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName} numberOfLines={1}>{user?.name}</Text>
        </View>
        <View style={styles.rolePill}>
          <Text style={styles.rolePillText}>{user?.role?.replace(/_/g, ' ')}</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={Colors.primary}
          />
        }
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <Text style={styles.dateText}>{today}</Text>

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
        ) : (
          <>
            {/* VENDOR */}
            {user?.role === 'VENDOR' && (
              <>
                <Text style={styles.sectionTitle}>My Invoice Summary</Text>
                <View style={styles.kpiGrid}>
                  <KpiCard label="Total Submitted" value={data?.totalInvoices} color={Colors.primary} onPress={() => goInvoices()} />
                  <KpiCard label="Pending Approval" value={data?.pendingApproval} color={Colors.warning} onPress={() => goInvoices('PENDING_APPROVAL')} />
                  <KpiCard label="Approved" value={data?.approved} color={Colors.success} onPress={() => goInvoices('APPROVED')} />
                  <KpiCard label="Paid" value={data?.paid} color={Colors.cyan} onPress={() => goInvoices('PAID')} />
                </View>
                {data?.pendingAmount != null && (
                  <View style={styles.amountCard}>
                    <Text style={styles.amountLabel}>Pending Payment Amount</Text>
                    <Text style={styles.amountValue}>{fmt(data.pendingAmount)}</Text>
                  </View>
                )}
                {hasModule('CREATE_INVOICE') && (
                  <TouchableOpacity
                    style={styles.ctaBtn}
                    onPress={() => navigation.navigate('CreateInvoice')}
                  >
                    <Text style={styles.ctaBtnText}>+ Create New Invoice</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* FINANCE / CFO */}
            {['FINANCE', 'CFO'].includes(user?.role) && (
              <>
                <Text style={styles.sectionTitle}>Financial Overview</Text>
                <View style={styles.kpiGrid}>
                  <KpiCard label="Total Amount" value={fmt(data?.totalAmount)} color={Colors.primary} />
                  <KpiCard label="Pending Amount" value={fmt(data?.pendingAmount)} color={Colors.warning} />
                  <KpiCard label="Approved Amount" value={fmt(data?.approvedAmount)} color={Colors.success} />
                  <KpiCard label="Paid Amount" value={fmt(data?.paidAmount)} color={Colors.cyan} />
                </View>
                <View style={styles.quickLinks}>
                  {hasModule('FINANCE_HUB') && (
                    <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('FinanceHub')}>
                      <Text style={styles.quickBtnText}>💰 Finance Hub</Text>
                    </TouchableOpacity>
                  )}
                  {hasModule('REPORTS') && (
                    <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('Reports')}>
                      <Text style={styles.quickBtnText}>📑 Reports</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}

            {/* ADMIN / OPERATIONS / DEPT_HEAD / etc. */}
            {!['VENDOR', 'FINANCE', 'CFO'].includes(user?.role) && (
              <>
                <Text style={styles.sectionTitle}>Invoice Overview</Text>
                <View style={styles.kpiGrid}>
                  <KpiCard label="Total" value={data?.totalInvoices} color={Colors.primary} onPress={() => goInvoices()} />
                  <KpiCard label="Pending" value={data?.pendingApproval} color={Colors.warning} onPress={() => goInvoices('PENDING_APPROVAL')} />
                  <KpiCard label="Approved" value={data?.approved} color={Colors.success} onPress={() => goInvoices('APPROVED')} />
                  <KpiCard label="Rejected" value={data?.rejected} color={Colors.danger} onPress={() => goInvoices('REJECTED')} />
                  <KpiCard label="Rework" value={data?.reworkRequired} color={Colors.yellow} onPress={() => goInvoices('REWORK_REQUIRED')} />
                  <KpiCard label="Paid" value={data?.paid} color={Colors.cyan} onPress={() => goInvoices('PAID')} />
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
  greeting: { color: Colors.textMuted, fontSize: 12 },
  userName: { color: Colors.text, fontSize: 17, fontWeight: '700' },
  rolePill: {
    backgroundColor: Colors.primary + '22',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  rolePillText: { color: Colors.primary, fontSize: 11, fontWeight: '700' },
  dateText: {
    color: Colors.textMuted,
    fontSize: 12,
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
  },
  sectionTitle: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  kpiValue: { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  kpiLabel: { color: Colors.textMuted, fontSize: 12 },
  amountCard: {
    margin: 16,
    backgroundColor: '#052e16',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#16a34a',
  },
  amountLabel: { color: '#86efac', fontSize: 13, marginBottom: 6 },
  amountValue: { color: '#4ade80', fontSize: 30, fontWeight: '800' },
  ctaBtn: {
    margin: 16,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  ctaBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  quickLinks: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 12 },
  quickBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickBtnText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
});
