import api from './api';

export const invoiceService = {
  create: (invoiceData, file) => {
    const form = new FormData();
    form.append('invoice', new Blob([JSON.stringify(invoiceData)], { type: 'application/json' }));
    if (file) form.append('file', file);
    return api.post('/invoices', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  submit:    id => api.post(`/invoices/${id}/submit`),
  approve:   (id, data) => api.post(`/invoices/${id}/approval`, data),
  markPaid:  (id, remarks) => api.post(`/invoices/${id}/pay`, null, { params: { remarks } }),
  list:      params => api.get('/invoices', { params }),
  getById:   id => api.get(`/invoices/${id}`),
  dashboard: () => api.get('/invoices/dashboard'),
  download:  id => api.get(`/invoices/${id}/download`, { responseType: 'blob' }),
};

export const reportService = {
  exportInvoices: status => api.get('/reports/invoices/export', {
    params: status ? { status } : {},
    responseType: 'blob',
  }),
  exportPendency: () => api.get('/reports/pendency/export', { responseType: 'blob' }),
};

export const adminService = {
  createUser:     data  => api.post('/admin/users', data),
  getAllUsers:     ()    => api.get('/admin/users'),
  getUsersByRole: role  => api.get(`/admin/users/role/${role}`),
  updateUser:     (id, data) => api.put(`/admin/users/${id}`, data),
  unlockUser:     id    => api.post(`/admin/users/${id}/unlock`),
};

export const workflowService = {
  getAll:    ()     => api.get('/workflows'),
  getActive: ()     => api.get('/workflows/active'),
  create:    data   => api.post('/workflows', data),
  update:    (id, data) => api.put(`/workflows/${id}`, data),
  activate:  id     => api.post(`/workflows/${id}/activate`),
  remove:    id     => api.delete(`/workflows/${id}`),
};

export const auditService = {
  getLogs:   (type) => api.get('/audit/logs', { params: type ? { type } : {} }),
  exportCsv: (type) => api.get('/audit/logs/export', {
    params: type ? { type } : {},
    responseType: 'blob',
  }),
};

export const financeService = {
  expenseSummary: () => api.get('/invoices/expense-summary'),
};

export const tenantService = {
  getAll:  ()   => api.get('/tenants'),
  create:  data => api.post('/tenants', data),
  toggle:  id   => api.put(`/tenants/${id}/toggle`),
};

export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(new Blob([blob]));
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  window.URL.revokeObjectURL(url);
};
