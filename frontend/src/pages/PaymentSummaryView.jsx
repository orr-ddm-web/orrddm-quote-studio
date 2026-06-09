import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

// Fetch from backend (includes settings)
async function fetchData(id) {
  const res = await fetch(`/api/payment-summaries/public/${id}`);
  if (!res.ok) throw new Error('Not found');
  return res.json();
}

function fmt(n, sym = '₪') {
  return `${sym}${Number(n || 0).toLocaleString('he-IL', { maximumFractionDigits: 0 })}`;
}
function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function PaymentSummaryView() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isPrint = searchParams.get('print') === 'true';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData(id)
      .then(setData)
      .catch(() => setError('מסמך לא נמצא'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-7 h-7 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (error || !data) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">מסמך לא נמצא</p>
    </div>
  );

  const { items, settings, vat_percent, client_name, date, notes } = data;
  const brandColor = settings?.brand_color || '#D4642A';
  const currSym = settings?.currency_symbol || '₪';
  const businessName = settings?.business_name || 'OrrDDM';
  const logoPath = settings?.logo_path;
  const footerText = settings?.footer_text || '';

  const vatRate = (vat_percent || 18) / 100;
  const subtotal = (items || []).reduce((s, it) => {
    const p = parseFloat(it.price) || 0;
    return s + (it.vat_included ? p / (1 + vatRate) : p);
  }, 0);
  const vatAmt = subtotal * vatRate;
  const total = subtotal + vatAmt;

  // Payment details
  const bankOwner = settings?.payment_account_owner || '';
  const bankName = settings?.payment_bank_name || '';
  const bankNum = settings?.payment_bank_number || '';
  const branchNum = settings?.payment_bank_branch || '';
  const accountNum = settings?.payment_bank_account || '';
  const bitNumber = settings?.payment_bit_number || '';
  const creditLink = settings?.payment_credit_link || '';

  return (
    <>
      <style>{`
        @page { size: A4; margin: 18mm 14mm; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          section { break-inside: avoid; page-break-inside: avoid; }
          tr { break-inside: avoid; page-break-inside: avoid; }
          thead { display: table-header-group; }
          .payment-block { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      {/* Download button (hidden in print) */}
      {!isPrint && (
        <div className="no-print fixed top-4 left-4 z-50">
          <button
            onClick={() => window.open(`/api/pdf/payment-summary/${id}`, '_blank')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl shadow-lg text-sm font-medium text-white"
            style={{ backgroundColor: brandColor }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            הורד PDF
          </button>
        </div>
      )}

      <div
        className="min-h-screen bg-[#FDF8F5] text-[#1a1a1a]"
        dir="rtl"
        style={{ fontFamily: '"Google Sans", Inter, system-ui, sans-serif' }}
      >
        <div className="max-w-[800px] mx-auto px-6 py-10 print-outer">

          {/* Header */}
          <div className="flex items-start justify-between mb-10">
            <div>
              {logoPath
                ? <img src={logoPath} alt={businessName} className="h-12 object-contain mb-2" />
                : <div className="text-3xl font-bold mb-2" style={{ color: brandColor }}>{businessName}</div>
              }
            </div>
            <div className="text-left">
              <p className="text-xs text-gray-500">תאריך: {fmtDate(date)}</p>
              <p className="text-sm font-semibold text-gray-700 mt-1">סיכום לתשלום</p>
            </div>
          </div>

          {/* Client */}
          <div className="border-r-4 pr-4 mb-8" style={{ borderColor: brandColor }}>
            <h2 className="text-2xl font-bold text-[#1a1a1a] mb-0.5">{client_name}</h2>
            <p className="text-sm font-medium" style={{ color: brandColor }}>פירוט עבודות שבוצעו</p>
          </div>

          {/* Work items table */}
          <section className="mb-8">
            <h3 className="text-xs font-bold uppercase tracking-widest mb-4 pb-2 border-b border-gray-200" style={{ color: brandColor }}>
              פירוט עבודות ותמחור
            </h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-right font-semibold text-gray-700 pb-3 pr-1">תיאור עבודה</th>
                  <th className="text-left font-semibold text-gray-700 pb-3 w-32">מחיר</th>
                </tr>
              </thead>
              <tbody>
                {(items || []).map((it, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-3 pr-1 text-gray-800">{it.description}</td>
                    <td className="py-3 text-left font-medium" style={{ color: brandColor }}>
                      <span>{fmt(it.price, currSym)}</span>
                      {it.vat_included && (
                        <span className="mr-1.5 text-xs font-normal text-gray-400">(כולל מע״מ)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="mt-5 flex justify-end">
              <div className="w-72 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600 py-1">
                  <span>סכום לפני מע״מ</span>
                  <span className="font-medium">{fmt(subtotal, currSym)}</span>
                </div>
                <div className="flex justify-between text-gray-500 py-1">
                  <span>מע״מ {vat_percent}%</span>
                  <span>{fmt(vatAmt, currSym)}</span>
                </div>
                <div className="flex justify-between py-2 border-t-2 border-gray-300 text-base font-bold" style={{ color: brandColor }}>
                  <span>סה״כ לתשלום</span>
                  <span>{fmt(total, currSym)}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Notes */}
          {notes && (
            <section className="mb-8">
              <h3 className="text-xs font-bold uppercase tracking-widest mb-3 pb-2 border-b border-gray-200" style={{ color: brandColor }}>
                הערות
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">{notes}</p>
            </section>
          )}

          {/* Payment methods */}
          <section className="mb-10 payment-block">
            <h3 className="text-xs font-bold uppercase tracking-widest mb-4 pb-2 border-b border-gray-200" style={{ color: brandColor }}>
              דרכי תשלום
            </h3>
            <div className="grid grid-cols-1 gap-4">

              {/* Bank transfer */}
              {accountNum && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs font-bold text-gray-500 mb-2">העברה בנקאית</p>
                  {bankOwner && <p className="text-sm font-semibold text-dark">{bankOwner}</p>}
                  <div className="mt-1.5 space-y-0.5 text-sm text-gray-600">
                    {bankName && <p>בנק: <span className="font-medium text-dark">{bankName}</span> {bankNum && `(${bankNum})`}</p>}
                    {branchNum && <p>סניף: <span className="font-medium text-dark">{branchNum}</span></p>}
                    {accountNum && <p>מספר חשבון: <span className="font-medium text-dark font-mono">{accountNum}</span></p>}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Bit */}
                {bitNumber && (
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs font-bold text-gray-500 mb-2">ביט / פייבוקס</p>
                    <p className="text-lg font-bold font-mono" style={{ color: brandColor }}>{bitNumber}</p>
                  </div>
                )}

                {/* Credit card */}
                {creditLink && (
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs font-bold text-gray-500 mb-2">תשלום באשראי</p>
                    {isPrint ? (
                      <p className="text-xs text-gray-500 break-all">{creditLink}</p>
                    ) : (
                      <a
                        href={creditLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg text-white"
                        style={{ backgroundColor: brandColor }}
                      >
                        לינק לתשלום →
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-400 text-center">{footerText}</p>
          </footer>

        </div>
      </div>
    </>
  );
}
