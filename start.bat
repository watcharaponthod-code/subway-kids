@echo off
echo ==========================================
echo       Subway Kids - Quick Start Launcher
echo ==========================================
echo 1. Play Desktop Version (Pygame)
echo 2. Play Web Version (Next.js + Python Server)
echo.

set /p choice="Enter your choice (1 or 2): "

if "%choice%"=="1" (
    echo Starting Desktop Version...
    call .\venv\Scripts\activate.bat
    python main.py
    pause
) else if "%choice%"=="2" (
    echo Starting Web Version...
    echo Starting Pose Server in the background...
    start cmd /k "call .\venv\Scripts\activate.bat && cd server && python -m uvicorn main:app --host 0.0.0.0 --port 8000"
    
    echo Starting Next.js Web App...
    cd web
    call npm run dev
    pause
) else (
    echo Invalid choice.
    pause
)
