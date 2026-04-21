import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoiceService } from '../services/invoiceService';
import { useAuth } from '../context/AuthContext';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import {
  DocumentTextIcon, ClockIcon, CheckCircleIcon, XCircleIcon,
  CurrencyRupeeIcon, BanknotesIcon, ArrowTrendingUpIcon, ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const PIE_COLORS = ['#94a3b8', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

const fmt = n => n == null ? '₹0' : `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

function StatCard({ label, value, icon: Icon, accent, onClick, sub }) {
  return (
    <button onClick={onClick} className={`stat-card stat-card-${accent} text-left w-full`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${
          accent === 'blue'   ? 'bg-blue-50 text-blue-600' :
          accent === 'amber'  ? 'bg-amber-50 text-amber-600' :
          accent === 'emerald'? 'bg-emerald-50 text-emerald-600' :
          accent === 'red'    ? 'bg-red-50 text-red-600' :
          accent === 'purple' ? 'bg-purple-50 text-purple-600' :
                                'bg-slate-100 text-slate-600'
        }`}>
          <Icon className="h-5 w-5"/>
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs font-medium text-gray-500 mt-1">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </button>
  );
}

// ── VENDOR dashboard ────────────────────────────────────────────────────────
function VendorDashboard({ data, navigate }) {
  const cards = [
    { label: 'Pending Payouts', value: data.pendingApproval, icon: ClockIcon, accent: 'amber', path: '/invoices?status=PENDING_APPROVAL' },
    { label: 'Total Submitted', value: data.totalInvoices, icon: DocumentTextIcon, accent: 'blue', path: '/invoices' },
    { label: 'In Progress', value: data.pendingApproval + data.draft, icon: ArrowTrendingUpIcon, accent: 'slate', path: '/invoices' },
    { label: 'Paid', value: data.paid, icon: BanknotesIcon, accent: 'purple', path: '/invoices?status=PAID' },
  ];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Invoice Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Track your submitted invoices and payment status.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => <StatCard key={c.label} {...c} onClick={() => navigate(c.path)}/>)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="stat-card stat-card-emerald">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><CheckCircleIcon className="h-5 w-5"/></div>
            <div>
              <div className="text-xl font-bold text-gray-900">{fmt(data.totalApprovedAmount)}</div>
              <div className="text-xs text-gray-500">Approved Amount</div>
            </div>
          </div>
        </div>
        <div className="stat-card stat-card-purple">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600"><BanknotesIcon className="h-5 w-5"/></div>
            <div>
              <div className="text-xl font-bold text-gray-900">{fmt(data.totalPaidAmount)}</div>
              <div className="text-xs text-gray-500">Paid Amount</div>
            </div>
          </div>
        </div>
      </div>
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => navigate('/invoices/new')} className="btn-primary">+ New Invoice</button>
          <button onClick={() => navigate('/invoices')} className="btn-secondary">View All</button>
        </div>
      </div>
    </div>
  );
}

// ── FINANCE / CFO dashboard ─────────────────────────────────────────────────
function FinanceDashboard({ data, navigate, role }) {
  const cards = [
    { label: 'Unapproved Spend', value: fmt(data.totalPaidAmount == null ? 0 : (data.totalApprovedAmount || 0)), icon: ExclamationTriangleIcon, accent: 'amber', path: '/finance-hub' },
    { label: 'Total Approved', value: fmt(data.totalApprovedAmount), icon: CheckCircleIcon, accent: 'emerald', path: '/invoices?status=APPROVED' },
    { label: 'Total Paid', value: fmt(data.totalPaidAmount), icon: BanknotesIcon, accent: 'purple', path: '/invoices?status=PAID' },
    { label: 'Pending Approval', value: data.pendingApproval, icon: ClockIcon, accent: 'blue', path: '/invoices?status=PENDING_APPROVAL' },
  ];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{role === 'CFO' ? 'CFO Command Center' : 'Finance Dashboard'}</h1>
        <p className="text-sm text-gray-500 mt-1">Financial overview of invoice spend and approvals.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => <StatCard key={c.label} {...c} onClick={() => navigate(c.path)}/>)}
      </div>
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => navigate('/finance-hub')} className="btn-primary">Finance Hub</button>
          {role === 'CFO' && <button onClick={() => navigate('/cfo')} className="btn-secondary">CFO Command</button>}
          <button onClick={() => navigate('/reports')} className="btn-secondary">Reports</button>
          <button onClick={() => navigate('/audit')} className="btn-secondary">Audit Registry</button>
        </div>
      </div>
    </div>
  );
}

