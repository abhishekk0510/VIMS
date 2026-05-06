import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import Toast from 'react-native-toast-message';
import { invoiceService } from '../services/invoiceService';
import { Colors } from '../theme';

function Field({ label, value, onChangeText, placeholder, keyboardType, multiline, required }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={{ color: Colors.danger }}> *</Text>}
      </Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMulti]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        keyboardType={keyboardType || 'default'}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
        autoCorrect={false}
      />
    </View>
  );
}

export default function CreateInvoiceScreen({ navigation }) {
  const [form, setForm] = useState({
    invoiceNumber: '',
    vendorName: '',
    amount: '',
    invoiceDate: '',
    dueDate: '',
    description: '',
    gstin: '',
    poNumber: '',
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSubmit, setIsSubmit] = useState(false);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        if (asset.size > 10 * 1024 * 1024) {
          Toast.show({ type: 'error', text1: 'File too large (max 10 MB)' });
          return;
        }
        setFile(asset);
      }
    } catch {}
  };

  const handleSave = async (submitImmediately) => {
    if (!form.invoiceNumber.trim() || !form.vendorName.trim() || !form.amount.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Invoice number, vendor name, and amount are required',
      });
      return;
    }
    if (isNaN(parseFloat(form.amount))) {
      Toast.show({ type: 'error', text1: 'Amount must be a valid number' });
      return;
    }
    setIsSubmit(submitImmediately);
    setLoading(true);
    try {
      const formData = new FormData();
      const invoiceData = {
        ...form,
        amount: parseFloat(form.amount),
        submitImmediately,
      };
      formData.append('invoice', JSON.stringify(invoiceData));
      if (file) {
        formData.append('file', {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || 'application/octet-stream',
        });
      }
      await invoiceService.create(formData);
      Toast.show({
        type: 'success',
        text1: submitImmediately
          ? 'Invoice submitted for approval'
          : 'Invoice saved as draft',
      });
      navigation.goBack();
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: e.response?.data?.message || 'Failed to create invoice',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>New Invoice</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Field label="Invoice Number" value={form.invoiceNumber} onChangeText={(v) => set('invoiceNumber', v)} placeholder="INV-2024-001" required />
        <Field label="Vendor Name" value={form.vendorName} onChangeText={(v) => set('vendorName', v)} placeholder="Vendor Company Ltd." required />
        <Field label="Amount (₹)" value={form.amount} onChangeText={(v) => set('amount', v)} placeholder="10000.00" keyboardType="numeric" required />
        <Field label="Invoice Date" value={form.invoiceDate} onChangeText={(v) => set('invoiceDate', v)} placeholder="YYYY-MM-DD" />
        <Field label="Due Date" value={form.dueDate} onChangeText={(v) => set('dueDate', v)} placeholder="YYYY-MM-DD" />
        <Field label="GSTIN" value={form.gstin} onChangeText={(v) => set('gstin', v)} placeholder="22AAAAA0000A1Z5" />
        <Field label="PO Number" value={form.poNumber} onChangeText={(v) => set('poNumber', v)} placeholder="PO-2024-001" />
        <Field label="Description" value={form.description} onChangeText={(v) => set('description', v)} placeholder="Brief description of this invoice..." multiline />

        {/* File attachment */}
        <Text style={styles.label}>Attachment (PDF / Image)</Text>
        <TouchableOpacity style={styles.filePicker} onPress={pickFile}>
          {file ? (
            <Text style={styles.filePickerText}>📎 {file.name}</Text>
          ) : (
            <Text style={styles.filePickerHint}>📂 Tap to choose file</Text>
          )}
        </TouchableOpacity>
        {file && (
          <TouchableOpacity onPress={() => setFile(null)}>
            <Text style={styles.removeFile}>✕ Remove attachment</Text>
          </TouchableOpacity>
        )}

        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.btn, styles.draftBtn, loading && !isSubmit && styles.btnDisabled]}
            onPress={() => handleSave(false)}
            disabled={loading}
          >
            {loading && !isSubmit ? (
              <ActivityIndicator color={Colors.text} size="small" />
            ) : (
              <Text style={styles.draftBtnText}>Save Draft</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.submitBtn, loading && isSubmit && styles.btnDisabled]}
            onPress={() => handleSave(true)}
            disabled={loading}
          >
            {loading && isSubmit ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>Submit</Text>
            )}
          </TouchableOpacity>
        </View>
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
  backBtn: { padding: 4 },
  backText: { color: Colors.primary, fontSize: 18, fontWeight: '600' },
  title: { color: Colors.text, fontSize: 20, fontWeight: '700' },
  field: { marginBottom: 16 },
  label: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 7 },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    color: Colors.text,
    fontSize: 14,
  },
  inputMulti: { minHeight: 80 },
  filePicker: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    padding: 22,
    alignItems: 'center',
    marginBottom: 8,
  },
  filePickerText: { color: Colors.text, fontSize: 14 },
  filePickerHint: { color: Colors.textMuted, fontSize: 14 },
  removeFile: {
    color: Colors.danger,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  btn: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
  btnDisabled: { opacity: 0.55 },
  draftBtn: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  draftBtnText: { color: Colors.text, fontWeight: '600', fontSize: 15 },
  submitBtn: { backgroundColor: Colors.primary },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
