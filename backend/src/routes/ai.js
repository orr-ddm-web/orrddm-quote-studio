const express = require('express');
const router = express.Router();
const db = require('../db');

function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

const SYSTEM_PROMPT = `אתה עוזר מקצועי ליצירת הצעות מחיר עבור OrrDDM — עסק לפיתוח אתרים ושיווק דיגיטלי.
המשימה שלך: לקבל בריף קצר מהמשתמש ולהפיק ממנו הצעת מחיר מקצועית ומפורטת בעברית.
החזר תמיד JSON תקין בלבד, ללא טקסט נוסף.`;

const buildPrompt = (brief, settings) => `
הבריף:
${brief}

הגדרות העסק:
- שם עסק: ${settings.business_name || 'OrrDDM'}
- מע"מ: ${settings.vat_percent || 18}%
- סמל מטבע: ${settings.currency_symbol || '₪'}

הפק הצעת מחיר מקצועית בעברית עם המבנה הבא (JSON בלבד):
{
  "client_name": "שם הלקוח לפי הבריף",
  "project_title": "כותרת ממוקדת לפרויקט",
  "package_name": "שם חבילה/פאקג' אטרקטיבי",
  "summary_text": "פסקת תקציר מקצועית 2-3 משפטים",
  "services": ["שירות 1", "שירות 2", "שירות 3"],
  "phases": [
    { "name": "שם שלב", "price": 0000, "description": "תיאור קצר" }
  ],
  "discount_percent": null,
  "third_party_costs": [
    { "service": "שם שירות", "cost": 000 }
  ],
  "timeline": [
    { "stage": "שם שלב", "description": "משך זמן" }
  ],
  "payment_terms": ["תנאי 1", "תנאי 2"],
  "warranty": ["אחריות 1", "אחריות 2"],
  "closing_text": "טקסט סגירה בעברית"
}

כללים:
- מחירים ריאליים לשוק הישראלי (${settings.currency_symbol || '₪'})
- כל הטקסטים בעברית ב-RTL
- לפחות 3-5 שלבי מחירים
- לפחות 4-6 שירותים
- תנאי תשלום ואחריות ריאליים
`;

// POST /api/ai/generate-quote
router.post('/generate-quote', async (req, res) => {
  const { brief, current_quote } = req.body;
  if (!brief || brief.trim().length < 5) {
    return res.status(400).json({ error: 'נא לספק בריף' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY || getSetting('ai_api_key');
  if (!apiKey) {
    return res.status(400).json({ error: 'לא הוגדר API Key עבור Claude. אנא הגדר בדף ההגדרות.' });
  }

  const model = getSetting('ai_model') || process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001';
  const settings = {};
  db.prepare('SELECT key, value FROM settings').all().forEach(r => { settings[r.key] = r.value; });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: buildPrompt(brief, settings),
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Claude API error:', err);
      return res.status(500).json({ error: 'שגיאה בחיבור ל-Claude API', details: err });
    }

    const data = await response.json();
    const raw = data.content?.[0]?.text || '';

    // Extract JSON from response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'לא הצלחנו לנתח את תגובת הבינה המלאכותית', raw });
    }

    const generated = JSON.parse(jsonMatch[0]);
    res.json({ quote: generated, model, usage: data.usage });
  } catch (e) {
    console.error('AI route error:', e);
    res.status(500).json({ error: 'שגיאה בשרת: ' + e.message });
  }
});

// POST /api/ai/chat — free-form chat for editing quotes
router.post('/chat', async (req, res) => {
  const { message, quote_context } = req.body;
  if (!message) return res.status(400).json({ error: 'חסרה הודעה' });

  const apiKey = process.env.ANTHROPIC_API_KEY || getSetting('ai_api_key');
  if (!apiKey) return res.status(400).json({ error: 'לא הוגדר API Key' });

  const model = getSetting('ai_model') || process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001';

  const contextStr = quote_context
    ? `\n\nהצעה נוכחית:\n${JSON.stringify(quote_context, null, 2)}`
    : '';

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        system: `אתה עוזר מקצועי לעריכת הצעות מחיר עבור OrrDDM. ענה תמיד בעברית.
אם המשתמש מבקש שינוי בהצעה, החזר JSON עם השדות שצריך לשנות בלבד (partial update).
אחרת, ענה בשיחה רגילה.${contextStr}`,
        messages: [{ role: 'user', content: message }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: 'שגיאה ב-API', details: err });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    // Try to detect if it's a JSON update
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    let update = null;
    if (jsonMatch) {
      try { update = JSON.parse(jsonMatch[0]); } catch {}
    }

    res.json({ message: text, update, usage: data.usage });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/ai/payment-summary — suggest items for payment summary
router.post('/payment-summary', async (req, res) => {
  const { brief, current_items } = req.body;
  if (!brief || brief.trim().length < 3) {
    return res.status(400).json({ error: 'נא לספק תיאור' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY || getSetting('ai_api_key');
  if (!apiKey) return res.status(400).json({ error: 'לא הוגדר API Key עבור Claude. אנא הגדר בדף ההגדרות.' });

  const model = getSetting('ai_model') || process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001';
  const settings = {};
  db.prepare('SELECT key, value FROM settings').all().forEach(r => { settings[r.key] = r.value; });

  const prompt = `המשתמש (OrrDDM — פיתוח אתרים ושיווק דיגיטלי) צריך לחייב לקוח על עבודות שבוצעו.

תיאור העבודות:
${brief.trim()}

${current_items && current_items.length > 0 ? `פריטים קיימים כרגע:\n${JSON.stringify(current_items, null, 2)}\n\n` : ''}
החזר JSON תקין בלבד:
{
  "items": [
    { "description": "תיאור עבודה מפורט ומקצועי", "price": 0000 }
  ],
  "message": "משפט קצר המסביר מה הצעת"
}

כללים:
- תיאורים ספציפיים, מקצועיים, בעברית
- מחירים ריאליים לשוק הישראלי (${settings.currency_symbol || '₪'})
- 2-6 פריטים לפי מה שמתאים
- price הוא מספר (לא מחרוזת)`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system: 'אתה עוזר מקצועי לחיוב לקוחות עבור OrrDDM. החזר תמיד JSON תקין בלבד, ללא טקסט נוסף.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: 'שגיאה ב-Claude API', details: err });
    }

    const data = await response.json();
    const raw = data.content?.[0]?.text || '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'שגיאה בניתוח תגובת ה-AI' });

    const generated = JSON.parse(jsonMatch[0]);
    res.json({ ...generated, usage: data.usage });
  } catch (e) {
    console.error('AI payment-summary error:', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
