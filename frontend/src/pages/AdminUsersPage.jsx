import React, { useState, useEffect } from 'react';
import { adminService, tenantService } from '../services/invoiceService';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { PlusIcon, LockOpenIcon } from '@heroicons/react/24/outline';

const ROLES = ['VENDOR','OPERATIONS','FINANCE','CLIENT','ADMIN','DEPT_HEAD','CFO','SUPER_ADMIN'];
const VENDOR_TYPES = ['General', 'MSME', 'Government', 'Startup', 'Other'];

const PHONE_RE   = /^(\+91)?[6-9]\d{9}$/;
const GSTIN_RE   = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_RE     = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const IFSC_RE    = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const ROLE_BADGE = {
  ADMIN:       'bg-purple-100 text-purple-700',
  VENDOR:      'bg-blue-100 text-blue-700',
  OPERATIONS:  'bg-amber-100 text-amber-700',
  FINANCE:     'bg-emerald-100 text-emerald-700',
  CLIENT:      'bg-gray-100 text-gray-700',
  DEPT_HEAD:   'bg-orange-100 text-orange-700',
  CFO:         'bg-cyan-100 text-cyan-700',
  SUPER_ADMIN: 'bg-rose-100 text-rose-700',
};

const EMPTY_FORM = {
  name: '', email: '', password: '', role: 'VENDOR', phone: '',
  vendorCode: '', contactPerson: '', address: '', bankName: '',
  accountNumber: '', ifscCode: '', gstin: '', pan: '',
  vendorType: 'General', msmeRegistered: false, accountName: '',
  tenantId: '',
};

function Modal({ onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[92vh] overflow-y-auto relative">
        {children}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
      </div>
    </div>
  );
}

