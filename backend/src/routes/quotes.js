const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const s = {};
  rows.forEach((r) => { s[r.key] = r.value; });
  return s;
}

function parseQuote(q) {
  if (!q) return null;
  const jsonFields = ['services', 'phases', 'third_party_costs', 'timeline', 'payment_terms', 'warranty', 'sections', 'custom_sections'];
  jsonFields.forEach((f) => {
    if (q[f]) {
      try { q[f] = JSON.parse(q[f]); }
      catch { q[f] = []; }
    }
  });
  return q;
}

function nextQuoteNumber() {
  const settings = getSettings();
  const prefix = settings.quote_prefix || 'QT';
  const year = new Date().getFullYear();
  const last = db.prepare(
    `SELECT number FROM quotes WHERE is_template = 0 AND number LIKE ? ORDER BY id DESC LIMIT 1`
  ).get(`${prefix}-${year}-%`);
  let seq = 1;
  if (last) {
    const parts = last.number.split('-');
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }
  return `${prefix}-${year}-${String(seq).padStart(3, '0')}`;
}

function logActivity(quoteId, action, details = '') {
  db.prepare('INSERT INTO activity_log (quote_id, action, details) VALUES (?, ?, ?)').run(quoteId, action, details);
}

// GET /api/quotes - list all non-template quotes
router.get('/', (req, res) => {
  const { status, search } = req.query;
  let sql = `SELECT id, number, token, client_name, project_title, date, status, phases, discount_percent, created_at, updated_at FROM quotes WHERE is_template = 0`;
  const params = [];
  if (status && status !== 'all') { sql += ` AND status = ?`; params.push(status); }
  if (search) { sql += ` AND (client_name LIKE ? OR number LIKE ? OR project_title LIKE ?)`; const s = `%${search}%`; params.push(s, s, s); }
  sql += ' ORDER BY id DESC';
  const quotes = db.prepare(sql).all(...params).map((q) => {
    let phases = [];
    try { phases = JSON.parse(q.phases || '[]'); } catch {}
    const sum = phases.reduce((acc, p) => acc + (parseFloat(p.price) || 0), 0);
    const discount = q.discount_percent ? sum * (q.discount_percent / 100) : 0;
    const vatPct = parseFloat(getSettings().vat_percent || 18);
    const afterDiscount = sum - discount;
    const vat = afterDiscount * (vatPct / 100);
    const total = afterDiscount + vat;
    return { ...q, phases: undefined, total };
  });
  res.json(quotes);
});

// GET /api/quotes/next-number
router.get('/next-number', (req, res) => {
  res.json({ number: nextQuoteNumber() });
});

// GET /api/quotes/:id
router.get('/:id', (req, res) => {
  const q = db.prepare('SELECT * FROM quotes WHERE id = ? AND is_template = 0').get(req.params.id);
  if (!q) return res.status(404).json({ error: 'Not found' });
  res.json(parseQuote(q));
});

// POST /api/quotes
router.post('/', (req, res) => {
  const body = req.body;
  const settings = getSettings();
  const now = new Date().toISOString().split('T')[0];

  const defaultSections = {
    summary: { visible: true, title: '01 | תקציר הפרויקט' },
    pricing: { visible: true, title: '02 | מחירון ופירוט שירותים' },
    third_party: { visible: true, title: '03 | עלויות צד שלישי' },
    terms: { visible: true, title: '04 | תנאים ולוח זמנים' },
  };

  const quote = {
    number: body.number || nextQuoteNumber(),
    token: uuidv4(),
    client_name: body.client_name || '',
    project_title: body.project_title || '',
    date: body.date || now,
    status: body.status || 'draft',
    summary_text: body.summary_text || '',
    services: JSON.stringify(body.services || JSON.parse(settings.default_services || '[]')),
    package_name: body.package_name || '',
    phases: JSON.stringify(body.phases || []),
    discount_percent: body.discount_percent ?? null,
    third_party_costs: JSON.stringify(body.third_party_costs || []),
    timeline: JSON.stringify(body.timeline || JSON.parse(settings.default_timeline || '[]')),
    payment_terms: JSON.stringify(body.payment_terms || JSON.parse(settings.default_payment_terms || '[]')),
    warranty: JSON.stringify(body.warranty || JSON.parse(settings.default_warranty || '[]')),
    sections: JSON.stringify(body.sections || defaultSections),
    show_signature: body.show_signature !== undefined ? (body.show_signature ? 1 : 0) : 1,
    signature_label: body.signature_label || 'חתימה ואישור',
    closing_text: body.closing_text || `בברכה,\n${settings.owner_name || 'אור פישביין'}\n${settings.business_name || 'OrrDDM'}`,
    custom_sections: JSON.stringify(body.custom_sections || []),
    is_template: 0,
  };

  const result = db.prepare(`
    INSERT INTO quotes (number, token, client_name, project_title, date, status, summary_text, services,
      package_name, phases, discount_percent, third_party_costs, timeline, payment_terms, warranty,
      sections, show_signature, signature_label, closing_text, custom_sections, is_template)
    VALUES (@number, @token, @client_name, @project_title, @date, @status, @summary_text, @services,
      @package_name, @phases, @discount_percent, @third_party_costs, @timeline, @payment_terms, @warranty,
      @sections, @show_signature, @signature_label, @closing_text, @custom_sections, @is_template)
  `).run(quote);

  const created = db.prepare('SELECT * FROM quotes WHERE id = ?').get(result.lastInsertRowid);
  logActivity(result.lastInsertRowid, 'created', `הצעה ${quote.number} נוצרה`);
  res.status(201).json(parseQuote(created));
});

