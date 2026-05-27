import React, { useState, useRef, useEffect } from 'react';
import { aiGenerateQuote, aiChat } from '../api';

const SUGGESTIONS = [
  'צור הצעה לאתר עסקי + SEO',
  'הצעה לחנות מקוונת עם Meta Ads',
  'פרויקט מיתוג + נוכחות דיגיטלית',
  'אתר תדמית + ניהול רשתות חברתיות',
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
        {msg.hasUpdate && (
          <button
            onClick={msg.onApply}
            className="mt-2 flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            החל שינויים
          </button>
        )}
      </div>
    </div>
  );
}

export default function AIAssistant({ quoteState, onApply, brandColor = '#D4642A' }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('brief'); // 'brief' | 'chat'
  const [brief, setBrief] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'שלום! אני עוזר ה-AI של OrrDDM 👋\n\nאוכל לעזור לך ב-2 דרכים:\n• כתוב לי בריף קצר ואמלא עבורך את כל ההצעה\n• שלח לי הודעה ואשנה חלקים ספציפיים בהצעה הקיימת',
    },
  ]);
  const [generating, setGenerating] = useState(false);
  const messagesEnd = useRef(null);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleGenerateFromBrief = async () => {
    if (!brief.trim() || generating) return;
    const userMsg = brief.trim();
    setBrief('');
    setMessages(m => [...m, { role: 'user', content: userMsg }, { role: 'assistant', content: '', loading: true }]);
    setGenerating(true);

    try {
      const res = await aiGenerateQuote(userMsg, quoteState);
      setMessages(m => {
        const updated = [...m];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: `יצרתי עבורך הצעה מלאה ✅\n\nכולל:\n• ${(res.quote.phases || []).length} שלבי תמחור\n• ${(res.quote.services || []).length} שירותים\n• לוח זמנים ותנאי תשלום\n\nלחץ על "החל הצעה" להזרמת התוכן לטופס.`,
          hasUpdate: true,
          update: res.quote,
          onApply: () => {
            onApply(res.quote, 'full');
            setMessages(m2 => [...m2, { role: 'assistant', content: 'ההצעה הוחלה בהצלחה! ✨ תוכל לערוך כל שדה לפי הצורך.' }]);
          },
        };
        return updated;
      });
      setMode('chat');
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

  const handleChat = async () => {
    if (!chatInput.trim() || generating) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setMessages(m => [...m, { role: 'user', content: userMsg }, { role: 'assistant', content: '', loading: true }]);
    setGenerating(true);

    try {
      const res = await aiChat(userMsg, quoteState);
      setMessages(m => {
        const updated = [...m];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: res.message,
          hasUpdate: !!res.update,
          update: res.update,
          onApply: res.update ? () => {
            onApply(res.update, 'partial');
            setMessages(m2 => [...m2, { role: 'assistant', content: 'השינויים הוחלו ✓' }]);
          } : undefined,
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

  const handleKeyDown = (e, fn) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); fn(); }
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
          <div className="relative bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col w-full sm:w-[400px] h-[85vh] sm:h-[600px] overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100" style={{ background: `linear-gradient(135deg, ${brandColor}15, ${brandColor}05)` }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: brandColor }}>AI</div>
                <div>
                  <p className="text-sm font-semibold text-dark">עוזר AI</p>
                  <p className="text-xs text-gray-400">מופעל על Claude</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => setMode('brief')}
                    className={`px-2.5 py-1 text-xs font-medium transition-colors ${mode === 'brief' ? 'text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                    style={mode === 'brief' ? { backgroundColor: brandColor } : {}}
                  >בריף</button>
                  <button
                    onClick={() => setMode('chat')}
                    className={`px-2.5 py-1 text-xs font-medium transition-colors ${mode === 'chat' ? 'text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                    style={mode === 'chat' ? { backgroundColor: brandColor } : {}}
                  >צ׳אט</button>
                </div>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors mr-0.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
              {messages.map((msg, i) => <Message key={i} msg={msg} />)}
              <div ref={messagesEnd} />
            </div>

            {/* Input area */}
            <div className="border-t border-gray-100 p-3 bg-gray-50/50">
              {mode === 'brief' ? (
                <>
                  {/* Quick suggestion chips */}
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
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:border-brand resize-none"
                      style={{ '--tw-ring-color': brandColor + '30' }}
                      rows={3}
                      value={brief}
                      onChange={e => setBrief(e.target.value)}
                      onKeyDown={e => handleKeyDown(e, handleGenerateFromBrief)}
                      placeholder="תאר את ההצעה שאתה רוצה ליצור...&#10;לדוג׳: אתר לקפה אופק, דף נחיתה + ניהול רשתות, תקציב ~12,000₪"
                      disabled={generating}
                    />
                    <button
                      onClick={handleGenerateFromBrief}
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
                </>
              ) : (
                <div className="flex gap-2">
                  <textarea
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:border-brand resize-none"
                    rows={2}
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => handleKeyDown(e, handleChat)}
                    placeholder="הוסף/שנה מחיר, הסר שלב, שכתב תקציר..."
                    disabled={generating}
                  />
                  <button
                    onClick={handleChat}
                    disabled={!chatInput.trim() || generating}
                    className="px-3 rounded-xl text-white text-sm disabled:opacity-40 transition-all hover:opacity-90 self-end h-10"
                    style={{ backgroundColor: brandColor }}
                  >
                    {generating ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    )}
                  </button>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1.5 text-center">מופעל על Claude API · המחיר נגבה מחשבון Anthropic שלך</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
