import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
} from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { useAuth } from '../context/AuthContext';
import { Colors, ROLE_COLORS } from '../theme';

const NAV_ITEMS = [
  { name: 'Dashboard', label: 'Dashboard', icon: '⊞', module: null },
  { name: 'Invoices', label: 'Invoices', icon: '📄', module: 'INVOICES' },
  { name: 'CreateInvoice', label: 'New Invoice', icon: '➕', module: 'CREATE_INVOICE' },
  { name: 'FinanceHub', label: 'Finance Hub', icon: '💰', module: 'FINANCE_HUB' },
  { name: 'CfoCommand', label: 'CFO Command', icon: '📊', module: 'CFO_COMMAND' },
  { name: 'AuditRegistry', label: 'Audit Registry', icon: '🔍', module: 'AUDIT_REGISTRY' },
  { name: 'Reports', label: 'Reports', icon: '📑', module: 'REPORTS' },
  { name: 'AdminUsers', label: 'User Management', icon: '👥', module: 'USER_MANAGEMENT' },
  { name: 'WorkflowConfig', label: 'Workflows', icon: '⚙️', module: 'WORKFLOW_CONFIG' },
  { name: 'Tenants', label: 'Tenants', icon: '🏢', module: 'TENANT_MANAGEMENT' },
];

export default function DrawerContent(props) {
  const { user, logout, hasModule, accessibleTenants, switchTenant, tenantName } =
    useAuth();
  const [tenantModal, setTenantModal] = useState(false);
  const { navigation, state } = props;
  const currentRoute = state.routeNames[state.index];

  const visibleItems = NAV_ITEMS.filter(
    (item) => item.module === null || hasModule(item.module)
  );

  const handleTenantSwitch = async (id) => {
    setTenantModal(false);
    try {
      await switchTenant(id);
    } catch {
      Alert.alert('Error', 'Failed to switch tenant');
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const roleColor = ROLE_COLORS[user?.role] || Colors.textMuted;

  return (
    <DrawerContentScrollView
      {...props}
      style={styles.container}
      contentContainerStyle={{ paddingTop: 0 }}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>V</Text>
          </View>
          <View>
            <Text style={styles.appName}>VIMS</Text>
            <Text style={styles.appSubtitle}>Invoice Management</Text>
          </View>
        </View>

        {/* User card */}
        <View style={styles.userCard}>
          <View style={[styles.avatar, { backgroundColor: roleColor + '33' }]}>
            <Text style={[styles.avatarText, { color: roleColor }]}>
              {user?.name?.charAt(0)?.toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName} numberOfLines={1}>{user?.name}</Text>
            <Text style={styles.userEmail} numberOfLines={1}>{user?.email}</Text>
            <View
              style={[
                styles.roleBadge,
                { backgroundColor: roleColor + '22', borderColor: roleColor },
              ]}
            >
              <Text style={[styles.roleText, { color: roleColor }]}>
                {user?.role?.replace(/_/g, ' ')}
              </Text>
            </View>
          </View>
        </View>

        {/* Tenant switcher */}
        {accessibleTenants.length > 1 && (
          <TouchableOpacity
            style={styles.tenantRow}
            onPress={() => setTenantModal(true)}
          >
            <Text style={styles.tenantIcon}>🏢</Text>
            <Text style={styles.tenantName} numberOfLines={1}>
              {tenantName || 'Select Tenant'}
            </Text>
            <Text style={styles.tenantChevron}>›</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Nav items */}
      <View style={styles.navSection}>
        {visibleItems.map((item) => {
          const isActive = currentRoute === item.name;
          return (
            <TouchableOpacity
              key={item.name}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => navigation.navigate(item.name)}
            >
              <Text style={styles.navIcon}>{item.icon}</Text>
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>⎋  Sign Out</Text>
      </TouchableOpacity>

      {/* Tenant modal */}
      <Modal
        visible={tenantModal}
        transparent
        animationType="slide"
        onRequestClose={() => setTenantModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Switch Tenant</Text>
            {accessibleTenants.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.tenantOption,
                  t.id === user?.tenantId && styles.tenantOptionActive,
                ]}
                onPress={() => handleTenantSwitch(t.id)}
              >
                <Text style={styles.tenantOptionText}>{t.name}</Text>
                {t.id === user?.tenantId && (
                  <Text style={styles.tenantCheck}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setTenantModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: { backgroundColor: Colors.bg, padding: 20, paddingTop: 50 },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  logoBox: {
    width: 40,
    height: 40,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: { color: '#fff', fontWeight: 'bold', fontSize: 22 },
  appName: { color: Colors.text, fontWeight: 'bold', fontSize: 18 },
  appSubtitle: { color: Colors.textMuted, fontSize: 11 },
  userCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  avatarText: { fontWeight: 'bold', fontSize: 20 },
  userName: { color: Colors.text, fontWeight: '600', fontSize: 14 },
  userEmail: { color: Colors.textMuted, fontSize: 12 },
  roleBadge: {
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  roleText: { fontSize: 10, fontWeight: '700' },
  tenantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tenantIcon: { fontSize: 14 },
  tenantName: { flex: 1, color: Colors.textSecondary, fontSize: 13 },
  tenantChevron: { color: Colors.textMuted, fontSize: 20 },
  navSection: { padding: 12, gap: 2 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 8,
  },
  navItemActive: { backgroundColor: Colors.primary + '20' },
  navIcon: { fontSize: 16, width: 24, textAlign: 'center' },
  navLabel: { color: Colors.textMuted, fontSize: 14, fontWeight: '500' },
  navLabelActive: { color: Colors.primary, fontWeight: '600' },
  logoutBtn: {
    margin: 16,
    padding: 14,
    backgroundColor: '#1f0707',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#7f1d1d',
  },
  logoutText: { color: '#fca5a5', textAlign: 'center', fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  modalTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  tenantOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    backgroundColor: Colors.bg,
    marginBottom: 8,
  },
  tenantOptionActive: { borderWidth: 1, borderColor: Colors.primary },
  tenantOptionText: { flex: 1, color: Colors.text, fontSize: 15 },
  tenantCheck: { color: Colors.primary, fontWeight: '700' },
  modalCancel: { padding: 14, alignItems: 'center', marginTop: 4 },
  modalCancelText: { color: Colors.textMuted, fontSize: 15 },
});
