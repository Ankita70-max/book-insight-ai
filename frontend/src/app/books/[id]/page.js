'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchBookDetail, fetchRecommendations, getInsight, deleteBook } from '@/lib/api';
import { ArrowLeft, BookOpen, Cpu, Lightbulb, Tag, Trash2 } from 'lucide-react';
import Link from 'next/link';

function StarRating({ rating }) {
  const filled = Math.round(rating || 0);
  return <span className="stars">{('★'.repeat(filled)) + ('☆'.repeat(5 - filled))}</span>;
}

function InsightPanel({ bookId }) {
  const [type, setType] = useState('summary');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runInsight = async () => {
    setLoading(true);
    setResult(null);
    try {
      const data = await getInsight(bookId, type);
      setResult(data);
    } catch (e) {
      setResult({ error: e.friendlyMessage || 'Failed to generate insight.' });
    }
    setLoading(false);
  };

  return (
    <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-5">
      <h3 className="font-display text-amber-300 text-lg mb-3 flex items-center gap-2">
        <Cpu size={18} /> AI Insights
      </h3>
      <div className="flex gap-2 mb-4">
        {['summary', 'genre', 'sentiment'].map(t => (
          <button key={t} onClick={() => setType(t)}
            className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-all
              ${type === t ? 'bg-amber-700 text-white' : 'bg-stone-800 text-stone-400 hover:bg-stone-700'}`}>
            {t}
          </button>
        ))}
      </div>
      <button onClick={runInsight} disabled={loading}
        className="w-full py-2 bg-amber-800 hover:bg-amber-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors mb-4">
        {loading ? '⏳ Generating...' : `Generate ${type}`}
      </button>
      {result && (
        <div className="bg-stone-800/60 rounded-lg p-4 text-sm text-parchment/90 animate-fade-in">
          {result.error ? (
            <p className="text-red-400">{result.error}</p>
          ) : type === 'sentiment' ? (
            <div className="space-y-1">
              <div className={`text-lg font-bold capitalize ${
                result.insight?.sentiment === 'positive' ? 'text-green-400' :
                result.insight?.sentiment === 'negative' ? 'text-red-400' : 'text-yellow-400'}`}>
                {result.insight?.sentiment} sentiment
              </div>
              <div className="text-stone-400 text-xs">Score: {result.insight?.score}</div>
              <div className="text-stone-400 text-xs">
                +{result.insight?.positive_signals} positive / -{result.insight?.negative_signals} negative signals
              </div>
            </div>
          ) : (
            <p className="leading-relaxed">
              {typeof result.insight === 'string' ? result.insight : JSON.stringify(result.insight)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function BookDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [book, setBook] = useState(null);
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchBookDetail(id).then(setBook).catch(() => setBook(null)).finally(() => setLoading(false));
    fetchRecommendations(id).then(d => setRecs(d.recommendations || [])).catch(() => {});
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteBook(id);
      router.push('/');
    } catch (e) {
      alert('Delete failed: ' + (e.friendlyMessage || e.message));
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 py-12 animate-pulse">
      <div className="skeleton h-8 w-32 rounded mb-6" />
      <div className="flex gap-8">
        <div className="skeleton h-80 w-56 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-4">
          <div className="skeleton h-8 rounded w-3/4" />
          <div className="skeleton h-4 rounded w-1/2" />
          <div className="skeleton h-24 rounded" />
        </div>
      </div>
    </div>
  );

  if (!book) return (
    <div className="max-w-5xl mx-auto px-4 py-20 text-center text-stone-500">
      <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
      <p>Book not found.</p>
      <Link href="/" className="text-amber-500 hover:underline mt-2 inline-block">← Back to Library</Link>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.back()}
          className="flex items-center gap-1 text-stone-400 hover:text-parchment text-sm transition-colors">
          <ArrowLeft size={16} /> Back
        </button>

        {/* Delete button */}
        {!showDeleteConfirm ? (
          <button onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1.5 text-red-500 hover:text-red-400 text-sm border border-red-900/50 hover:border-red-700 px-3 py-1.5 rounded-lg transition-all">
            <Trash2 size={14} /> Delete Book
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-red-400 text-sm">Are you sure?</span>
            <button onClick={handleDelete} disabled={deleting}
              className="bg-red-700 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
              {deleting ? 'Deleting...' : 'Yes, Delete'}
            </button>
            <button onClick={() => setShowDeleteConfirm(false)}
              className="bg-stone-700 hover:bg-stone-600 text-white text-xs px-3 py-1.5 rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-8 mb-10">
        {/* Cover */}
        <div className="flex-shrink-0">
          <div className="w-52 h-72 rounded-xl overflow-hidden bg-stone-800 shadow-xl shadow-black/50">
            {book.cover_image_url ? (
              <img src={book.cover_image_url} alt={book.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-600">
                <BookOpen size={56} />
              </div>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 space-y-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-parchment leading-tight">{book.title}</h1>
            {book.author && <p className="text-amber-400 italic mt-1">by {book.author}</p>}
          </div>

          {book.genre && (
            <div className="flex items-center gap-1 text-sm text-stone-400">
              <Tag size={14} className="text-amber-600" />
              <span>{book.genre}</span>
            </div>
          )}

          {book.rating > 0 && (
            <div className="flex items-center gap-2">
              <StarRating rating={book.rating} />
              <span className="text-parchment font-bold">{book.rating}</span>
              {book.rating_count > 0 && (
                <span className="text-stone-500 text-sm">({book.rating_count.toLocaleString()} ratings)</span>
              )}
            </div>
          )}

          {book.description && (
            <p className="text-stone-300 leading-relaxed text-sm border-l-2 border-amber-800 pl-4">
              {book.description}
            </p>
          )}

          {book.book_url && (
            <a href={book.book_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-amber-800 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <BookOpen size={16} /> View Book →
            </a>
          )}

          <div className="text-xs text-stone-600">
            Source: {book.source} | Indexed in ChromaDB: {book.chroma_indexed ? '✅ Yes' : '❌ No'}
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <div className="grid md:grid-cols-2 gap-6 mb-10">
        <InsightPanel bookId={id} />
        <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-5">
          <h3 className="font-display text-amber-300 text-lg mb-3 flex items-center gap-2">
            <Lightbulb size={18} /> Ask About This Book
          </h3>
          <p className="text-stone-400 text-sm mb-4">Use the AI Q&A system to ask specific questions about this book.</p>
          <Link href={`/qa?book_id=${book.id}&book_title=${encodeURIComponent(book.title)}`}
            className="block text-center py-2 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-lg text-sm text-parchment transition-colors">
            Open Q&A for "{book.title.slice(0, 30)}..."
          </Link>
        </div>
      </div>

      {/* Recommendations */}
      {recs.length > 0 && (
        <div>
          <h2 className="font-display text-xl text-parchment mb-4">Similar Books You Might Like</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {recs.map(rec => (
              <Link key={rec.id} href={`/books/${rec.id}`}
                className="group bg-stone-900/60 border border-stone-800 rounded-xl overflow-hidden hover:border-amber-700/50 transition-all">
                <div className="h-36 bg-stone-800 overflow-hidden">
                  {rec.cover_image_url ? (
                    <img src={rec.cover_image_url} alt={rec.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-700">
                      <BookOpen size={32} />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-parchment text-xs font-semibold line-clamp-2 group-hover:text-amber-200 transition-colors">{rec.title}</p>
                  <p className="text-stone-500 text-xs italic mt-0.5">{rec.author}</p>
                  <div className="text-xs text-amber-600 mt-1">{Math.round(rec.similarity * 100)}% match</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
