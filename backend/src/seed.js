require('./db'); // ensure DB + defaults are set up
const db = require('./db');
const { v4: uuidv4 } = require('uuid');

const existing = db.prepare(`SELECT COUNT(*) as c FROM quotes WHERE is_template = 0`).get();
if (existing.c > 0) {
  console.log('Seed already applied, skipping.');
  process.exit(0);
}

const sampleQuote = {
  number: 'QT-2026-001',
  token: uuidv4(),
  client_name: 'קפה אופק',
  project_title: 'אסטרטגיה דיגיטלית + אתר חדש',
  date: '2026-05-27',
  status: 'sent',
  summary_text:
    'הצעה זו מפרטת את השירותים המוצעים לבניית נוכחות דיגיטלית מקצועית עבור קפה אופק, כולל עיצוב ובניית אתר, אסטרטגיה שיווקית וקמפיין פרסום ממומן.',
  services: JSON.stringify([
    'עיצוב UI/UX מותאם לקהל היעד',
    'פיתוח אתר וורדפרס רספונסיבי',
    'הקמת חנות מקוונת (WooCommerce)',
    'קידום אורגני SEO — תשתית טכנית ותוכן',
    'אסטרטגיית Meta Ads — קמפיין השקה',
    'חיבור לגוגל אנליטיקס ו-Pixel',
  ]),
  package_name: 'חבילת פרמיום דיגיטל',
  phases: JSON.stringify([
    { name: 'אפיון ואסטרטגיה', price: 2500, description: 'ריאיון עומק, מחקר שוק, מפת דרכים' },
    { name: 'עיצוב UI/UX', price: 4500, description: 'מסכים מלאים ב-Figma, גרסה מובייל ודסקטופ' },
    { name: 'פיתוח אתר + חנות', price: 8000, description: 'וורדפרס + WooCommerce, SEO, מהירות' },
    { name: 'קמפיין Meta Ads', price: 3500, description: 'הקמת קמפיין, קריאייטיב, ניהול חודשיים' },
  ]),
  discount_percent: 10,
  third_party_costs: JSON.stringify([
    { service: 'אחסון אתר (שנה)', cost: 350 },
    { service: 'דומיין (שנה)', cost: 60 },
    { service: 'תקציב פרסום Meta (מינימום)', cost: 1500 },
  ]),
  timeline: JSON.stringify([
    { stage: 'אפיון ואסטרטגיה', description: '3-5 ימי עסקים' },
    { stage: 'עיצוב', description: 'שבוע-שבועיים' },
    { stage: 'פיתוח', description: '3-4 שבועות' },
    { stage: 'בדיקות והשקה', description: 'שבוע' },
    { stage: 'משך כולל', description: '6-8 שבועות' },
  ]),
  payment_terms: JSON.stringify([
    '50% מקדמה עם אישור ההצעה ותחילת העבודה',
    '25% עם סיום שלב האסטרטגיה ואישור תכנון האתר',
    '25% עם עליית האתר לאוויר והשקת הקמפיינים הממומנים',
    'תשלום בהעברה בנקאית / ביט / פייבוקס',
    'תשלום כנגד חשבונית מס כחוק',
    'התשלום אינו כולל דומיין, דמי אחסון, תקציבי פרסום או תשלומי צד שלישי',
  ]),
  warranty: JSON.stringify([
    '3 חודשי אחריות ותמיכה טכנית לאחר מסירת האתר',
    'תיקוני באגים ובעיות תצוגה שאינן נובעות משינויי צד ג׳',
    'הדרכה על מערכת הניהול של האתר',
    'ליווי ותמיכה במהלך הפרויקט',
  ]),
  sections: JSON.stringify({
    summary: { visible: true, title: '01 | תקציר הפרויקט' },
    pricing: { visible: true, title: '02 | מחירון ופירוט שירותים' },
    third_party: { visible: true, title: '03 | עלויות צד שלישי' },
    terms: { visible: true, title: '04 | תנאים ולוח זמנים' },
  }),
  show_signature: 1,
  signature_label: 'חתימה ואישור',
  closing_text: 'בברכה,\nאור פישביין\nOrrDDM',
  custom_sections: JSON.stringify([]),
  is_template: 0,
};

db.prepare(`
  INSERT INTO quotes (
    number, token, client_name, project_title, date, status,
    summary_text, services, package_name, phases, discount_percent,
    third_party_costs, timeline, payment_terms, warranty, sections,
    show_signature, signature_label, closing_text, custom_sections, is_template
  ) VALUES (
    @number, @token, @client_name, @project_title, @date, @status,
    @summary_text, @services, @package_name, @phases, @discount_percent,
    @third_party_costs, @timeline, @payment_terms, @warranty, @sections,
    @show_signature, @signature_label, @closing_text, @custom_sections, @is_template
  )
`).run(sampleQuote);

// Insert as template too
db.prepare(`
  INSERT INTO quotes (
    number, token, client_name, project_title, date, status,
    summary_text, services, package_name, phases, discount_percent,
    third_party_costs, timeline, payment_terms, warranty, sections,
    show_signature, signature_label, closing_text, custom_sections,
    is_template, template_name, template_description
  ) VALUES (
    @number, @token, @client_name, @project_title, @date, 'draft',
    @summary_text, @services, @package_name, @phases, @discount_percent,
    @third_party_costs, @timeline, @payment_terms, @warranty, @sections,
    @show_signature, @signature_label, @closing_text, @custom_sections,
    1, @template_name, @template_description
  )
`).run({
  ...sampleQuote,
  number: 'TPL-001',
  token: uuidv4(),
  template_name: 'אסטרטגיה דיגיטלית + אתר',
  template_description: 'תבנית מלאה לפרויקט אסטרטגיה דיגיטלית הכוללת עיצוב, פיתוח וקמפיין',
});

console.log('Seed completed successfully.');
