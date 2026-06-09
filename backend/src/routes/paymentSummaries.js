const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

function parse(row) {
  if (!row) return null;
  try { row.items = JSON.parse(row.items || '[]'); } catch { row.items = []; }
  return row;
}

// GET /api/payment-summaries
router.get('/', (req, res) => {
  const rows = db.prepare(
    'SELECT id, token, client_name, date, items, vat_percent, created_at FROM payment_summaries ORDER BY id DESC'
  ).all();
  res.json(rows.map(r => {
    let items = [];
    try { items = JSON.parse(r.items || '[]'); } catch {}
    const vatRate = (r.vat_percent || 18) / 100;
    const subtotal = items.reduce((s, i) => {
      const p = parseFloat(i.price) || 0;
      return s + (i.vat_included ? p / (1 + vatRate) : p);
    }, 0);
    const vat = subtotal * vatRate;
    return { ...r, items: undefined, subtotal, total: subtotal + vat };
  }));
});

// GET /api/payment-summaries/:id
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM payment_summaries WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(parse(row));
});

// POST /api/payment-summaries
router.post('/', (req, res) => {
  const b = req.body;
  const now = new Date().toISOString().split('T')[0];
  const settings = {};
  db.prepare('SELECT key, value FROM settings').all().forEach(r => { settings[r.key] = r.value; });

  const row = {
    token: uuidv4(),
    client_name: b.client_name || '',
    date: b.date || now,
    items: JSON.stringify(b.items || []),
    notes: b.notes || '',
    vat_percent: b.vat_percent ?? parseFloat(settings.vat_percent || 18),
  };
  const result = db.prepare(
    `INSERT INTO payment_summaries (token, client_name, date, items, notes, vat_percent)
     VALUES (@token, @client_name, @date, @items, @notes, @vat_percent)`
  ).run(row);
  const created = db.prepare('SELECT * FROM payment_summaries WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(parse(created));
});

// PUT /api/payment-summaries/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM payment_summaries WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const b = req.body;
  const updates = {
    client_name: b.client_name ?? existing.client_name,
    date: b.date ?? existing.date,
    items: JSON.stringify(b.items ?? JSON.parse(existing.items || '[]')),
    notes: b.notes ?? existing.notes,
    vat_percent: b.vat_percent ?? existing.vat_percent,
    updated_at: new Date().toISOString(),
  };
  db.prepare(
    `UPDATE payment_summaries SET client_name=@client_name, date=@date, items=@items,
     notes=@notes, vat_percent=@vat_percent, updated_at=@updated_at WHERE id=@id`
  ).run({ ...updates, id: req.params.id });
  res.json(parse(db.prepare('SELECT * FROM payment_summaries WHERE id = ?').get(req.params.id)));
});

// DELETE /api/payment-summaries/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM payment_summaries WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// GET /api/payment-summaries/public/:id — for the print/view page
router.get('/public/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM payment_summaries WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const settings = {};
  db.prepare('SELECT key, value FROM settings').all().forEach(r => { settings[r.key] = r.value; });
  const parsed = parse(row);
  res.json({ ...parsed, settings });
});

module.exports = router;
