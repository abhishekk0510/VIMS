import api, { BASE_URL } from './api';

export const invoiceService = {
  getAll: (params) => api.get('/invoices', { params }),
  getById: (id) => api.get(`/invoices/${id}`),
  create: (formData) =>
    api.post('/invoices', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  submit: (id) => api.post(`/invoices/${id}/submit`),
  approve: (id, data) => api.post(`/invoices/${id}/approval`, data),
  pay: (id) => api.post(`/invoices/${id}/pay`),
  getDashboard: () => api.get('/invoices/dashboard'),
  getExpenseSummary: () => api.get('/invoices/expense-summary'),
  downloadUrl: (id) => `${BASE_URL}/invoices/${id}/download`,
  previewUrl: (id) => `${BASE_URL}/invoices/${id}/preview`,
};

export const reportService = {
  exportInvoices: (params) =>
    api.get('/reports/invoices/export', { params, responseType: 'blob' }),
  exportPendency: (params) =>
    api.get('/reports/pendency/export', { params, responseType: 'blob' }),
};

export const adminService = {
  getUsers: () => api.get('/admin/users'),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  unlockUser: (id) => api.post(`/admin/users/${id}/unlock`),
  getUserPermissions: (id) => api.get(`/admin/users/${id}/permissions`),
  updatePermissions: (id, data) => api.put(`/admin/users/${id}/permissions`, data),
  deletePermission: (id, moduleKey) =>
    api.delete(`/admin/users/${id}/permissions/${moduleKey}`),
  assignTenants: (id, data) => api.put(`/admin/users/${id}/tenants`, data),
};

export const workflowService = {
  getAll: () => api.get('/workflows'),
  create: (data) => api.post('/workflows', data),
  update: (id, data) => api.put(`/workflows/${id}`, data),
  activate: (id) => api.post(`/workflows/${id}/activate`),
  delete: (id) => api.delete(`/workflows/${id}`),
};

export const auditService = {
  getLogs: (params) => api.get('/audit/logs', { params }),
  exportLogs: (params) =>
    api.get('/audit/logs/export', { params, responseType: 'blob' }),
};

export const tenantService = {
  getAll: () => api.get('/tenants'),
  create: (data) => api.post('/tenants', data),
  toggle: (id) => api.put(`/tenants/${id}/toggle`),
};
