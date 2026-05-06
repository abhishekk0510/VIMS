import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';
import { invoiceService } from '../services/invoiceService';
import { Colors, STATUS_COLORS } from '../theme';
import { format } from 'date-fns';

const TABS = ['Details', 'OCR Data', 'Timeline'];
const RISK_COLOR = { LOW: Colors.success, MEDIUM: Colors.warning, HIGH: Colors.danger };

function DetailRow({ label, value, highlight }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, highlight && styles.detailHighlight]}>
        {value || '—'}
      </Text>
    </View>
  );
}

export default function InvoiceDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { user } = useAuth();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('Details');
  const [actionModal, setActionModal] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await invoiceService.getById(id);
      setInvoice(res.data.data || res.data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const canSubmit = () =>
    invoice &&
    ['VENDOR', 'ADMIN'].includes(user.role) &&
    ['DRAFT', 'REJECTED', 'REWORK_REQUIRED'].includes(invoice.status);

  const canApprove = () => {
    if (!invoice) return false;
    if (!['PENDING_APPROVAL', 'UNDER_REVIEW'].includes(invoice.status)) return false;
    return user.role === 'ADMIN' || user.role === invoice.currentStepRole;
  };

  const canPay = () =>
    invoice &&
    ['FINANCE', 'CFO', 'ADMIN'].includes(user.role) &&
    invoice.status === 'APPROVED';

  const handleSubmit = () => {
    Alert.alert('Submit Invoice', 'Submit this invoice for approval?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Submit',
        onPress: async () => {
          try {
            await invoiceService.submit(id);
            Toast.show({ type: 'success', text1: 'Submitted for approval' });
            load();
          } catch (e) {
            Toast.show({
              type: 'error',
              text1: e.response?.data?.message || 'Submit failed',
            });
          }
        },
      },
    ]);
  };

  const handleAction = async () => {
    if (['reject', 'rework'].includes(actionModal) && !remarks.trim()) {
      Toast.show({ type: 'error', text1: 'Remarks are required' });
      return;
    }
    setActionLoading(true);
    try {
      const actionMap = { approve: 'APPROVE', reject: 'REJECT', rework: 'REWORK' };
      await invoiceService.approve(id, {
        action: actionMap[actionModal],
        remarks: remarks.trim(),
      });
      Toast.show({
        type: 'success',
        text1: `Invoice ${actionModal}d successfully`,
      });
      setActionModal(null);
      setRemarks('');
      load();
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: e.response?.data?.message || 'Action failed',
      });
    }
    setActionLoading(false);
  };

  const handlePay = () => {
    Alert.alert('Mark as Paid', 'Mark this invoice as paid?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          try {
            await invoiceService.pay(id);
            Toast.show({ type: 'success', text1: 'Invoice marked as paid' });
            load();
          } catch {
            Toast.show({ type: 'error', text1: 'Payment failed' });
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={Colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  if (!invoice) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backRow}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.notFound}>Invoice not found</Text>
      </SafeAreaView>
    );
  }

  const sc = STATUS_COLORS[invoice.status] || STATUS_COLORS.DRAFT;
  const modalColor =
    actionModal === 'approve'
      ? Colors.success
      : actionModal === 'reject'
      ? Colors.danger
      : Colors.warning;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.invNum} numberOfLines={1}>{invoice.invoiceNumber}</Text>
        <View style={[styles.statusBadge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
          <Text style={[styles.statusText, { color: sc.text }]}>
            {invoice.status?.replace(/_/g, ' ')}
          </Text>
        </View>
      </View>

      {/* Approval flow tracker */}
      {invoice.workflowLevels?.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.flowScroll}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 6 }}
        >
          {invoice.workflowLevels.map((level, i) => {
            const done = i < (invoice.currentLevel ?? 0);
            const current =
              i === (invoice.currentLevel ?? 0) &&
              ['PENDING_APPROVAL', 'UNDER_REVIEW'].includes(invoice.status);
            const rejected =
              invoice.status === 'REJECTED' && i === (invoice.currentLevel ?? 0);
            const color = rejected
              ? Colors.danger
              : done
              ? Colors.success
              : current
              ? Colors.primary
              : Colors.border;
            return (
              <View key={i} style={styles.flowStep}>
                <View style={[styles.flowDot, { backgroundColor: color }]}>
                  <Text style={styles.flowDotText}>{done ? '✓' : i + 1}</Text>
                </View>
                <Text style={[styles.flowLabel, { color }]} numberOfLines={2}>
                  {level.name || `Step ${i + 1}`}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Tabs */}
      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
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
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
      >
        {/* DETAILS */}
        {tab === 'Details' && (
          <>
            <DetailRow label="Invoice Number" value={invoice.invoiceNumber} />
            <DetailRow label="Vendor Name" value={invoice.vendorName} />
            <DetailRow
              label="Amount"
              value={`₹${Number(invoice.amount || 0).toLocaleString('en-IN')}`}
              highlight
            />
            <DetailRow
              label="Invoice Date"
              value={invoice.invoiceDate ? format(new Date(invoice.invoiceDate), 'dd MMM yyyy') : null}
            />
            <DetailRow
              label="Due Date"
              value={invoice.dueDate ? format(new Date(invoice.dueDate), 'dd MMM yyyy') : null}
            />
            {invoice.description && (
              <DetailRow label="Description" value={invoice.description} />
            )}
            {invoice.gstin && <DetailRow label="GSTIN" value={invoice.gstin} />}
            {invoice.poNumber && <DetailRow label="PO Number" value={invoice.poNumber} />}
            {invoice.tenantName && <DetailRow label="Tenant" value={invoice.tenantName} />}

            {invoice.riskScore != null && (
              <View style={styles.riskCard}>
                <Text style={styles.riskCardTitle}>AI Risk Analysis</Text>
                <Text
                  style={[
                    styles.riskScore,
                    { color: RISK_COLOR[invoice.riskLevel] || Colors.textMuted },
                  ]}
                >
                  Score: {invoice.riskScore}/100 —{' '}
                  <Text style={{ fontWeight: '700' }}>{invoice.riskLevel || 'N/A'}</Text>
                </Text>
                {invoice.aiAnalysis && (
                  <Text style={styles.aiText}>{invoice.aiAnalysis}</Text>
                )}
              </View>
            )}

            {invoice.currentStepRole && (
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  Awaiting approval from: {invoice.currentStepRole?.replace(/_/g, ' ')}
                </Text>
              </View>
            )}
          </>
        )}

        {/* OCR DATA */}
        {tab === 'OCR Data' && (
          <>
            {invoice.ocrData ? (
              <>
                <DetailRow label="Detected Amount" value={invoice.ocrData.amount?.toString()} />
                <DetailRow label="Invoice No. (OCR)" value={invoice.ocrData.invoiceNumber} />
                <DetailRow label="Vendor (OCR)" value={invoice.ocrData.vendorName} />
                <DetailRow label="GSTIN (OCR)" value={invoice.ocrData.gstin} />
                <DetailRow label="Date (OCR)" value={invoice.ocrData.date} />
                {invoice.ocrData.amountMismatch && (
                  <View style={styles.warnBox}>
                    <Text style={styles.warnText}>
                      ⚠️ Amount mismatch detected between OCR and entered value
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.emptyMsg}>No OCR data available for this invoice</Text>
            )}
          </>
        )}

        {/* TIMELINE */}
        {tab === 'Timeline' && (
          <>
            {invoice.timeline?.length > 0 ? (
              invoice.timeline.map((event, i) => (
                <View key={i} style={styles.timelineRow}>
                  <View style={styles.timelineLine}>
                    <View style={[styles.timelineDot, i === 0 && { backgroundColor: Colors.primary }]} />
                    {i < invoice.timeline.length - 1 && <View style={styles.timelineConnector} />}
                  </View>
                  <View style={styles.timelineBody}>
                    <Text style={styles.timelineAction}>
                      {event.action?.replace(/_/g, ' ')}
                    </Text>
                    <Text style={styles.timelineUser}>{event.performedBy || event.user || 'System'}</Text>
                    {event.remarks ? (
                      <Text style={styles.timelineRemarks}>"{event.remarks}"</Text>
                    ) : null}
                    <Text style={styles.timelineDate}>
                      {event.timestamp
                        ? format(new Date(event.timestamp), 'dd MMM yyyy, hh:mm a')
                        : ''}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyMsg}>No timeline events yet</Text>
            )}
          </>
        )}
      </ScrollView>

      {/* Action bar */}
      {(canSubmit() || canApprove() || canPay()) && (
        <View style={styles.actionBar}>
          {canSubmit() && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: Colors.primary }]}
              onPress={handleSubmit}
            >
              <Text style={styles.actionBtnText}>Submit</Text>
            </TouchableOpacity>
          )}
          {canApprove() && (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#052e16', borderWidth: 1, borderColor: Colors.success }]}
                onPress={() => setActionModal('approve')}
              >
                <Text style={[styles.actionBtnText, { color: Colors.success }]}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: Colors.dangerBg, borderWidth: 1, borderColor: Colors.danger }]}
                onPress={() => setActionModal('reject')}
              >
                <Text style={[styles.actionBtnText, { color: Colors.danger }]}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: Colors.warningBg, borderWidth: 1, borderColor: Colors.warning }]}
                onPress={() => setActionModal('rework')}
              >
                <Text style={[styles.actionBtnText, { color: Colors.warning }]}>Rework</Text>
              </TouchableOpacity>
            </>
          )}
          {canPay() && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: Colors.success }]}
              onPress={handlePay}
            >
              <Text style={styles.actionBtnText}>Mark Paid</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Action modal */}
      <Modal
        visible={!!actionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setActionModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {actionModal === 'approve'
                ? 'Approve Invoice'
                : actionModal === 'reject'
                ? 'Reject Invoice'
                : 'Request Rework'}
            </Text>
            <TextInput
              style={styles.remarksInput}
              placeholder={
                actionModal === 'approve'
                  ? 'Add remarks (optional)'
                  : 'Remarks are required'
              }
              placeholderTextColor={Colors.textMuted}
              value={remarks}
              onChangeText={setRemarks}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => { setActionModal(null); setRemarks(''); }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, { backgroundColor: modalColor }]}
                onPress={handleAction}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  backRow: { padding: 16 },
  notFound: { color: Colors.textMuted, textAlign: 'center', marginTop: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 10,
  },
  backBtn: { padding: 4 },
  backText: { color: Colors.primary, fontSize: 18, fontWeight: '600' },
  invNum: { flex: 1, color: Colors.text, fontWeight: '700', fontSize: 15 },
  statusBadge: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
  flowScroll: {
    maxHeight: 90,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  flowStep: { alignItems: 'center', width: 76 },
  flowDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  flowDotText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  flowLabel: { fontSize: 10, textAlign: 'center', lineHeight: 13 },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabText: { color: Colors.textMuted, fontSize: 13 },
  tabTextActive: { color: Colors.primary, fontWeight: '600' },
  detailRow: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  detailLabel: { color: Colors.textMuted, fontSize: 11, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue: { color: Colors.text, fontSize: 15 },
  detailHighlight: { color: Colors.primary, fontWeight: '800', fontSize: 20 },
  riskCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  riskCardTitle: { color: Colors.textMuted, fontSize: 11, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  riskScore: { fontSize: 15, marginBottom: 8 },
  aiText: { color: Colors.textSecondary, fontSize: 13, lineHeight: 20 },
  infoBox: {
    backgroundColor: '#1c2d47',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2563eb',
    marginBottom: 8,
  },
  infoText: { color: '#60a5fa', fontSize: 13 },
  warnBox: {
    backgroundColor: Colors.warningBg,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.warning,
    marginBottom: 8,
  },
  warnText: { color: Colors.warning, fontSize: 13 },
  emptyMsg: { color: Colors.textMuted, textAlign: 'center', marginTop: 50, fontSize: 15 },
  timelineRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  timelineLine: { alignItems: 'center', width: 16 },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.border,
    marginTop: 3,
  },
  timelineConnector: { flex: 1, width: 2, backgroundColor: Colors.border, marginTop: 2 },
  timelineBody: { flex: 1, paddingBottom: 8 },
  timelineAction: { color: Colors.text, fontWeight: '600', fontSize: 14 },
  timelineUser: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  timelineRemarks: { color: Colors.textSecondary, fontSize: 13, fontStyle: 'italic', marginTop: 4 },
  timelineDate: { color: Colors.textMuted, fontSize: 11, marginTop: 4 },
  actionBar: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.bg,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flex: 1,
    minWidth: 80,
    borderRadius: 8,
    padding: 13,
    alignItems: 'center',
  },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 24,
  },
  modalTitle: { color: Colors.text, fontSize: 18, fontWeight: '700', marginBottom: 16 },
  remarksInput: {
    backgroundColor: Colors.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    color: Colors.text,
    fontSize: 14,
    minHeight: 100,
    marginBottom: 16,
  },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalCancel: {
    flex: 1,
    padding: 14,
    alignItems: 'center',
    backgroundColor: Colors.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalCancelText: { color: Colors.textMuted, fontWeight: '600' },
  modalConfirm: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 10 },
  modalConfirmText: { color: '#fff', fontWeight: '700' },
});
