import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { invoiceService } from '../services/invoiceService';
import { useAuth } from '../context/AuthContext';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

const STATUSES = ['', 'DRAFT','PENDING_APPROVAL','APPROVED','REJECTED','PAID'];

function StatusBadge({ status }) {
  return <span className={`badge-${status.toLowerCase()}`}>{status.replace('_',' ')}</span>;
}

export default function InvoiceListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState({ page: 0, totalPages: 0, totalElements: 0 });
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: params.get('status') || '',
    from: '', to: '', clientName: '', page: 0
  });

  const fetchInvoices = useCallback(() => {
    setLoading(true);
    const p = {};
    if (filters.status) p.status = filters.status;
    if (filters.from) p.from = filters.from;
    if (filters.to) p.to = filters.to;
    if (filters.clientName) p.clientName = filters.clientName;
    p.page = filters.page;
    p.size = 20;

    invoiceService.list(p)
      .then(r => {
        setInvoices(r.data.data.content);
        setPagination({ page: r.data.data.page, totalPages: r.data.data.totalPages, totalElements: r.data.data.totalElements });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const handleFilterChange = e => setFilters(p => ({ ...p, [e.target.name]: e.target.value, page: 0 }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500">{pagination.totalElements} total invoices</p>
        </div>
        {(user?.role === 'VENDOR' || user?.role === 'ADMIN') && (
          <button onClick={() => navigate('/invoices/new')} className="btn-primary">+ New Invoice</button>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-700">
          <FunnelIcon className="h-4 w-4"/> Filters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="label text-xs">Status</label>
            <select name="status" value={filters.status} onChange={handleFilterChange} className="input text-sm">
              {STATUSES.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">From Date</label>
            <input type="date" name="from" value={filters.from} onChange={handleFilterChange} className="input text-sm"/>
          </div>
          <div>
            <label className="label text-xs">To Date</label>
            <input type="date" name="to" value={filters.to} onChange={handleFilterChange} className="input text-sm"/>
          </div>
          <div>
            <label className="label text-xs">Client Name</label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
              <input type="text" name="clientName" value={filters.clientName} onChange={handleFilterChange}
                placeholder="Search client..." className="input text-sm pl-9"/>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><div className="animate-spin h-8 w-8 rounded-full border-b-2 border-primary-600"/></div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <DocumentIcon className="h-12 w-12 mx-auto mb-3 opacity-50"/>
            No invoices found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Invoice No','Vendor','Date','Amount','Client','Status','AI Risk','Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-primary-600">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 text-gray-700">{inv.vendor?.name}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {inv.invoiceDate ? format(new Date(inv.invoiceDate), 'dd MMM yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      ₹{Number(inv.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{inv.clientName || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={inv.status}/></td>
                    <td className="px-4 py-3">
                      {inv.aiRiskScore != null ? (
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                          inv.aiRiskScore >= 65 ? 'bg-red-100 text-red-700' :
                          inv.aiRiskScore >= 40 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {inv.aiAnomalyFlag ? '⚠ ' : '✓ '}{inv.aiRiskScore}
                        </span>
                      ) : <span className="text-gray-400 text-xs">Analyzing...</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => navigate(`/invoices/${inv.id}`)}
                        className="text-primary-600 hover:text-primary-800 font-medium text-xs">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <span className="text-sm text-gray-500">
              Page {pagination.page + 1} of {pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <button disabled={filters.page === 0}
                onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))}
                className="btn-secondary text-sm py-1 px-3 disabled:opacity-40">Prev</button>
              <button disabled={filters.page >= pagination.totalPages - 1}
                onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))}
                className="btn-secondary text-sm py-1 px-3 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>;
}
