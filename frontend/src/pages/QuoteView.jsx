import React, { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getPublicQuote, markViewed, signQuote, getSettings } from '../api';

function calcPrices(phases, discountPct, vatPct) {
  const subtotal = phases.reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0);
  const discount = discountPct ? subtotal * (discountPct / 100) : 0;
  const afterDiscount = subtotal - discount;
  const vat = afterDiscount * (vatPct / 100);
  const total = afterDiscount + vat;
  return { subtotal, discount, afterDiscount, vat, total };
}

function fmt(n, sym = '₪') {
  return `${sym}${Number(n).toLocaleString('he-IL', { maximumFractionDigits: 0 })}`;
}

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Simple canvas signature pad
function SignaturePad({ onSave }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = (e) => {
    e.preventDefault();
    drawing.current = true;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    const { x, y } = getPos(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = () => { drawing.current = false; };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const save = () => {
    const canvas = canvasRef.current;
    onSave(canvas.toDataURL('image/png'));
  };

  return (
    <div>
      <div className="border border-gray-300 rounded-lg overflow-hidden bg-white cursor-crosshair mb-2">
        <canvas
          ref={canvasRef}
          width={500}
          height={150}
          className="w-full"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={clear} className="text-xs text-gray-500 hover:text-gray-700 underline">נקה</button>
        <button type="button" onClick={save} className="text-xs text-brand font-medium hover:text-brand-600 underline">אשר חתימה</button>
      </div>
    </div>
  );
}

export default function QuoteView() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const isPrint = searchParams.get('print') === 'true';

  const [quote, setQuote] = useState(null);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [signMode, setSignMode] = useState(false);
  const [sigName, setSigName] = useState('');
  const [sigDate, setSigDate] = useState(new Date().toISOString().split('T')[0]);
  const [sigData, setSigData] = useState('');
  const [sigType, setSigType] = useState('draw'); // 'draw' or 'type'
  const [submitting, setSubmitting] = useState(false);
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    Promise.all([getPublicQuote(token), getSettings()])
      .then(([q, s]) => { setQuote(q); setSettings(s); })
      .catch(() => setError('ההצעה לא נמצאה'))
      .finally(() => setLoading(false));

    // Mark as viewed
    markViewed(token).catch(() => {});
  }, [token]);

  const brandColor = settings?.brand_color || '#D4642A';
  const currSym = settings?.currency_symbol || '₪';
  const vatPct = parseFloat(settings?.vat_percent || 18);
  const showBsd = settings?.show_bsd === 'true' || settings?.show_bsd === true;
  const footerText = settings?.footer_text || 'OrrDDM | orr@orrddm.com';
  const logoPath = settings?.logo_path;
  const businessName = settings?.business_name || 'OrrDDM';

  const handleSign = async () => {
    if (!sigName.trim()) return;
    setSubmitting(true);
    try {
      await signQuote(token, { signature_name: sigName, signature_date: sigDate, signature_data: sigType === 'type' ? null : sigData });
      setSigned(true);
      setSignMode(false);
      setQuote(q => ({ ...q, status: 'approved', signature_name: sigName, approved_at: new Date().toISOString() }));
    } catch (e) {
      alert('שגיאה בשמירת החתימה');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="w-7 h-7 border-2 border-brand border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !quote) return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="text-center">
        <p className="text-gray-500 text-lg mb-2">הצעה לא נמצאה</p>
        <p className="text-gray-400 text-sm">ייתכן שהקישור שגוי או שפג תוקפו</p>
      </div>
    </div>
  );

  const sections = quote.sections || {};
  const prices = calcPrices(quote.phases || [], quote.discount_percent, vatPct);
  const showSummary = sections.summary?.visible !== false;
  const showPricing = sections.pricing?.visible !== false;
  const showThirdParty = sections.third_party?.visible !== false;
  const showTerms = sections.terms?.visible !== false;

  return (
    <>
    <style>{`
      @page {
        size: A4;
        margin: 18mm 14mm;
      }
      @media print {
        .no-print { display: none !important; }
        body { background: white !important; }
        /* prevent sections from being cut mid-content */
        section {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        /* prevent heading from being orphaned at page bottom */
        h3 {
          break-after: avoid;
          page-break-after: avoid;
        }
        /* table rows stay intact */
        tr {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        thead {
          display: table-header-group;
        }
        /* option pricing blocks */
        .option-card {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        /* price summary box */
        .price-summary {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        /* header block */
        .quote-header {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        /* footer */
        footer {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        /* remove outer page padding since @page margin handles it */
        .print-outer {
          padding-top: 0 !important;
          padding-bottom: 0 !important;
        }
      }
    `}</style>
    <div className="min-h-screen bg-[#FDF8F5] text-[#1a1a1a]" dir="rtl" style={{ fontFamily: '"Google Sans", Inter, system-ui, sans-serif' }}>
      {/* Print download button */}
      {!isPrint && (
        <div className="no-print fixed top-4 left-4 z-50">
          <button
            onClick={() => window.open(`/api/pdf/${token}`, '_blank')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl shadow-lg text-sm font-medium text-white transition-all"
            style={{ backgroundColor: brandColor }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            הורד PDF
          </button>
        </div>
      )}

      <div className="max-w-[800px] mx-auto px-6 py-10 print-outer">
        {/* Header */}
        <div className="flex items-start justify-between mb-10 quote-header">
          <div>
            {logoPath ? (
              <img src={logoPath} alt={businessName} className="h-12 object-contain mb-3" />
            ) : (
              <div className="text-3xl font-bold mb-3" style={{ color: brandColor }}>{businessName}</div>
            )}
            <p className="text-xs text-gray-400">{settings?.tagline}</p>
          </div>
          <div className="text-left">
            {showBsd && <p className="text-xs text-gray-400 mb-2 text-left">בס״ד</p>}
            <p className="text-xs text-gray-500">תאריך: {fmtDate(quote.date)}</p>
            <p className="text-xs text-gray-500 font-mono">{quote.number}</p>
          </div>
        </div>

        {/* Client info */}
        <div className="border-r-4 pr-4 mb-8" style={{ borderColor: brandColor }}>
          <h2 className="text-2xl font-bold text-[#1a1a1a] mb-1">{quote.client_name}</h2>
          {quote.project_title && (
            <p className="text-base font-medium" style={{ color: brandColor }}>{quote.project_title}</p>
          )}
          {quote.package_name && (
            <p className="text-sm text-gray-500 mt-1">{quote.package_name}</p>
          )}
        </div>

        {/* Status badge */}
        {(quote.status === 'approved' || signed) && (
          <div className="flex items-center gap-2 mb-6 p-3 bg-green-50 rounded-xl border border-green-200">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="text-sm font-medium text-green-700">
              הצעה זו אושרה {quote.signature_name ? `ע״י ${quote.signature_name}` : ''}
              {quote.approved_at ? ` ב-${fmtDate(quote.approved_at)}` : ''}
            </span>
          </div>
        )}

        {/* Section 01 — Summary */}
        {showSummary && (quote.summary_text || (quote.services || []).length > 0) && (
          <section className="mb-8">
            <h3 className="text-sm font-bold uppercase tracking-widest mb-4 pb-2 border-b border-gray-200" style={{ color: brandColor }}>
              {sections.summary?.title || '01 | תקציר הפרויקט'}
            </h3>
            {quote.summary_text && <p className="text-sm text-gray-700 leading-relaxed mb-4">{quote.summary_text}</p>}
            {(quote.services || []).length > 0 && (
              <ul className="space-y-1.5">
                {quote.services.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span style={{ color: brandColor }} className="mt-0.5 flex-shrink-0">◈</span>
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Section 02 — Pricing */}
        {showPricing && (
          <section className="mb-8">
            <h3 className="text-sm font-bold uppercase tracking-widest mb-4 pb-2 border-b border-gray-200" style={{ color: brandColor }}>
              {sections.pricing?.title || '02 | מחירון ופירוט שירותים'}
            </h3>

            {/* ── Multi-option pricing ── */}
            {(quote.pricing_options || []).length > 0 ? (
              <div className="space-y-5">
                {quote.pricing_options.map((option, oi) => {
                  const optPrices = calcPrices(option.phases || [], option.discount_percent, vatPct);
                  return (
                    <div key={oi} className="rounded-xl overflow-hidden border border-gray-200 option-card">
                      {/* Option header */}
                      <div className="px-4 py-2.5 text-sm font-bold" style={{ backgroundColor: brandColor + '18', color: brandColor }}>
                        {option.name}
                      </div>
                      <div className="p-4">
                        {(option.phases || []).length > 0 && (
                          <table className="w-full text-sm mb-4">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-right text-xs text-gray-500 font-medium pb-2">שלב / שירות</th>
                                <th className="text-right text-xs text-gray-500 font-medium pb-2 w-36">מחיר</th>
                                <th className="text-right text-xs text-gray-500 font-medium pb-2">תיאור</th>
                              </tr>
                            </thead>
                            <tbody>
                              {option.phases.map((p, pi) => (
                                <tr key={pi} className="border-b border-gray-50">
                                  <td className="py-2 font-medium">{p.name}</td>
                                  <td className="py-2 font-medium" style={{ color: brandColor }}>{fmt(p.price, currSym)}</td>
                                  <td className="py-2 text-gray-500 text-xs">{p.description}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                        {/* Option price summary */}
                        <div className="bg-gray-50 rounded-xl p-4 max-w-xs mr-auto price-summary">
                          <div className="space-y-1.5 text-sm">
                            {option.discount_percent && (
                              <div className="flex justify-between text-gray-500">
                                <span>הנחה ({option.discount_percent}%)</span>
                                <span className="text-red-500">−{fmt(optPrices.discount, currSym)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-gray-600">
                              <span>לפני מע״מ</span>
                              <span>{fmt(optPrices.afterDiscount, currSym)}</span>
                            </div>
                            <div className="flex justify-between text-gray-500">
                              <span>מע״מ {vatPct}%</span>
                              <span>{fmt(optPrices.vat, currSym)}</span>
                            </div>
                            <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200" style={{ color: brandColor }}>
                              <span>סה״כ כולל מע״מ</span>
                              <span>{fmt(optPrices.total, currSym)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ── Single pricing ── */
              <>
                {(quote.phases || []).length > 0 && (
                  <table className="w-full text-sm mb-5">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-right text-xs text-gray-500 font-medium pb-2">שלב / שירות</th>
                        <th className="text-right text-xs text-gray-500 font-medium pb-2 w-36">מחיר</th>
                        <th className="text-right text-xs text-gray-500 font-medium pb-2">תיאור</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quote.phases.map((p, i) => (
                        <tr key={i} className="border-b border-gray-50">
                          <td className="py-2.5 font-medium">{p.name}</td>
                          <td className="py-2.5 font-medium" style={{ color: brandColor }}>{fmt(p.price, currSym)}</td>
                          <td className="py-2.5 text-gray-500 text-xs">{p.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {/* Price summary */}
                <div className="bg-gray-50 rounded-xl p-5 max-w-xs mr-auto price-summary">
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>לפני הנחה</span>
                      <span>{fmt(prices.subtotal, currSym)}</span>
                    </div>
                    {quote.discount_percent && (
                      <div className="flex justify-between text-gray-500">
                        <span>הנחה ({quote.discount_percent}%)</span>
                        <span className="text-red-500">−{fmt(prices.discount, currSym)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-gray-600">
                      <span>לפני מע״מ</span>
                      <span>{fmt(prices.afterDiscount, currSym)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>מע״מ {vatPct}%</span>
                      <span>{fmt(prices.vat, currSym)}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200" style={{ color: brandColor }}>
                      <span>סה״כ כולל מע״מ</span>
                      <span>{fmt(prices.total, currSym)}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {/* Section 03 — Third Party Costs */}
        {showThirdParty && (quote.third_party_costs || []).length > 0 && (
          <section className="mb-8">
            <h3 className="text-sm font-bold uppercase tracking-widest mb-4 pb-2 border-b border-gray-200" style={{ color: brandColor }}>
              {sections.third_party?.title || '03 | עלויות צד שלישי'}
            </h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-right text-xs text-gray-500 font-medium pb-2">שירות</th>
                  <th className="text-right text-xs text-gray-500 font-medium pb-2 w-36">עלות משוערת</th>
                </tr>
              </thead>
              <tbody>
                {quote.third_party_costs.map((t, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">{t.service}</td>
                    <td className="py-2 text-gray-700">{fmt(t.cost, currSym)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-400 mt-2">* עלויות אלו אינן כלולות במחיר הצעה זו ומשולמות ישירות לצד השלישי</p>
          </section>
        )}

        {/* Section 04 — Terms */}
        {showTerms && (
          <section className="mb-8">
            <h3 className="text-sm font-bold uppercase tracking-widest mb-4 pb-2 border-b border-gray-200" style={{ color: brandColor }}>
              {sections.terms?.title || '04 | תנאים ולוח זמנים'}
            </h3>
            {/* Timeline */}
            {(quote.timeline || []).length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">לוח זמנים</p>
                <table className="w-full text-sm">
                  <tbody>
                    {quote.timeline.map((t, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-2 font-medium text-gray-700 w-1/3">{t.stage}</td>
                        <td className="py-2 text-gray-500">{t.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {/* Payment */}
            {(quote.payment_terms || []).length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">תנאי תשלום</p>
                <ul className="space-y-1">
                  {quote.payment_terms.map((t, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span style={{ color: brandColor }} className="mt-0.5 flex-shrink-0">◈</span>{t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/* Warranty */}
            {(quote.warranty || []).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">אחריות</p>
                <ul className="space-y-1">
                  {quote.warranty.map((t, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span style={{ color: brandColor }} className="mt-0.5 flex-shrink-0">◈</span>{t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* Custom sections */}
        {(quote.custom_sections || []).filter(cs => cs.visible !== false).map((cs, i) => (
          <section key={i} className="mb-8">
            <h3 className="text-sm font-bold uppercase tracking-widest mb-4 pb-2 border-b border-gray-200" style={{ color: brandColor }}>
              {cs.title}
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{cs.content}</p>
          </section>
        ))}

        {/* Closing text */}
        {quote.closing_text && (
          <div className="mt-8 mb-10">
            <p className="text-sm text-gray-700 whitespace-pre-line">{quote.closing_text}</p>
          </div>
        )}

        {/* Signature block */}
        {quote.show_signature && !isPrint && quote.status !== 'approved' && !signed && (
          <section className="mb-8 border-t border-gray-200 pt-8">
            <h3 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: brandColor }}>
              {quote.signature_label || 'חתימה ואישור'}
            </h3>
            {!signMode ? (
              <div className="flex flex-col items-start gap-3">
                <p className="text-sm text-gray-600">לאישור ההצעה, לחץ על הכפתור למטה וחתום דיגיטלית.</p>
                <button
                  onClick={() => setSignMode(true)}
                  className="px-5 py-2.5 rounded-xl text-white text-sm font-medium transition-all"
                  style={{ backgroundColor: brandColor }}
                >
                  אני מאשר את ההצעה ←
                </button>
              </div>
            ) : (
              <div className="max-w-lg">
                <div className="flex gap-3 mb-4">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">שם מלא</label>
                    <input
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-brand"
                      style={{ '--tw-ring-color': brandColor + '30' }}
                      value={sigName}
                      onChange={e => setSigName(e.target.value)}
                      placeholder="שמך המלא..."
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">תאריך</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2"
                      value={sigDate}
                      onChange={e => setSigDate(e.target.value)}
                    />
                  </div>
                </div>
                {/* Signature type tabs */}
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${sigType === 'draw' ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    style={sigType === 'draw' ? { backgroundColor: brandColor } : {}}
                    onClick={() => setSigType('draw')}
                  >חתימה ידנית</button>
                  <button
                    type="button"
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${sigType === 'type' ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    style={sigType === 'type' ? { backgroundColor: brandColor } : {}}
                    onClick={() => setSigType('type')}
                  >חתימה מוקלדת</button>
                </div>
                {sigType === 'draw' ? (
                  <SignaturePad onSave={setSigData} />
                ) : (
                  <input
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg italic text-xl"
                    style={{ fontFamily: 'cursive' }}
                    value={sigData}
                    onChange={e => setSigData(e.target.value)}
                    placeholder="חתמו כאן..."
                  />
                )}
                <div className="flex gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setSignMode(false)}
                    className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                  >ביטול</button>
                  <button
                    type="button"
                    onClick={handleSign}
                    disabled={submitting || !sigName.trim()}
                    className="px-5 py-2 text-sm text-white rounded-lg font-medium disabled:opacity-50 transition-all"
                    style={{ backgroundColor: brandColor }}
                  >
                    {submitting ? 'שומר...' : 'אני מאשר/ת את ההצעה'}
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Signed confirmation */}
        {(quote.status === 'approved' || signed) && quote.show_signature && !isPrint && (
          <div className="mt-8 p-4 bg-green-50 rounded-xl border border-green-200">
            <p className="text-sm text-green-700 font-medium">ההצעה אושרה חתומה ✓</p>
            {quote.signature_name && <p className="text-xs text-green-600 mt-0.5">חתמו: {quote.signature_name} | {fmtDate(quote.signature_date || quote.approved_at)}</p>}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-400 text-center">{footerText}</p>
        </footer>
      </div>
    </div>
    </>
  );
}
