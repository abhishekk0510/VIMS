import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, ActivityIndicator, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DrawerActions } from '@react-navigation/native';
import { auditService } from '../services/invoiceService';
import { Colors } from '../theme';
import { format } from 'date-fns';

const ACTION_COLOR = {
  CREATED: Colors.primary,
  SUBMITTED: Colors.warning,
  APPROVED: Colors.success,
  REJECTED: Colors.danger,
  PAID: Colors.cyan,
  REWORK: Colors.yellow,
  LOGIN: Colors.purple,
  LOGOUT: Colors.textMuted,
};

export default function AuditRegistryScreen({ navigation }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      const res = await auditService.getLogs(params);
      setLogs(res.data.data || res.data?.content || res.data || []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const renderLog = ({ item }) => {
    const actionKey = Object.keys(ACTION_COLOR).find((k) => item.action?.includes(k));
    const color = ACTION_COLOR[actionKey] || Colors.textMuted;
    return (
      <View style={styles.logCard}>
        <View style={styles.logHeader}>
          <View style={[styles.actionBadge, { backgroundColor: color + '22', borderColor: color }]}>
            <Text style={[styles.actionText, { color }]}>{item.action?.replace(/_/g, ' ')}</Text>
          </View>
          <Text style={styles.logDate}>
            {item.timestamp ? format(new Date(item.timestamp), 'dd MMM, hh:mm a') : '—'}
          </Text>
        </View>
        <Text style={styles.logUser}>{item.performedBy || item.user || 'System'}</Text>
        {item.details && <Text style={styles.logDetails} numberOfLines={2}>{item.details}</Text>}
        {item.entityId && <Text style={styles.logEntity}>Ref: {item.entityId}</Text>}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={styles.menuBtn}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Audit Registry</Text>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search audit logs..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={load}
          returnKeyType="search"
        />
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item, i) => String(item.id || i)}
          renderItem={renderLog}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
          ListEmptyComponent={<Text style={styles.empty}>No audit logs found</Text>}
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
  searchWrap: { padding: 16, paddingBottom: 8 },
  searchInput: { backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 12, color: Colors.text, fontSize: 14 },
  logCard: { backgroundColor: Colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.border },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  actionBadge: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  actionText: { fontSize: 11, fontWeight: '700' },
  logDate: { color: Colors.textMuted, fontSize: 11 },
  logUser: { color: Colors.text, fontWeight: '600', fontSize: 13, marginBottom: 4 },
  logDetails: { color: Colors.textMuted, fontSize: 12, marginBottom: 4 },
  logEntity: { color: Colors.textMuted, fontSize: 11 },
  empty: { color: Colors.textMuted, textAlign: 'center', marginTop: 60 },
});
