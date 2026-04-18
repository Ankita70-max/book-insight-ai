'use client';
import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { queryRAG, fetchQueryHistory } from '@/lib/api';
import { Send, BookOpen, Clock, Search, Cpu } from 'lucide-react';

function QAContent() {
  const params = useSearchParams();
  const bookId = params.get('book_id');
  const bookTitle = params.get('book_title');

  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    fetchQueryHistory().then(d => setHistory(d.results || d || [])).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!question.trim() || loading) return;

    const q = question.trim();
    setQuestion('');
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setLoading(true);

    try {
      const data = await queryRAG({
        question: q,
        book_id: bookId ? parseInt(bookId) : undefined,
        top_k: 5,
      });
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: data.answer,
        sources: data.sources || [],
        chunks: data.chunks_retrieved || 0,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: '⚠️ Error: Could not reach the backend. Make sure Django server is running on port 8000.',
        sources: [],
      }]);
    }
    setLoading(false);
  };

  const suggestions = [
    'What books do you have about mystery?',
    'Recommend a romance novel',
    'Which books have the highest ratings?',
    'Tell me about classic fiction in your library',
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Header */}
      <div className="mb-4">
        <h1 className="font-display text-2xl font-bold text-parchment flex items-center gap-2">
          <Cpu size={24} className="text-amber-400" /> Ask BookInsight AI
        </h1>
        {bookTitle && (
          <div className="mt-2 flex items-center gap-2 text-sm text-amber-400 bg-amber-900/20 border border-amber-800/30 rounded-lg px-3 py-1.5 w-fit">
            <BookOpen size={14} />
            <span>Focused on: <strong>{decodeURIComponent(bookTitle)}</strong></span>
          </div>
        )}
        {!bookTitle && (
          <p className="text-stone-400 text-sm mt-1">
            Ask anything about books in the library. The AI searches across all indexed content.
          </p>
        )}
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
        {messages.length === 0 && (
          <div className="py-8">
            <p className="text-stone-500 text-sm mb-4 text-center">Try one of these questions:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {suggestions.map(s => (
                <button key={s} onClick={() => setQuestion(s)}
                  className="text-left text-sm bg-stone-900/60 border border-stone-800 rounded-lg px-4 py-2.5 text-stone-400
                    hover:border-amber-700/50 hover:text-parchment transition-all">
                  <Search size={12} className="inline mr-2 text-amber-600" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
            {msg.role === 'assistant' && (
              <span className="text-2xl mr-2 mt-1 flex-shrink-0">📚</span>
            )}
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed
              ${msg.role === 'user'
                ? 'bg-amber-900/60 border border-amber-800/50 text-parchment rounded-br-sm'
                : 'bg-stone-900/80 border border-stone-700 text-parchment/90 rounded-bl-sm'
              }`}>
              <p className="answer-prose whitespace-pre-wrap">{msg.text}</p>

              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-stone-700/50">
                  <p className="text-xs text-stone-500 mb-1">Sources ({msg.chunks} chunks searched):</p>
                  <div className="flex flex-wrap gap-1">
                    {msg.sources.map((s, j) => (
                      <span key={j} className="text-xs bg-stone-800 border border-stone-700 rounded px-2 py-0.5 text-amber-400">
                        📖 {s.title?.slice(0, 30)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {msg.role === 'user' && (
              <span className="text-xl ml-2 mt-1 flex-shrink-0">🧑</span>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start animate-fade-in">
            <span className="text-2xl mr-2">📚</span>
            <div className="bg-stone-900/80 border border-stone-700 rounded-2xl rounded-bl-sm px-5 py-3">
              <div className="flex gap-1 items-center h-5">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder={bookId ? `Ask about "${bookTitle || 'this book'}"...` : "Ask about any book in the library..."}
          className="flex-1 bg-stone-900 border border-stone-700 rounded-xl px-4 py-3 text-sm text-parchment
            placeholder:text-stone-600 focus:outline-none focus:border-amber-700 transition-colors"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !question.trim()}
          className="bg-amber-700 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed
            text-white px-5 py-3 rounded-xl transition-colors flex items-center gap-2 text-sm font-medium">
          <Send size={16} />
        </button>
      </form>

      {/* History toggle */}
      {history.length > 0 && (
        <div className="mt-4">
          <button onClick={() => setShowHistory(!showHistory)}
            className="text-xs text-stone-500 hover:text-stone-400 flex items-center gap-1 transition-colors">
            <Clock size={12} /> {showHistory ? 'Hide' : 'Show'} query history ({history.length})
          </button>
          {showHistory && (
            <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
              {history.slice(0, 10).map(h => (
                <button key={h.id} onClick={() => setQuestion(h.question)}
                  className="w-full text-left text-xs bg-stone-900/60 border border-stone-800 rounded px-3 py-1.5 text-stone-400 hover:text-parchment transition-colors truncate">
                  Q: {h.question}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function QAPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen text-stone-500">Loading...</div>}>
      <QAContent />
    </Suspense>
  );
}
