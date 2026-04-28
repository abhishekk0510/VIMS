import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invoiceService, downloadBlob } from '../services/invoiceService';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { CheckCircleIcon, XCircleIcon, CurrencyRupeeIcon, ArrowDownTrayIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

// 7 canonical workflow stages shown as a progress track
const WORKFLOW_STAGES = [
  { key: 'submitted',   label: 'Submitted' },
  { key: 'l1',         label: 'L1 Review' },
  { key: 'l2',         label: 'L2 Review' },
  { key: 'dept_head',  label: 'Dept Head' },
  { key: 'finance_l1', label: 'Finance L1' },
  { key: 'finance_l2', label: 'Finance L2' },
  { key: 'cfo',        label: 'CFO' },
  { key: 'approved',   label: 'Approved' },
];

function StatusBadge({ status }) {
  return <span className={`badge-${status?.toLowerCase()} text-sm px-3 py-1`}>{status?.replace(/_/g,' ')}</span>;
}

function RiskBar({ score }) {
  const pct = Number(score);
  const color = pct >= 65 ? 'bg-red-500' : pct >= 40 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">AI Risk Score</span>
        <span className={`font-bold ${pct >= 65 ? 'text-red-600' : pct >= 40 ? 'text-amber-600' : 'text-emerald-600'}`}>{pct}/100</span>
      </div>
      <div className="progress-track">
        <div className={`${color} progress-bar`} style={{ width: `${pct}%` }}/>
      </div>
    </div>
  );
}

