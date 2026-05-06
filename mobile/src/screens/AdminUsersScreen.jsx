import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Modal, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DrawerActions } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { adminService } from '../services/invoiceService';
import { Colors, ROLE_COLORS } from '../theme';

const ROLES = ['VENDOR', 'OPERATIONS', 'DEPT_HEAD', 'FINANCE', 'CFO', 'CLIENT', 'ADMIN'];

export default function AdminUsersScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'VENDOR' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await adminService.getUsers();
      setUsers(res.data.data || res.data || []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUnlock = (userId) => {
    Alert.alert('Unlock User', 'Unlock this user account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unlock', onPress: async () => {
          try {
            await adminService.unlockUser(userId);
            Toast.show({ type: 'success', text1: 'User unlocked' });
            load();
          } catch {
            Toast.show({ type: 'error', text1: 'Failed to unlock user' });
          }
        },
      },
    ]);
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      Toast.show({ type: 'error', text1: 'Name, email and password are required' });
      return;
    }
    setSaving(true);
    try {
      await adminService.createUser(form);
      Toast.show({ type: 'success', text1: 'User created successfully' });
      setCreateModal(false);
      setForm({ name: '', email: '', password: '', role: 'VENDOR' });
      load();
    } catch (e) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Failed to create user' });
    }
    setSaving(false);
  };

  const renderUser = ({ item }) => {
    const rc = ROLE_COLORS[item.role] || Colors.textMuted;
    return (
      <View style={styles.userCard}>
        <View style={styles.userRow}>
          <View style={[styles.avatar, { backgroundColor: rc + '22' }]}>
            <Text style={[styles.avatarText, { color: rc }]}>{item.name?.charAt(0)?.toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: rc + '22', borderColor: rc }]}>
            <Text style={[styles.roleText, { color: rc }]}>{item.role?.replace(/_/g, ' ')}</Text>
          </View>
        </View>
        {(item.locked || item.accountLocked) && (
          <View style={styles.lockedRow}>
            <Text style={styles.lockedText}>🔒 Account Locked</Text>
            <TouchableOpacity style={styles.unlockBtn} onPress={() => handleUnlock(item.id)}>
              <Text style={styles.unlockText}>Unlock</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={styles.menuBtn}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.title}>User Management</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setCreateModal(true)}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(u) => String(u.id)}
          renderItem={renderUser}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
          ListEmptyComponent={<Text style={styles.empty}>No users found</Text>}
        />
      )}

      <Modal visible={createModal} transparent animationType="slide" onRequestClose={() => setCreateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create User</Text>
            {['name', 'email', 'password'].map((field) => (
              <TextInput
                key={field}
                style={styles.input}
                placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                placeholderTextColor={Colors.textMuted}
                value={form[field]}
                onChangeText={(v) => setForm((f) => ({ ...f, [field]: v }))}
                secureTextEntry={field === 'password'}
                autoCapitalize="none"
                keyboardType={field === 'email' ? 'email-address' : 'default'}
              />
            ))}
            <Text style={styles.roleLabel}>Role</Text>
            <View style={styles.rolesGrid}>
              {ROLES.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.rolePill, form.role === r && styles.rolePillActive]}
                  onPress={() => setForm((f) => ({ ...f, role: r }))}
                >
                  <Text style={[styles.rolePillText, form.role === r && styles.rolePillTextActive]}>
                    {r.replace(/_/g, ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
  userCard: { backgroundColor: Colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.border },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontWeight: '700', fontSize: 18 },
  userName: { color: Colors.text, fontWeight: '600', fontSize: 14 },
  userEmail: { color: Colors.textMuted, fontSize: 12 },
  roleBadge: { borderRadius: 5, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 3 },
  roleText: { fontSize: 10, fontWeight: '700' },
  lockedRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10, gap: 10 },
  lockedText: { flex: 1, color: Colors.danger, fontSize: 13 },
  unlockBtn: { backgroundColor: Colors.success + '22', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: Colors.success },
  unlockText: { color: Colors.success, fontSize: 12, fontWeight: '600' },
  empty: { color: Colors.textMuted, textAlign: 'center', marginTop: 60 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 24 },
  modalTitle: { color: Colors.text, fontSize: 18, fontWeight: '700', marginBottom: 16 },
  input: { backgroundColor: Colors.bg, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 13, color: Colors.text, fontSize: 14, marginBottom: 12 },
  roleLabel: { color: Colors.textMuted, fontSize: 12, marginBottom: 8 },
  rolesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  rolePill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border },
  rolePillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  rolePillText: { color: Colors.textMuted, fontSize: 12 },
  rolePillTextActive: { color: '#fff', fontWeight: '600' },
  modalBtns: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, padding: 14, backgroundColor: Colors.bg, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  cancelText: { color: Colors.textMuted, fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, backgroundColor: Colors.primary, borderRadius: 10, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700' },
});
