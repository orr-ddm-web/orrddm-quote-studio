import React, { useEffect, useReducer, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createQuote, updateQuote, getQuote, getNextNumber, createTemplate, getTemplate, updateTemplate } from '../api';
import { useAppSettings } from '../App';
import Modal from '../components/Modal';
import AIAssistant from '../components/AIAssistant';

// ── Toast Component ────────────────────────────────────────────────────────────
function Toast({ message, type = 'success', onDone }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => onDone && onDone(), 2800);
    return () => clearTimeout(t);
  }, [message, onDone]);
  if (!message) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center z-[200] pointer-events-none">
      <div
        className="px-7 py-4 rounded-2xl shadow-2xl font-semibold text-base flex items-center gap-3 text-white"
        style={{
          background: type === 'success' ? '#16a34a' : '#dc2626',
          boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
          animation: 'toastIn 0.25s cubic-bezier(.4,0,.2,1)',
        }}
      >
        {type === 'success' ? (
          <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
        {message}
      </div>
      <style>{`@keyframes toastIn{from{opacity:0;transform:scale(.85) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
    </div>
  );
}

// ── Reducer ──────────────────────────────────────────────────────────────────

const HEBREW_LETTERS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח'];

function initQuote(settings) {
  let defPayment = [], defWarranty = [], defServices = [], defTimeline = [];
  try { defPayment = JSON.parse(settings?.default_payment_terms || '[]'); } catch {}
  try { defWarranty = JSON.parse(settings?.default_warranty || '[]'); } catch {}
  try { defServices = JSON.parse(settings?.default_services || '[]'); } catch {}
  try { defTimeline = JSON.parse(settings?.default_timeline || '[]'); } catch {}
  return {
    number: '',
    client_name: '',
    project_title: '',
    date: new Date().toISOString().split('T')[0],
    status: 'draft',
    summary_text: '',
    services: defServices,
    package_name: '',
    phases: [],
    pricing_options: [],
    discount_percent: null,
    third_party_costs: [],
    timeline: defTimeline,
    payment_terms: defPayment,
    warranty: defWarranty,
    sections: {
      summary: { visible: true, title: '01 | תקציר הפרויקט' },
      pricing: { visible: true, title: '02 | מחירון ופירוט שירותים' },
      third_party: { visible: true, title: '03 | עלויות צד שלישי' },
      terms: { visible: true, title: '04 | תנאים ולוח זמנים' },
    },
    custom_sections: [],
    show_signature: true,
    signature_label: 'חתימה ואישור',
    closing_text: `בברכה,\n${settings?.owner_name || 'אור פישביין'}\n${settings?.business_name || 'OrrDDM'}`,
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD': return { ...action.payload };
    case 'SET': return { ...state, [action.key]: action.value };
    case 'SECTION_TITLE': return { ...state, sections: { ...state.sections, [action.sec]: { ...state.sections[action.sec], title: action.title } } };
    case 'SECTION_TOGGLE': return { ...state, sections: { ...state.sections, [action.sec]: { ...state.sections[action.sec], visible: !state.sections[action.sec].visible } } };
    case 'SERVICE_ADD': return { ...state, services: [...state.services, ''] };
    case 'SERVICE_UPD': return { ...state, services: state.services.map((s, i) => i === action.i ? action.v : s) };
    case 'SERVICE_DEL': return { ...state, services: state.services.filter((_, i) => i !== action.i) };
    case 'SERVICE_MOVE': {
      const arr = [...state.services];
      const [el] = arr.splice(action.from, 1); arr.splice(action.to, 0, el);
      return { ...state, services: arr };
    }
    case 'PHASE_ADD': return { ...state, phases: [...state.phases, { name: '', price: '', description: '' }] };
    case 'PHASE_UPD': return { ...state, phases: state.phases.map((p, i) => i === action.i ? { ...p, [action.k]: action.v } : p) };
    case 'PHASE_DEL': return { ...state, phases: state.phases.filter((_, i) => i !== action.i) };
    case 'PHASE_MOVE': {
      const arr = [...state.phases];
      const [el] = arr.splice(action.from, 1); arr.splice(action.to, 0, el);
      return { ...state, phases: arr };
    }
    // ── Pricing Options ──
    case 'OPTION_INIT': {
      // Convert existing phases to Option A, add empty Option B
      const opts = [
        { id: Date.now(), name: `אופציה א׳`, phases: [...(state.phases || [])], discount_percent: state.discount_percent },
        { id: Date.now() + 1, name: `אופציה ב׳`, phases: [], discount_percent: null },
      ];
      return { ...state, pricing_options: opts };
    }
    case 'OPTION_ADD': {
      const nextLetter = HEBREW_LETTERS[state.pricing_options.length] || String(state.pricing_options.length + 1);
      const newOpt = { id: Date.now(), name: `אופציה ${nextLetter}׳`, phases: [], discount_percent: null };
      return { ...state, pricing_options: [...state.pricing_options, newOpt] };
    }
    case 'OPTION_DEL': {
      if (state.pricing_options.length <= 1) return state; // keep at least one
      return { ...state, pricing_options: state.pricing_options.filter((_, i) => i !== action.i) };
    }
    case 'OPTION_CLEAR':
      return { ...state, pricing_options: [] };
    case 'OPTION_RENAME':
      return { ...state, pricing_options: state.pricing_options.map((o, i) => i === action.i ? { ...o, name: action.name } : o) };
    case 'OPTION_DISCOUNT':
      return { ...state, pricing_options: state.pricing_options.map((o, i) => i === action.i ? { ...o, discount_percent: action.v } : o) };
    case 'OPTION_PHASE_ADD':
      return { ...state, pricing_options: state.pricing_options.map((o, i) => i === action.oi ? { ...o, phases: [...o.phases, { name: '', price: '', description: '' }] } : o) };
    case 'OPTION_PHASE_UPD':
      return { ...state, pricing_options: state.pricing_options.map((o, i) => i === action.oi ? { ...o, phases: o.phases.map((p, pi) => pi === action.pi ? { ...p, [action.k]: action.v } : p) } : o) };
    case 'OPTION_PHASE_DEL':
      return { ...state, pricing_options: state.pricing_options.map((o, i) => i === action.oi ? { ...o, phases: o.phases.filter((_, pi) => pi !== action.pi) } : o) };
    // ──
    case 'TPC_ADD': return { ...state, third_party_costs: [...state.third_party_costs, { service: '', cost: '' }] };
    case 'TPC_UPD': return { ...state, third_party_costs: state.third_party_costs.map((t, i) => i === action.i ? { ...t, [action.k]: action.v } : t) };
    case 'TPC_DEL': return { ...state, third_party_costs: state.third_party_costs.filter((_, i) => i !== action.i) };
    case 'TL_ADD': return { ...state, timeline: [...state.timeline, { stage: '', description: '' }] };
    case 'TL_UPD': return { ...state, timeline: state.timeline.map((t, i) => i === action.i ? { ...t, [action.k]: action.v } : t) };
    case 'TL_DEL': return { ...state, timeline: state.timeline.filter((_, i) => i !== action.i) };
    case 'TL_MOVE': {
      const arr = [...state.timeline];
      const [el] = arr.splice(action.from, 1); arr.splice(action.to, 0, el);
      return { ...state, timeline: arr };
    }
    case 'PT_ADD': return { ...state, payment_terms: [...state.payment_terms, ''] };
    case 'PT_UPD': return { ...state, payment_terms: state.payment_terms.map((t, i) => i === action.i ? action.v : t) };
    case 'PT_DEL': return { ...state, payment_terms: state.payment_terms.filter((_, i) => i !== action.i) };
    case 'PT_MOVE': {
      const arr = [...state.payment_terms];
      const [el] = arr.splice(action.from, 1); arr.splice(action.to, 0, el);
      return { ...state, payment_terms: arr };
    }
    case 'WR_ADD': return { ...state, warranty: [...state.warranty, ''] };
    case 'WR_UPD': return { ...state, warranty: state.warranty.map((t, i) => i === action.i ? action.v : t) };
    case 'WR_DEL': return { ...state, warranty: state.warranty.filter((_, i) => i !== action.i) };
    case 'WR_MOVE': {
      const arr = [...state.warranty];
      const [el] = arr.splice(action.from, 1); arr.splice(action.to, 0, el);
      return { ...state, warranty: arr };
    }
    case 'CS_ADD': return { ...state, custom_sections: [...state.custom_sections, { id: Date.now(), title: 'סעיף חדש', content: '', visible: true }] };
    case 'CS_UPD': return { ...state, custom_sections: state.custom_sections.map((s, i) => i === action.i ? { ...s, [action.k]: action.v } : s) };
    case 'CS_DEL': return { ...state, custom_sections: state.custom_sections.filter((_, i) => i !== action.i) };
    default: return state;
  }
}

// ── Price Calculation ─────────────────────────────────────────────────────────

function calcPrices(phases, discountPct, vatPct) {
  const subtotal = phases.reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0);
  const discount = discountPct ? subtotal * (discountPct / 100) : 0;
  const afterDiscount = subtotal - discount;
  const vat = afterDiscount * (vatPct / 100);
  const total = afterDiscount + vat;
  return { subtotal, discount, afterDiscount, vat, total };
}

// ── Reusable sub-components ───────────────────────────────────────────────────

function SectionCard({ title, visible, sectionKey, onToggle, onRenameTitle, children }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  return (
    <div className={`card mb-4 overflow-hidden transition-opacity ${visible ? '' : 'opacity-60'}`}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/50">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={() => { onRenameTitle(draft); setEditing(false); }}
            onKeyDown={e => { if (e.key === 'Enter') { onRenameTitle(draft); setEditing(false); } }}
            className="text-sm font-semibold text-dark bg-transparent border-b border-brand outline-none flex-1 ml-2"
          />
        ) : (
          <h3
            className="text-sm font-semibold text-dark cursor-text hover:text-brand transition-colors"
            onClick={() => { setDraft(title); setEditing(true); }}
            title="לחץ לעריכת כותרת"
          >
            {title}
          </h3>
        )}
        <button
          onClick={onToggle}
          title={visible ? 'הסתר סעיף' : 'הצג סעיף'}
          className={`p-1.5 rounded-lg transition-colors ${visible ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-200' : 'text-brand bg-brand/10'}`}
        >
          {visible ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
          )}
        </button>
      </div>
      {visible && <div className="p-5">{children}</div>}
    </div>
  );
}

function DynList({ items, onAdd, onUpdate, onDelete, onMove, placeholder = 'הוסף פריט...' }) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2 group">
          <span className="mt-2.5 text-brand text-xs select-none">◈</span>
          <input
            className="input flex-1 text-sm"
            value={item}
            onChange={e => onUpdate(i, e.target.value)}
            placeholder={placeholder}
          />
          <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {i > 0 && (
              <button onClick={() => onMove(i, i - 1)} className="p-0.5 text-gray-400 hover:text-gray-600">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
              </button>
            )}
            {i < items.length - 1 && (
              <button onClick={() => onMove(i, i + 1)} className="p-0.5 text-gray-400 hover:text-gray-600">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
            )}
          </div>
          <button onClick={() => onDelete(i)} className="mt-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      ))}
      <button onClick={onAdd} className="flex items-center gap-1.5 text-xs text-brand hover:text-brand-600 font-medium mt-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        הוסף שורה
      </button>
    </div>
  );
}

