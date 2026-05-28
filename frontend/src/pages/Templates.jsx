import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTemplates, deleteTemplate, createQuoteFromTemplate, updateTemplate } from '../api';
import Modal from '../components/Modal';

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('he-IL', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function Templates() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const load = () => {
    setLoading(true);
    getTemplates().then(setTemplates).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreateQuote = async (id) => {
    try {
      const q = await createQuoteFromTemplate(id);
      navigate(`/quotes/${q.id}/edit`);
    } catch (e) { console.error(e); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTemplate(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (e) { console.error(e); }
  };

  const handleEdit = async () => {
    try {
      await updateTemplate(editTarget.id, { template_name: editName, template_description: editDesc });
      setEditTarget(null);
      load();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark">תבניות</h1>
          <p className="text-sm text-gray-500 mt-0.5">תבניות מוכנות לשימוש חוזר</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-7 h-7 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <div className="card text-center py-16">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
          <p className="text-gray-400 text-sm mb-3">אין תבניות עדיין</p>
          <p className="text-gray-400 text-xs mb-4">ניתן לשמור כל הצעה כתבנית מתוך עורך ההצעות</p>
          <button className="btn-primary" onClick={() => navigate('/quotes/new')}>צור הצעה ראשונה</button>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map(t => (
            <div key={t.id} className="card p-5 hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-dark text-sm truncate">{t.template_name || 'תבנית ללא שם'}</h3>
                  {t.template_description && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{t.template_description}</p>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity mr-2">
                  <button
                    onClick={() => { setEditTarget(t); setEditName(t.template_name || ''); setEditDesc(t.template_description || ''); }}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button
                    onClick={() => setDeleteTarget(t)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>

              <div className="space-y-1 mb-4">
                {t.project_title && (
                  <p className="text-xs text-gray-500 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    {t.project_title}
                  </p>
                )}
                {(t.phases || []).length > 0 && (
                  <p className="text-xs text-gray-500 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    {t.phases.length} שלבים
                  </p>
                )}
                <p className="text-xs text-gray-400">עודכן: {formatDate(t.updated_at)}</p>
              </div>

              <div className="flex gap-2">
                <button
                  className="flex-1 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: '#D4642A' }}
                  onClick={() => handleCreateQuote(t.id)}
                >
                  צור הצעה
                </button>
                <button
                  className="px-3 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                  onClick={() => navigate(`/templates/${t.id}/edit`)}
                  title="ערוך את תוכן התבנית"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="מחיקת תבנית" size="sm">
        <p className="text-sm text-gray-600 mb-4">האם למחוק את התבנית <strong>{deleteTarget?.template_name}</strong>?</p>
        <div className="flex gap-2 justify-end">
          <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>ביטול</button>
          <button className="btn-danger" onClick={handleDelete}>מחיקה</button>
        </div>
      </Modal>

      {/* Edit template */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="עריכת תבנית" size="sm">
        <div className="space-y-3">
          <div>
            <label className="label">שם התבנית</label>
            <input className="input" value={editName} onChange={e => setEditName(e.target.value)} />
          </div>
          <div>
            <label className="label">תיאור</label>
            <input className="input" value={editDesc} onChange={e => setEditDesc(e.target.value)} />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button className="btn-secondary" onClick={() => setEditTarget(null)}>ביטול</button>
            <button className="btn-primary" onClick={handleEdit}>שמור</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
