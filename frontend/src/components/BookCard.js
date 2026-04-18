'use client';
import Link from 'next/link';
import { useState } from 'react';
import { BookOpen, Trash2 } from 'lucide-react';
import { deleteBook } from '@/lib/api';

function StarRating({ rating }) {
  const filled = Math.round(rating || 0);
  return <span className="stars text-sm">{('★'.repeat(filled)) + ('☆'.repeat(5 - filled))}</span>;
}

export default function BookCard({ book, onDeleted }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleting(true);
    try {
      await deleteBook(book.id);
      onDeleted?.(book.id);
    } catch (err) {
      alert('Delete failed: ' + (err.friendlyMessage || err.message));
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <div className="group relative flex flex-col bg-stone-900/60 border border-stone-800 rounded-xl overflow-hidden
      hover:border-amber-700/60 hover:shadow-lg hover:shadow-amber-900/20 transition-all duration-300 animate-fade-in">

      {/* Delete button — top-right corner */}
      <div className="absolute top-2 left-2 z-10">
        {!confirming ? (
          <button
            onClick={e => { e.preventDefault(); setConfirming(true); }}
            className="opacity-0 group-hover:opacity-100 bg-red-900/80 hover:bg-red-700 text-white p-1 rounded-md transition-all backdrop-blur-sm"
            title="Delete book">
            <Trash2 size={12} />
          </button>
        ) : (
          <div className="flex gap-1 bg-stone-900/95 border border-red-800 rounded-lg p-1 backdrop-blur-sm">
            <button onClick={handleDelete} disabled={deleting}
              className="bg-red-700 hover:bg-red-600 text-white text-xs px-2 py-0.5 rounded disabled:opacity-50">
              {deleting ? '...' : 'Yes'}
            </button>
            <button onClick={e => { e.preventDefault(); setConfirming(false); }}
              className="bg-stone-700 hover:bg-stone-600 text-white text-xs px-2 py-0.5 rounded">
              No
            </button>
          </div>
        )}
      </div>

      <Link href={`/books/${book.id}`} className="flex flex-col flex-1">
        {/* Cover */}
        <div className="relative h-52 bg-stone-800 overflow-hidden">
          {book.cover_image_url ? (
            <img
              src={book.cover_image_url}
              alt={book.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={e => { e.target.style.display = 'none'; }}
            />
          ) : null}
          <div className="absolute inset-0 flex items-center justify-center bg-stone-800 text-stone-600"
            style={{ display: book.cover_image_url ? 'none' : 'flex' }}>
            <BookOpen size={48} />
          </div>
          {book.genre && (
            <span className="absolute top-2 right-2 bg-amber-900/80 text-amber-200 text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">
              {book.genre.slice(0, 20)}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col flex-1 p-4 gap-2">
          <h3 className="font-display text-parchment text-sm font-semibold leading-tight line-clamp-2 group-hover:text-amber-200 transition-colors">
            {book.title}
          </h3>
          {book.author && <p className="text-stone-400 text-xs italic">by {book.author}</p>}

          {book.rating > 0 && (
            <div className="flex items-center gap-1.5 mt-auto pt-2 border-t border-stone-800">
              <StarRating rating={book.rating} />
              <span className="text-stone-400 text-xs">{book.rating}/5</span>
            </div>
          )}

          {book.description && (
            <p className="text-stone-500 text-xs line-clamp-2 mt-1">{book.description}</p>
          )}
        </div>
      </Link>
    </div>
  );
}