// ── Pricing Option Card ───────────────────────────────────────────────────────
function OptionCard({ option, oi, currencySymbol, vatPct, dispatch, canDelete }) {
  const prices = calcPrices(option.phases || [], option.discount_percent, vatPct);
  const [showDiscount, setShowDiscount] = useState(!!option.discount_percent);
  const [editName, setEditName] = useState(false);
  const [draftName, setDraftName] = useState(option.name);

  return (
    <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 mb-3 hover:border-brand/40 transition-colors">
      {/* Option header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-brand flex-shrink-0" />
          {editName ? (
            <input
              autoFocus
              className="text-sm font-bold text-brand bg-transparent border-b border-brand outline-none"
              value={draftName}
              onChange={e => setDraftName(e.target.value)}
              onBlur={() => { dispatch({ type: 'OPTION_RENAME', i: oi, name: draftName }); setEditName(false); }}
              onKeyDown={e => { if (e.key === 'Enter') { dispatch({ type: 'OPTION_RENAME', i: oi, name: draftName }); setEditName(false); } }}
            />
          ) : (
            <span
              className="text-sm font-bold text-brand cursor-text hover:underline"
              onClick={() => { setDraftName(option.name); setEditName(true); }}
            >
              {option.name}
            </span>
          )}
          <span className="text-xs text-gray-400">(לחץ לשינוי שם)</span>
        </div>
        {canDelete && (
          <button
            onClick={() => dispatch({ type: 'OPTION_DEL', i: oi })}
            className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            הסר
          </button>
        )}
      </div>

      {/* Phases table */}
      <div className="overflow-x-auto mb-3">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-right text-xs text-gray-500 font-medium pb-1.5 pr-1">שלב / שירות</th>
              <th className="text-right text-xs text-gray-500 font-medium pb-1.5 w-28">מחיר ({currencySymbol})</th>
              <th className="text-right text-xs text-gray-500 font-medium pb-1.5">תיאור</th>
              <th className="pb-1.5 w-8" />
            </tr>
          </thead>
          <tbody>
            {(option.phases || []).map((p, pi) => (
              <tr key={pi} className="group">
                <td className="py-1 pl-2">
                  <input className="input text-sm" value={p.name} onChange={e => dispatch({ type: 'OPTION_PHASE_UPD', oi, pi, k: 'name', v: e.target.value })} placeholder="שם השלב..." />
                </td>
                <td className="py-1 pl-2 w-28">
                  <input className="input text-sm" type="number" value={p.price} onChange={e => dispatch({ type: 'OPTION_PHASE_UPD', oi, pi, k: 'price', v: e.target.value })} placeholder="0" />
                </td>
                <td className="py-1 pl-2">
                  <input className="input text-sm" value={p.description} onChange={e => dispatch({ type: 'OPTION_PHASE_UPD', oi, pi, k: 'description', v: e.target.value })} placeholder="תיאור..." />
                </td>
                <td className="py-1">
                  <button onClick={() => dispatch({ type: 'OPTION_PHASE_DEL', oi, pi })} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={() => dispatch({ type: 'OPTION_PHASE_ADD', oi })} className="flex items-center gap-1.5 text-xs text-brand hover:text-brand-600 font-medium mt-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          הוסף שלב
        </button>
      </div>

      {/* Discount toggle */}
      <div className="flex items-center gap-2 mb-2">
        <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-500">
          <input
            type="checkbox"
            checked={showDiscount}
            onChange={e => { setShowDiscount(e.target.checked); if (!e.target.checked) dispatch({ type: 'OPTION_DISCOUNT', i: oi, v: null }); }}
            className="rounded border-gray-300 text-brand focus:ring-brand/30"
          />
          הנחה לאופציה זו
        </label>
        {showDiscount && (
          <div className="flex items-center gap-1">
            <input
              type="number" min="0" max="100"
              className="input w-16 text-xs"
              value={option.discount_percent || ''}
              onChange={e => dispatch({ type: 'OPTION_DISCOUNT', i: oi, v: e.target.value ? parseFloat(e.target.value) : null })}
              placeholder="10"
            />
            <span className="text-xs text-gray-500">%</span>
          </div>
        )}
      </div>

      {/* Price summary */}
      <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs space-y-1">
        {showDiscount && option.discount_percent && (
          <div className="flex justify-between text-gray-500">
            <span>הנחה ({option.discount_percent}%)</span>
            <span className="text-red-500">−{currencySymbol}{prices.discount.toLocaleString('he-IL')}</span>
          </div>
        )}
        <div className="flex justify-between text-gray-600">
          <span>לפני מע״מ</span>
          <span className="font-medium">{currencySymbol}{prices.afterDiscount.toLocaleString('he-IL')}</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>מע״מ {vatPct}%</span>
          <span>{currencySymbol}{prices.vat.toLocaleString('he-IL')}</span>
        </div>
        <div className="flex justify-between font-bold text-brand text-sm pt-1 border-t border-gray-200">
          <span>סה״כ כולל מע״מ</span>
          <span>{currencySymbol}{prices.total.toLocaleString('he-IL')}</span>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function QuoteBuilder() {
  const { id, templateId } = useParams();
  const isTemplateMode = !!templateId;
  const navigate = useNavigate();
  const { settings } = useAppSettings();
  const vatPct = parseFloat(settings?.vat_percent || 18);
  const currencySymbol = settings?.currency_symbol || '₪';

  const [state, dispatch] = useReducer(reducer, null, () => initQuote(settings));
  const [loading, setLoading] = useState(!!(id || templateId));
  const [saving, setSaving] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ msg: '', type: 'success' });
  const [showDiscountRow, setShowDiscountRow] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sendToken, setSendToken] = useState('');
  const [copied, setCopied] = useState(false);

  const set = useCallback((key, value) => dispatch({ type: 'SET', key, value }), []);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
  }, []);

  // Load existing quote or template
  useEffect(() => {
    if (templateId) {
      setLoading(true);
      getTemplate(templateId)
        .then(q => {
          dispatch({ type: 'LOAD', payload: q });
          setShowDiscountRow(!!q.discount_percent);
        })
        .catch(() => setError('שגיאה בטעינת התבנית'))
        .finally(() => setLoading(false));
      return;
    }
    if (!id) {
      getNextNumber().then(({ number }) => set('number', number)).catch(() => {});
      return;
    }
    setLoading(true);
    getQuote(id)
      .then(q => {
        dispatch({ type: 'LOAD', payload: q });
        setShowDiscountRow(!!q.discount_percent);
      })
      .catch(() => setError('שגיאה בטעינת ההצעה'))
      .finally(() => setLoading(false));
  }, [id, templateId]);

  const prices = calcPrices(state.phases, state.discount_percent, vatPct);

  const handleSave = async (status = null) => {
    setSaving(true);
    setError('');
    try {
      const payload = { ...state };
      if (status) payload.status = status;
      let saved;
      if (isTemplateMode) {
        // Save as template
        saved = await updateTemplate(templateId, payload);
        showToast('תבנית נשמרה בהצלחה');
      } else if (id) {
        saved = await updateQuote(id, payload);
        showToast('הצעה נשמרה בהצלחה');
      } else {
        saved = await createQuote(payload);
        showToast('הצעה נשמרה בהצלחה');
      }
      if (!id && !isTemplateMode) navigate(`/quotes/${saved.id}/edit`);
      return saved;
    } catch (e) {
      const msg = 'שגיאה בשמירה: ' + (e.response?.data?.error || e.message);
      setError(msg);
      showToast(msg, 'error');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndSend = async () => {
    const saved = await handleSave('sent');
    if (saved && !isTemplateMode) {
      const token = saved.token || state.token;
      setSendToken(token);
      setSendModalOpen(true);
    }
  };

  const sendLink = sendToken ? `${window.location.origin}/p/${sendToken}` : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(sendLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Apply AI-generated content (full or partial)
  const handleAIApply = useCallback((generated, mode) => {
    const jsonFields = ['services', 'phases', 'pricing_options', 'third_party_costs', 'timeline', 'payment_terms', 'warranty', 'sections', 'custom_sections'];
    const scalarFields = ['client_name', 'project_title', 'package_name', 'summary_text', 'discount_percent', 'closing_text'];

    if (mode === 'full') {
      [...scalarFields, ...jsonFields].forEach(key => {
        if (generated[key] !== undefined) {
          dispatch({ type: 'SET', key, value: generated[key] });
        }
      });
    } else {
      Object.entries(generated).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          dispatch({ type: 'SET', key, value });
        }
      });
    }
  }, []);

  const handleSaveTemplate = async () => {
    try {
      await createTemplate({ ...state, template_name: templateName, template_description: templateDesc, quote_id: id || undefined });
      setSaveTemplateOpen(false);
      showToast('תבנית נשמרה בהצלחה');
    } catch (e) {
      setError('שגיאה בשמירת תבנית');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-7 h-7 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasOptions = (state.pricing_options || []).length > 0;

  return (
    <div className="min-h-screen bg-surface">
      {/* Center Toast */}
      <Toast message={toast.msg} type={toast.type} onDone={() => setToast({ msg: '', type: 'success' })} />

      {/* Topbar */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate('/')} className="btn-ghost p-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-dark truncate">
              {isTemplateMode
                ? `עריכת תבנית — ${state.template_name || 'ללא שם'}`
                : id ? `עריכת הצעה — ${state.number}` : 'הצעה חדשה'}
            </h1>
            {isTemplateMode && <span className="text-xs text-brand font-medium bg-brand/10 px-2 py-0.5 rounded-md">מצב תבנית</span>}
            {!isTemplateMode && state.client_name && <p className="text-xs text-gray-500 truncate">{state.client_name}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
          <button className="btn-ghost text-xs" onClick={() => setSaveTemplateOpen(true)}>שמור כתבנית</button>
          {id && (
            <button className="btn-ghost text-xs" onClick={() => window.open(`/p/${state.token}`, '_blank')}>
              תצוגה מקדימה
            </button>
          )}
          {isTemplateMode ? (
            <button className="btn-primary text-xs" onClick={() => handleSave()} disabled={saving}>
              {saving ? 'שומר...' : 'שמור תבנית'}
            </button>
          ) : (
            <>
              <button className="btn-secondary text-xs" onClick={() => handleSave()} disabled={saving}>שמור טיוטה</button>
              <button className="btn-primary text-xs" onClick={handleSaveAndSend} disabled={saving}>
                {saving ? 'שומר...' : 'שמור ושלח'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-4">

        {/* Header Section */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-dark mb-4 pb-2 border-b border-gray-100">פרטי ההצעה</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">מספר הצעה</label>
              <input className="input" value={state.number} onChange={e => set('number', e.target.value)} placeholder="QT-2026-001" />
            </div>
            <div>
              <label className="label">תאריך</label>
              <input className="input" type="date" value={state.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div>
              <label className="label">שם לקוח</label>
              <input className="input" value={state.client_name} onChange={e => set('client_name', e.target.value)} placeholder="שם הלקוח..." />
            </div>
            <div>
              <label className="label">כותרת הפרויקט</label>
              <input className="input" value={state.project_title} onChange={e => set('project_title', e.target.value)} placeholder="שם / תיאור הפרויקט..." />
            </div>
            <div>
              <label className="label">סטטוס</label>
              <select className="input" value={state.status} onChange={e => set('status', e.target.value)}>
                <option value="draft">טיוטה</option>
                <option value="sent">נשלחה</option>
                <option value="pending">ממתינת אישור</option>
                <option value="approved">אושרה</option>
                <option value="cancelled">בוטלה</option>
              </select>
            </div>
            <div>
              <label className="label">שם חבילה / פאקג׳</label>
              <input className="input" value={state.package_name} onChange={e => set('package_name', e.target.value)} placeholder="חבילת פרמיום דיגיטל..." />
            </div>
          </div>
        </div>

        {/* Section 01 — Summary */}
        <SectionCard
          title={state.sections.summary.title}
          visible={state.sections.summary.visible}
          sectionKey="summary"
          onToggle={() => dispatch({ type: 'SECTION_TOGGLE', sec: 'summary' })}
          onRenameTitle={(t) => dispatch({ type: 'SECTION_TITLE', sec: 'summary', title: t })}
        >
          <div className="mb-4">
            <label className="label">תקציר הפרויקט</label>
            <textarea
              className="input min-h-[90px] resize-y"
              value={state.summary_text}
              onChange={e => set('summary_text', e.target.value)}
              placeholder="תיאור קצר של הפרויקט, הצרכים של הלקוח והפתרון המוצע..."
            />
          </div>
          <div>
            <label className="label mb-2">שירותים כלולים</label>
            <DynList
              items={state.services}
              placeholder="שירות נוסף..."
              onAdd={() => dispatch({ type: 'SERVICE_ADD' })}
              onUpdate={(i, v) => dispatch({ type: 'SERVICE_UPD', i, v })}
              onDelete={(i) => dispatch({ type: 'SERVICE_DEL', i })}
              onMove={(from, to) => dispatch({ type: 'SERVICE_MOVE', from, to })}
            />
          </div>
        </SectionCard>

        {/* Section 02 — Pricing */}
        <SectionCard
          title={state.sections.pricing.title}
          visible={state.sections.pricing.visible}
          sectionKey="pricing"
          onToggle={() => dispatch({ type: 'SECTION_TOGGLE', sec: 'pricing' })}
          onRenameTitle={(t) => dispatch({ type: 'SECTION_TITLE', sec: 'pricing', title: t })}
        >
          {/* ── Multi-option mode ── */}
          {hasOptions ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-brand bg-brand/10 px-2.5 py-1 rounded-lg">מצב אופציות תמחור</span>
                  <span className="text-xs text-gray-400">{state.pricing_options.length} אופציות</span>
                </div>
                <button
                  onClick={() => dispatch({ type: 'OPTION_CLEAR' })}
                  className="text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  חזור לתמחור בודד
                </button>
              </div>

              {state.pricing_options.map((option, oi) => (
                <OptionCard
                  key={option.id || oi}
                  option={option}
                  oi={oi}
                  currencySymbol={currencySymbol}
                  vatPct={vatPct}
                  dispatch={dispatch}
                  canDelete={state.pricing_options.length > 1}
                />
              ))}

              <button
                onClick={() => dispatch({ type: 'OPTION_ADD' })}
                className="w-full py-2.5 border-2 border-dashed border-brand/30 rounded-xl text-sm text-brand hover:border-brand hover:bg-brand/5 transition-colors font-medium"
              >
                + הוסף אופציה נוספת
              </button>
            </div>
          ) : (
            /* ── Single pricing mode ── */
            <div>
              {/* Phases table */}
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-right text-xs text-gray-500 font-medium pb-2 pr-1">שלב / שירות</th>
                      <th className="text-right text-xs text-gray-500 font-medium pb-2 w-32">מחיר ({currencySymbol})</th>
                      <th className="text-right text-xs text-gray-500 font-medium pb-2">תיאור</th>
                      <th className="pb-2 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {state.phases.map((p, i) => (
                      <tr key={i} className="group">
                        <td className="py-1.5 pl-2">
                          <input className="input text-sm" value={p.name} onChange={e => dispatch({ type: 'PHASE_UPD', i, k: 'name', v: e.target.value })} placeholder="שם השלב..." />
                        </td>
                        <td className="py-1.5 pl-2 w-32">
                          <input className="input text-sm" type="number" value={p.price} onChange={e => dispatch({ type: 'PHASE_UPD', i, k: 'price', v: e.target.value })} placeholder="0" />
                        </td>
                        <td className="py-1.5 pl-2">
                          <input className="input text-sm" value={p.description} onChange={e => dispatch({ type: 'PHASE_UPD', i, k: 'description', v: e.target.value })} placeholder="תיאור קצר..." />
                        </td>
                        <td className="py-1.5">
                          <button onClick={() => dispatch({ type: 'PHASE_DEL', i })} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button onClick={() => dispatch({ type: 'PHASE_ADD' })} className="flex items-center gap-1.5 text-xs text-brand hover:text-brand-600 font-medium mt-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  הוסף שלב
                </button>
              </div>

              {/* Discount toggle */}
              <div className="flex items-center gap-2 mb-3">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={showDiscountRow}
                    onChange={e => { setShowDiscountRow(e.target.checked); if (!e.target.checked) set('discount_percent', null); }}
                    className="rounded border-gray-300 text-brand focus:ring-brand/30"
                  />
                  הוסף הנחה
                </label>
                {showDiscountRow && (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number" min="0" max="100"
                      className="input w-20 text-sm"
                      value={state.discount_percent || ''}
                      onChange={e => set('discount_percent', e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="10"
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                )}
              </div>

              {/* Price summary */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>לפני הנחה</span>
                  <span className="font-medium">{currencySymbol}{prices.subtotal.toLocaleString('he-IL')}</span>
                </div>
                {showDiscountRow && state.discount_percent && (
                  <div className="flex justify-between text-gray-500">
                    <span>הנחה ({state.discount_percent}%)</span>
                    <span className="text-red-500">−{currencySymbol}{prices.discount.toLocaleString('he-IL')}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>לפני מע״מ</span>
                  <span className="font-medium">{currencySymbol}{prices.afterDiscount.toLocaleString('he-IL')}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>מע״מ {vatPct}%</span>
                  <span>{currencySymbol}{prices.vat.toLocaleString('he-IL')}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-brand pt-2 border-t border-gray-200">
                  <span>סה״כ כולל מע״מ</span>
                  <span>{currencySymbol}{prices.total.toLocaleString('he-IL')}</span>
                </div>
              </div>

              {/* Switch to options mode */}
              <button
                onClick={() => dispatch({ type: 'OPTION_INIT' })}
                className="mt-3 flex items-center gap-1.5 text-xs text-gray-400 hover:text-brand font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                הוסף אופציות תמחור (א׳, ב׳...)
              </button>
            </div>
          )}
        </SectionCard>

        {/* Section 03 — Third Party Costs */}
        <SectionCard
          title={state.sections.third_party.title}
          visible={state.sections.third_party.visible}
          sectionKey="third_party"
          onToggle={() => dispatch({ type: 'SECTION_TOGGLE', sec: 'third_party' })}
          onRenameTitle={(t) => dispatch({ type: 'SECTION_TITLE', sec: 'third_party', title: t })}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-right text-xs text-gray-500 font-medium pb-2 pr-1">שירות</th>
                  <th className="text-right text-xs text-gray-500 font-medium pb-2 w-36">עלות משוערת ({currencySymbol})</th>
                  <th className="pb-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {state.third_party_costs.map((t, i) => (
                  <tr key={i} className="group">
                    <td className="py-1.5 pl-2">
                      <input className="input text-sm" value={t.service} onChange={e => dispatch({ type: 'TPC_UPD', i, k: 'service', v: e.target.value })} placeholder="שם השירות..." />
                    </td>
                    <td className="py-1.5 pl-2">
                      <input className="input text-sm" type="number" value={t.cost} onChange={e => dispatch({ type: 'TPC_UPD', i, k: 'cost', v: e.target.value })} placeholder="0" />
                    </td>
                    <td className="py-1.5">
                      <button onClick={() => dispatch({ type: 'TPC_DEL', i })} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => dispatch({ type: 'TPC_ADD' })} className="flex items-center gap-1.5 text-xs text-brand hover:text-brand-600 font-medium mt-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              הוסף עלות
            </button>
          </div>
        </SectionCard>

        {/* Section 04 — Terms & Timeline */}
        <SectionCard
          title={state.sections.terms.title}
          visible={state.sections.terms.visible}
          sectionKey="terms"
          onToggle={() => dispatch({ type: 'SECTION_TOGGLE', sec: 'terms' })}
          onRenameTitle={(t) => dispatch({ type: 'SECTION_TITLE', sec: 'terms', title: t })}
        >
          {/* Timeline */}
          <div className="mb-5">
            <label className="label mb-2">לוח זמנים</label>
            <table className="w-full text-sm mb-1">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-right text-xs text-gray-500 font-medium pb-2 pr-1">שלב</th>
                  <th className="text-right text-xs text-gray-500 font-medium pb-2">משך</th>
                  <th className="pb-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {state.timeline.map((t, i) => (
                  <tr key={i} className="group">
                    <td className="py-1.5 pl-2">
                      <input className="input text-sm" value={t.stage} onChange={e => dispatch({ type: 'TL_UPD', i, k: 'stage', v: e.target.value })} placeholder="שלב..." />
                    </td>
                    <td className="py-1.5 pl-2">
                      <input className="input text-sm" value={t.description} onChange={e => dispatch({ type: 'TL_UPD', i, k: 'description', v: e.target.value })} placeholder="1-2 שבועות..." />
                    </td>
                    <td className="py-1.5">
                      <button onClick={() => dispatch({ type: 'TL_DEL', i })} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => dispatch({ type: 'TL_ADD' })} className="flex items-center gap-1.5 text-xs text-brand hover:text-brand-600 font-medium mt-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              הוסף שלב
            </button>
          </div>

          {/* Payment Terms */}
          <div className="mb-5">
            <label className="label mb-2">תנאי תשלום</label>
            <DynList
              items={state.payment_terms}
              placeholder="תנאי תשלום..."
              onAdd={() => dispatch({ type: 'PT_ADD' })}
              onUpdate={(i, v) => dispatch({ type: 'PT_UPD', i, v })}
              onDelete={(i) => dispatch({ type: 'PT_DEL', i })}
              onMove={(from, to) => dispatch({ type: 'PT_MOVE', from, to })}
            />
          </div>

          {/* Warranty */}
          <div>
            <label className="label mb-2">אחריות</label>
            <DynList
              items={state.warranty}
              placeholder="תנאי אחריות..."
              onAdd={() => dispatch({ type: 'WR_ADD' })}
              onUpdate={(i, v) => dispatch({ type: 'WR_UPD', i, v })}
              onDelete={(i) => dispatch({ type: 'WR_DEL', i })}
              onMove={(from, to) => dispatch({ type: 'WR_MOVE', from, to })}
            />
          </div>
        </SectionCard>

        {/* Custom sections */}
        {state.custom_sections.map((cs, i) => (
          <div key={cs.id || i} className="card overflow-hidden mb-4">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/50">
              <input
                className="text-sm font-semibold text-dark bg-transparent outline-none border-b border-transparent focus:border-brand flex-1 ml-2"
                value={cs.title}
                onChange={e => dispatch({ type: 'CS_UPD', i, k: 'title', v: e.target.value })}
              />
              <button onClick={() => dispatch({ type: 'CS_DEL', i })} className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
            <div className="p-5">
              <textarea
                className="input min-h-[80px] resize-y text-sm"
                value={cs.content}
                onChange={e => dispatch({ type: 'CS_UPD', i, k: 'content', v: e.target.value })}
                placeholder="תוכן הסעיף..."
              />
            </div>
          </div>
        ))}

        <button
          onClick={() => dispatch({ type: 'CS_ADD' })}
          className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-brand hover:text-brand transition-colors font-medium"
        >
          + הוסף סעיף מותאם אישית
        </button>

        {/* Closing text + Signature toggle */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-dark mb-4 pb-2 border-b border-gray-100">חתימת סיום</h3>
          <div className="mb-4">
            <label className="label">טקסט סגירה</label>
            <textarea
              className="input min-h-[70px] resize-y text-sm"
              value={state.closing_text}
              onChange={e => set('closing_text', e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
              <input
                type="checkbox"
                checked={state.show_signature}
                onChange={e => set('show_signature', e.target.checked)}
                className="rounded border-gray-300 text-brand focus:ring-brand/30"
              />
              הצג בלוק חתימה
            </label>
            {state.show_signature && (
              <div className="flex items-center gap-2 flex-1">
                <label className="label mb-0 whitespace-nowrap">כותרת בלוק:</label>
                <input
                  className="input flex-1 text-sm"
                  value={state.signature_label}
                  onChange={e => set('signature_label', e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Bottom save bar */}
        <div className="flex justify-end gap-2 pb-8">
          <button className="btn-secondary" onClick={() => isTemplateMode ? navigate('/templates') : navigate('/')}>ביטול</button>
          {isTemplateMode ? (
            <button className="btn-primary" onClick={() => handleSave()} disabled={saving}>
              {saving ? 'שומר...' : 'שמור תבנית'}
            </button>
          ) : (
            <>
              <button className="btn-secondary" onClick={() => handleSave()} disabled={saving}>שמור טיוטה</button>
              <button className="btn-primary" onClick={handleSaveAndSend} disabled={saving}>
                {saving ? 'שומר...' : 'שמור ושלח'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* AI Assistant */}
      <AIAssistant
        quoteState={state}
        onApply={handleAIApply}
        brandColor={settings?.brand_color || '#D4642A'}
      />

      {/* Save as template modal */}
      <Modal open={saveTemplateOpen} onClose={() => setSaveTemplateOpen(false)} title="שמור כתבנית" size="sm">
        <div className="space-y-3">
          <div>
            <label className="label">שם התבנית</label>
            <input className="input" value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="תבנית חדשה..." autoFocus />
          </div>
          <div>
            <label className="label">תיאור</label>
            <input className="input" value={templateDesc} onChange={e => setTemplateDesc(e.target.value)} placeholder="תיאור קצר..." />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button className="btn-secondary" onClick={() => setSaveTemplateOpen(false)}>ביטול</button>
            <button className="btn-primary" onClick={handleSaveTemplate} disabled={!templateName.trim()}>שמור</button>
          </div>
        </div>
      </Modal>

      {/* Send Modal */}
      <Modal open={sendModalOpen} onClose={() => setSendModalOpen(false)} title="שמור ושלח" size="sm">
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 p-3.5 bg-green-50 rounded-xl border border-green-200">
            <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-green-700 font-medium">ההצעה נשמרה ועודכנה לסטטוס "נשלחה"!</span>
          </div>
          <div>
            <label className="label">קישור ללקוח</label>
            <p className="text-xs text-gray-500 mb-2">שלח את הקישור הבא ללקוח לצפייה ואישור ההצעה:</p>
            <div className="flex gap-2">
              <input
                readOnly
                className="input text-xs font-mono flex-1 bg-gray-50 cursor-text"
                value={sendLink}
                onClick={e => e.target.select()}
                dir="ltr"
              />
              <button
                onClick={handleCopyLink}
                className={`btn-primary text-xs whitespace-nowrap transition-all ${copied ? 'bg-green-600' : ''}`}
              >
                {copied ? '✓ הועתק!' : 'העתק קישור'}
              </button>
            </div>
          </div>
          <div className="flex gap-2 justify-between pt-1">
            <button
              className="btn-secondary text-xs flex items-center gap-1.5"
              onClick={() => window.open(`/p/${sendToken}`, '_blank')}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              תצוגה מקדימה
            </button>
            <button className="btn-ghost text-xs" onClick={() => setSendModalOpen(false)}>סגור</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
