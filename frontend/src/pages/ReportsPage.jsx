import React, { useState } from 'react';
import { reportService, downloadBlob } from '../services/invoiceService';
import toast from 'react-hot-toast';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';

const STATUSES = ['', 'DRAFT','PENDING_APPROVAL','APPROVED','REJECTED','PAID'];

export default function ReportsPage() {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState('');

  const download = async (type) => {
    setLoading(type);
    try {
      let res;
      if (type === 'invoices') {
        res = await reportService.exportInvoices(status || null);
        downloadBlob(res.data, `VIMS_Invoice_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
      } else {
        res = await reportService.exportPendency();
        downloadBlob(res.data, `VIMS_Pendency_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
      }
      toast.success('Report downloaded!');
    } catch { toast.error('Download failed'); }
    finally { setLoading(''); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-1">Download Excel reports for analysis</p>
      </div>

      <div className="card space-y-5">
        <h2 className="text-base font-semibold text-gray-900 border-b pb-3">Invoice Report</h2>
        <div>
          <label className="label">Filter by Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)} className="input max-w-xs">
            {STATUSES.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
          </select>
        </div>
        <button onClick={() => download('invoices')} disabled={!!loading}
          className="btn-primary flex items-center gap-2">
          <ArrowDownTrayIcon className="h-4 w-4"/>
          {loading === 'invoices' ? 'Downloading...' : 'Download Invoice Report (.xlsx)'}
        </button>
      </div>

      <div className="card space-y-4">
        <h2 className="text-base font-semibold text-gray-900 border-b pb-3">Pendency Report</h2>
        <p className="text-sm text-gray-500">Summary of invoices pending at each stage.</p>
        <button onClick={() => download('pendency')} disabled={!!loading}
          className="btn-primary flex items-center gap-2">
          <ArrowDownTrayIcon className="h-4 w-4"/>
          {loading === 'pendency' ? 'Downloading...' : 'Download Pendency Report (.xlsx)'}
        </button>
      </div>
    </div>
  );
}
