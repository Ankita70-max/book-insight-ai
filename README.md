# 📚 BookInsight AI — Document Intelligence Platform

> Ergosphere Solutions Assignment | Ankita | Full-stack AI/ML web app

A full-stack web application with AI/RAG integration that processes book data and enables intelligent querying.

---

## 🏗️ Architecture

```
book_insight/
├── backend/          # Django REST Framework + ChromaDB + RAG pipeline
│   ├── book_insight/ # Django project settings
│   ├── books/        # Main app (models, views, scraper, RAG service)
│   └── manage.py
└── frontend/         # Next.js 14 + Tailwind CSS
    └── src/
        ├── app/      # Pages: /, /books/[id], /qa, /admin-panel, /insights
        ├── components/
        └── lib/      # API client
```

---

## ✅ Features Implemented

### Backend (Django REST Framework)
| Endpoint | Method | Description |
|---|---|---|
| `/api/books/` | GET | List all books (filter by genre, search, rating) |
| `/api/books/<id>/` | GET | Full book detail |
| `/api/books/<id>/recommend/` | GET | Semantic recommendations |
| `/api/genres/` | GET | All genres |
| `/api/stats/` | GET | Dashboard stats |
| `/api/books/upload/` | POST | Upload/add a book + auto-index |
| `/api/scrape/` | POST | Scrape books from web |
| `/api/books/index/` | POST | Index books into ChromaDB |
| `/api/query/` | POST | RAG Q&A query |
| `/api/query/history/` | GET | Query history |
| `/api/books/<id>/insights/` | POST | AI summary/genre/sentiment |

### AI/RAG Pipeline
- **Scraping**: books.toscrape.com (legal) + Open Library API
- **Embeddings**: `sentence-transformers/all-MiniLM-L6-v2`
- **Vector DB**: ChromaDB (persistent, local)
- **Chunking**: Sliding window (400 tokens, 50 overlap)
- **LLM**: Anthropic Claude or OpenAI GPT (configurable)
- **Features**: Summary, Genre Classification, Sentiment Analysis, Recommendations

### Frontend (Next.js 14 + Tailwind CSS)
- 📚 **Library page** — book grid with search/filter
- 📖 **Book detail** — cover, info, AI insights, recommendations
- 🤖 **Ask AI** — RAG-powered chat interface
- ⚙️ **Admin panel** — scrape, index, upload books
- 📊 **Insights** — genre chart, per-book AI analysis

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- Git

### Step 1 — Clone & enter project
```bash
# Unzip the downloaded file
unzip book_insight.zip
cd book_insight
```

### Step 2 — Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Linux/Mac)
source venv/bin/activate

# Activate (Windows)
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment
cp .env.example .env
```

**Edit `.env`** and add your API key:
```
ANTHROPIC_API_KEY=your_key_here   # Get from console.anthropic.com
# OR
OPENAI_API_KEY=your_key_here      # Get from platform.openai.com
```

> **Note:** Without an API key, the app still works — you get rule-based fallback answers. AI insights require a key.

```bash
# Run migrations (uses SQLite by default — no MySQL setup needed)
python manage.py migrate

# Create admin user (optional)
python manage.py createsuperuser

# Start Django server
python manage.py runserver
```

Backend runs at: **http://localhost:8000**

### Step 3 — Frontend Setup

Open a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend runs at: **http://localhost:3000**

---

## 📥 Getting Books into the System

### Option A — Use the Admin Panel (easiest)
1. Open http://localhost:3000/admin-panel
2. Click **"Start Scraping"** (scrapes ~40 books from books.toscrape.com + Open Library)
3. Click **"Index All Unindexed Books"** (creates vector embeddings)
4. Go to http://localhost:3000 — books appear!

### Option B — Django management command
```bash
cd backend
python manage.py scrape_books --pages 3 --index
```

### Option C — Add books manually
Use the "Add Book Manually" form in the admin panel.

---

## 🛢️ Using MySQL (Optional)

By default the app uses **SQLite** (zero config). To switch to MySQL:

```bash
# Install MySQL adapter
pip install mysqlclient

# Create MySQL database
mysql -u root -p -e "CREATE DATABASE book_insight_db CHARACTER SET utf8mb4;"
```

Edit `.env`:
```
USE_MYSQL=True
DB_NAME=book_insight_db
DB_USER=root
DB_PASSWORD=your_password
DB_HOST=localhost
```

Then run:
```bash
python manage.py migrate
```

---

## 🔑 API Keys

| Provider | Get Key From | Set in .env |
|---|---|---|
| Anthropic Claude | https://console.anthropic.com | `ANTHROPIC_API_KEY=...` |
| OpenAI | https://platform.openai.com | `OPENAI_API_KEY=...` |

Set `LLM_PROVIDER=anthropic` or `LLM_PROVIDER=openai` accordingly.

---

## 🎯 Tech Stack

**Backend:** Python, Django 4.2, Django REST Framework, ChromaDB, sentence-transformers, BeautifulSoup4, Anthropic SDK, OpenAI SDK

**Frontend:** Next.js 14, React 18, Tailwind CSS, Axios, Lucide React

**Database:** SQLite (default) or MySQL

**AI/ML:** RAG pipeline, vector embeddings, semantic search, LLM-powered answers


---

## 💡 Bonus Features Implemented

- ✅ Caching AI responses (ChromaDB re-use)
- ✅ Embedding-based similarity search
- ✅ Bulk scraping with rate limiting
- ✅ Loading states & UX polish
- ✅ Multi-page frontend with routing
- ✅ Semantic chunking with overlap
- ✅ Error handling throughout

