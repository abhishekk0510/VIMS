import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoiceService } from '../services/invoiceService';
import toast from 'react-hot-toast';
import { CloudArrowUpIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function CreateInvoicePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    invoiceNumber: '', invoiceDate: '', amount: '', clientName: '', description: ''
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.invoiceNumber.trim()) e.invoiceNumber = 'Invoice number is required';
    if (!form.invoiceDate) e.invoiceDate = 'Invoice date is required';
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) e.amount = 'Valid amount required';
    return e;
  };

  const handleChange = e => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    setErrors(p => ({ ...p, [e.target.name]: '' }));
  };

  const handleFileChange = e => {
    const f = e.target.files[0];
    if (f && f.size > 10 * 1024 * 1024) { toast.error('File too large (max 10MB)'); return; }
    setFile(f);
  };

  const handleSubmit = async (e, submitAfter = false) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    try {
      const payload = { ...form, amount: parseFloat(form.amount) };
      const res = await invoiceService.create(payload, file);
      const inv = res.data.data;
      toast.success('Invoice created successfully!');
      if (submitAfter) {
        await invoiceService.submit(inv.id);
        toast.success('Invoice submitted for review!');
      }
      navigate(`/invoices/${inv.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <button onClick={() => navigate('/invoices')} className="text-sm text-gray-500 hover:text-gray-700 mb-2">
          ← Back to Invoices
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Create New Invoice</h1>
        <p className="text-sm text-gray-500 mt-1">Fill in the details and optionally attach supporting documents.</p>
      </div>

      <form className="space-y-6">
        <div className="card space-y-5">
          <h2 className="text-base font-semibold text-gray-900 border-b pb-3">Invoice Details</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Invoice Number *</label>
              <input name="invoiceNumber" value={form.invoiceNumber} onChange={handleChange}
                className={`input ${errors.invoiceNumber ? 'border-red-400' : ''}`}
                placeholder="INV-2024-001"/>
              {errors.invoiceNumber && <p className="text-xs text-red-500 mt-1">{errors.invoiceNumber}</p>}
            </div>
            <div>
              <label className="label">Invoice Date *</label>
              <input type="date" name="invoiceDate" value={form.invoiceDate} onChange={handleChange}
                className={`input ${errors.invoiceDate ? 'border-red-400' : ''}`}
                max={new Date().toISOString().split('T')[0]}/>
              {errors.invoiceDate && <p className="text-xs text-red-500 mt-1">{errors.invoiceDate}</p>}
            </div>
            <div>
              <label className="label">Amount (₹) *</label>
              <input type="number" name="amount" value={form.amount} onChange={handleChange}
                className={`input ${errors.amount ? 'border-red-400' : ''}`}
                placeholder="50000.00" min="0.01" step="0.01"/>
              {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
            </div>
            <div>
              <label className="label">Client Name</label>
              <input name="clientName" value={form.clientName} onChange={handleChange}
                className="input" placeholder="ABC Corporation"/>
            </div>
          </div>

          <div>
            <label className="label">Description</label>
            <textarea name="description" value={form.description} onChange={handleChange}
              rows={3} className="input resize-none"
              placeholder="Brief description of goods/services..."/>
          </div>
        </div>

        {/* File Upload */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 border-b pb-3 mb-4">Supporting Document</h2>
          {file ? (
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <CloudArrowUpIcon className="h-5 w-5 text-blue-500"/>
              <span className="text-sm text-blue-700 flex-1 truncate">{file.name}</span>
              <button type="button" onClick={() => setFile(null)} className="text-blue-400 hover:text-blue-600">
                <XMarkIcon className="h-5 w-5"/>
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors">
              <CloudArrowUpIcon className="h-8 w-8 text-gray-400"/>
              <span className="text-sm text-gray-600 font-medium">Click to upload document</span>
              <span className="text-xs text-gray-400">PDF, JPG, PNG, Excel (max 10MB)</span>
              <input type="file" className="hidden" onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls"/>
            </label>
          )}
        </div>

        {/* AI Notice */}
        <div className="flex items-start gap-3 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
          <span className="text-indigo-500 text-lg">🤖</span>
          <div className="text-sm">
            <p className="font-medium text-indigo-900">AI Analysis Enabled</p>
            <p className="text-indigo-600 mt-0.5">After submission, AI will automatically analyze this invoice for anomalies and assign a risk score.</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button type="button" onClick={e => handleSubmit(e, false)} disabled={loading} className="btn-secondary flex-1">
            Save as Draft
          </button>
          <button type="button" onClick={e => handleSubmit(e, true)} disabled={loading} className="btn-primary flex-1">
            {loading ? 'Saving...' : 'Save & Submit'}
          </button>
        </div>
      </form>
    </div>
  );
}
