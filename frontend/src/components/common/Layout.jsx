import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  HomeIcon, DocumentTextIcon, PlusCircleIcon, ChartBarIcon,
  UsersIcon, Bars3Icon, XMarkIcon, ArrowRightOnRectangleIcon,
  Cog6ToothIcon, ClipboardDocumentListIcon, BanknotesIcon,
  BuildingLibraryIcon, ShieldCheckIcon, BuildingOffice2Icon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';

// All possible nav items keyed by module
const ALL_NAV_ITEMS = [
  { module: 'DASHBOARD',         to: '/',                label: 'Dashboard',       icon: HomeIcon },
  { module: 'INVOICES',          to: '/invoices',        label: 'Invoices',        icon: DocumentTextIcon },
  { module: 'CREATE_INVOICE',    to: '/invoices/new',    label: 'New Invoice',     icon: PlusCircleIcon },
  { module: 'FINANCE_HUB',       to: '/finance-hub',     label: 'Finance Hub',     icon: BanknotesIcon },
  { module: 'CFO_COMMAND',       to: '/cfo',             label: 'CFO Command',     icon: ShieldCheckIcon },
  { module: 'AUDIT_REGISTRY',    to: '/audit',           label: 'Audit Registry',  icon: ClipboardDocumentListIcon },
  { module: 'REPORTS',           to: '/reports',         label: 'Reports',         icon: ChartBarIcon },
  { module: 'USER_MANAGEMENT',   to: '/admin/users',     label: 'User Management', icon: UsersIcon },
  { module: 'WORKFLOW_CONFIG',   to: '/admin/workflows', label: 'Workflow Config',  icon: Cog6ToothIcon },
  { module: 'TENANT_MANAGEMENT', to: '/tenants',         label: 'Tenant Mgmt',     icon: BuildingOffice2Icon },
];

const ROLE_BADGE_COLORS = {
  ADMIN:       'bg-purple-500/20 text-purple-300 border-purple-500/30',
  VENDOR:      'bg-blue-500/20 text-blue-300 border-blue-500/30',
  OPERATIONS:  'bg-amber-500/20 text-amber-300 border-amber-500/30',
  FINANCE:     'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  CLIENT:      'bg-slate-500/20 text-slate-300 border-slate-500/30',
  DEPT_HEAD:   'bg-orange-500/20 text-orange-300 border-orange-500/30',
  CFO:         'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  SUPER_ADMIN: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
};

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

function TenantSwitcher({ accessibleTenants, currentTenantId, onSwitch }) {
  const [open, setOpen] = useState(false);
  if (accessibleTenants.length <= 1) return null;
  const current = accessibleTenants.find(t => t.id === currentTenantId);

  return (
    <div className="relative mt-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between text-xs px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
      >
        <span className="truncate">{current?.name ?? 'Switch Tenant'}</span>
        <ChevronDownIcon className={`h-3 w-3 flex-shrink-0 ml-1 transition-transform ${open ? 'rotate-180' : ''}`}/>
      </button>
      {open && (
        <div className="absolute left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
          {accessibleTenants.map(t => (
            <button
              key={t.id}
              onClick={() => { onSwitch(t.id); setOpen(false); }}
              className={`w-full text-left text-xs px-3 py-2 transition-colors truncate
                ${t.id === currentTenantId
                  ? 'bg-blue-600/20 text-blue-300'
                  : 'text-slate-300 hover:bg-slate-700'}`}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { user, logout, tenantName, tenantId, accessibleTenants, hasModule, switchTenant } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const handleSwitchTenant = async (tid) => {
    try {
      await switchTenant(tid);
      toast.success('Switched tenant context');
      navigate('/');
    } catch {
      toast.error('Failed to switch tenant');
    }
  };

  // Filter nav items dynamically based on user's effective module permissions
  const navItems = ALL_NAV_ITEMS.filter(item => hasModule(item.module));

  const SidebarContent = ({ mobile }) => (
    <div className="flex flex-col h-full" style={{ background: '#0f172a' }}>
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-5 py-5"
        style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 shadow-lg flex-shrink-0">
          <BuildingLibraryIcon className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-white text-base leading-tight tracking-tight">VIMS</div>
          <div className="text-xs text-slate-400 truncate">Vendor Invoice Management</div>
        </div>
        {mobile && (
          <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-white ml-1">
            <XMarkIcon className="h-5 w-5"/>
          </button>
        )}
      </div>

      {/* User identity + tenant switcher */}
      <div className="px-4 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {getInitials(user?.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white truncate">{user?.name}</div>
            <div className="text-xs text-slate-500 truncate">{user?.email}</div>
          </div>
        </div>
        <div className="mt-2.5 flex flex-col gap-1">
          <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-semibold border ${ROLE_BADGE_COLORS[user?.role] || 'bg-slate-700 text-slate-300'}`}>
            {user?.role}
          </span>
          <span className="text-xs text-slate-500 truncate">
            {user?.role === 'SUPER_ADMIN' ? 'Platform Admin' : (tenantName || '')}
          </span>
        </div>
        <TenantSwitcher
          accessibleTenants={accessibleTenants}
          currentTenantId={tenantId}
          onSwitch={handleSwitchTenant}
        />
      </div>

      {/* Navigation — fully dynamic from module permissions */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5">
        <div className="text-xs font-semibold text-slate-600 uppercase tracking-widest px-3 py-2">Menu</div>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/50'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <item.icon className="h-[18px] w-[18px] flex-shrink-0"/>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-red-900/30 hover:text-red-400 transition-all"
        >
          <ArrowRightOnRectangleIcon className="h-[18px] w-[18px] flex-shrink-0"/>
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0 w-60">
        <div className="w-full">
          <SidebarContent />
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-60 flex-shrink-0">
            <SidebarContent mobile />
          </div>
          <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}/>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-shrink-0 shadow-sm">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <Bars3Icon className="h-5 w-5"/>
          </button>
          <div className="flex-1"/>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-gray-800">{user?.name}</div>
              <div className="text-xs text-gray-400">{user?.role}</div>
            </div>
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm">
              {getInitials(user?.name)}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
