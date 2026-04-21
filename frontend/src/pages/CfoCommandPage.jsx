import React, { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import {
  ShieldExclamationIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon,
  BanknotesIcon, ClockIcon, MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

// ── Mock data ───────────────────────────────────────────────────────────────
const CASH_FLOW_DATA = [
  { day: 'Apr 1',  inflow: 420000, outflow: 310000, net: 110000 },
  { day: 'Apr 5',  inflow: 380000, outflow: 290000, net: 90000  },
  { day: 'Apr 10', inflow: 520000, outflow: 450000, net: 70000  },
  { day: 'Apr 15', inflow: 610000, outflow: 380000, net: 230000 },
  { day: 'Apr 20', inflow: 490000, outflow: 420000, net: 70000  },
  { day: 'Apr 25', inflow: 730000, outflow: 510000, net: 220000 },
  { day: 'Apr 30', inflow: 560000, outflow: 400000, net: 160000 },
  { day: 'May 5',  inflow: 680000, outflow: 530000, net: 150000 },
  { day: 'May 10', inflow: 720000, outflow: 480000, net: 240000 },
  { day: 'May 15', inflow: 850000, outflow: 620000, net: 230000 },
  { day: 'May 20', inflow: 790000, outflow: 710000, net: 80000  },
  { day: 'May 25', inflow: 920000, outflow: 640000, net: 280000 },
  { day: 'Jun 1',  inflow: 870000, outflow: 590000, net: 280000 },
];

const KPI_CARDS = [
  {
    label: 'Days Sales Outstanding',
    value: '42.3',
    unit: 'days',
    change: '+3.1',
    trend: 'up',
    color: 'amber',
    icon: ClockIcon,
    sub: 'vs 39.2 last quarter',
  },
  {
    label: 'Days Payable Outstanding',
    value: '28.7',
    unit: 'days',
    change: '-1.8',
    trend: 'down',
    color: 'emerald',
    icon: BanknotesIcon,
    sub: 'vs 30.5 last quarter',
  },
  {
    label: 'Cash Conversion Cycle',
    value: '18.4',
    unit: 'days',
    change: '-2.2',
    trend: 'down',
    color: 'blue',
    icon: ArrowTrendingDownIcon,
    sub: 'Improving trend',
  },
  {
    label: 'Working Capital Ratio',
    value: '2.14',
    unit: 'x',
    change: '+0.08',
    trend: 'up',
    color: 'purple',
    icon: ArrowTrendingUpIcon,
    sub: 'Healthy threshold > 2.0',
  },
];

const RISK_ALERTS = [
  {
    id: 1,
    severity: 'high',
    title: 'Duplicate Invoice Detected',
    detail: 'INV-2024-0421 and INV-2024-0418 share the same amount (₹84,500) from vendor Acme Supplies within 3 days.',
    time: '2 hours ago',
    icon: ShieldExclamationIcon,
  },
  {
    id: 2,
    severity: 'medium',
    title: 'DPO Drift Alert',
    detail: 'Average payment cycle has extended by 4.2 days compared to last month. 3 vendors past net-30 terms.',
    time: '6 hours ago',
    icon: ClockIcon,
  },
  {
    id: 3,
    severity: 'medium',
    title: 'Bank Account Change Request',
    detail: 'Vendor "Global Tech Pvt Ltd" submitted a bank account change. Finance verification pending.',
    time: '1 day ago',
    icon: BanknotesIcon,
  },
  {
    id: 4,
    severity: 'low',
    title: 'High-Value Approval Queue',
    detail: '4 invoices above ₹5,00,000 awaiting CFO-level sign-off. Oldest is 3 days pending.',
    time: '1 day ago',
    icon: ArrowTrendingUpIcon,
  },
];

const SEVERITY_STYLE = {
  high:   { badge: 'bg-red-100 text-red-700 border-red-200',    dot: 'bg-red-500' },
  medium: { badge: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  low:    { badge: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
};

const fmt = n => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

function KpiCard({ label, value, unit, change, trend, color, icon: Icon, sub }) {
  const positive = trend === 'up';
  const accentBg = {
    amber: 'bg-amber-50 text-amber-600', blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600', purple: 'bg-purple-50 text-purple-600',
  }[color];

  return (
    <div className={`stat-card stat-card-${color}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${accentBg}`}><Icon className="h-5 w-5"/></div>
        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
          positive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
        }`}>{change}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}<span className="text-base font-medium text-gray-400 ml-1">{unit}</span></div>
      <div className="text-xs font-semibold text-gray-500 mt-1">{label}</div>
      <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 text-white text-xs rounded-xl p-3 shadow-xl border border-slate-700">
      <div className="font-semibold mb-1.5 text-slate-300">{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }}/>
          <span className="capitalize text-slate-400">{p.dataKey}:</span>
          <span className="font-bold">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function CfoCommandPage() {
  const [query, setQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const handleAskData = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setAiLoading(true);
    // Simulate AI response with a delay
    setTimeout(() => {
      setAiResponse(
        `Based on your Q2 data: Total invoice spend is ₹48.7L with ${query.toLowerCase().includes('pending') ? '₹12.3L pending approval.' :
        query.toLowerCase().includes('vendor') ? 'top vendor Acme Supplies accounting for 23% of total payables.' :
        'average processing time of 4.2 days per invoice cycle.'} For a detailed breakdown, visit the Finance Hub or pull the full report.`
      );
      setAiLoading(false);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-gray-900">CFO Intelligence Center</h1>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-cyan-100 text-cyan-700 border border-cyan-200">BETA</span>
        </div>
        <p className="text-sm text-gray-500">Real-time financial intelligence, risk monitoring, and cash flow analytics.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_CARDS.map(k => <KpiCard key={k.label} {...k}/>)}
      </div>

      {/* Cash flow chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-bold text-gray-900">90-Day Cash Flow</h2>
            <p className="text-xs text-gray-400 mt-0.5">Rolling inflow, outflow and net position</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded bg-emerald-400 inline-block"/>Inflow</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded bg-red-400 inline-block"/>Outflow</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded bg-blue-400 inline-block"/>Net</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={CASH_FLOW_DATA} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false}/>
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} tickFormatter={v => `₹${(v/100000).toFixed(1)}L`}/>
            <Tooltip content={<CustomTooltip/>}/>
            <ReferenceLine y={0} stroke="#e2e8f0"/>
            <Area type="monotone" dataKey="inflow" stroke="#10b981" strokeWidth={2} fill="url(#inflowGrad)" dot={false}/>
            <Area type="monotone" dataKey="outflow" stroke="#ef4444" strokeWidth={2} fill="url(#outflowGrad)" dot={false}/>
            <Area type="monotone" dataKey="net" stroke="#3b82f6" strokeWidth={2.5} fill="url(#netGrad)" dot={false}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Watch feed */}
        <div className="card">
          <div className="flex items-center gap-2 mb-5">
            <ShieldExclamationIcon className="h-5 w-5 text-red-500"/>
            <h2 className="text-base font-bold text-gray-900">Risk Watch</h2>
            <span className="ml-auto text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
              {RISK_ALERTS.filter(a => a.severity === 'high').length} High
            </span>
          </div>
          <div className="space-y-3">
            {RISK_ALERTS.map(alert => {
              const sty = SEVERITY_STYLE[alert.severity];
              return (
                <div key={alert.id} className="flex gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors cursor-pointer">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className={`w-2 h-2 rounded-full mt-1.5 ${sty.dot}`}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">{alert.title}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-semibold border ${sty.badge}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{alert.detail}</p>
                    <p className="text-xs text-gray-400 mt-1.5">{alert.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ask Your Data */}
        <div className="card flex flex-col">
          <div className="flex items-center gap-2 mb-5">
            <MagnifyingGlassIcon className="h-5 w-5 text-blue-500"/>
            <h2 className="text-base font-bold text-gray-900">Ask Your Data</h2>
            <span className="ml-auto text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">AI Powered</span>
          </div>

          <div className="space-y-3 text-xs text-gray-500 mb-4">
            <p>Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {[
                'What is our pending approval spend?',
                'Show vendor concentration risk',
                'Which invoices are overdue?',
              ].map(q => (
                <button key={q} onClick={() => setQuery(q)}
                  className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 transition-colors text-xs font-medium">
                  {q}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleAskData} className="flex gap-2">
            <input
              className="input flex-1 text-sm"
              placeholder="Ask a financial question..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <button type="submit" disabled={aiLoading} className="btn-primary px-4 flex-shrink-0">
              {aiLoading ? (
                <div className="animate-spin h-4 w-4 rounded-full border-b-2 border-white"/>
              ) : 'Ask'}
            </button>
          </form>

          {aiResponse && (
            <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 text-sm text-gray-700 leading-relaxed">
              <div className="flex items-center gap-2 mb-2 text-blue-700 font-semibold text-xs">
                <span>🤖</span> AI Response
              </div>
              {aiResponse}
            </div>
          )}

          {!aiResponse && !aiLoading && (
            <div className="flex-1 flex items-center justify-center mt-6">
              <div className="text-center text-gray-300">
                <div className="text-5xl mb-3">💬</div>
                <p className="text-sm">Ask any financial question above</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
