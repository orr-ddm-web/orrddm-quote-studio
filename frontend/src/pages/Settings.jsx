import React, { useEffect, useState } from 'react';
import { getSettings, updateSettings, uploadLogo } from '../api';
import { useAppSettings } from '../App';

function Section({ title, children }) {
  return (
    <div className="card p-5 mb-4">
      <h3 className="text-sm font-semibold text-dark mb-4 pb-2 border-b border-gray-100">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div className="mb-4">
      <label className="label">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1">{hint}</p>}
      {children}
    </div>
  );
}

function DynListEditor({ items, onChange, placeholder = 'הוסף פריט...' }) {
  const handleAdd = () => onChange([...items, '']);
  const handleUpdate = (i, v) => onChange(items.map((x, idx) => idx === i ? v : x));
  const handleDelete = (i) => onChange(items.filter((_, idx) => idx !== i));
  const handleMove = (from, to) => {
    const arr = [...items];
    const [el] = arr.splice(from, 1);
    arr.splice(to, 0, el);
    onChange(arr);
  };
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 group">
          <span className="text-brand text-xs select-none">◈</span>
          <input
            className="input flex-1 text-sm"
            value={item}
            onChange={e => handleUpdate(i, e.target.value)}
            placeholder={placeholder}
          />
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {i > 0 && (
              <button onClick={() => handleMove(i, i - 1)} className="p-0.5 text-gray-400 hover:text-gray-600">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
              </button>
            )}
            {i < items.length - 1 && (
              <button onClick={() => handleMove(i, i + 1)} className="p-0.5 text-gray-400 hover:text-gray-600">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
            )}
          </div>
          <button onClick={() => handleDelete(i)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      ))}
      <button onClick={handleAdd} className="flex items-center gap-1.5 text-xs text-brand hover:text-brand-600 font-medium mt-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        הוסף
      </button>
    </div>
  );
}

function TimelineEditor({ items, onChange }) {
  const handleAdd = () => onChange([...items, { stage: '', description: '' }]);
  const handleUpdate = (i, k, v) => onChange(items.map((x, idx) => idx === i ? { ...x, [k]: v } : x));
  const handleDelete = (i) => onChange(items.filter((_, idx) => idx !== i));
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 items-center group">
          <input className="input flex-1 text-sm" value={item.stage} onChange={e => handleUpdate(i, 'stage', e.target.value)} placeholder="שם שלב..." />
          <input className="input flex-1 text-sm" value={item.description} onChange={e => handleUpdate(i, 'description', e.target.value)} placeholder="משך זמן..." />
          <button onClick={() => handleDelete(i)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      ))}
      <button onClick={handleAdd} className="flex items-center gap-1.5 text-xs text-brand hover:text-brand-600 font-medium mt-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        הוסף שלב
      </button>
    </div>
  );
}

