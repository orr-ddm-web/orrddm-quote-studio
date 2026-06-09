import React, { useEffect, useReducer, useState, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAppSettings } from '../App';
import {
  getPaymentSummary, createPaymentSummary, updatePaymentSummary,
  getPaymentSummaries, deletePaymentSummary,
} from '../api';
import AIAssistantPS from '../components/AIAssistantPS';

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, type = 'success', onDone }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => onDone && onDone(), 2800);
    return () => clearTimeout(t);
  }, [message, onDone]);
  if (!message) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center z-[200] pointer-events-none">
      <div className="px-7 py-4 rounded-2xl shadow-2xl font-semibold text-base flex items-center gap-3 text-white"
        style={{ background: type === 'success' ? '#16a34a' : '#dc2626', boxShadow: '0 8px 32px rgba(0,0,0,0.22)', animation: 'toastIn 0.25s ease' }}>
        {type === 'success'
          ? <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
          : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
        }
        {message}
      </div>
      <style>{`@keyframes toastIn{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}

// ── Reducer ───────────────────────────────────────────────────────────────────
function initState(vatPct) {
  return {
    client_name: '',
    date: new Date().toISOString().split('T')[0],
    items: [{ description: '', price: '' }],
    notes: '',
    vat_percent: vatPct,
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD': return { ...action.payload };
    case 'SET': return { ...state, [action.key]: action.value };
    case 'ITEM_ADD': return { ...state, items: [...state.items, { description: '', price: '' }] };
    case 'ITEM_UPD': return { ...state, items: state.items.map((it, i) => i === action.i ? { ...it, [action.k]: action.v } : it) };
    case 'ITEM_DEL': return { ...state, items: state.items.filter((_, i) => i !== action.i) };
    case 'ITEMS_APPEND': {
      // Filter out empty placeholder rows before appending
      const existing = state.items.filter(it => it.description || it.price);
      return { ...state, items: [...existing, ...action.items.map(it => ({ description: it.description || '', price: String(it.price || '') }))] };
    }
    case 'ITEMS_REPLACE': return { ...state, items: action.items.map(it => ({ description: it.description || '', price: String(it.price || '') })) };
    default: return state;
  }
}

// ── List page (no id param) ───────────────────────────────────────────────────
function SummaryList() {
  const navigate = useNavigate();
  const { settings } = useAppSettings();
  const brandColor = settings?.brand_color || '#D4642A';
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPaymentSummaries()
      .then(setSummaries)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('למחוק את המסמך?')) return;
    await deletePaymentSummary(id);
    setSummaries(s => s.filter(x => x.id !== id));
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-7 h-7 border-2 border-brand border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-surface p-6" dir="rtl">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-dark">סיכומי תשלום</h1>
            <p className="text-sm text-gray-500 mt-0.5">מסמכי חיוב לעבודות שבוצעו</p>
          </div>
          <button
            onClick={() => navigate('/payment-summaries/new')}
            className="btn-primary flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            מסמך חדש
          </button>
        </div>

        {summaries.length === 0 ? (
          <div className="card p-12 text-center">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500">אין מסמכים עדיין</p>
            <button onClick={() => navigate('/payment-summaries/new')} className="btn-primary mt-4">צור מסמך ראשון</button>
          </div>
        ) : (
          <div className="space-y-3">
            {summaries.map(s => (
              <div
                key={s.id}
                onClick={() => navigate(`/payment-summaries/${s.id}/edit`)}
                className="card p-4 flex items-center justify-between cursor-pointer hover:border-brand/30 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: brandColor + '18' }}>
                    <svg className="w-5 h-5" style={{ color: brandColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-dark truncate">{s.client_name || 'ללא שם לקוח'}</p>
                    <p className="text-xs text-gray-400">{s.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm font-bold" style={{ color: brandColor }}>
                    ₪{(s.total || 0).toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                  </span>
                  <button
                    onClick={(e) => handleDelete(s.id, e)}
                    className="p-1.5 text-gray-300 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main export — shows list or editor based on route ─────────────────────────
export default function PaymentSummary() {
  const { id } = useParams();
  const location = useLocation();
  const isNew = location.pathname.endsWith('/new');
  if (!id && !isNew) return <SummaryList />;
  return <Editor id={(!id || id === 'new') ? null : id} />;
}

function Editor({ id }) {
  const navigate = useNavigate();
  const { settings } = useAppSettings();
  const vatPct = parseFloat(settings?.vat_percent || 18);
  const currSym = settings?.currency_symbol || '₪';
  const brandColor = settings?.brand_color || '#D4642A';

  const [state, dispatch] = useReducer(reducer, null, () => initState(vatPct));
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ msg: '', type: 'success' });

  const showToast = useCallback((msg, type = 'success') => setToast({ msg, type }), []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getPaymentSummary(id)
      .then(s => dispatch({ type: 'LOAD', payload: { ...s, vat_percent: s.vat_percent ?? vatPct } }))
      .catch(() => navigate('/payment-summaries'))
      .finally(() => setLoading(false));
  }, [id]);

  // Price calculations
  const subtotal = state.items.reduce((sum, it) => sum + (parseFloat(it.price) || 0), 0);
  const vatAmount = subtotal * (state.vat_percent / 100);
  const total = subtotal + vatAmount;

  const handleSave = async () => {
    setSaving(true);
    try {
      let saved;
      if (id) {
        saved = await updatePaymentSummary(id, state);
      } else {
        saved = await createPaymentSummary(state);
        navigate(`/payment-summaries/${saved.id}/edit`, { replace: true });
      }
      showToast('נשמר בהצלחה');
      return saved;
    } catch (e) {
      showToast('שגיאה בשמירה', 'error');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    let docId = id;
    if (!docId) {
      setSaving(true);
      try {
        const saved = await createPaymentSummary(state);
        docId = saved.id;
        navigate(`/payment-summaries/${saved.id}/edit`, { replace: true });
      } catch {
        showToast('שגיאה בשמירה', 'error');
        setSaving(false);
        return;
      }
      setSaving(false);
    } else {
      await handleSave();
    }
    window.open(`/api/pdf/payment-summary/${docId}`, '_blank');
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-7 h-7 border-2 border-brand border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-surface" dir="rtl">
      <Toast message={toast.msg} type={toast.type} onDone={() => setToast({ msg: '', type: 'success' })} />

      {/* Topbar */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate('/payment-summaries')} className="btn-ghost p-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-base font-semibold text-dark truncate">
            {id ? `עריכת סיכום — ${state.client_name || 'ללא שם'}` : 'סיכום תשלום חדש'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost text-xs" onClick={handleSave} disabled={saving}>
            {saving ? 'שומר...' : 'שמור'}
          </button>
          {id && (
            <button className="btn-ghost text-xs" onClick={() => window.open(`/ps/${id}`, '_blank')}>
              תצוגה מקדימה
            </button>
          )}
          <button className="btn-primary text-xs flex items-center gap-1.5" onClick={handleDownloadPdf} disabled={saving}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            הורד PDF
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-6 space-y-4">
        {/* Client + Date */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-dark mb-4 pb-2 border-b border-gray-100">פרטי המסמך</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">שם לקוח</label>
              <input className="input" value={state.client_name}
                onChange={e => dispatch({ type: 'SET', key: 'client_name', value: e.target.value })}
                placeholder="שם הלקוח..." />
            </div>
            <div>
              <label className="label">תאריך</label>
              <input className="input" type="date" value={state.date}
                onChange={e => dispatch({ type: 'SET', key: 'date', value: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Work items */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-dark mb-4 pb-2 border-b border-gray-100">פירוט עבודות</h3>
          <table className="w-full text-sm mb-3">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-right text-xs text-gray-500 font-medium pb-2 pr-1">תיאור עבודה</th>
                <th className="text-right text-xs text-gray-500 font-medium pb-2 w-28">מחיר ({currSym})</th>
                <th className="pb-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {state.items.map((it, i) => (
                <tr key={i} className="group">
                  <td className="py-1 pl-2">
                    <input
                      className="input text-sm"
                      value={it.description}
                      onChange={e => dispatch({ type: 'ITEM_UPD', i, k: 'description', v: e.target.value })}
                      placeholder="תיאור העבודה שבוצעה..."
                    />
                  </td>
                  <td className="py-1 pl-2">
                    <input
                      className="input text-sm"
                      type="number"
                      value={it.price}
                      onChange={e => dispatch({ type: 'ITEM_UPD', i, k: 'price', v: e.target.value })}
                      placeholder="0"
                    />
                  </td>
                  <td className="py-1">
                    <button
                      onClick={() => dispatch({ type: 'ITEM_DEL', i })}
                      disabled={state.items.length <= 1}
                      className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={() => dispatch({ type: 'ITEM_ADD' })}
            className="flex items-center gap-1.5 text-xs text-brand hover:text-brand-600 font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            הוסף שורה
          </button>

          {/* Totals */}
          <div className="mt-5 bg-gray-50 rounded-xl p-4 space-y-2 text-sm max-w-xs mr-auto">
            <div className="flex justify-between text-gray-600">
              <span>לפני מע״מ</span>
              <span className="font-medium">{currSym}{subtotal.toLocaleString('he-IL', { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex justify-between text-gray-500 items-center gap-2">
              <span className="flex items-center gap-1">
                מע״מ
                <input
                  type="number" min="0" max="100"
                  className="input w-14 text-xs py-0.5 px-1.5 h-7"
                  value={state.vat_percent}
                  onChange={e => dispatch({ type: 'SET', key: 'vat_percent', value: parseFloat(e.target.value) || 0 })}
                />
                %
              </span>
              <span>{currSym}{vatAmount.toLocaleString('he-IL', { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200" style={{ color: brandColor }}>
              <span>סה״כ לתשלום</span>
              <span>{currSym}{total.toLocaleString('he-IL', { maximumFractionDigits: 0 })}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-dark mb-3 pb-2 border-b border-gray-100">הערות (אופציונלי)</h3>
          <textarea
            className="input min-h-[70px] resize-y text-sm"
            value={state.notes}
            onChange={e => dispatch({ type: 'SET', key: 'notes', value: e.target.value })}
            placeholder="הערות נוספות..."
          />
        </div>

        {/* Payment methods preview */}
        <div className="card p-5 bg-gray-50/50">
          <h3 className="text-sm font-semibold text-gray-500 mb-2">פרטי תשלום (מתוך הגדרות)</h3>
          <p className="text-xs text-gray-400">
            הפרטים יופיעו אוטומטית במסמך.
            <button className="text-brand underline mr-1" onClick={() => window.open('/settings', '_blank')}>ניהול פרטי תשלום ←</button>
          </p>
        </div>
      </div>

      {/* AI Assistant */}
      <AIAssistantPS
        currentItems={state.items}
        brandColor={brandColor}
        onAdd={(newItems) => dispatch({ type: 'ITEMS_APPEND', items: newItems })}
        onReplace={(newItems) => dispatch({ type: 'ITEMS_REPLACE', items: newItems })}
      />
    </div>
  );
}
