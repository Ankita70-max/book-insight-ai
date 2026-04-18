#!/bin/bash
set -e

echo "========================================="
echo "  📚 BookInsight AI — Quick Start"
echo "========================================="

# ── Backend ──────────────────────────────────
echo ""
echo "🔧 Setting up backend..."
cd backend

if [ ! -d "venv" ]; then
  python3 -m venv venv
  echo "  ✅ Virtual environment created"
fi

source venv/bin/activate
pip install -r requirements.txt -q
echo "  ✅ Python dependencies installed"

if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "  ⚠️  .env created from template — add your API key!"
fi

python manage.py migrate --run-syncdb 2>/dev/null || python manage.py migrate
echo "  ✅ Database migrated"

echo ""
echo "🚀 Starting Django server on http://localhost:8000 ..."
python manage.py runserver &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"

# ── Frontend ─────────────────────────────────
echo ""
echo "🎨 Setting up frontend..."
cd ../frontend

if [ ! -d "node_modules" ]; then
  npm install
  echo "  ✅ Node modules installed"
fi

echo ""
echo "🚀 Starting Next.js on http://localhost:3000 ..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "========================================="
echo "  ✅ Both servers running!"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8000"
echo "  Admin:    http://localhost:8000/admin"
echo ""
echo "  Next steps:"
echo "  1. Open http://localhost:3000/admin-panel"
echo "  2. Click 'Start Scraping'"
echo "  3. Click 'Index All Books'"
echo "  4. Browse books at http://localhost:3000"
echo "========================================="

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait
