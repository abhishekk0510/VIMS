import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DrawerActions } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { tenantService } from '../services/invoiceService';
import { Colors } from '../theme';

export default function TenantsScreen({ navigation }) {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [form, setForm] = useState({ name: '', domain: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await tenantService.getAll();
      setTenants(res.data.data || res.data || []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = (id, active) => {
    Alert.alert(
      active ? 'Disable Tenant' : 'Enable Tenant',
      `${active ? 'Disable' : 'Enable'} this tenant organization?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm', onPress: async () => {
            try {
              await tenantService.toggle(id);
              Toast.show({ type: 'success', text1: `Tenant ${active ? 'disabled' : 'enabled'}` });
              load();
            } catch {
              Toast.show({ type: 'error', text1: 'Failed to update tenant' });
            }
          },
        },
      ]
    );
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      Toast.show({ type: 'error', text1: 'Tenant name is required' });
      return;
    }
    setSaving(true);
    try {
      await tenantService.create(form);
      Toast.show({ type: 'success', text1: 'Tenant created successfully' });
      setCreateModal(false);
      setForm({ name: '', domain: '' });
      load();
    } catch (e) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Failed to create tenant' });
    }
    setSaving(false);
  };

  const renderTenant = ({ item }) => (
    <View style={styles.tenantCard}>
      <View style={styles.tenantRow}>
        <View style={styles.tenantIcon}>
          <Text style={styles.tenantIconText}>{item.name?.charAt(0)?.toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.tenantName}>{item.name}</Text>
          {item.domain && <Text style={styles.tenantDomain}>{item.domain}</Text>}
        </View>
        <View style={[styles.statusDot, { backgroundColor: item.active !== false ? Colors.success : Colors.danger }]} />
      </View>
      <View style={styles.tenantFooter}>
        <Text style={styles.tenantId}>ID: {item.id?.substring(0, 8)}...</Text>
        <TouchableOpacity
          style={[styles.toggleBtn, { borderColor: item.active !== false ? Colors.danger : Colors.success }]}
          onPress={() => handleToggle(item.id, item.active !== false)}
        >
          <Text style={[styles.toggleText, { color: item.active !== false ? Colors.danger : Colors.success }]}>
            {item.active !== false ? 'Disable' : 'Enable'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={styles.menuBtn}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Tenants</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setCreateModal(true)}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={tenants}
          keyExtractor={(t) => String(t.id)}
          renderItem={renderTenant}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
          ListEmptyComponent={<Text style={styles.empty}>No tenants found</Text>}
        />
      )}

      <Modal visible={createModal} transparent animationType="slide" onRequestClose={() => setCreateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Tenant</Text>
            <TextInput
              style={styles.input}
              placeholder="Organization Name *"
              placeholderTextColor={Colors.textMuted}
              value={form.name}
              onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Domain (optional)"
              placeholderTextColor={Colors.textMuted}
              value={form.domain}
              onChangeText={(v) => setForm((f) => ({ ...f, domain: v }))}
              autoCapitalize="none"
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setCreateModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleCreate} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveText}>Create</Text>}
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
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 12 },
  menuBtn: { padding: 4 },
  menuIcon: { color: Colors.text, fontSize: 22 },
  title: { flex: 1, color: Colors.text, fontSize: 20, fontWeight: '700' },
  addBtn: { backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  tenantCard: { backgroundColor: Colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: Colors.border },
  tenantRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  tenantIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.primary + '22', justifyContent: 'center', alignItems: 'center' },
  tenantIconText: { color: Colors.primary, fontSize: 20, fontWeight: '700' },
  tenantName: { color: Colors.text, fontWeight: '700', fontSize: 15 },
  tenantDomain: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  tenantFooter: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12 },
  tenantId: { flex: 1, color: Colors.textMuted, fontSize: 11 },
  toggleBtn: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  toggleText: { fontSize: 12, fontWeight: '600' },
  empty: { color: Colors.textMuted, textAlign: 'center', marginTop: 60 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 24 },
  modalTitle: { color: Colors.text, fontSize: 18, fontWeight: '700', marginBottom: 16 },
  input: { backgroundColor: Colors.bg, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 13, color: Colors.text, fontSize: 14, marginBottom: 12 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, padding: 14, backgroundColor: Colors.bg, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  cancelText: { color: Colors.textMuted, fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, backgroundColor: Colors.primary, borderRadius: 10, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700' },
});
