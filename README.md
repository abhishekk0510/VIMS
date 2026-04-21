# VIMS — Vendor Invoice Management System

Multi-tenant invoice management system with role-based approval workflows.

## Stack
- **Backend:** Spring Boot 3.2.5, Java 21, PostgreSQL, Flyway
- **Frontend:** React 18, Tailwind CSS, React Router v6

---

## Prerequisites

| Tool | Version |
|------|---------|
| Java | **21** (required — not 17, not 25) |
| Maven | 3.8+ |
| Node.js | 18+ |
| PostgreSQL | 14+ |

---

## Database Setup

```sql
-- Run as postgres superuser
CREATE USER vims_user WITH PASSWORD 'Vims@Local123';
CREATE DATABASE vimsdb OWNER vims_user;
GRANT ALL PRIVILEGES ON DATABASE vimsdb TO vims_user;
```

---

## Backend Setup

```bash
cd backend

# Set env vars (or export them in your shell profile)
export DB_USERNAME=vims_user
export DB_PASSWORD=Vims@Local123
export JWT_SECRET=change-this-to-a-very-long-random-secret-256bit

# Run (Flyway migrations run automatically on startup)
JAVA_HOME=/path/to/jdk-21 mvn spring-boot:run
```

**macOS (Homebrew Java 21):**
```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
JAVA_HOME=$JAVA_HOME DB_PASSWORD=Vims@Local123 DB_USERNAME=vims_user mvn spring-boot:run
```

Backend starts on `http://localhost:8080/api`

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_USERNAME` | `vims_user` | PostgreSQL username |
| `DB_PASSWORD` | *(required)* | PostgreSQL password |
| `JWT_SECRET` | change-this... | JWT signing secret (change in prod) |
| `UPLOAD_DIR` | `./uploads` | File upload directory |
| `MAIL_HOST` | smtp.gmail.com | SMTP host |
| `MAIL_USERNAME` | *(optional)* | SMTP username |
| `MAIL_PASSWORD` | *(optional)* | SMTP password |
| `HF_TOKEN` | *(optional)* | HuggingFace API token for AI features |
| `CORS_ORIGINS` | http://localhost:3001 | Allowed CORS origins |

---

## Frontend Setup

```bash
cd frontend
npm install
npm start
```

Frontend starts on `http://localhost:3001`

The `.env` file is committed with default local settings:
```
REACT_APP_API_URL=http://localhost:8080/api
PORT=3001
```

---

## Default Login Credentials (Dev Only)

| Role | Email | Password |
|------|-------|----------|
| SUPER_ADMIN | superadmin@vims.com | Admin@123 |
| ADMIN | admin@vims.com | Admin@123 |
| VENDOR | vendor@vims.com | Vendor@123 |
| OPERATIONS | ops1@vims.com | Ops1@123 |
| DEPT_HEAD | depthead@vims.com | DeptHead@123 |
| FINANCE | finance1@vims.com | Finance1@123 |
| CFO | cfo@vims.com | Cfo@12345 |
| CLIENT | client@vims.com | Client@123 |

> These are seeded by Flyway migration V1. Do **not** use in production.

---

## Migrations

Flyway runs automatically on startup. Migrations are in:
```
backend/src/main/resources/db/migration/
  V1__init.sql
  V2__workflow.sql
  V3__extended_features.sql
  V4__multi_tenant.sql
```

---

## Project Structure

```
VIMS/
├── backend/          # Spring Boot application
│   ├── src/
│   └── pom.xml
├── frontend/         # React application
│   ├── src/
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## Docker (Optional)

```bash
docker-compose up -d
```
