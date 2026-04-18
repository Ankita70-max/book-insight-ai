@echo off
echo =========================================
echo   BookInsight AI - Quick Start (Windows)
echo =========================================

:: Backend
echo.
echo Setting up backend...
cd backend

if not exist venv (
    python -m venv venv
    echo   Virtual environment created
)

call venv\Scripts\activate.bat
pip install -r requirements.txt -q
echo   Python dependencies installed

if not exist .env (
    copy .env.example .env
    echo   .env created - add your API key!
)

python manage.py migrate
echo   Database migrated

echo.
echo Starting Django on http://localhost:8000 ...
start "Django Backend" cmd /k "venv\Scripts\activate && python manage.py runserver"

:: Frontend
echo.
cd ..\frontend

if not exist node_modules (
    npm install
    echo   Node modules installed
)

echo Starting Next.js on http://localhost:3000 ...
start "Next.js Frontend" cmd /k "npm run dev"

echo.
echo =========================================
echo   Both servers starting!
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:8000
echo =========================================
pause
