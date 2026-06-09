import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Quotes
export const getQuotes = (params) => api.get('/quotes', { params }).then(r => r.data);
export const getQuote = (id) => api.get(`/quotes/${id}`).then(r => r.data);
export const createQuote = (data) => api.post('/quotes', data).then(r => r.data);
export const updateQuote = (id, data) => api.put(`/quotes/${id}`, data).then(r => r.data);
export const deleteQuote = (id) => api.delete(`/quotes/${id}`).then(r => r.data);
export const duplicateQuote = (id) => api.post(`/quotes/${id}/duplicate`).then(r => r.data);
export const sendQuote = (id) => api.post(`/quotes/${id}/send`).then(r => r.data);
export const getNextNumber = () => api.get('/quotes/next-number').then(r => r.data);
export const getQuoteActivity = (id) => api.get(`/quotes/${id}/activity`).then(r => r.data);

// Public
export const getPublicQuote = (token) => api.get(`/quotes/public/${token}`).then(r => r.data);
export const markViewed = (token) => api.post(`/quotes/public/${token}/view`).then(r => r.data);
export const signQuote = (token, data) => api.post(`/quotes/public/${token}/sign`, data).then(r => r.data);

// Templates
export const getTemplates = () => api.get('/templates').then(r => r.data);
export const getTemplate = (id) => api.get(`/templates/${id}`).then(r => r.data);
export const createTemplate = (data) => api.post('/templates', data).then(r => r.data);
export const updateTemplate = (id, data) => api.put(`/templates/${id}`, data).then(r => r.data);
export const deleteTemplate = (id) => api.delete(`/templates/${id}`).then(r => r.data);
export const createQuoteFromTemplate = (id) => api.post(`/templates/${id}/quote`).then(r => r.data);

// Settings
export const getSettings = () => api.get('/settings').then(r => r.data);
export const updateSettings = (data) => api.put('/settings', data).then(r => r.data);
export const uploadLogo = (file) => {
  const fd = new FormData();
  fd.append('logo', file);
  return axios.post('/api/settings/logo', fd).then(r => r.data);
};

// Payment Summaries
export const getPaymentSummaries = () => api.get('/payment-summaries').then(r => r.data);
export const getPaymentSummary = (id) => api.get(`/payment-summaries/${id}`).then(r => r.data);
export const createPaymentSummary = (data) => api.post('/payment-summaries', data).then(r => r.data);
export const updatePaymentSummary = (id, data) => api.put(`/payment-summaries/${id}`, data).then(r => r.data);
export const deletePaymentSummary = (id) => api.delete(`/payment-summaries/${id}`).then(r => r.data);

// AI
export const aiGenerateQuote = (brief, current_quote) => api.post('/ai/generate-quote', { brief, current_quote }).then(r => r.data);
export const aiChat = (message, quote_context) => api.post('/ai/chat', { message, quote_context }).then(r => r.data);

export default api;
