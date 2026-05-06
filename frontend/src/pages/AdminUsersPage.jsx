import React, { useState, useEffect } from 'react';
import { adminService, tenantService } from '../services/invoiceService';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { PlusIcon, LockOpenIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

const ROLES = ['VENDOR','OPERATIONS','FINANCE','CLIENT','ADMIN','DEPT_HEAD','CFO','SUPER_ADMIN'];
const VENDOR_TYPES = ['General', 'MSME', 'Government', 'Startup', 'Other'];

const PHONE_RE    = /^(\+91)?[6-9]\d{9}$/;
const GSTIN_RE    = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_RE      = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const IFSC_RE     = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const ROLE_BADGE = {
  ADMIN:'bg-purple-100 text-purple-700', VENDOR:'bg-blue-100 text-blue-700',
  OPERATIONS:'bg-amber-100 text-amber-700', FINANCE:'bg-emerald-100 text-emerald-700',
  CLIENT:'bg-gray-100 text-gray-700', DEPT_HEAD:'bg-orange-100 text-orange-700',
  CFO:'bg-cyan-100 text-cyan-700', SUPER_ADMIN:'bg-rose-100 text-rose-700',
};

const MODULE_META = [
  { key: 'DASHBOARD',         label: 'Dashboard',        desc: 'Home dashboard & KPI cards' },
  { key: 'INVOICES',          label: 'Invoices',          desc: 'View invoice list & details' },
  { key: 'CREATE_INVOICE',    label: 'New Invoice',       desc: 'Submit new invoices' },
  { key: 'REPORTS',           label: 'Reports',           desc: 'Export & analytics reports' },
  { key: 'FINANCE_HUB',       label: 'Finance Hub',       desc: 'Finance workflow & spend overview' },
  { key: 'CFO_COMMAND',       label: 'CFO Command',       desc: 'CFO approval & financial control' },
  { key: 'AUDIT_REGISTRY',    label: 'Audit Registry',    desc: 'Audit logs & compliance trail' },
  { key: 'USER_MANAGEMENT',   label: 'User Management',   desc: 'Create & manage users' },
  { key: 'WORKFLOW_CONFIG',   label: 'Workflow Config',   desc: 'Configure approval workflows' },
  { key: 'TENANT_MANAGEMENT', label: 'Tenant Management', desc: 'Manage organisation tenants' },
];

const EMPTY_FORM = {
  name:'', email:'', password:'', role:'VENDOR', phone:'',
  vendorCode:'', contactPerson:'', address:'', bankName:'',
  accountNumber:'', ifscCode:'', gstin:'', pan:'',
  vendorType:'General', msmeRegistered:false, accountName:'',
  tenantId:'',
};

function Modal({ onClose, children, wide }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-2xl'} p-6 max-h-[92vh] overflow-y-auto relative`}>
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

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        active ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  );
}

// ── Manage User Modal ────────────────────────────────────────────────────────

