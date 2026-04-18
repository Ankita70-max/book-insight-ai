'use client';
import { useState, useEffect } from 'react';
import { fetchBooks, getInsight, queryRAG } from '@/lib/api';
import { Cpu, BarChart2, BookOpen, TrendingUp } from 'lucide-react';

export default function InsightsPage() {
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState('');
  const [analysisResults, setAnalysisResults] = useState({});
  const [loading, setLoading] = useState({});
  const [genreStats, setGenreStats] = useState([]);

  useEffect(() => {
    fetchBooks({ page_size: 100 }).then(d => {
      const list = d.results || d;
      setBooks(list);

      // Compute genre distribution
      const counts = {};
      list.forEach(b => {
        const g = b.genre || 'Unknown';
        counts[g] = (counts[g] || 0) + 1;
      });
      const sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([genre, count]) => ({ genre, count }));
      setGenreStats(sorted);
    }).catch(() => {});
  }, []);

  const runAnalysis = async (type) => {
    if (!selectedBook) return;
    setLoading(l => ({ ...l, [type]: true }));
    try {
      const data = await getInsight(parseInt(selectedBook), type);
      setAnalysisResults(r => ({ ...r, [type]: data }));
    } catch (e) {
      setAnalysisResults(r => ({ ...r, [type]: { error: 'Analysis failed. Check API key.' } }));
    }
    setLoading(l => ({ ...l, [type]: false }));
  };

  const maxCount = genreStats[0]?.count || 1;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold text-parchment mb-2 flex items-center gap-2">
        <Cpu size={28} className="text-amber-400" /> AI Insights Dashboard
      </h1>
      <p className="text-stone-400 text-sm mb-8">Analyze books with AI — summaries, genre classification, and sentiment analysis.</p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Genre Chart */}
        <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-6">
          <h2 className="font-display text-lg text-amber-300 mb-4 flex items-center gap-2">
            <BarChart2 size={18} /> Genre Distribution
          </h2>
          {genreStats.length === 0 ? (
            <p className="text-stone-500 text-sm">No books in library yet. Scrape some books first.</p>
          ) : (
            <div className="space-y-2">
              {genreStats.map(({ genre, count }) => (
                <div key={genre} className="flex items-center gap-3">
                  <span className="text-xs text-stone-400 w-32 truncate text-right">{genre}</span>
                  <div className="flex-1 bg-stone-800 rounded-full h-5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-800 to-amber-600 rounded-full flex items-center justify-end pr-2 transition-all duration-700"
                      style={{ width: `${(count / maxCount) * 100}%` }}>
                      <span className="text-xs text-amber-100 font-bold">{count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Library Stats */}
        <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-6">
          <h2 className="font-display text-lg text-amber-300 mb-4 flex items-center gap-2">
            <TrendingUp size={18} /> Library Overview
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm border-b border-stone-800 pb-2">
              <span className="text-stone-400">Total books</span>
              <span className="text-parchment font-bold">{books.length}</span>
            </div>
            <div className="flex justify-between text-sm border-b border-stone-800 pb-2">
              <span className="text-stone-400">Unique genres</span>
              <span className="text-parchment font-bold">{genreStats.length}</span>
            </div>
            <div className="flex justify-between text-sm border-b border-stone-800 pb-2">
              <span className="text-stone-400">Avg rating</span>
              <span className="text-parchment font-bold">
                {books.length > 0
                  ? (books.reduce((s, b) => s + (b.rating || 0), 0) / books.filter(b => b.rating).length || 0).toFixed(1)
                  : '—'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-400">Top genre</span>
              <span className="text-amber-400 font-bold">{genreStats[0]?.genre || '—'}</span>
            </div>
          </div>

          {/* Top rated */}
          <h3 className="text-sm text-stone-400 mt-4 mb-2">Top Rated Books</h3>
          <div className="space-y-1">
            {[...books].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 3).map(b => (
              <div key={b.id} className="flex items-center gap-2 text-xs">
                <span className="text-amber-500">★ {b.rating}</span>
                <span className="text-stone-300 truncate">{b.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Per-book analysis */}
      <div className="mt-6 bg-stone-900/60 border border-stone-800 rounded-xl p-6">
        <h2 className="font-display text-lg text-amber-300 mb-4 flex items-center gap-2">
          <BookOpen size={18} /> Analyze a Book
        </h2>

        <div className="flex flex-wrap gap-3 mb-6">
          <select value={selectedBook} onChange={e => { setSelectedBook(e.target.value); setAnalysisResults({}); }}
            className="flex-1 min-w-[200px] bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-parchment focus:outline-none focus:border-amber-700">
            <option value="">Select a book...</option>
            {books.map(b => (
              <option key={b.id} value={b.id}>{b.title.slice(0, 60)}</option>
            ))}
          </select>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {[
            { type: 'summary', label: '📝 Summary', desc: 'AI-generated book summary' },
            { type: 'genre', label: '🏷️ Genre Classification', desc: 'Predict genre using AI' },
            { type: 'sentiment', label: '💬 Sentiment Analysis', desc: 'Analyze review sentiment' },
          ].map(({ type, label, desc }) => (
            <div key={type} className="bg-stone-800/60 border border-stone-700 rounded-xl p-4">
              <h3 className="text-amber-200 font-medium text-sm mb-1">{label}</h3>
              <p className="text-stone-500 text-xs mb-3">{desc}</p>
              <button
                onClick={() => runAnalysis(type)}
                disabled={!selectedBook || loading[type]}
                className="w-full py-2 bg-amber-900/60 hover:bg-amber-800 disabled:opacity-40 border border-amber-800/50 rounded-lg text-xs font-medium transition-colors">
                {loading[type] ? '⏳ Analyzing...' : 'Run Analysis'}
              </button>
              {analysisResults[type] && (
                <div className="mt-3 p-3 bg-stone-900/80 rounded-lg text-xs text-parchment/80 animate-fade-in leading-relaxed">
                  {analysisResults[type].error ? (
                    <span className="text-red-400">{analysisResults[type].error}</span>
                  ) : type === 'sentiment' ? (
                    <div>
                      <span className={`font-bold capitalize ${
                        analysisResults[type].insight?.sentiment === 'positive' ? 'text-green-400' :
                        analysisResults[type].insight?.sentiment === 'negative' ? 'text-red-400' : 'text-yellow-400'
                      }`}>{analysisResults[type].insight?.sentiment}</span>
                      <span className="text-stone-500 ml-2">score: {analysisResults[type].insight?.score}</span>
                    </div>
                  ) : (
                    typeof analysisResults[type].insight === 'string'
                      ? analysisResults[type].insight
                      : JSON.stringify(analysisResults[type].insight)
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