function Toast({ message, onDone }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => onDone && onDone(), 2800);
    return () => clearTimeout(t);
  }, [message, onDone]);
  if (!message) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center z-[200] pointer-events-none">
      <div className="px-7 py-4 rounded-2xl shadow-2xl font-semibold text-base flex items-center gap-3 text-white"
        style={{ background: '#16a34a', boxShadow: '0 8px 32px rgba(0,0,0,0.22)', animation: 'toastIn 0.25s cubic-bezier(.4,0,.2,1)' }}>
        <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        {message}
      </div>
      <style>{`@keyframes toastIn{from{opacity:0;transform:scale(.85) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
    </div>
  );
}

export default function Settings() {
  const { setSettings: setAppSettings } = useAppSettings();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    getSettings().then(s => {
      // Parse JSON arrays
      const parsed = { ...s };
      ['default_payment_terms', 'default_warranty', 'default_services', 'default_timeline'].forEach(k => {
        if (typeof parsed[k] === 'string') {
          try { parsed[k] = JSON.parse(parsed[k]); } catch { parsed[k] = []; }
        }
        if (!Array.isArray(parsed[k])) parsed[k] = [];
      });
      setForm(parsed);
    });
  }, []);

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form };
      // Serialize arrays back to JSON strings for API
      ['default_payment_terms', 'default_warranty', 'default_services', 'default_timeline'].forEach(k => {
        if (Array.isArray(payload[k])) payload[k] = JSON.stringify(payload[k]);
      });
      const updated = await updateSettings(payload);
      // Update app-wide settings
      const parsed = { ...updated };
      ['default_payment_terms', 'default_warranty', 'default_services', 'default_timeline'].forEach(k => {
        if (typeof parsed[k] === 'string') { try { parsed[k] = JSON.parse(parsed[k]); } catch { parsed[k] = []; } }
      });
      setForm(parsed);
      setAppSettings(updated);
      setSuccess('הגדרות נשמרו בהצלחה');
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadLogo(file);
      set('logo_path', res.logo_path);
    } catch (e) { console.error(e); }
    finally { setUploading(false); }
  };

  if (!form) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-7 h-7 border-2 border-brand border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Toast message={success} onDone={() => setSuccess('')} />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark">הגדרות</h1>
          <p className="text-sm text-gray-500 mt-0.5">ניהול פרופיל עסקי ותצורת המערכת</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'שומר...' : 'שמור הגדרות'}
          </button>
        </div>
      </div>

      {/* Business Profile */}
      <Section title="פרופיל עסקי">
        <div className="grid grid-cols-2 gap-4">
          <Field label="שם העסק">
            <input className="input" value={form.business_name || ''} onChange={e => set('business_name', e.target.value)} placeholder="OrrDDM" />
          </Field>
          <Field label="שם הבעלים">
            <input className="input" value={form.owner_name || ''} onChange={e => set('owner_name', e.target.value)} placeholder="אור פישביין" />
          </Field>
          <Field label="דואר אלקטרוני">
            <input className="input" type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} placeholder="orr@orrddm.com" />
          </Field>
          <Field label="טלפון">
            <input className="input" value={form.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="054-30-11-361" />
          </Field>
          <Field label="אתר">
            <input className="input" value={form.website || ''} onChange={e => set('website', e.target.value)} placeholder="orrddm.com" />
          </Field>
          <Field label="תגית (tagline)">
            <input className="input" value={form.tagline || ''} onChange={e => set('tagline', e.target.value)} placeholder="Design · Development · Management" />
          </Field>
        </div>
        <Field label="טקסט פוטר (מוצג בכל הצעה)">
          <input className="input" value={form.footer_text || ''} onChange={e => set('footer_text', e.target.value)} />
        </Field>
      </Section>

      {/* Branding */}
      <Section title="מיתוג">
        <div className="grid grid-cols-2 gap-4">
          <Field label="צבע ראשי">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.brand_color || '#D4642A'}
                onChange={e => set('brand_color', e.target.value)}
                className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
              />
              <input className="input flex-1" value={form.brand_color || '#D4642A'} onChange={e => set('brand_color', e.target.value)} placeholder="#D4642A" />
            </div>
          </Field>
          <Field label="לוגו" hint="JPG, PNG, SVG — עד 5MB">
            <div className="flex items-center gap-3">
              {form.logo_path && (
                <img src={form.logo_path} alt="לוגו" className="h-10 object-contain rounded border border-gray-200" />
              )}
              <label className="btn-secondary cursor-pointer text-xs">
                {uploading ? 'מעלה...' : 'בחר קובץ'}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
              </label>
              {form.logo_path && (
                <button className="text-xs text-red-400 hover:text-red-600" onClick={() => set('logo_path', '')}>הסר</button>
              )}
            </div>
          </Field>
        </div>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
            <input
              type="checkbox"
              checked={form.show_bsd === 'true' || form.show_bsd === true}
              onChange={e => set('show_bsd', String(e.target.checked))}
              className="rounded border-gray-300 text-brand focus:ring-brand/30"
            />
            הצג ״בס״ד״ בפינת ההצעה
          </label>
        </div>
      </Section>

      {/* Quote Settings */}
      <Section title="הגדרות הצעה">
        <div className="grid grid-cols-3 gap-4">
          <Field label="מע״מ (%)">
            <input className="input" type="number" min="0" max="100" value={form.vat_percent || '18'} onChange={e => set('vat_percent', e.target.value)} />
          </Field>
          <Field label="סימן מטבע">
            <input className="input" value={form.currency_symbol || '₪'} onChange={e => set('currency_symbol', e.target.value)} placeholder="₪" />
          </Field>
          <Field label="קידומת מספור הצעות">
            <input className="input" value={form.quote_prefix || 'QT'} onChange={e => set('quote_prefix', e.target.value)} placeholder="QT" />
          </Field>
        </div>
      </Section>

      {/* Default Payment Terms */}
      <Section title="תנאי תשלום ברירת מחדל">
        <p className="text-xs text-gray-400 mb-3">תנאים אלו יופיעו אוטומטית בכל הצעה חדשה (ניתן לשנות לכל הצעה בנפרד)</p>
        <DynListEditor
          items={Array.isArray(form.default_payment_terms) ? form.default_payment_terms : []}
          onChange={v => set('default_payment_terms', v)}
          placeholder="תנאי תשלום..."
        />
      </Section>

      {/* Default Warranty */}
      <Section title="אחריות ברירת מחדל">
        <p className="text-xs text-gray-400 mb-3">תנאי האחריות שיופיעו בכל הצעה חדשה</p>
        <DynListEditor
          items={Array.isArray(form.default_warranty) ? form.default_warranty : []}
          onChange={v => set('default_warranty', v)}
          placeholder="תנאי אחריות..."
        />
      </Section>

      {/* Default Services */}
      <Section title="שירותים ברירת מחדל">
        <p className="text-xs text-gray-400 mb-3">רשימת שירותים שתופיע בהצעה חדשה</p>
        <DynListEditor
          items={Array.isArray(form.default_services) ? form.default_services : []}
          onChange={v => set('default_services', v)}
          placeholder="שירות..."
        />
      </Section>

      {/* Default Timeline */}
      <Section title="לוח זמנים ברירת מחדל">
        <p className="text-xs text-gray-400 mb-3">שלבי לוח הזמנים שיופיעו בהצעה חדשה</p>
        <TimelineEditor
          items={Array.isArray(form.default_timeline) ? form.default_timeline : []}
          onChange={v => set('default_timeline', v)}
        />
      </Section>

      {/* AI Settings */}
      <Section title="עוזר AI (Claude)">
        <p className="text-xs text-gray-400 mb-4">
          העוזר משתמש ב-Claude API כדי לייצר ולערוך הצעות מחיר מבריף קצר.
          נדרש <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-brand underline">חשבון Anthropic</a> עם API Key.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Anthropic API Key" hint="מתחיל ב-sk-ant-...">
            <input
              className="input font-mono text-xs"
              type="password"
              value={form.ai_api_key || ''}
              onChange={e => set('ai_api_key', e.target.value)}
              placeholder="sk-ant-api03-..."
            />
          </Field>
          <Field label="מודל Claude" hint="ברירת מחדל: claude-haiku-4-5">
            <select className="input" value={form.ai_model || 'claude-haiku-4-5-20251001'} onChange={e => set('ai_model', e.target.value)}>
              <option value="claude-haiku-4-5-20251001">claude-haiku-4-5 (מהיר, זול)</option>
              <option value="claude-sonnet-4-6">claude-sonnet-4-5 (מאוזן)</option>
              <option value="claude-opus-4-6">claude-opus-4 (הכי חזק)</option>
            </select>
          </Field>
        </div>
        {form.ai_api_key && (
          <div className="mt-2 flex items-center gap-2 text-xs text-green-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            API Key מוגדר — עוזר AI זמין בעורך ההצעות
          </div>
        )}
      </Section>

      <div className="flex justify-end pb-8">
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'שומר...' : 'שמור הגדרות'}
        </button>
      </div>
    </div>
  );
}
