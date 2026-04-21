import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { financeService } from '../services/invoiceService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const fmt = n => n == null ? '₹0' : `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const STATUS_TABS = [
  { key: 'ALL',              label: 'All' },
  { key: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { key: 'APPROVED',         label: 'Approved' },
  { key: 'DRAFT',            label: 'Draft' },
  { key: 'REJECTED',         label: 'Rejected' },
  { key: 'PAID',             label: 'Paid' },
];

const STATUS_BADGE = {
  DRAFT:            'badge-draft',
  PENDING_APPROVAL: 'badge-pending_approval',
  APPROVED:         'badge-approved',
  REJECTED:         'badge-rejected',
  PAID:             'badge-paid',
};

export default function FinanceHubPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const navigate = useNavigate();

  useEffect(() => {
    financeService.expenseSummary()
      .then(r => setSummary(r.data.data))
      .catch(() => toast.error('Failed to load finance summary'))
      .finally(() => setLoading(false));
  }, []);

  const allInvoices = useMemo(() => {
    if (!summary) return [];
    return summary.byStatus?.flatMap(g => g.invoices || []) || [];
  }, [summary]);

  const displayedInvoices = useMemo(() => {
    if (activeTab === 'ALL') return allInvoices;
    return allInvoices.filter(inv => inv.status === activeTab);
  }, [allInvoices, activeTab]);

  const statusGroup = (status) => summary?.byStatus?.find(g => g.status === status);

  if (loading) return (
    <div className="flex justify-center mt-20">
      <div className="animate-spin h-10 w-10 rounded-full border-b-2 border-blue-600"/>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Finance Hub</h1>
        <p className="text-sm text-gray-500 mt-1">Spend visibility and invoice financial overview.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Unapproved spend KPI */}
        <div className="stat-card stat-card-amber col-span-1 sm:col-span-2 lg:col-span-1">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5"/>
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{fmt(summary?.unapprovedSpendTotal)}</div>
              <div className="text-xs text-gray-500 mt-0.5 font-medium">Unapproved Spend</div>
              <div className="text-xs text-amber-600 mt-1">Pending + Draft + Rejected</div>
            </div>
          </div>
        </div>

        {(['APPROVED','PAID','PENDING_APPROVAL']).map((s, i) => {
          const g = statusGroup(s);
          const accents = ['emerald','purple','blue'];
          return (
            <div key={s} className={`stat-card stat-card-${accents[i]}`}>
              <div className="text-xl font-bold text-gray-900">{fmt(g?.total)}</div>
              <div className="text-xs text-gray-500 mt-0.5 font-medium">{s.replace(/_/g,' ')}</div>
              <div className="text-xs text-gray-400 mt-0.5">{g?.count || 0} invoices</div>
            </div>
          );
        })}
      </div>

      {/* Tab filter */}
      <div className="flex gap-1 overflow-x-auto pb-1 bg-white border border-gray-200 rounded-xl p-1.5 w-fit">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab.label}
            {tab.key !== 'ALL' && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key ? 'bg-blue-500 text-blue-100' : 'bg-gray-100 text-gray-500'
              }`}>
                {statusGroup(tab.key)?.count || 0}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Invoice table */}
      <div className="card p-0 overflow-hidden">
        {displayedInvoices.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">💳</div>
            <p className="font-medium">No invoices in this category</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="tbl-head">
                <tr>
                  {['Invoice #','Vendor','Date','Amount','Status'].map(h => (
                    <th key={h} className="tbl-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayedInvoices.map(inv => (
                  <tr
                    key={inv.id}
                    className="tbl-row cursor-pointer"
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                  >
                    <td className="tbl-td font-mono text-blue-600 font-medium">{inv.invoiceNumber}</td>
                    <td className="tbl-td font-medium text-gray-900">{inv.vendor?.name}</td>
                    <td className="tbl-td text-gray-500">
                      {inv.invoiceDate ? format(new Date(inv.invoiceDate), 'dd MMM yyyy') : '—'}
                    </td>
                    <td className="tbl-td font-semibold text-gray-900">{fmt(inv.amount)}</td>
                    <td className="tbl-td">
                      <span className={STATUS_BADGE[inv.status] || 'badge-draft'}>
                        {inv.status?.replace(/_/g,' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
