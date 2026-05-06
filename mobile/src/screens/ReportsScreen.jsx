import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DrawerActions } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Toast from 'react-native-toast-message';
import { reportService } from '../services/invoiceService';
import { Colors } from '../theme';

const STATUSES = ['ALL', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PAID'];

export default function ReportsScreen({ navigation }) {
  const [loading, setLoading] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const handleExport = async (type) => {
    setLoading(type);
    try {
      const params = statusFilter !== 'ALL' ? { status: statusFilter } : {};
      const res =
        type === 'invoices'
          ? await reportService.exportInvoices(params)
          : await reportService.exportPendency(params);

      const fileName = `VIMS_${type}_${Date.now()}.xlsx`;
      const fileUri = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, res.data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: `Export ${type}`,
        });
      } else {
        Alert.alert('Saved', `Report saved to: ${fileName}`);
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Export failed. Try again.' });
    }
    setLoading(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={styles.menuBtn}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Reports</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Filter by Status</Text>
        <View style={styles.filterRow}>
          {STATUSES.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.pill, statusFilter === s && styles.pillActive]}
              onPress={() => setStatusFilter(s)}
            >
              <Text style={[styles.pillText, statusFilter === s && styles.pillTextActive]}>
                {s === 'ALL' ? 'All' : s.replace(/_/g, ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Export Reports</Text>

        <ReportCard
          icon="📊"
          title="Invoice Report"
          description="Export all invoices with status, amounts, vendor details and approval history"
          loading={loading === 'invoices'}
          onPress={() => handleExport('invoices')}
        />
        <ReportCard
          icon="⏳"
          title="Pendency Report"
          description="Export invoices pending action — useful for follow-ups and escalations"
          loading={loading === 'pendency'}
          onPress={() => handleExport('pendency')}
        />
      </View>
    </SafeAreaView>
  );
}

function ReportCard({ icon, title, description, loading, onPress }) {
  return (
    <TouchableOpacity style={styles.reportCard} onPress={onPress} disabled={loading}>
      <View style={styles.reportRow}>
        <Text style={styles.reportIcon}>{icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.reportTitle}>{title}</Text>
          <Text style={styles.reportDesc}>{description}</Text>
        </View>
        {loading ? (
          <ActivityIndicator color={Colors.primary} />
        ) : (
          <Text style={styles.downloadIcon}>⬇</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 12 },
  menuBtn: { padding: 4 },
  menuIcon: { color: Colors.text, fontSize: 22 },
  title: { color: Colors.text, fontSize: 20, fontWeight: '700' },
  content: { padding: 16 },
  sectionTitle: { color: Colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12, marginTop: 8 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  pill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  pillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pillText: { color: Colors.textMuted, fontSize: 12 },
  pillTextActive: { color: '#fff', fontWeight: '600' },
  reportCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  reportRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  reportIcon: { fontSize: 28 },
  reportTitle: { color: Colors.text, fontWeight: '700', fontSize: 15, marginBottom: 4 },
  reportDesc: { color: Colors.textMuted, fontSize: 12, lineHeight: 18 },
  downloadIcon: { color: Colors.primary, fontSize: 22 },
});
