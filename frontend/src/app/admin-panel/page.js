'use client';
import { useState, useEffect } from 'react';
import { scrapeBooks, indexBooks, uploadBook, fetchStats } from '@/lib/api';
import { Database, RefreshCw, Upload, Cpu, CheckCircle, AlertCircle, Loader, Wifi, WifiOff } from 'lucide-react';

function StatusBadge({ status }) {
  if (status === 'success') return <span className="flex items-center gap-1 text-green-400 text-sm"><CheckCircle size={14} /> Success</span>;
  if (status === 'error') return <span className="flex items-center gap-1 text-red-400 text-sm"><AlertCircle size={14} /> Failed</span>;
  if (status === 'loading') return <span className="flex items-center gap-1 text-amber-400 text-sm"><Loader size={14} className="animate-spin" /> Running…</span>;
  return null;
}

function Card({ title, icon: Icon, children }) {
  return (
    <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-6">
      <h2 className="font-display text-lg text-amber-300 mb-4 flex items-center gap-2">
        <Icon size={20} /> {title}
      </h2>
      {children}
    </div>
  );
}

function ResultBox({ result }) {
  if (!result) return null;
  const isError = result.status === 'error';
  return (
    <div className={`mt-3 rounded-lg p-3 text-sm ${isError
      ? 'bg-red-900/20 border border-red-800/50 text-red-300'
      : 'bg-green-900/20 border border-green-800/50 text-green-300'}`}>
      <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">
        {result.message || JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
}

function BackendStatus() {
  const [online, setOnline] = useState(null);

  useEffect(() => {
    fetch('http://localhost:8000/')
      .then(() => setOnline(true))
      .catch(() => setOnline(false));
  }, []);

  if (online === null) return null;

  return (
    <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border mb-6 ${
      online
        ? 'bg-green-900/20 border-green-800/40 text-green-400'
        : 'bg-red-900/20 border-red-800/40 text-red-400'
    }`}>
      {online ? <Wifi size={14} /> : <WifiOff size={14} />}
      {online
        ? 'Django backend is running ✅'
        : '❌ Django backend is NOT running — start it with: cd backend && python manage.py runserver'}
    </div>
  );
}

export default function AdminPanel() {
  const [stats, setStats] = useState(null);

  const [scrapePages, setScrapePages] = useState(1);
  const [scrapeQuery, setScrapeQuery] = useState('fiction');
  const [includeOL, setIncludeOL] = useState(true);
  const [scrapeStatus, setScrapeStatus] = useState(null);
  const [scrapeResult, setScrapeResult] = useState(null);

  const [indexStatus, setIndexStatus] = useState(null);
  const [indexResult, setIndexResult] = useState(null);

  const [uploadForm, setUploadForm] = useState({
    title: '', author: '', description: '', genre: '',
    cover_image_url: '', book_url: '', rating: ''
  });
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);

  const loadStats = () =>
    fetchStats().then(setStats).catch(() => {});

  useEffect(() => { loadStats(); }, []);

  const handleScrape = async () => {
    setScrapeStatus('loading');
    setScrapeResult(null);
    try {
      const data = await scrapeBooks({
        max_pages: scrapePages,
        query: scrapeQuery,
        include_open_library: includeOL,
      });
      setScrapeResult(data);
      setScrapeStatus('success');
      loadStats();
    } catch (e) {
      setScrapeResult({
        status: 'error',
        message: e.friendlyMessage || e?.response?.data?.message || e.message || 'Unknown error',
      });
      setScrapeStatus('error');
    }
  };

  const handleIndex = async () => {
    setIndexStatus('loading');
    setIndexResult(null);
    try {
      const data = await indexBooks();
      setIndexResult(data);
      setIndexStatus('success');
      loadStats();
    } catch (e) {
      setIndexResult({
        status: 'error',
        message: e.friendlyMessage || e?.response?.data?.message || e.message || 'Unknown error',
      });
      setIndexStatus('error');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setUploadStatus('loading');
    setUploadResult(null);
    try {
      const payload = { ...uploadForm };
      if (payload.rating) payload.rating = parseFloat(payload.rating);
      else delete payload.rating;
      const data = await uploadBook(payload);
      setUploadResult({ status: 'success', message: `✅ Book "${data.title}" saved and indexed!` });
      setUploadStatus('success');
      setUploadForm({ title: '', author: '', description: '', genre: '', cover_image_url: '', book_url: '', rating: '' });
      loadStats();
    } catch (e) {
      setUploadResult({
        status: 'error',
        message: e.friendlyMessage || e?.response?.data?.title?.[0] || e.message || 'Unknown error',
      });
      setUploadStatus('error');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold text-parchment mb-2 flex items-center gap-3">
        <Database size={28} className="text-amber-400" /> Admin Panel
      </h1>
      <p className="text-stone-400 text-sm mb-6">Manage book data, scraping, and vector indexing.</p>

      <BackendStatus />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Total Books', value: stats.total_books },
            { label: 'Indexed', value: stats.indexed_books },
            { label: 'Chunks', value: stats.total_chunks },
            { label: 'Queries', value: stats.total_queries },
          ].map(s => (
            <div key={s.label} className="bg-stone-900/60 border border-stone-800 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-amber-400 font-display">{s.value}</div>
              <div className="text-xs text-stone-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* How to use guide */}
      <div className="bg-amber-900/10 border border-amber-800/30 rounded-xl p-4 mb-6 text-sm text-amber-200/80">
        <p className="font-medium mb-1">📋 Quick Start Guide:</p>
        <ol className="list-decimal list-inside space-y-1 text-amber-200/60">
          <li>Click <strong className="text-amber-300">Start Scraping</strong> — fetches books from the web (takes 30–90 seconds)</li>
          <li>Click <strong className="text-amber-300">Index All Books</strong> — creates vector embeddings (may take 1–2 min first time)</li>
          <li>Go to <strong className="text-amber-300">Library</strong> page to browse books</li>
          <li>Go to <strong className="text-amber-300">Ask AI</strong> to query your book collection</li>
        </ol>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Scrape */}
        <Card title="Scrape Books from Web" icon={RefreshCw}>
          <p className="text-stone-400 text-xs mb-4">
            Scrapes <strong className="text-parchment">books.toscrape.com</strong> (legal practice site) + Open Library API.
          </p>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-stone-400 block mb-1">
                Pages to scrape <span className="text-stone-600">(1 page ≈ 20 books, ~30s)</span>
              </label>
              <input type="number" min="1" max="5" value={scrapePages}
                onChange={e => setScrapePages(parseInt(e.target.value))}
                className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-parchment focus:outline-none focus:border-amber-700" />
            </div>
            <div>
              <label className="text-xs text-stone-400 block mb-1">Open Library search query</label>
              <input type="text" value={scrapeQuery} onChange={e => setScrapeQuery(e.target.value)}
                placeholder="fiction, science, history…"
                className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-parchment focus:outline-none focus:border-amber-700" />
            </div>
            <label className="flex items-center gap-2 text-sm text-stone-300 cursor-pointer">
              <input type="checkbox" checked={includeOL} onChange={e => setIncludeOL(e.target.checked)} className="accent-amber-600" />
              Include Open Library results
            </label>
          </div>

          <button onClick={handleScrape} disabled={scrapeStatus === 'loading'}
            className="mt-4 w-full py-2.5 bg-amber-800 hover:bg-amber-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
            {scrapeStatus === 'loading'
              ? <><Loader size={14} className="animate-spin" /> Scraping… (please wait 30–90s)</>
              : <><RefreshCw size={14} /> Start Scraping</>}
          </button>
          <div className="mt-2"><StatusBadge status={scrapeStatus} /></div>
          <ResultBox result={scrapeResult} />
        </Card>

        {/* Index */}
        <Card title="Index Books into ChromaDB" icon={Cpu}>
          <p className="text-stone-400 text-xs mb-4">
            Converts books into vector embeddings using <strong className="text-parchment">sentence-transformers</strong>.
            First run downloads the model (~90MB) and may take 1–2 minutes.
          </p>
          <div className="bg-stone-800/60 rounded-lg p-3 text-xs text-stone-400 mb-4 space-y-1">
            <div>📦 Model: <span className="text-parchment">all-MiniLM-L6-v2</span></div>
            <div>🔢 Chunk size: <span className="text-parchment">400 tokens, 50 overlap</span></div>
            <div>📍 Storage: <span className="text-parchment">./chroma_db (persistent)</span></div>
          </div>
          <button onClick={handleIndex} disabled={indexStatus === 'loading'}
            className="w-full py-2.5 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
            {indexStatus === 'loading'
              ? <><Loader size={14} className="animate-spin" /> Indexing… (may take 1–2 min)</>
              : <><Cpu size={14} /> Index All Unindexed Books</>}
          </button>
          <div className="mt-2"><StatusBadge status={indexStatus} /></div>
          <ResultBox result={indexResult} />
        </Card>
      </div>

      {/* Upload */}
      <div className="mt-6">
        <Card title="Add Book Manually" icon={Upload}>
          <form onSubmit={handleUpload} className="grid md:grid-cols-2 gap-4">
            {[
              { key: 'title', label: 'Title *', placeholder: 'Book title', required: true },
              { key: 'author', label: 'Author', placeholder: 'Author name' },
              { key: 'genre', label: 'Genre', placeholder: 'Fiction, Mystery…' },
              { key: 'rating', label: 'Rating (0-5)', placeholder: '4.2', type: 'number' },
              { key: 'cover_image_url', label: 'Cover Image URL', placeholder: 'https://…' },
              { key: 'book_url', label: 'Book URL', placeholder: 'https://…' },
            ].map(({ key, label, placeholder, required, type }) => (
              <div key={key}>
                <label className="text-xs text-stone-400 block mb-1">{label}</label>
                <input type={type || 'text'} value={uploadForm[key]} required={required}
                  onChange={e => setUploadForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-parchment focus:outline-none focus:border-amber-700" />
              </div>
            ))}
            <div className="md:col-span-2">
              <label className="text-xs text-stone-400 block mb-1">Description</label>
              <textarea value={uploadForm.description} rows={3}
                onChange={e => setUploadForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Book description / synopsis"
                className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-parchment focus:outline-none focus:border-amber-700 resize-none" />
            </div>
            <div className="md:col-span-2 flex items-center gap-4">
              <button type="submit" disabled={uploadStatus === 'loading'}
                className="px-6 py-2.5 bg-green-900 hover:bg-green-800 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                {uploadStatus === 'loading'
                  ? <><Loader size={14} className="animate-spin" /> Saving…</>
                  : <><Upload size={14} /> Add & Index Book</>}
              </button>
              <StatusBadge status={uploadStatus} />
            </div>
            <div className="md:col-span-2"><ResultBox result={uploadResult} /></div>
          </form>
        </Card>
      </div>
    </div>
  );
}
