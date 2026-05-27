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
  const last = db.prepare(`SELECT number FROM quotes WHERE is_template = 0 AND number LIKE ? ORDER BY id DESC LIMIT 1`).get(`${prefix}-${year}-%`);
  let seq = 1;
  if (last) {
    const parts = last.number.split('-');
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }
  return `${prefix}-${year}-${String(seq).padStart(3, '0')}`;
}

// GET /api/templates
router.get('/', (req, res) => {
  const templates = db.prepare('SELECT * FROM quotes WHERE is_template = 1 ORDER BY id DESC').all().map(parseQuote);
  res.json(templates);
});

// GET /api/templates/:id
router.get('/:id', (req, res) => {
  const t = db.prepare('SELECT * FROM quotes WHERE id = ? AND is_template = 1').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  res.json(parseQuote(t));
});

// POST /api/templates — create template (optionally from quote_id)
router.post('/', (req, res) => {
  const body = req.body;
  let source = {};
  if (body.quote_id) {
    const q = db.prepare('SELECT * FROM quotes WHERE id = ?').get(body.quote_id);
    if (q) source = q;
  }

  const template = {
    number: `TPL-${Date.now()}`,
    token: uuidv4(),
    client_name: body.client_name || source.client_name || '',
    project_title: body.project_title || source.project_title || '',
    date: new Date().toISOString().split('T')[0],
    status: 'draft',
    summary_text: body.summary_text || source.summary_text || '',
    services: JSON.stringify(body.services || (source.services ? JSON.parse(source.services) : [])),
    package_name: body.package_name || source.package_name || '',
    phases: JSON.stringify(body.phases || (source.phases ? JSON.parse(source.phases) : [])),
    discount_percent: body.discount_percent ?? source.discount_percent ?? null,
    third_party_costs: JSON.stringify(body.third_party_costs || (source.third_party_costs ? JSON.parse(source.third_party_costs) : [])),
    timeline: JSON.stringify(body.timeline || (source.timeline ? JSON.parse(source.timeline) : [])),
    payment_terms: JSON.stringify(body.payment_terms || (source.payment_terms ? JSON.parse(source.payment_terms) : [])),
    warranty: JSON.stringify(body.warranty || (source.warranty ? JSON.parse(source.warranty) : [])),
    sections: JSON.stringify(body.sections || (source.sections ? JSON.parse(source.sections) : {})),
    show_signature: body.show_signature !== undefined ? (body.show_signature ? 1 : 0) : (source.show_signature ?? 1),
    signature_label: body.signature_label || source.signature_label || 'חתימה ואישור',
    closing_text: body.closing_text || source.closing_text || '',
    custom_sections: JSON.stringify(body.custom_sections || (source.custom_sections ? JSON.parse(source.custom_sections) : [])),
    template_name: body.template_name || 'תבנית חדשה',
    template_description: body.template_description || '',
  };

  const result = db.prepare(`
    INSERT INTO quotes (number, token, client_name, project_title, date, status, summary_text, services,
      package_name, phases, discount_percent, third_party_costs, timeline, payment_terms, warranty,
      sections, show_signature, signature_label, closing_text, custom_sections, is_template, template_name, template_description)
    VALUES (@number, @token, @client_name, @project_title, @date, @status, @summary_text, @services,
      @package_name, @phases, @discount_percent, @third_party_costs, @timeline, @payment_terms, @warranty,
      @sections, @show_signature, @signature_label, @closing_text, @custom_sections, 1, @template_name, @template_description)
  `).run(template);

  const created = db.prepare('SELECT * FROM quotes WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(parseQuote(created));
});

// PUT /api/templates/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM quotes WHERE id = ? AND is_template = 1').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const body = req.body;
  const fields = ['client_name', 'project_title', 'summary_text', 'package_name', 'discount_percent', 'show_signature', 'signature_label', 'closing_text', 'template_name', 'template_description'];
  const jsonFields = ['services', 'phases', 'third_party_costs', 'timeline', 'payment_terms', 'warranty', 'sections', 'custom_sections'];
  const updates = {};
  fields.forEach((f) => { if (body[f] !== undefined) updates[f] = body[f]; });
  jsonFields.forEach((f) => { if (body[f] !== undefined) updates[f] = JSON.stringify(body[f]); });
  updates.updated_at = new Date().toISOString();

  const setClauses = Object.keys(updates).map((k) => `${k} = @${k}`).join(', ');
  db.prepare(`UPDATE quotes SET ${setClauses} WHERE id = @id`).run({ ...updates, id: req.params.id });

  const updated = db.prepare('SELECT * FROM quotes WHERE id = ?').get(req.params.id);
  res.json(parseQuote(updated));
});

// DELETE /api/templates/:id
router.delete('/:id', (req, res) => {
  const t = db.prepare('SELECT id FROM quotes WHERE id = ? AND is_template = 1').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM quotes WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// POST /api/templates/:id/quote — create quote from template
router.post('/:id/quote', (req, res) => {
  const t = db.prepare('SELECT * FROM quotes WHERE id = ? AND is_template = 1').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Template not found' });

  const newNumber = nextQuoteNumber();
  const result = db.prepare(`
    INSERT INTO quotes (number, token, client_name, project_title, date, status, summary_text, services,
      package_name, phases, discount_percent, third_party_costs, timeline, payment_terms, warranty,
      sections, show_signature, signature_label, closing_text, custom_sections, is_template)
    VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `).run(
    newNumber, uuidv4(), t.client_name, t.project_title,
    new Date().toISOString().split('T')[0],
    t.summary_text, t.services, t.package_name, t.phases,
    t.discount_percent, t.third_party_costs, t.timeline, t.payment_terms,
    t.warranty, t.sections, t.show_signature, t.signature_label,
    t.closing_text, t.custom_sections,
  );

  const created = db.prepare('SELECT * FROM quotes WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(parseQuote(created));
});

module.exports = router;