function ManageUserModal({ user: u, tenants, onClose, onRefresh }) {
  const [tab, setTab] = useState('info');
  const [editForm, setEditForm] = useState({ name: u.name, phone: u.phone || '' });
  const [editErrors, setEditErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Tenant access tab state
  const [selectedTenants, setSelectedTenants] = useState(
    u.accessibleTenantIds?.filter(id => id !== u.tenantId) ?? []
  );
  const [savingTenants, setSavingTenants] = useState(false);

  // Module permissions tab state
  const [permissions, setPermissions] = useState([]);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [savingPerms, setSavingPerms] = useState(false);
  const [pendingPerms, setPendingPerms] = useState({});

  useEffect(() => {
    if (tab === 'modules' && permissions.length === 0) {
      setLoadingPerms(true);
      adminService.getPermissions(u.id)
        .then(r => { setPermissions(r.data.data); setPendingPerms({}); })
        .catch(() => toast.error('Failed to load permissions'))
        .finally(() => setLoadingPerms(false));
    }
  }, [tab, u.id]);

  // ── Info tab ──
  const validateEdit = () => {
    const e = {};
    if (!editForm.name.trim() || editForm.name.length < 2) e.name = 'Name must be at least 2 characters';
    if (editForm.phone && !PHONE_RE.test(editForm.phone)) e.phone = 'Enter a valid 10-digit Indian mobile number';
    setEditErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSaveInfo = async e => {
    e.preventDefault();
    if (!validateEdit()) return;
    setSaving(true);
    try {
      await adminService.updateUser(u.id, editForm);
      toast.success('User updated');
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally { setSaving(false); }
  };

  // ── Tenant access tab ──
  const toggleTenant = (id) => {
    setSelectedTenants(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSaveTenants = async () => {
    setSavingTenants(true);
    try {
      // Include primary tenant + selected additional tenants
      const allTenants = [u.tenantId, ...selectedTenants].filter(Boolean);
      await adminService.assignTenants(u.id, allTenants);
      toast.success('Tenant access updated');
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update tenants');
    } finally { setSavingTenants(false); }
  };

  // ── Module permissions tab ──
  const getEffective = (perm) => {
    if (perm.key in pendingPerms) return pendingPerms[perm.key];
    return perm.effective;
  };

  const togglePerm = (key, currentEffective) => {
    setPendingPerms(prev => ({ ...prev, [key]: !currentEffective }));
  };

  const handleSavePerms = async () => {
    if (Object.keys(pendingPerms).length === 0) { toast('No changes to save'); return; }
    setSavingPerms(true);
    try {
      await adminService.updatePermissions(u.id, pendingPerms);
      // Reload permissions to reflect saved state
      const r = await adminService.getPermissions(u.id);
      setPermissions(r.data.data);
      setPendingPerms({});
      toast.success('Module permissions saved');
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save permissions');
    } finally { setSavingPerms(false); }
  };

  const handleResetAllPerms = async () => {
    setSavingPerms(true);
    try {
      await adminService.resetAllPermissions(u.id);
      const r = await adminService.getPermissions(u.id);
      setPermissions(r.data.data);
      setPendingPerms({});
      toast.success('Permissions reset to role defaults');
      onRefresh();
    } catch {
      toast.error('Failed to reset permissions');
    } finally { setSavingPerms(false); }
  };

  return (
    <Modal onClose={onClose} wide>
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900">Manage User</h3>
        <p className="text-sm text-gray-500">{u.name} &middot; <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_BADGE[u.role]}`}>{u.role}</span></p>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-5">
        <TabBtn active={tab === 'info'} onClick={() => setTab('info')}>Basic Info</TabBtn>
        <TabBtn active={tab === 'tenants'} onClick={() => setTab('tenants')}>Tenant Access</TabBtn>
        <TabBtn active={tab === 'modules'} onClick={() => setTab('modules')}>Module Permissions</TabBtn>
      </div>

      {/* ── Basic Info ── */}
      {tab === 'info' && (
        <form onSubmit={handleSaveInfo} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Full Name" required error={editErrors.name}>
              <input className="input text-sm" maxLength={100} value={editForm.name}
                onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
            </Field>
            <Field label="Phone" error={editErrors.phone}>
              <input type="tel" className="input text-sm" maxLength={13} value={editForm.phone}
                onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} placeholder="9876543210"/>
            </Field>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}

      {/* ── Tenant Access ── */}
      {tab === 'tenants' && (
        <div className="space-y-4">
          <div className="text-sm text-gray-600 bg-blue-50 rounded-lg p-3">
            <strong>Primary tenant:</strong> {u.tenantName || <span className="italic text-gray-400">None (Platform-wide)</span>}
            <br/>
            <span className="text-xs text-gray-500">Grant this user read-access to additional tenants below.</span>
          </div>

          {tenants.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No tenants available.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {tenants.filter(t => t.id !== u.tenantId).map(t => (
                <label key={t.id} className="flex items-center gap-3 p-3 rounded-xl border hover:bg-gray-50 cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={selectedTenants.includes(t.id)}
                    onChange={() => toggleTenant(t.id)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-800">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.code}</div>
                  </div>
                  {!t.active && <span className="ml-auto text-xs text-red-500">Inactive</span>}
                </label>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleSaveTenants} disabled={savingTenants} className="btn-primary flex-1">
              {savingTenants ? 'Saving...' : 'Save Tenant Access'}
            </button>
          </div>
        </div>
      )}

      {/* ── Module Permissions ── */}
      {tab === 'modules' && (
        <div className="space-y-4">
          {loadingPerms ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-6 w-6 rounded-full border-b-2 border-blue-600"/>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500">
                Toggles override the user's role defaults. <span className="font-medium text-gray-700">Gray = role default</span> &middot; <span className="font-medium text-blue-600">Blue = custom override</span>.
              </p>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {MODULE_META.map(m => {
                  const perm = permissions.find(p => p.key === m.key);
                  if (!perm) return null;
                  const effective = getEffective(perm);
                  const hasOverride = perm.key in pendingPerms || perm.override !== null;
                  return (
                    <div key={m.key} className={`flex items-center justify-between p-3 rounded-xl border transition ${hasOverride ? 'border-blue-200 bg-blue-50/50' : 'border-gray-100'}`}>
                      <div className="flex-1 min-w-0 mr-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-800">{m.label}</span>
                          {hasOverride && (
                            <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-medium">custom</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">{m.desc}</div>
                        <div className="text-xs text-gray-400 mt-0.5">Role default: {perm.defaultEnabled ? '✓ on' : '✗ off'}</div>
                      </div>
                      <button
                        onClick={() => togglePerm(m.key, effective)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                          effective ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${effective ? 'translate-x-5' : 'translate-x-0'}`}/>
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={handleResetAllPerms} disabled={savingPerms}
                  className="text-sm px-3 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition">
                  Reset to Defaults
                </button>
                <div className="flex-1"/>
                <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                <button onClick={handleSavePerms} disabled={savingPerms || Object.keys(pendingPerms).length === 0}
                  className="btn-primary">
                  {savingPerms ? 'Saving...' : `Save ${Object.keys(pendingPerms).length > 0 ? `(${Object.keys(pendingPerms).length})` : ''}`}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const [users, setUsers] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [managingUser, setManagingUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: undefined })); };

  const validate = () => {
    const e = {};
    if (!form.name.trim() || form.name.length < 2) e.name = 'Name must be at least 2 characters';
    if (!form.email.trim()) e.email = 'Email is required';
    if (!PASSWORD_RE.test(form.password)) e.password = 'Min 8 chars with uppercase, lowercase, digit & special char';
    if (form.phone && !PHONE_RE.test(form.phone)) e.phone = 'Enter a valid 10-digit Indian mobile number';
    if (isSuperAdmin && !form.tenantId) e.tenantId = 'Please select a tenant';
    if (form.role === 'VENDOR') {
      if (!form.vendorCode.trim()) e.vendorCode = 'Vendor code is required';
      if (form.gstin && !GSTIN_RE.test(form.gstin)) e.gstin = 'Invalid GSTIN format';
      if (form.pan && !PAN_RE.test(form.pan)) e.pan = 'Invalid PAN format';
      if (form.ifscCode && !IFSC_RE.test(form.ifscCode)) e.ifscCode = 'Invalid IFSC format';
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

  const fetchTenants = () => {
    tenantService.getAll()
      .then(r => setTenants(r.data.data || []))
      .catch(() => {});
  };

  useEffect(() => {
    fetchUsers();
    fetchTenants(); // always fetch tenants (ADMIN needs them for tenant access tab)
  }, []);

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
                  {['Name','Email','Role','Tenant','Access','Status','Actions'].map(h => (
                    <th key={h} className="tbl-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="tbl-row">
                    <td className="tbl-td font-medium text-gray-900">{u.name}</td>
                    <td className="tbl-td text-gray-500 text-xs">{u.email}</td>
                    <td className="tbl-td">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_BADGE[u.role] || 'bg-gray-100 text-gray-700'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="tbl-td text-gray-500 text-xs">{u.tenantName || <span className="text-slate-300">—</span>}</td>
                    <td className="tbl-td">
                      {u.accessibleTenantIds && u.accessibleTenantIds.length > 1 ? (
                        <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
                          {u.accessibleTenantIds.length} tenants
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Single</span>
                      )}
                    </td>
                    <td className="tbl-td">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${u.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {u.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="tbl-td">
                      <div className="flex gap-1.5 flex-wrap">
                        <button
                          onClick={() => handleToggleEnable(u.id, u.enabled)}
                          className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors ${
                            u.enabled ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          }`}>
                          {u.enabled ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => handleUnlock(u.id)}
                          className="text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium flex items-center gap-1 transition-colors">
                          <LockOpenIcon className="h-3 w-3"/> Unlock
                        </button>
                        <button
                          onClick={() => setManagingUser(u)}
                          className="text-xs px-2 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium flex items-center gap-1 transition-colors">
                          <Cog6ToothIcon className="h-3 w-3"/> Manage
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

      {/* Create User Modal */}
      {showCreate && (
        <Modal onClose={() => setShowCreate(false)}>
          <h3 className="text-lg font-bold text-gray-900 mb-5">Create New User</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Full Name" required error={errors.name}>
                <input required className="input text-sm" maxLength={100} value={form.name} onChange={e => set('name', e.target.value)} placeholder="John Doe"/>
              </Field>
              <Field label="Email" required error={errors.email}>
                <input type="email" required className="input text-sm" maxLength={150} value={form.email} onChange={e => set('email', e.target.value)} placeholder="john@company.com" autoComplete="off"/>
              </Field>
              <Field label="Password" required error={errors.password}>
                <input type="password" required className="input text-sm" maxLength={64} value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min 8 chars" autoComplete="new-password"/>
              </Field>
              <Field label="Role" required>
                <select className="input text-sm" value={form.role} onChange={e => set('role', e.target.value)}>
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="Phone" error={errors.phone}>
                <input type="tel" className="input text-sm" maxLength={13} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="9876543210"/>
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
                    <input className="input text-sm" maxLength={100} value={form.accountName} onChange={e => set('accountName', e.target.value)}/>
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
                      <input type="checkbox" id="msme" checked={form.msmeRegistered} onChange={e => set('msmeRegistered', e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600"/>
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

      {/* Manage User Modal */}
      {managingUser && (
        <ManageUserModal
          user={managingUser}
          tenants={tenants}
          onClose={() => setManagingUser(null)}
          onRefresh={() => { fetchUsers(); setManagingUser(null); }}
        />
      )}
    </div>
  );
}
