import React, { useState, useRef, useEffect } from 'react';
import { aiPaymentSummary } from '../api';

const SUGGESTIONS = [
  'בניית אתר תדמית',
  'ניהול רשתות חברתיות',
  'קמפיין Meta Ads',
  'עיצוב ופיתוח דף נחיתה',
  'SEO ואופטימיזציה',
];

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-2 mb-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${isUser ? 'bg-brand text-white' : 'bg-gray-100 text-gray-600'}`}>
        {isUser ? 'Or' : 'AI'}
      </div>
      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${isUser ? 'bg-brand text-white rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm'}`}>
        {msg.loading ? (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        ) : (
          <div className="whitespace-pre-wrap">{msg.content}</div>
        )}
        {msg.suggestedItems && (
          <div className="mt-3 space-y-1.5">
            {msg.suggestedItems.map((item, i) => (
              <div key={i} className="bg-white/20 rounded-lg px-2.5 py-1.5 text-xs">
                <span className="font-medium">{item.description}</span>
                <span className="opacity-75 mr-2"> — ₪{Number(item.price).toLocaleString('he-IL')}</span>
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => msg.onAdd && msg.onAdd()}
                className="flex-1 text-xs font-medium px-2.5 py-1.5 bg-white/25 hover:bg-white/35 rounded-lg transition-colors"
              >
                ➕ הוסף לפריטים הקיימים
              </button>
              <button
                onClick={() => msg.onReplace && msg.onReplace()}
                className="flex-1 text-xs font-medium px-2.5 py-1.5 bg-white/25 hover:bg-white/35 rounded-lg transition-colors"
              >
                🔄 החלף פריטים
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AIAssistantPS({ currentItems = [], onAdd, onReplace, brandColor = '#D4642A' }) {
  const [open, setOpen] = useState(false);
  const [brief, setBrief] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'שלום! 👋\n\nתאר לי בקצרה את העבודה שביצעת ואני אמלא עבורך פירוט פריטים עם מחירים מוצעים.\n\nלדוגמה: "בניתי אתר ל-3 עמודים + לוגו + SEO בסיסי"',
    },
  ]);
  const [generating, setGenerating] = useState(false);
  const messagesEnd = useRef(null);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleGenerate = async () => {
    if (!brief.trim() || generating) return;
    const userMsg = brief.trim();
    setBrief('');
    setMessages(m => [...m, { role: 'user', content: userMsg }, { role: 'assistant', content: '', loading: true }]);
    setGenerating(true);

    try {
      const res = await aiPaymentSummary(userMsg, currentItems);
      const items = res.items || [];
      const aiMessage = res.message || 'הנה הפריטים המוצעים:';

      setMessages(m => {
        const updated = [...m];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: `${aiMessage}\n\nבחר איך להוסיף:`,
          suggestedItems: items,
          onAdd: () => {
            onAdd(items);
            setMessages(m2 => [...m2, { role: 'assistant', content: `✅ נוספו ${items.length} פריטים לרשימה הקיימת.` }]);
          },
          onReplace: () => {
            onReplace(items);
            setMessages(m2 => [...m2, { role: 'assistant', content: `✅ הפריטים הוחלפו ב-${items.length} פריטים חדשים.` }]);
          },
        };
        return updated;
      });
    } catch (e) {
      const errMsg = e.response?.data?.error || e.message;
      setMessages(m => {
        const updated = [...m];
        updated[updated.length - 1] = { role: 'assistant', content: `שגיאה: ${errMsg}` };
        return updated;
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); }
  };

  return (
    <>
      {/* FAB button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-40 flex items-center gap-2 px-4 py-3 rounded-2xl text-white shadow-2xl text-sm font-medium no-print transition-all hover:scale-105"
        style={{ backgroundColor: brandColor }}
        title="עוזר AI"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <span>עוזר AI</span>
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end p-0 sm:p-4 no-print">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm sm:hidden" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col w-full sm:w-[400px] h-[80vh] sm:h-[560px] overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100" style={{ background: `linear-gradient(135deg, ${brandColor}15, ${brandColor}05)` }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: brandColor }}>AI</div>
                <div>
                  <p className="text-sm font-semibold text-dark">עוזר AI — סיכום תשלום</p>
                  <p className="text-xs text-gray-400">מופעל על Claude</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
              {messages.map((msg, i) => <Message key={i} msg={msg} />)}
              <div ref={messagesEnd} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-100 p-3 bg-gray-50/50">
              {/* Quick suggestions */}
              <div className="flex gap-1.5 mb-2.5 overflow-x-auto pb-1">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => setBrief(s)}
                    className="whitespace-nowrap px-2.5 py-1 rounded-full border border-gray-200 text-xs text-gray-600 hover:border-brand hover:text-brand bg-white transition-colors flex-shrink-0"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <textarea
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 resize-none"
                  rows={3}
                  value={brief}
                  onChange={e => setBrief(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="תאר את העבודה שביצעת...&#10;לדוג׳: אתר 4 עמודים, עיצוב לוגו, ניהול FB חודש"
                  disabled={generating}
                />
                <button
                  onClick={handleGenerate}
                  disabled={!brief.trim() || generating}
                  className="px-3 rounded-xl text-white text-sm font-medium disabled:opacity-40 transition-all hover:opacity-90 self-end h-10"
                  style={{ backgroundColor: brandColor }}
                >
                  {generating ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1.5 text-center">מופעל על Claude API</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