// ── Generic dashboard ───────────────────────────────────────────────────────
function GenericDashboard({ data, navigate, user }) {
  const stats = [
    { label: 'Total Invoices', value: data.totalInvoices, icon: DocumentTextIcon, accent: 'blue', path: '/invoices' },
    { label: 'Pending Approval', value: data.pendingApproval, icon: ClockIcon, accent: 'amber', path: '/invoices?status=PENDING_APPROVAL' },
    { label: 'Approved', value: data.approved, icon: CheckCircleIcon, accent: 'emerald', path: '/invoices?status=APPROVED' },
    { label: 'Rejected', value: data.rejected, icon: XCircleIcon, accent: 'red', path: '/invoices?status=REJECTED' },
    { label: 'Paid', value: data.paid, icon: CurrencyRupeeIcon, accent: 'purple', path: '/invoices?status=PAID' },
  ];

  const pieData = [
    { name: 'Draft', value: data.draft },
    { name: 'Pending', value: data.pendingApproval },
    { name: 'Approved', value: data.approved },
    { name: 'Rejected', value: data.rejected },
    { name: 'Paid', value: data.paid },
  ].filter(d => d.value > 0);

  const barData = [
    { stage: 'Draft', count: data.draft },
    { stage: 'Pending', count: data.pendingApproval },
    { stage: 'Approved', count: data.approved },
    { stage: 'Rejected', count: data.rejected },
    { stage: 'Paid', count: data.paid },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back, {user?.name}. Here's your invoice overview.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {stats.map(s => <StatCard key={s.label} {...s} onClick={() => navigate(s.path)}/>)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="stat-card stat-card-emerald">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><CheckCircleIcon className="h-5 w-5"/></div>
            <div>
              <div className="text-xl font-bold text-gray-900">{fmt(data.totalApprovedAmount)}</div>
              <div className="text-xs text-gray-500">Approved Amount</div>
            </div>
          </div>
        </div>
        <div className="stat-card stat-card-purple">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600"><BanknotesIcon className="h-5 w-5"/></div>
            <div>
              <div className="text-xl font-bold text-gray-900">{fmt(data.totalPaidAmount)}</div>
              <div className="text-xs text-gray-500">Paid Amount</div>
            </div>
          </div>
        </div>
      </div>
      {pieData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Status Distribution</h2>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={85} dataKey="value"
                     label={({name, percent}) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
                </Pie>
                <Tooltip/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Invoice Count by Stage</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="stage" tick={{ fontSize: 11 }} stroke="#94a3b8"/>
                <YAxis allowDecimals={false} stroke="#94a3b8"/>
                <Tooltip/>
                <Bar dataKey="count" fill="#3b82f6" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          {(user?.role === 'VENDOR' || user?.role === 'ADMIN') && (
            <button onClick={() => navigate('/invoices/new')} className="btn-primary">+ New Invoice</button>
          )}
          <button onClick={() => navigate('/invoices')} className="btn-secondary">View All Invoices</button>
          {['ADMIN','FINANCE','OPERATIONS'].includes(user?.role) && (
            <button onClick={() => navigate('/reports')} className="btn-secondary">Reports</button>
          )}
          {user?.role === 'ADMIN' && (
            <button onClick={() => navigate('/admin/workflows')} className="btn-secondary">Configure Workflows</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    invoiceService.dashboard()
      .then(r => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center mt-20">
      <div className="animate-spin h-10 w-10 rounded-full border-b-2 border-blue-600"/>
    </div>
  );
  if (!data) return <div className="text-center mt-20 text-gray-400">Could not load dashboard.</div>;

  if (user?.role === 'VENDOR') return <VendorDashboard data={data} navigate={navigate}/>;
  if (user?.role === 'FINANCE' || user?.role === 'CFO')
    return <FinanceDashboard data={data} navigate={navigate} role={user.role}/>;
  return <GenericDashboard data={data} navigate={navigate} user={user}/>;
}
