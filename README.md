# Customer Inquiry Management System

Full-stack app for recording customer inquiries and moving them through New, In Progress and Resolved. Built for the Coffee Ninja technical assessment.

**Stack:** Next.js (App Router, Tailwind) | Node.js + Express | PostgreSQL

## Prerequisites
- Node.js 20 or 22 LTS
- PostgreSQL 14+

## Setup

### 1. Database
```sql
CREATE DATABASE inquiry_db;
```

### 2. Backend
```
cd backend
npm install
copy .env.example .env
```
Edit `.env`: set `DATABASE_URL` (user, password, port) and `JWT_SECRET`. Then:
```
npm run migrate
npm run seed
npm run dev
```
API runs on http://localhost:4000

### 3. Frontend
```
cd frontend
npm install
npm run dev
```
App runs on http://localhost:3000

## Test accounts (created by `npm run seed`)
| Role | Email | Password |
|---|---|---|
| Staff | staff1@coffeeninja.test | Staff@1234 |
| Staff | staff2@coffeeninja.test | Staff@1234 |
| Admin | admin@coffeeninja.test | Admin@1234 |

## Tests
```
cd backend && npm test    # unit + integration (database must be running)
cd frontend && npm test   # form validation UI test
```

## Structure
- `backend/migrations`: SQL schema
- `backend/scripts`: migrate and seed
- `backend/src`: Express app (auth, inquiries routes, status transition rules)
- `frontend/src`: Next.js pages and components

See [DECISIONS.md](DECISIONS.md) for design decisions and trade-offs.