// PUT /api/quotes/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM quotes WHERE id = ? AND is_template = 0').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const body = req.body;
  const fields = [
    'client_name', 'project_title', 'date', 'status', 'summary_text',
    'package_name', 'discount_percent', 'show_signature', 'signature_label', 'closing_text',
  ];
  const jsonFields = ['services', 'phases', 'third_party_costs', 'timeline', 'payment_terms', 'warranty', 'sections', 'custom_sections'];
  const updates = {};

  fields.forEach((f) => { if (body[f] !== undefined) updates[f] = body[f]; });
  jsonFields.forEach((f) => { if (body[f] !== undefined) updates[f] = JSON.stringify(body[f]); });
  updates.updated_at = new Date().toISOString();
  if (updates.show_signature !== undefined) updates.show_signature = updates.show_signature ? 1 : 0;

  const setClauses = Object.keys(updates).map((k) => `${k} = @${k}`).join(', ');
  db.prepare(`UPDATE quotes SET ${setClauses} WHERE id = @id`).run({ ...updates, id: req.params.id });

  if (body.status && body.status !== existing.status) {
    logActivity(req.params.id, 'status_changed', `סטטוס שונה ל-${body.status}`);
  }

  const updated = db.prepare('SELECT * FROM quotes WHERE id = ?').get(req.params.id);
  res.json(parseQuote(updated));
});

// DELETE /api/quotes/:id
router.delete('/:id', (req, res) => {
  const q = db.prepare('SELECT id FROM quotes WHERE id = ? AND is_template = 0').get(req.params.id);
  if (!q) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM quotes WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// POST /api/quotes/:id/duplicate
router.post('/:id/duplicate', (req, res) => {
  const q = db.prepare('SELECT * FROM quotes WHERE id = ?').get(req.params.id);
  if (!q) return res.status(404).json({ error: 'Not found' });
  const newNumber = nextQuoteNumber();
  const result = db.prepare(`
    INSERT INTO quotes (number, token, client_name, project_title, date, status, summary_text, services,
      package_name, phases, discount_percent, third_party_costs, timeline, payment_terms, warranty,
      sections, show_signature, signature_label, closing_text, custom_sections, is_template)
    VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `).run(
    newNumber, uuidv4(), q.client_name + ' (עותק)', q.project_title,
    new Date().toISOString().split('T')[0], q.summary_text, q.services, q.package_name,
    q.phases, q.discount_percent, q.third_party_costs, q.timeline, q.payment_terms,
    q.warranty, q.sections, q.show_signature, q.signature_label, q.closing_text,
    q.custom_sections, 0,
  );
  const created = db.prepare('SELECT * FROM quotes WHERE id = ?').get(result.lastInsertRowid);
  logActivity(result.lastInsertRowid, 'duplicated', `שוכפל מהצעה ${q.number}`);
  res.status(201).json(parseQuote(created));
});

// POST /api/quotes/:id/send
router.post('/:id/send', (req, res) => {
  const q = db.prepare('SELECT * FROM quotes WHERE id = ? AND is_template = 0').get(req.params.id);
  if (!q) return res.status(404).json({ error: 'Not found' });
  db.prepare(`UPDATE quotes SET status = 'sent', updated_at = ? WHERE id = ?`).run(new Date().toISOString(), req.params.id);
  logActivity(req.params.id, 'sent', 'הצעה נשלחה ללקוח');
  const updated = db.prepare('SELECT * FROM quotes WHERE id = ?').get(req.params.id);
  res.json(parseQuote(updated));
});

// GET /api/public/:token  — public view, no auth
router.get('/public/:token', (req, res) => {
  const q = db.prepare('SELECT * FROM quotes WHERE token = ? AND is_template = 0').get(req.params.token);
  if (!q) return res.status(404).json({ error: 'Not found' });
  res.json(parseQuote(q));
});

// POST /api/public/:token/view — mark as viewed
router.post('/public/:token/view', (req, res) => {
  const q = db.prepare('SELECT * FROM quotes WHERE token = ? AND is_template = 0').get(req.params.token);
  if (!q) return res.status(404).json({ error: 'Not found' });
  if (!q.viewed_at) {
    const now = new Date().toISOString();
    db.prepare(`UPDATE quotes SET viewed_at = ?, status = CASE WHEN status = 'sent' THEN 'pending' ELSE status END, updated_at = ? WHERE token = ?`).run(now, now, req.params.token);
    logActivity(q.id, 'viewed', 'הלקוח צפה בהצעה');
  }
  res.json({ success: true });
});

// POST /api/public/:token/sign
router.post('/public/:token/sign', (req, res) => {
  const q = db.prepare('SELECT * FROM quotes WHERE token = ? AND is_template = 0').get(req.params.token);
  if (!q) return res.status(404).json({ error: 'Not found' });
  if (q.status === 'approved') return res.status(400).json({ error: 'Already approved' });
  const { signature_name, signature_date, signature_data } = req.body;
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE quotes SET signature_name = ?, signature_date = ?, signature_data = ?,
    status = 'approved', approved_at = ?, updated_at = ? WHERE token = ?
  `).run(signature_name, signature_date, signature_data, now, now, req.params.token);
  logActivity(q.id, 'approved', `אושר ע״י ${signature_name}`);
  res.json({ success: true });
});

// GET /api/quotes/:id/activity
router.get('/:id/activity', (req, res) => {
  const logs = db.prepare('SELECT * FROM activity_log WHERE quote_id = ? ORDER BY timestamp DESC').all(req.params.id);
  res.json(logs);
});

module.exports = router;
