#!/bin/bash
set -e

echo "====================================================="
echo "  VIMS - Local Setup Script (macOS / Linux)"
echo "====================================================="
echo ""

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Check Java 17+
if ! command -v java &>/dev/null; then
  err "Java not found. Install Java 17+:
       macOS:  brew install openjdk@17
       Ubuntu: sudo apt install openjdk-17-jdk"
fi
JAVA_VER=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}' | cut -d'.' -f1)
[ "$JAVA_VER" -lt 17 ] 2>/dev/null && err "Java 17+ required (found $JAVA_VER)"
ok "Java found ($JAVA_VER)"

# Check Maven
if ! command -v mvn &>/dev/null; then
  err "Maven not found.
       macOS:  brew install maven
       Ubuntu: sudo apt install maven"
fi
ok "Maven found"

# Check Node
if ! command -v node &>/dev/null; then
  err "Node.js not found. Install from https://nodejs.org or:
       macOS:  brew install node
       Ubuntu: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt install nodejs"
fi
ok "Node.js found ($(node -v))"

# Check PostgreSQL
if ! command -v psql &>/dev/null; then
  warn "psql CLI not found. Install PostgreSQL 15+:
       macOS:  brew install postgresql@15
       Ubuntu: sudo apt install postgresql"
fi

echo ""
echo "---- Setting up Database ----"
echo "Make sure PostgreSQL is running. Enter postgres superuser password if prompted."
echo ""

psql -U postgres -c "CREATE DATABASE vimsdb;" 2>/dev/null || warn "Database may already exist"
psql -U postgres -c "CREATE USER vims_user WITH PASSWORD 'Vims@Local123';" 2>/dev/null || warn "User may already exist"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE vimsdb TO vims_user;" 2>/dev/null
ok "Database setup done"

echo ""
echo "---- Building Backend ----"
cd backend
mvn clean package -DskipTests -q
ok "Backend built → target/vims-backend-1.0.0.jar"
cd ..

echo ""
echo "---- Installing Frontend Dependencies ----"
cd frontend
npm install --silent
ok "Frontend dependencies installed"
cd ..

echo ""
echo "====================================================="
echo -e "  ${GREEN}Setup Complete!${NC}"
echo "====================================================="
echo ""
echo "To START the application (open 2 terminals):"
echo ""
echo "  Terminal 1 – Backend:"
echo "    chmod +x start_backend.sh && ./start_backend.sh"
echo ""
echo "  Terminal 2 – Frontend:"
echo "    cd frontend && npm start"
echo ""
echo "  Then open: http://localhost:3000"
echo ""
echo "  Default Admin Login:"
echo "    Email:    admin@vims.com"
echo "    Password: Admin@123"
echo ""
