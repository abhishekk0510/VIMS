import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DrawerActions } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { workflowService } from '../services/invoiceService';
import { Colors } from '../theme';

export default function WorkflowConfigScreen({ navigation }) {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await workflowService.getAll();
      setWorkflows(res.data.data || res.data || []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleActivate = (id) => {
    Alert.alert('Activate Workflow', 'Set this as the active workflow?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Activate', onPress: async () => {
          try {
            await workflowService.activate(id);
            Toast.show({ type: 'success', text1: 'Workflow activated' });
            load();
          } catch {
            Toast.show({ type: 'error', text1: 'Failed to activate workflow' });
          }
        },
      },
    ]);
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Workflow', 'Delete this workflow? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await workflowService.delete(id);
            Toast.show({ type: 'success', text1: 'Workflow deleted' });
            load();
          } catch {
            Toast.show({ type: 'error', text1: 'Failed to delete workflow' });
          }
        },
      },
    ]);
  };

  const renderWorkflow = ({ item }) => (
    <View style={styles.wfCard}>
      <View style={styles.wfHeader}>
        <Text style={styles.wfName}>{item.name}</Text>
        {item.active && (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>Active</Text>
          </View>
        )}
      </View>
      {item.description && <Text style={styles.wfDesc}>{item.description}</Text>}

      {item.levels?.length > 0 && (
        <View style={styles.levelsRow}>
          {item.levels.map((level, i) => (
            <View key={i} style={styles.levelChip}>
              <Text style={styles.levelText}>{i + 1}. {level.role?.replace(/_/g, ' ')}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.wfActions}>
        {!item.active && (
          <TouchableOpacity style={styles.activateBtn} onPress={() => handleActivate(item.id)}>
            <Text style={styles.activateBtnText}>Activate</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
          <Text style={styles.deleteBtnText}>Delete</Text>
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
        <Text style={styles.title}>Workflow Config</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={workflows}
          keyExtractor={(w) => String(w.id)}
          renderItem={renderWorkflow}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
          ListEmptyComponent={<Text style={styles.empty}>No workflows configured</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 12 },
  menuBtn: { padding: 4 },
  menuIcon: { color: Colors.text, fontSize: 22 },
  title: { color: Colors.text, fontSize: 20, fontWeight: '700' },
  wfCard: { backgroundColor: Colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: Colors.border },
  wfHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 10 },
  wfName: { flex: 1, color: Colors.text, fontWeight: '700', fontSize: 15 },
  activeBadge: { backgroundColor: Colors.successBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: Colors.success },
  activeBadgeText: { color: Colors.success, fontSize: 11, fontWeight: '700' },
  wfDesc: { color: Colors.textMuted, fontSize: 13, marginBottom: 10 },
  levelsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  levelChip: { backgroundColor: Colors.bg, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: Colors.border },
  levelText: { color: Colors.textSecondary, fontSize: 12 },
  wfActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  activateBtn: { flex: 1, padding: 10, backgroundColor: Colors.successBg, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: Colors.success },
  activateBtnText: { color: Colors.success, fontWeight: '600', fontSize: 13 },
  deleteBtn: { padding: 10, backgroundColor: Colors.dangerBg, borderRadius: 8, paddingHorizontal: 20, borderWidth: 1, borderColor: Colors.danger },
  deleteBtnText: { color: Colors.danger, fontWeight: '600', fontSize: 13 },
  empty: { color: Colors.textMuted, textAlign: 'center', marginTop: 60 },
});
