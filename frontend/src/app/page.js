'use client';
import { useState, useEffect, useCallback } from 'react';
import { fetchBooks, fetchStats, fetchGenres } from '@/lib/api';
import BookCard from '@/components/BookCard';
import { Search, BarChart2, BookOpen, Database, Cpu, RefreshCw } from 'lucide-react';

function StatCard({ icon: Icon, label, value, color = 'amber' }) {
  const colorMap = {
    amber: 'text-amber-400 bg-amber-900/30 border-amber-800/40',
    green: 'text-green-400 bg-green-900/30 border-green-800/40',
    blue: 'text-blue-400 bg-blue-900/30 border-blue-800/40',
    purple: 'text-purple-400 bg-purple-900/30 border-purple-800/40',
  };
  return (
    <div className={`flex items-center gap-3 rounded-xl border p-4 ${colorMap[color]}`}>
      <Icon size={22} />
      <div>
        <div className="text-2xl font-bold font-display">{value ?? '—'}</div>
        <div className="text-xs opacity-70">{label}</div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl overflow-hidden border border-stone-800">
      <div className="skeleton h-52 w-full" />
      <div className="p-4 space-y-2">
        <div className="skeleton h-4 rounded w-3/4" />
        <div className="skeleton h-3 rounded w-1/2" />
        <div className="skeleton h-3 rounded w-full mt-2" />
      </div>
    </div>
  );
}

export default function HomePage() {
  const [books, setBooks] = useState([]);
  const [stats, setStats] = useState(null);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [minRating, setMinRating] = useState('');
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);

  const loadBooks = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page };
      if (search) params.search = search;
      if (selectedGenre) params.genre = selectedGenre;
      if (minRating) params.min_rating = minRating;
      const data = await fetchBooks(params);
      setBooks(data.results || data);
      setHasNext(!!data.next);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [search, selectedGenre, minRating, page]);

  useEffect(() => { loadBooks(); }, [loadBooks]);

  useEffect(() => {
    fetchStats().then(setStats).catch(() => {});
    fetchGenres().then(d => setGenres(d.genres || [])).catch(() => {});
  }, []);

  const handleSearch = (e) => { e.preventDefault(); setPage(1); };

  // Called by BookCard when a book is deleted
  const handleBookDeleted = (deletedId) => {
    setBooks(prev => prev.filter(b => b.id !== deletedId));
    fetchStats().then(setStats).catch(() => {});
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="text-center mb-10">
        <h1 className="font-display text-4xl md:text-5xl font-bold text-parchment mb-3">
          📚 BookInsight <span className="text-amber-400">AI</span>
        </h1>
        <p className="text-stone-400 text-lg max-w-xl mx-auto">
          AI-powered book discovery with RAG-based Q&A, semantic search, and intelligent recommendations.
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <StatCard icon={BookOpen} label="Total Books" value={stats.total_books} color="amber" />
          <StatCard icon={Database} label="Indexed Books" value={stats.indexed_books} color="green" />
          <StatCard icon={Cpu} label="Vector Chunks" value={stats.total_chunks} color="blue" />
          <StatCard icon={BarChart2} label="Queries Run" value={stats.total_queries} color="purple" />
        </div>
      )}

      {/* Filters */}
      <form onSubmit={handleSearch} className="flex flex-wrap gap-3 mb-8">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search title, author, description..."
            className="w-full bg-stone-900 border border-stone-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-parchment placeholder:text-stone-600 focus:outline-none focus:border-amber-700"
          />
        </div>
        <select value={selectedGenre} onChange={e => { setSelectedGenre(e.target.value); setPage(1); }}
          className="bg-stone-900 border border-stone-700 rounded-lg px-3 py-2.5 text-sm text-parchment focus:outline-none focus:border-amber-700">
          <option value="">All Genres</option>
          {genres.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={minRating} onChange={e => { setMinRating(e.target.value); setPage(1); }}
          className="bg-stone-900 border border-stone-700 rounded-lg px-3 py-2.5 text-sm text-parchment focus:outline-none focus:border-amber-700">
          <option value="">Any Rating</option>
          {[3, 4, 5].map(r => <option key={r} value={r}>≥ {r} ★</option>)}
        </select>
        <button type="submit"
          className="bg-amber-700 hover:bg-amber-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
          <RefreshCw size={14} /> Search
        </button>
      </form>

      {/* Book Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-24 text-stone-500">
          <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg">No books found.</p>
          <p className="text-sm mt-2">
            Go to <strong className="text-amber-500">Admin</strong> → Scrape Books to get started.
          </p>
        </div>
      ) : (
        <>
          <p className="text-stone-500 text-xs mb-3">
            Hover over a book card to see the 🗑️ delete button.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {books.map(book => (
              <BookCard key={book.id} book={book} onDeleted={handleBookDeleted} />
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      <div className="flex justify-center gap-3 mt-8">
        {page > 1 && (
          <button onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 bg-stone-800 border border-stone-700 rounded-lg text-sm text-parchment hover:bg-stone-700 transition-colors">
            ← Previous
          </button>
        )}
        {hasNext && (
          <button onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 bg-amber-800 border border-amber-700 rounded-lg text-sm text-parchment hover:bg-amber-700 transition-colors">
            Next →
          </button>
        )}
      </div>
    </div>
  );
}
