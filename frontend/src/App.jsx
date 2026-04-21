import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import InvoiceListPage from './pages/InvoiceListPage';
import InvoiceDetailPage from './pages/InvoiceDetailPage';
import CreateInvoicePage from './pages/CreateInvoicePage';
import AdminUsersPage from './pages/AdminUsersPage';
import ReportsPage from './pages/ReportsPage';
import WorkflowConfigPage from './pages/WorkflowConfigPage';
import AuditRegistryPage from './pages/AuditRegistryPage';
import FinanceHubPage from './pages/FinanceHubPage';
import CfoCommandPage from './pages/CfoCommandPage';
import TenantsPage from './pages/TenantsPage';
import Layout from './components/common/Layout';

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-900">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"/>
        <span className="text-slate-400 text-sm">Loading...</span>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="invoices" element={<InvoiceListPage />} />
        <Route path="invoices/new" element={<PrivateRoute roles={['VENDOR','ADMIN']}><CreateInvoicePage /></PrivateRoute>} />
        <Route path="invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="reports" element={<PrivateRoute roles={['ADMIN','FINANCE','CFO','OPERATIONS']}><ReportsPage /></PrivateRoute>} />
        <Route path="admin/users" element={<PrivateRoute roles={['ADMIN','SUPER_ADMIN']}><AdminUsersPage /></PrivateRoute>} />
        <Route path="admin/workflows" element={<PrivateRoute roles={['ADMIN']}><WorkflowConfigPage /></PrivateRoute>} />
        <Route path="audit" element={<PrivateRoute roles={['ADMIN','FINANCE','CFO','OPERATIONS','DEPT_HEAD']}><AuditRegistryPage /></PrivateRoute>} />
        <Route path="finance-hub" element={<PrivateRoute roles={['ADMIN','FINANCE','CFO']}><FinanceHubPage /></PrivateRoute>} />
        <Route path="cfo" element={<PrivateRoute roles={['ADMIN','CFO']}><CfoCommandPage /></PrivateRoute>} />
        <Route path="tenants" element={<PrivateRoute roles={['SUPER_ADMIN']}><TenantsPage /></PrivateRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { borderRadius: '10px', background: '#1e293b', color: '#f1f5f9', fontSize: '14px' },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
