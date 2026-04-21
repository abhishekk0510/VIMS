@echo off
SETLOCAL

echo =====================================================
echo   VIMS - Local Setup Script (Windows)
echo =====================================================
echo.

:: Check Java
java -version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Java 17+ not found. Download from: https://adoptium.net/
    pause & exit /b 1
)
echo [OK] Java found

:: Check Maven
mvn -version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Maven not found. Download from: https://maven.apache.org/download.cgi
    echo         Or install with: choco install maven
    pause & exit /b 1
)
echo [OK] Maven found

:: Check Node
node -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js 18+ not found. Download from: https://nodejs.org/
    pause & exit /b 1
)
echo [OK] Node.js found

:: Check psql
psql --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [WARN] PostgreSQL CLI not found. Make sure PostgreSQL 15+ is installed and running.
    echo        Download: https://www.postgresql.org/download/windows/
)

echo.
echo ---- Setting up database ----
echo Please ensure PostgreSQL is running, then press any key...
pause >nul

psql -U postgres -c "CREATE DATABASE vimsdb;" 2>nul
psql -U postgres -c "CREATE USER vims_user WITH PASSWORD 'Vims@Local123';" 2>nul
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE vimsdb TO vims_user;" 2>nul
echo [OK] Database setup done (or already exists)

echo.
echo ---- Building Backend ----
cd backend
call mvn clean package -DskipTests
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Backend build failed
    pause & exit /b 1
)
echo [OK] Backend built

echo.
echo ---- Installing Frontend dependencies ----
cd ..\frontend
call npm install
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm install failed
    pause & exit /b 1
)
echo [OK] Frontend dependencies installed

cd ..
echo.
echo =====================================================
echo   Setup Complete!
echo =====================================================
echo.
echo To START the application:
echo   1. Start Backend:   cd backend ^& start_backend.bat
echo   2. Start Frontend:  cd frontend ^& npm start
echo.
echo Default Admin Login:
echo   Email:    admin@vims.com
echo   Password: Admin@123
echo.
pause
