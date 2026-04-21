import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  HomeIcon, DocumentTextIcon, PlusCircleIcon, ChartBarIcon,
  UsersIcon, Bars3Icon, XMarkIcon, ArrowRightOnRectangleIcon,
  Cog6ToothIcon, ClipboardDocumentListIcon, BanknotesIcon,
  BuildingLibraryIcon, ShieldCheckIcon, BuildingOffice2Icon
} from '@heroicons/react/24/outline';

// Role-specific nav definitions
const NAV_BY_ROLE = {
  VENDOR: [
    { to: '/', label: 'Dashboard', icon: HomeIcon },
    { to: '/invoices', label: 'My Invoices', icon: DocumentTextIcon },
    { to: '/invoices/new', label: 'New Invoice', icon: PlusCircleIcon },
  ],
  OPERATIONS: [
    { to: '/', label: 'Dashboard', icon: HomeIcon },
    { to: '/invoices', label: 'Invoices', icon: DocumentTextIcon },
    { to: '/audit', label: 'Audit Registry', icon: ClipboardDocumentListIcon },
  ],
  DEPT_HEAD: [
    { to: '/', label: 'Dashboard', icon: HomeIcon },
    { to: '/invoices', label: 'Invoices', icon: DocumentTextIcon },
    { to: '/audit', label: 'Audit Registry', icon: ClipboardDocumentListIcon },
  ],
  FINANCE: [
    { to: '/', label: 'Dashboard', icon: HomeIcon },
    { to: '/finance-hub', label: 'Finance Hub', icon: BanknotesIcon },
    { to: '/invoices', label: 'Invoices', icon: DocumentTextIcon },
    { to: '/audit', label: 'Audit Registry', icon: ClipboardDocumentListIcon },
    { to: '/reports', label: 'Reports', icon: ChartBarIcon },
  ],
  CFO: [
    { to: '/', label: 'Dashboard', icon: HomeIcon },
    { to: '/cfo', label: 'CFO Command', icon: ShieldCheckIcon },
    { to: '/finance-hub', label: 'Finance Hub', icon: BanknotesIcon },
    { to: '/invoices', label: 'Invoices', icon: DocumentTextIcon },
    { to: '/audit', label: 'Audit Registry', icon: ClipboardDocumentListIcon },
    { to: '/reports', label: 'Reports', icon: ChartBarIcon },
  ],
  CLIENT: [
    { to: '/', label: 'Dashboard', icon: HomeIcon },
    { to: '/invoices', label: 'Invoices', icon: DocumentTextIcon },
  ],
  ADMIN: [
    { to: '/', label: 'Dashboard', icon: HomeIcon },
    { to: '/invoices', label: 'Invoices', icon: DocumentTextIcon },
    { to: '/invoices/new', label: 'New Invoice', icon: PlusCircleIcon },
    { to: '/finance-hub', label: 'Finance Hub', icon: BanknotesIcon },
    { to: '/audit', label: 'Audit Registry', icon: ClipboardDocumentListIcon },
    { to: '/reports', label: 'Reports', icon: ChartBarIcon },
    { to: '/admin/users', label: 'User Management', icon: UsersIcon },
    { to: '/admin/workflows', label: 'Workflow Config', icon: Cog6ToothIcon },
  ],
  SUPER_ADMIN: [
    { to: '/', label: 'Dashboard', icon: HomeIcon },
    { to: '/tenants', label: 'Tenant Management', icon: BuildingOffice2Icon },
    { to: '/admin/users', label: 'User Management', icon: UsersIcon },
  ],
};

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

export default function Layout() {
  const { user, logout, tenantName } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const navItems = NAV_BY_ROLE[user?.role] || NAV_BY_ROLE.CLIENT;

  const SidebarContent = ({ mobile }) => (
    <div className="flex flex-col h-full" style={{ background: '#0f172a' }}>
      {/* Logo area */}
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

      {/* User identity block */}
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
      </div>

      {/* Navigation */}
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
            <item.icon className="h-4.5 w-4.5 flex-shrink-0 h-[18px] w-[18px]"/>
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

          {/* Top-right user avatar */}
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
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