function Field({ label, required, error, children }) {
  return (
    <div>
      <label className="label text-xs">{label}{required && ' *'}</label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const [users, setUsers] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim() || form.name.length < 2) e.name = 'Name must be at least 2 characters';
    if (!form.email.trim()) e.email = 'Email is required';
    if (!PASSWORD_RE.test(form.password)) e.password = 'Min 8 chars with uppercase, lowercase, digit & special char';
    if (form.phone && !PHONE_RE.test(form.phone)) e.phone = 'Enter a valid 10-digit Indian mobile number (e.g. 9876543210 or +919876543210)';
    if (isSuperAdmin && !form.tenantId) e.tenantId = 'Please select a tenant';
    if (form.role === 'VENDOR') {
      if (!form.vendorCode.trim()) e.vendorCode = 'Vendor code is required';
      if (form.gstin && !GSTIN_RE.test(form.gstin)) e.gstin = 'Invalid GSTIN format (e.g. 22AAAAA0000A1Z5)';
      if (form.pan && !PAN_RE.test(form.pan)) e.pan = 'Invalid PAN format (e.g. AAAAA1234A)';
      if (form.ifscCode && !IFSC_RE.test(form.ifscCode)) e.ifscCode = 'Invalid IFSC format (e.g. HDFC0001234)';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const fetchUsers = () => {
    adminService.getAllUsers()
      .then(r => setUsers(r.data.data))
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
    if (isSuperAdmin) {
      tenantService.getAll()
        .then(r => setTenants(r.data.data || []))
        .catch(() => {});
    }
  }, [isSuperAdmin]);

  const handleCreate = async e => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await adminService.createUser(form);
      toast.success('User created successfully');
      setShowCreate(false);
      setForm(EMPTY_FORM);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create user');
    } finally { setSaving(false); }
  };

  const handleUnlock = async id => {
    try { await adminService.unlockUser(id); toast.success('User unlocked'); fetchUsers(); }
    catch { toast.error('Failed to unlock user'); }
  };

  const handleToggleEnable = async (id, enabled) => {
    try {
      await adminService.updateUser(id, { enabled: !enabled });
      toast.success(`User ${enabled ? 'disabled' : 'enabled'}`);
      fetchUsers();
    } catch { toast.error('Failed to update user'); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500">{users.length} registered users</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <PlusIcon className="h-4 w-4"/> Add User
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 rounded-full border-b-2 border-blue-600"/>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="tbl-head">
                <tr>
                  {['Name','Email','Role', ...(isSuperAdmin ? ['Tenant'] : []), 'Status','Actions'].map(h => (
                    <th key={h} className="tbl-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="tbl-row">
                    <td className="tbl-td font-medium text-gray-900">{u.name}</td>
                    <td className="tbl-td text-gray-500">{u.email}</td>
                    <td className="tbl-td">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_BADGE[u.role] || 'bg-gray-100 text-gray-700'}`}>
                        {u.role}
                      </span>
                    </td>
                    {isSuperAdmin && (
                      <td className="tbl-td text-gray-500 text-xs">{u.tenantName || <span className="text-slate-300">—</span>}</td>
                    )}
                    <td className="tbl-td">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${u.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {u.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="tbl-td">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleEnable(u.id, u.enabled)}
                          className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                            u.enabled ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          }`}>
                          {u.enabled ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => handleUnlock(u.id)}
                          className="text-xs px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium flex items-center gap-1 transition-colors">
                          <LockOpenIcon className="h-3 w-3"/> Unlock
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <Modal onClose={() => setShowCreate(false)}>
          <h3 className="text-lg font-bold text-gray-900 mb-5">Create New User</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            {/* Core fields */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Full Name" required error={errors.name}>
                <input required className="input text-sm" maxLength={100} value={form.name} onChange={e => set('name', e.target.value)} placeholder="John Doe"/>
              </Field>
              <Field label="Email" required error={errors.email}>
                <input type="email" required className="input text-sm" maxLength={150} value={form.email} onChange={e => set('email', e.target.value)} placeholder="john@company.com" autoComplete="off"/>
              </Field>
              <Field label="Password" required error={errors.password}>
                <input type="password" required className="input text-sm" maxLength={64} value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min 8 chars, upper+lower+digit+symbol" autoComplete="new-password"/>
              </Field>
              <Field label="Role" required>
                <select className="input text-sm" value={form.role} onChange={e => set('role', e.target.value)}>
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="Phone" error={errors.phone}>
                <input type="tel" className="input text-sm" maxLength={13} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="9876543210 or +919876543210"/>
              </Field>
              {isSuperAdmin && (
                <Field label="Tenant" required error={errors.tenantId}>
                  <select className="input text-sm" value={form.tenantId} onChange={e => set('tenantId', e.target.value)}>
                    <option value="">-- Select Tenant --</option>
                    {tenants.map(t => <option key={t.id} value={t.id}>{t.name} ({t.code})</option>)}
                  </select>
                </Field>
              )}
            </div>

            {/* Vendor-specific section */}
            {form.role === 'VENDOR' && (
              <div className="border border-blue-100 rounded-xl p-4 bg-blue-50/50 space-y-3">
                <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Vendor Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Vendor Code" required error={errors.vendorCode}>
                    <input required className="input text-sm" maxLength={50} value={form.vendorCode} onChange={e => set('vendorCode', e.target.value)} placeholder="VND001"/>
                  </Field>
                  <Field label="Contact Person">
                    <input className="input text-sm" maxLength={100} value={form.contactPerson} onChange={e => set('contactPerson', e.target.value)}/>
                  </Field>
                  <Field label="Bank Name">
                    <input className="input text-sm" maxLength={100} value={form.bankName} onChange={e => set('bankName', e.target.value)}/>
                  </Field>
                  <Field label="Account Number">
                    <input className="input text-sm" maxLength={20} value={form.accountNumber} onChange={e => set('accountNumber', e.target.value.replace(/\D/g, ''))} placeholder="Digits only"/>
                  </Field>
                  <Field label="Account Name">
                    <input className="input text-sm" maxLength={100} value={form.accountName} onChange={e => set('accountName', e.target.value)} placeholder="Account holder name"/>
                  </Field>
                  <Field label="IFSC Code" error={errors.ifscCode}>
                    <input className="input text-sm" maxLength={11} value={form.ifscCode} onChange={e => set('ifscCode', e.target.value.toUpperCase())} placeholder="HDFC0001234"/>
                  </Field>
                  <Field label="GSTIN" error={errors.gstin}>
                    <input className="input text-sm" value={form.gstin} onChange={e => set('gstin', e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" maxLength={15}/>
                  </Field>
                  <Field label="PAN" error={errors.pan}>
                    <input className="input text-sm" value={form.pan} onChange={e => set('pan', e.target.value.toUpperCase())} placeholder="AAAAA1234A" maxLength={10}/>
                  </Field>
                  <Field label="Vendor Type">
                    <select className="input text-sm" value={form.vendorType} onChange={e => set('vendorType', e.target.value)}>
                      {VENDOR_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </Field>
                  <Field label="MSME Registered">
                    <div className="flex items-center gap-2 mt-2">
                      <input type="checkbox" id="msme" checked={form.msmeRegistered} onChange={e => set('msmeRegistered', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600"/>
                      <label htmlFor="msme" className="text-sm text-gray-700">Yes, MSME registered</label>
                    </div>
                  </Field>
                  <div className="col-span-2">
                    <Field label="Address">
                      <input className="input text-sm" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Registered address"/>
                    </Field>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
