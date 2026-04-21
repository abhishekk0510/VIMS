import React, { useState, useEffect, useMemo } from 'react';
import { auditService, downloadBlob } from '../services/invoiceService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { MagnifyingGlassIcon, ArrowDownTrayIcon, FunnelIcon } from '@heroicons/react/24/outline';

const EVENT_TYPES = [
  '', 'INVOICE_SUBMITTED', 'INVOICE_APPROVED_LEVEL', 'INVOICE_FULLY_APPROVED',
  'INVOICE_REJECTED', 'INVOICE_PAID',
];

const EVENT_BADGE = {
  INVOICE_SUBMITTED:       'bg-blue-50 text-blue-700 border-blue-200',
  INVOICE_APPROVED_LEVEL:  'bg-amber-50 text-amber-700 border-amber-200',
  INVOICE_FULLY_APPROVED:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  INVOICE_REJECTED:        'bg-red-50 text-red-700 border-red-200',
  INVOICE_PAID:            'bg-purple-50 text-purple-700 border-purple-200',
};

export default function AuditRegistryPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);

  const fetchLogs = (type) => {
    setLoading(true);
    auditService.getLogs(type || undefined)
      .then(r => setLogs(r.data.data || []))
      .catch(() => toast.error('Failed to load audit logs'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLogs(filterType); }, [filterType]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await auditService.exportCsv(filterType || undefined);
      downloadBlob(res.data, 'audit-logs.csv');
      toast.success('CSV exported');
    } catch { toast.error('Export failed'); }
    finally { setExporting(false); }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.toLowerCase();
    return logs.filter(l =>
      l.actor?.toLowerCase().includes(q) ||
      l.description?.toLowerCase().includes(q) ||
      l.invoiceRef?.toLowerCase().includes(q) ||
      l.actorRole?.toLowerCase().includes(q)
    );
  }, [logs, search]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Registry</h1>
          <p className="text-sm text-gray-500">{filtered.length} events</p>
        </div>
        <button onClick={handleExport} disabled={exporting}
          className="btn-secondary flex items-center gap-2">
          <ArrowDownTrayIcon className="h-4 w-4"/>
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
            <input
              className="input pl-9 text-sm"
              placeholder="Search by actor, invoice, description..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {/* Event type filter */}
          <div className="relative sm:w-64">
            <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
            <select
              className="input pl-9 text-sm appearance-none"
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
              {EVENT_TYPES.map(t => (
                <option key={t} value={t}>{t || 'All Event Types'}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin h-8 w-8 rounded-full border-b-2 border-blue-600"/>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">📋</div>
            <p className="font-medium">No audit events found</p>
            <p className="text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="tbl-head">
                <tr>
                  {['Event Type','Actor','Role','Description','Invoice Ref','Timestamp'].map(h => (
                    <th key={h} className="tbl-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(log => (
                  <tr key={log.id} className="tbl-row">
                    <td className="tbl-td">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${
                        EVENT_BADGE[log.eventType] || 'bg-gray-100 text-gray-600 border-gray-200'
                      }`}>
                        {log.eventType?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="tbl-td font-medium text-gray-900">{log.actor}</td>
                    <td className="tbl-td text-gray-500">{log.actorRole}</td>
                    <td className="tbl-td text-gray-600 max-w-xs truncate">{log.description}</td>
                    <td className="tbl-td">
                      {log.invoiceRef ? (
                        <span className="font-mono text-blue-600 text-xs">{log.invoiceRef}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="tbl-td text-gray-400 whitespace-nowrap">
                      {log.createdAt ? format(new Date(log.createdAt), 'dd MMM yyyy, HH:mm') : '—'}
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
