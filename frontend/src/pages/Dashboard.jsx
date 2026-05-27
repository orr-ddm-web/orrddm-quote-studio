import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getQuotes, deleteQuote, duplicateQuote, sendQuote } from '../api';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { useAppSettings } from '../App';

const FILTERS = [
  { key: 'all', label: 'הכל' },
  { key: 'draft', label: 'טיוטה' },
  { key: 'sent', label: 'נשלחה' },
  { key: 'pending', label: 'ממתינת אישור' },
  { key: 'approved', label: 'אושרה' },
  { key: 'cancelled', label: 'בוטלה' },
];

function StatCard({ label, value, color }) {
  return (
    <div className="card p-5">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function formatCurrency(amount, symbol = '₪') {
  if (!amount && amount !== 0) return '—';
  return `${symbol}${Number(amount).toLocaleString('he-IL', { maximumFractionDigits: 0 })}`;
}

function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('he-IL', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { settings } = useAppSettings();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [shareToken, setShareToken] = useState(null);
  const [copied, setCopied] = useState(false);

  const currencySymbol = settings?.currency_symbol || '₪';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter !== 'all') params.status = filter;
      if (search.trim()) params.search = search.trim();
      const data = await getQuotes(params);
      setQuotes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => { load(); }, [load]);

  // Stats (from all quotes)
  const [allQuotes, setAllQuotes] = useState([]);
  useEffect(() => { getQuotes({}).then(setAllQuotes).catch(() => {}); }, []);

  const stats = {
    total: allQuotes.length,
    draft: allQuotes.filter(q => q.status === 'draft').length,
    pending: allQuotes.filter(q => q.status === 'pending' || q.status === 'sent').length,
    approved: allQuotes.filter(q => q.status === 'approved').length,
    cancelled: allQuotes.filter(q => q.status === 'cancelled').length,
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteQuote(deleteTarget.id);
      setDeleteTarget(null);
      load();
      getQuotes({}).then(setAllQuotes);
    } catch (e) { console.error(e); }
  };

  const handleDuplicate = async (id) => {
    try {
      const dup = await duplicateQuote(id);
      navigate(`/quotes/${dup.id}/edit`);
    } catch (e) { console.error(e); }
  };

  const handleSend = async (id) => {
    try {
      await sendQuote(id);
      load();
    } catch (e) { console.error(e); }
  };

  const handleShare = (token) => {
    setShareToken(token);
    setCopied(false);
  };

  const copyLink = () => {
    const url = `${window.location.origin}/p/${shareToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark">לוח בקרה</h1>
          <p className="text-sm text-gray-500 mt-0.5">ניהול הצעות מחיר</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/quotes/new')}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          הצעה חדשה
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="סה״כ הצעות" value={stats.total} color="text-dark" />
        <StatCard label="טיוטות" value={stats.draft} color="text-yellow-600" />
        <StatCard label="ממתינות" value={stats.pending} color="text-blue-600" />
        <StatCard label="אושרו" value={stats.approved} color="text-green-600" />
        <StatCard label="בוטלו" value={stats.cancelled} color="text-red-500" />
      </div>

      {/* Table card */}
      <div className="card overflow-hidden">
        {/* Filters + Search */}
        <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-gray-100">
          <div className="flex gap-1 overflow-x-auto pb-1 flex-1">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  filter === f.key
                    ? 'bg-brand text-white'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <svg className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="חיפוש לפי לקוח או מספר..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pr-9 w-full sm:w-64 text-sm"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : quotes.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">אין הצעות מחיר</p>
            <button className="btn-primary mt-3" onClick={() => navigate('/quotes/new')}>צור הצעה חדשה</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {['מספר הצעה', 'לקוח', 'פרויקט', 'סכום', 'סטטוס', 'תאריך', 'פעולות'].map(h => (
                    <th key={h} className="text-right text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {quotes.map(q => (
                  <tr key={q.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 whitespace-nowrap">{q.number}</td>
                    <td className="px-4 py-3 font-medium text-dark whitespace-nowrap">{q.client_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">{q.project_title || '—'}</td>
                    <td className="px-4 py-3 font-medium text-dark whitespace-nowrap">
                      {formatCurrency(q.total, currencySymbol)}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={q.status} /></td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(q.date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          title="צפייה"
                          onClick={() => window.open(`/p/${q.token}`, '_blank')}
                          className="btn-ghost p-1.5"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          title="עריכה"
                          onClick={() => navigate(`/quotes/${q.id}/edit`)}
                          className="btn-ghost p-1.5"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          title="שיתוף"
                          onClick={() => handleShare(q.token)}
                          className="btn-ghost p-1.5"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                          </svg>
                        </button>
                        <button
                          title="שלח"
                          onClick={() => handleSend(q.id)}
                          className="btn-ghost p-1.5"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        </button>
                        <button
                          title="שכפול"
                          onClick={() => handleDuplicate(q.id)}
                          className="btn-ghost p-1.5"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <button
                          title="מחיקה"
                          onClick={() => setDeleteTarget(q)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirm modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="מחיקת הצעה" size="sm">
        <p className="text-sm text-gray-600 mb-4">
          האם למחוק את הצעה <strong>{deleteTarget?.number}</strong> ל-<strong>{deleteTarget?.client_name}</strong>? פעולה זו בלתי הפיכה.
        </p>
        <div className="flex gap-2 justify-end">
          <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>ביטול</button>
          <button className="btn-danger" onClick={handleDelete}>מחיקה</button>
        </div>
      </Modal>

      {/* Share modal */}
      <Modal open={!!shareToken} onClose={() => setShareToken(null)} title="שיתוף הצעה" size="sm">
        <p className="text-sm text-gray-600 mb-3">העתק את הקישור הבא ושלח ללקוח:</p>
        <div className="flex gap-2">
          <input
            readOnly
            value={shareToken ? `${window.location.origin}/p/${shareToken}` : ''}
            className="input text-xs flex-1 font-mono"
          />
          <button className="btn-primary whitespace-nowrap" onClick={copyLink}>
            {copied ? '✓ הועתק' : 'העתק'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