// 7-step visual tracker
function ApprovalStageTracker({ invoice }) {
  if (invoice.status === 'DRAFT' || invoice.status === 'REJECTED' || invoice.status === 'PAID') return null;

  // Map current step from the workflow (1-based) to visual position
  // We collapse dynamic workflow levels onto the 8-stage visual
  const isApproved = invoice.status === 'APPROVED';
  const isPending  = invoice.status === 'PENDING_APPROVAL';

  // Determine current visual step:
  // Step 0 = Submitted (always done once pending), then steps 1-6 per workflow level, step 7 = Approved
  let activeVisualStep = 0; // default = Submitted
  if (isPending && invoice.currentApprovalStep != null) {
    // currentApprovalStep is 1-based; show as step index 1..6
    activeVisualStep = Math.min(invoice.currentApprovalStep, WORKFLOW_STAGES.length - 2);
  } else if (isApproved) {
    activeVisualStep = WORKFLOW_STAGES.length - 1; // last dot = Approved
  }

  return (
    <div className="card bg-gradient-to-r from-slate-50 to-blue-50 border-blue-100">
      <h3 className="text-sm font-bold text-gray-800 mb-4">Approval Stages</h3>

      {/* Dots track */}
      <div className="relative">
        {/* Connecting line */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 z-0" style={{ left: '20px', right: '20px' }}/>
        <div
          className="absolute top-4 h-0.5 bg-blue-500 z-0 transition-all"
          style={{
            left: '20px',
            width: activeVisualStep === 0
              ? '0%'
              : `${(activeVisualStep / (WORKFLOW_STAGES.length - 1)) * 100}%`
          }}
        />

        {/* Dots */}
        <div className="relative z-10 flex justify-between">
          {WORKFLOW_STAGES.map((stage, idx) => {
            const isDone    = idx < activeVisualStep;
            const isCurrent = idx === activeVisualStep;
            const isFuture  = idx > activeVisualStep;
            return (
              <div key={stage.key} className="flex flex-col items-center gap-1.5" style={{ minWidth: 0 }}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                  isDone    ? 'bg-emerald-500 border-emerald-500 text-white' :
                  isCurrent ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200' :
                              'bg-white border-gray-300 text-gray-400'
                }`}>
                  {isDone ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                    </svg>
                  ) : idx + 1}
                </div>
                <span className={`text-center text-xs font-medium leading-tight max-w-[56px] ${
                  isDone ? 'text-emerald-600' : isCurrent ? 'text-blue-700' : 'text-gray-400'
                }`} style={{ fontSize: '10px' }}>
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {isPending && invoice.currentStepName && (
        <p className="text-xs text-blue-700 mt-4 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
          Awaiting <strong>{invoice.currentStepName}</strong>
          {invoice.currentStepRole && <span className="text-blue-500"> ({invoice.currentStepRole})</span>}
        </p>
      )}
    </div>
  );
}

// Parse key fields from raw OCR text for display
function parseOcrFields(text) {
  const fields = [];
  if (!text) return fields;

  const amountMatch = text.match(/(?:total|amount|grand\s+total|net\s+amount)[^\d]*([₹Rs.INR]*\s*[\d,]+(?:\.\d{1,2})?)/i);
  if (amountMatch) fields.push({ label: 'Detected Amount', value: amountMatch[1].trim() });

  const invNoMatch = text.match(/(?:invoice\s*(?:no|number|#)?)[:\s#]*([A-Z0-9/-]{4,20})/i);
  if (invNoMatch) fields.push({ label: 'Invoice No.', value: invNoMatch[1].trim() });

  const dateMatch = text.match(/(?:invoice\s*date|date)[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-]\d{2}[\/\-]\d{2})/i);
  if (dateMatch) fields.push({ label: 'Date', value: dateMatch[1].trim() });

  const vendorMatch = text.match(/(?:from|vendor|billed?\s*by|seller)[:\s]*([A-Za-z][A-Za-z0-9 .,-]{2,40})/i);
  if (vendorMatch) fields.push({ label: 'Vendor / Biller', value: vendorMatch[1].trim() });

  const gstMatch = text.match(/(?:GST(?:IN)?|GSTIN)[:\s#]*([0-9A-Z]{15})/i);
  if (gstMatch) fields.push({ label: 'GSTIN', value: gstMatch[1].trim() });

  return fields;
}

function OcrTab({ invoice }) {
  const hasOcr = invoice.ocrText && invoice.ocrText.trim().length > 0;
  const isProcessing = !invoice.ocrText && invoice.fileName;
  const parsed = hasOcr ? parseOcrFields(invoice.ocrText) : [];

  // Cross-check: detect amount mismatch between entered amount and OCR
  let amountWarning = null;
  if (hasOcr) {
    const amountField = parsed.find(f => f.label === 'Detected Amount');
    if (amountField) {
      const ocrNum = parseFloat(amountField.value.replace(/[₹Rs.INR,\s]/gi, ''));
      const enteredNum = Number(invoice.amount);
      if (!isNaN(ocrNum) && Math.abs(ocrNum - enteredNum) / Math.max(enteredNum, 1) > 0.05) {
        amountWarning = { entered: enteredNum, ocr: ocrNum };
      }
    }
  }

  if (isProcessing) return (
    <div className="card text-center py-10">
      <div className="animate-spin h-8 w-8 rounded-full border-b-2 border-blue-500 mx-auto mb-3"/>
      <p className="text-sm text-gray-500">OCR extraction in progress...</p>
      <p className="text-xs text-gray-400 mt-1">This usually takes a few seconds after upload.</p>
    </div>
  );

  if (!hasOcr) return (
    <div className="card text-center py-10 text-gray-400 text-sm">
      <span className="text-3xl mb-3 block">📄</span>
      No OCR data available. Upload a PDF or image to extract text.
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Parsed Fields */}
      {parsed.length > 0 && (
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-3">Extracted Fields</h2>
          <dl className="grid grid-cols-2 gap-3">
            {parsed.map(({ label, value }) => (
              <div key={label}>
                <dt className="text-gray-400 text-xs font-medium uppercase tracking-wide">{label}</dt>
                <dd className="font-semibold text-gray-900 mt-0.5 text-sm">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* Amount mismatch warning */}
      {amountWarning && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <span className="text-lg leading-none">⚠️</span>
          <div>
            <p className="font-semibold">Amount mismatch detected</p>
            <p className="text-xs mt-0.5">
              Entered: <strong>₹{amountWarning.entered.toLocaleString('en-IN')}</strong> &nbsp;|&nbsp;
              OCR detected: <strong>₹{amountWarning.ocr.toLocaleString('en-IN')}</strong>
            </p>
          </div>
        </div>
      )}

      {/* Raw OCR text */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold text-gray-900">Raw Extracted Text</h2>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {invoice.ocrText.length} chars
          </span>
        </div>
        <pre className="text-xs text-gray-600 bg-gray-50 border rounded-lg p-3 overflow-auto max-h-64 whitespace-pre-wrap font-mono leading-relaxed">
          {invoice.ocrText}
        </pre>
      </div>
    </div>
  );
}

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approvalModal, setApprovalModal] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  const fetchInvoice = () => {
    invoiceService.getById(id)
      .then(r => setInvoice(r.data.data))
      .catch(() => toast.error('Invoice not found'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchInvoice(); }, [id]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await invoiceService.submit(id);
      toast.success('Invoice submitted for approval!');
      fetchInvoice();
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setSubmitting(false); }
  };

  const handleApproval = async () => {
    if (approvalModal === 'REJECT' && !remarks.trim()) { toast.error('Remarks required for rejection'); return; }
    setSubmitting(true);
    try {
      await invoiceService.approve(id, { action: approvalModal, remarks });
      toast.success(`Invoice ${approvalModal === 'APPROVE' ? 'approved' : 'rejected'}!`);
      setApprovalModal(null); setRemarks('');
      fetchInvoice();
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setSubmitting(false); }
  };

  const handleMarkPaid = async () => {
    setSubmitting(true);
    try {
      await invoiceService.markPaid(id, 'Payment processed');
      toast.success('Marked as Paid!');
      fetchInvoice();
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setSubmitting(false); }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await invoiceService.download(id);
      downloadBlob(res.data, invoice.fileName || 'invoice-attachment');
      toast.success('Download started');
    } catch { toast.error('Download failed'); }
    finally { setDownloading(false); }
  };

  if (loading) return (
    <div className="flex justify-center mt-20">
      <div className="animate-spin h-10 w-10 rounded-full border-b-2 border-blue-600"/>
    </div>
  );
  if (!invoice) return <div className="text-center mt-20 text-gray-400">Invoice not found</div>;

  const canSubmit  = (user?.role === 'VENDOR' || user?.role === 'ADMIN') && (invoice.status === 'DRAFT' || invoice.status === 'REJECTED');
  const canApprove = invoice.status === 'PENDING_APPROVAL' && (
    user?.role === 'ADMIN' ||
    (invoice.currentStepRole != null && String(user?.role) === String(invoice.currentStepRole))
  );
  const canMarkPaid = (user?.role === 'FINANCE' || user?.role === 'CFO' || user?.role === 'ADMIN') && invoice.status === 'APPROVED';

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <button onClick={() => navigate('/invoices')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3 transition-colors">
          <ArrowLeftIcon className="h-4 w-4"/> Back to Invoices
        </button>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{invoice.invoiceNumber}</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Created {invoice.createdAt ? format(new Date(invoice.createdAt), 'dd MMM yyyy, HH:mm') : ''}
            </p>
          </div>
          <StatusBadge status={invoice.status}/>
        </div>
      </div>

      {/* 7-step approval tracker */}
      <ApprovalStageTracker invoice={invoice}/>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left – Tabbed: Details | OCR Extract | Timeline */}
        <div className="lg:col-span-2 space-y-5">
          {/* Tab buttons */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 text-sm font-medium">
            {[
              { key: 'details', label: 'Details' },
              { key: 'ocr', label: `OCR Extract${invoice.ocrText ? '' : ''}` },
              { key: 'timeline', label: `Timeline${invoice.history?.length ? ` (${invoice.history.length})` : ''}` },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-1.5 px-3 rounded-lg transition-all ${
                  activeTab === tab.key
                    ? 'bg-white text-blue-700 shadow-sm font-semibold'
                    : 'text-gray-500 hover:text-gray-700'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Details tab */}
          {activeTab === 'details' && (
            <div className="card">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Invoice Details</h2>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                {[
                  ['Vendor', invoice.vendor?.name],
                  ['Invoice Date', invoice.invoiceDate ? format(new Date(invoice.invoiceDate), 'dd MMM yyyy') : '—'],
                  ['Amount', `₹${Number(invoice.amount).toLocaleString('en-IN')}`],
                  ['Client', invoice.clientName || '—'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-gray-400 text-xs font-medium uppercase tracking-wide">{k}</dt>
                    <dd className="font-semibold text-gray-900 mt-1">{v}</dd>
                  </div>
                ))}
                {invoice.description && (
                  <div className="col-span-2">
                    <dt className="text-gray-400 text-xs font-medium uppercase tracking-wide">Description</dt>
                    <dd className="text-gray-700 mt-1">{invoice.description}</dd>
                  </div>
                )}
                {invoice.rejectionRemarks && (
                  <div className="col-span-2">
                    <dt className="text-red-500 text-xs font-bold uppercase tracking-wide">Rejection Remarks</dt>
                    <dd className="text-red-700 mt-1 p-2.5 bg-red-50 rounded-lg border border-red-100">{invoice.rejectionRemarks}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* OCR Extract tab */}
          {activeTab === 'ocr' && (
            <OcrTab invoice={invoice} />
          )}

          {/* Timeline tab */}
          {activeTab === 'timeline' && (
            invoice.history && invoice.history.length > 0 ? (
              <div className="card">
                <h2 className="text-base font-semibold text-gray-900 mb-4">Approval Timeline</h2>
                <div className="space-y-4">
                  {invoice.history.map((h, i) => (
                    <div key={h.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                          h.statusAfter === 'APPROVED' || h.statusAfter === 'PAID' ? 'bg-emerald-500' :
                          h.statusAfter === 'REJECTED' ? 'bg-red-500' : 'bg-blue-500'
                        }`}>{i + 1}</div>
                        {i < invoice.history.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 mt-1"/>}
                      </div>
                      <div className="pb-4 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-900">{h.actionBy?.name}</span>
                          <span className="text-xs text-gray-400">{h.createdAt ? format(new Date(h.createdAt), 'dd MMM, HH:mm') : ''}</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                          <span>{h.role}</span>
                          <span>→</span>
                          <StatusBadge status={h.statusAfter}/>
                        </div>
                        {h.remarks && <p className="text-xs text-gray-600 mt-1 italic bg-gray-50 px-2 py-1 rounded">"{h.remarks}"</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="card text-center py-8 text-gray-400 text-sm">No approval history yet.</div>
            )
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* AI Analysis */}
          <div className="card bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-100">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🤖</span>
              <h2 className="text-sm font-bold text-indigo-900">AI Analysis</h2>
            </div>
            {invoice.aiRiskScore != null ? (
              <div className="space-y-3">
                <RiskBar score={Number(invoice.aiRiskScore)}/>
                {invoice.aiAnomalyFlag && (
                  <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg text-xs text-red-700 border border-red-200">
                    <span>⚠️</span> Anomaly flag raised
                  </div>
                )}
                {invoice.aiAnalysis && (
                  <p className="text-xs text-indigo-700 leading-relaxed">{invoice.aiAnalysis}</p>
                )}
              </div>
            ) : (
              <div className="text-sm text-indigo-500 flex items-center gap-2">
                <div className="animate-spin h-4 w-4 rounded-full border-b-2 border-indigo-400"/>
                Analyzing invoice...
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="card">
            <h2 className="text-sm font-bold text-gray-900 mb-4">Actions</h2>
            <div className="space-y-2">
              {canSubmit && (
                <button onClick={handleSubmit} disabled={submitting} className="btn-primary w-full">
                  Submit for Review
                </button>
              )}
              {canApprove && (
                <>
                  <button onClick={() => setApprovalModal('APPROVE')} className="btn-success w-full flex items-center justify-center gap-2">
                    <CheckCircleIcon className="h-4 w-4"/> Approve
                  </button>
                  <button onClick={() => setApprovalModal('REJECT')} className="btn-danger w-full flex items-center justify-center gap-2">
                    <XCircleIcon className="h-4 w-4"/> Reject
                  </button>
                </>
              )}
              {canMarkPaid && (
                <button onClick={handleMarkPaid} disabled={submitting}
                  className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition font-medium flex items-center justify-center gap-2">
                  <CurrencyRupeeIcon className="h-4 w-4"/> Mark as Paid
                </button>
              )}
              {!canSubmit && !canApprove && !canMarkPaid && (
                <div className="text-center py-2">
                  <p className="text-sm text-gray-400">No actions available</p>
                  {invoice.status === 'PENDING_APPROVAL' && invoice.currentStepRole && user?.role !== invoice.currentStepRole && user?.role !== 'ADMIN' && (
                    <p className="text-xs text-amber-600 mt-1">
                      Awaiting <strong>{invoice.currentStepRole}</strong> approval
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Attachment */}
          {invoice.fileName && (
            <div className="card">
              <h2 className="text-sm font-bold text-gray-900 mb-3">Attachment</h2>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border text-sm mb-3">
                <span>📎</span>
                <span className="truncate text-gray-700 flex-1 text-xs">{invoice.fileName}</span>
              </div>
              <button onClick={handleDownload} disabled={downloading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50">
                <ArrowDownTrayIcon className="h-4 w-4"/>
                {downloading ? 'Downloading...' : 'Download File'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Approval Modal */}
      {approvalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {approvalModal === 'APPROVE' ? '✅ Approve Invoice' : '❌ Reject Invoice'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {invoice.invoiceNumber} — ₹{Number(invoice.amount).toLocaleString('en-IN')}
            </p>
            {invoice.currentStepName && (
              <p className="text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg mb-4 border border-blue-100">
                Acting as: <strong>{invoice.currentStepName}</strong>
              </p>
            )}
            <label className="label">Remarks {approvalModal === 'REJECT' ? '*' : '(optional)'}</label>
            <textarea value={remarks} onChange={e => setRemarks(e.target.value)}
              rows={3} className="input resize-none mb-4"
              placeholder={approvalModal === 'REJECT' ? 'Reason for rejection...' : 'Optional comments...'}/>
            <div className="flex gap-3">
              <button onClick={() => { setApprovalModal(null); setRemarks(''); }} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleApproval} disabled={submitting}
                className={`flex-1 ${approvalModal === 'APPROVE' ? 'btn-success' : 'btn-danger'}`}>
                {submitting ? 'Processing...' : approvalModal === 'APPROVE' ? 'Confirm Approve' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
