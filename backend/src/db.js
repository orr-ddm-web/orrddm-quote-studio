const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'quotes.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS quotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    number TEXT UNIQUE,
    token TEXT UNIQUE,
    client_name TEXT DEFAULT '',
    project_title TEXT DEFAULT '',
    date TEXT,
    status TEXT DEFAULT 'draft',
    summary_text TEXT DEFAULT '',
    services TEXT DEFAULT '[]',
    package_name TEXT DEFAULT '',
    phases TEXT DEFAULT '[]',
    discount_percent REAL,
    third_party_costs TEXT DEFAULT '[]',
    timeline TEXT DEFAULT '[]',
    payment_terms TEXT DEFAULT '[]',
    warranty TEXT DEFAULT '[]',
    sections TEXT DEFAULT '{}',
    show_signature INTEGER DEFAULT 1,
    signature_label TEXT DEFAULT 'חתימה ואישור',
    closing_text TEXT DEFAULT 'בברכה,\nאור פישביין\nOrrDDM',
    custom_sections TEXT DEFAULT '[]',
    is_template INTEGER DEFAULT 0,
    template_name TEXT,
    template_description TEXT,
    signature_name TEXT,
    signature_date TEXT,
    signature_data TEXT,
    viewed_at TEXT,
    approved_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_id INTEGER,
    action TEXT,
    timestamp TEXT DEFAULT (datetime('now')),
    details TEXT,
    FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
  );
`);

// Default settings
const DEFAULT_SETTINGS = {
  business_name: 'OrrDDM',
  owner_name: 'אור פישביין',
  email: 'orr@orrddm.com',
  phone: '054-30-11-361',
  website: 'orrddm.com',
  tagline: 'Design · Development · Management',
  footer_text: 'אור פישביין | OrrDDM | orr@orrddm.com | 054-30-11-361 | orrddm.com',
  vat_percent: '18',
  currency_symbol: '₪',
  show_bsd: 'true',
  brand_color: '#D4642A',
  quote_prefix: 'QT',
  logo_path: '',
  default_payment_terms: JSON.stringify([
    '50% מקדמה עם אישור ההצעה ותחילת העבודה',
    '25% עם סיום שלב האסטרטגיה ואישור תכנון האתר',
    '25% עם עליית האתר לאוויר והשקת הקמפיינים הממומנים',
    'תשלום בהעברה בנקאית / ביט / פייבוקס',
    'תשלום כנגד חשבונית מס כחוק',
    'התשלום אינו כולל דומיין, דמי אחסון, תקציבי פרסום או תשלומי צד שלישי',
  ]),
  default_warranty: JSON.stringify([
    '3 חודשי אחריות ותמיכה טכנית לאחר מסירת האתר',
    'תיקוני באגים ובעיות תצוגה שאינן נובעות משינויי צד ג׳',
    'הדרכה על מערכת הניהול של האתר',
    'ליווי ותמיכה במהלך הפרויקט',
  ]),
  default_services: JSON.stringify([
    'עיצוב ממשק משתמש (UI/UX)',
    'פיתוח אתר רספונסיבי',
    'אינטגרציה עם מערכות חיצוניות',
    'אופטימיזציה למנועי חיפוש (SEO)',
  ]),
  ai_api_key: '',
  ai_model: 'claude-haiku-4-5-20251001',
  default_timeline: JSON.stringify([
    { stage: 'אפיון ועיצוב', description: '1-2 שבועות' },
    { stage: 'פיתוח', description: '3-4 שבועות' },
    { stage: 'בדיקות והשקה', description: '1 שבוע' },
    { stage: 'משך כולל', description: '5-7 שבועות' },
  ]),
};

const insertSetting = db.prepare(
  `INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`
);
const insertSettingsMany = db.transaction((settings) => {
  for (const [key, value] of Object.entries(settings)) {
    insertSetting.run(key, value);
  }
});
insertSettingsMany(DEFAULT_SETTINGS);

module.exports = db;
