import React, { useState, useEffect } from 'react';
import { tenantService } from '../services/invoiceService';
import toast from 'react-hot-toast';
import { PlusIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline';

const EMPTY_FORM = {
  tenantName: '',
  tenantCode: '',
  description: '',
  adminName: '',
  adminEmail: '',
  adminPassword: '',
};

function Modal({ onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[92vh] overflow-y-auto relative">
        {children}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="label text-xs">{label}{required && ' *'}</label>
      {children}
    </div>
  );
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const fetchTenants = () => {
    tenantService.getAll()
      .then(r => setTenants(r.data.data || []))
      .catch(() => toast.error('Failed to load tenants'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTenants(); }, []);

  const handleCreate = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      await tenantService.create(form);
      toast.success('Tenant created successfully');
      setShowCreate(false);
      setForm(EMPTY_FORM);
      fetchTenants();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create tenant');
    } finally { setSaving(false); }
  };

  const handleToggle = async (id, active) => {
    try {
      await tenantService.toggle(id);
      toast.success(`Tenant ${active ? 'deactivated' : 'activated'}`);
      fetchTenants();
    } catch { toast.error('Failed to toggle tenant status'); }
  };

  const activeTenants = tenants.filter(t => t.active).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenant Management</h1>
          <p className="text-sm text-gray-500">{tenants.length} total tenants · {activeTenants} active</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <PlusIcon className="h-4 w-4"/> Create Tenant
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <div className="text-2xl font-bold text-gray-900">{tenants.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Total Tenants</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-emerald-600">{activeTenants}</div>
          <div className="text-xs text-gray-500 mt-0.5">Active</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-red-500">{tenants.length - activeTenants}</div>
          <div className="text-xs text-gray-500 mt-0.5">Inactive</div>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 rounded-full border-b-2 border-blue-600"/>
          </div>
        ) : tenants.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <BuildingOffice2Icon className="h-12 w-12 mb-3 opacity-30"/>
            <p className="text-sm">No tenants yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="tbl-head">
                <tr>
                  {['Organization', 'Code', 'Description', 'Status', 'Created', 'Actions'].map(h => (
                    <th key={h} className="tbl-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tenants.map(t => (
                  <tr key={t.id} className="tbl-row">
                    <td className="tbl-td font-medium text-gray-900">{t.name}</td>
                    <td className="tbl-td">
                      <code className="text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">{t.code}</code>
                    </td>
                    <td className="tbl-td text-gray-500 max-w-xs truncate">{t.description || '—'}</td>
                    <td className="tbl-td">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${t.active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {t.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="tbl-td text-gray-400 text-xs">
                      {t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="tbl-td">
                      <button
                        onClick={() => handleToggle(t.id, t.active)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                          t.active
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                        }`}
                      >
                        {t.active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Tenant Modal */}
      {showCreate && (
        <Modal onClose={() => setShowCreate(false)}>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Create New Tenant</h3>
          <p className="text-xs text-gray-500 mb-5">A first ADMIN user will be created automatically for this tenant.</p>
          <form onSubmit={handleCreate} className="space-y-4">
            {/* Organization details */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Organization</p>
              <Field label="Organization Name" required>
                <input required className="input text-sm" value={form.tenantName} onChange={e => set('tenantName', e.target.value)} placeholder="Acme Corp"/>
              </Field>
              <Field label="Tenant Code (slug)" required>
                <input required className="input text-sm font-mono" value={form.tenantCode}
                  onChange={e => set('tenantCode', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                  placeholder="acme-corp" maxLength={30}/>
                <p className="text-xs text-gray-400 mt-0.5">Lowercase letters, numbers and hyphens only</p>
              </Field>
              <Field label="Description">
                <textarea className="input text-sm h-16 resize-none" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Brief description..."/>
              </Field>
            </div>

            {/* Admin user details */}
            <div className="border border-purple-100 rounded-xl p-4 bg-purple-50/50 space-y-3">
              <p className="text-xs font-bold text-purple-700 uppercase tracking-wider">First Admin User</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Admin Name" required>
                  <input required className="input text-sm" value={form.adminName} onChange={e => set('adminName', e.target.value)} placeholder="Jane Smith"/>
                </Field>
                <Field label="Admin Email" required>
                  <input type="email" required className="input text-sm" value={form.adminEmail} onChange={e => set('adminEmail', e.target.value)} placeholder="admin@acme.com"/>
                </Field>
              </div>
              <Field label="Admin Password" required>
                <input type="password" required className="input text-sm" value={form.adminPassword} onChange={e => set('adminPassword', e.target.value)} placeholder="Min 8 chars with upper, lower, digit, special"/>
              </Field>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Creating...' : 'Create Tenant'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
