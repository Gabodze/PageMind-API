# PageMind API

Backend API for **PageMind** — a research capture system used by a Chrome extension to save web pages, text highlights, and PDFs into user-owned folders, with optional AI summarization.

**Stack:** NestJS 11 · TypeScript · Prisma 7 · PostgreSQL 16 · JWT · Docker · OpenAI-compatible AI

---

## What it does

- User auth (register / login / refresh token rotation / logout)
- Folders (also exposed as `/files`) with note counts
- Notes: create, list, update, delete
- Full-page capture with URL normalization and upsert (no duplicate pages)
- Highlight save with source-page linking and overlap deduplication
- PDF upload + text extraction
- AI summarization (optional save as a `SUMMARY` note)
- Health check for API + database

---

## Architecture

```text
Chrome Extension (MV3)
        │
        ▼
  NestJS REST API  (/api)
        │
   ┌────┼────────────┐
 Auth  Notes/Folders  AI
   │        │
   └────────┼──────── Prisma
            ▼
     PostgreSQL (:5433)
```

---

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- AI API key (OpenAI-compatible, e.g. Groq)

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Start database
docker compose up -d

# 3. Environment
cp .env.example .env
# edit .env with your secrets (API keys, passwords, etc.)

# 4. Database schema
npx prisma db push
# or: npx prisma migrate dev

npx prisma generate

# 5. Run API (watch mode)
npm run start:dev
```

- API: `http://localhost:3000`
- Health: `http://localhost:3000/health`

---

## Environment variables

See `.env.example` for template. Create `.env` with:

```env
NODE_ENV=development
PORT=3000

# Database (Docker maps 5433:5432)
DATABASE_URL=postgresql://pagemind:u8EtVTV5@127.0.0.1:5433/pagemind?schema=public

# JWT
JWT_ACCESS_SECRET=your-secret-key-at-least-16-characters
JWT_REFRESH_SECRET=your-refresh-secret-at-least-16-characters
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# AI (OpenAI-compatible)
AI_API_KEY=your-api-key
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4

# Phase 2 (upcoming)
REDIS_URL=redis://localhost:6379
BUDGET_PER_USER_USD=10
```

---

## Main endpoints

| Method           | Path                     | Description                              |
| ---------------- | ------------------------ | ---------------------------------------- |
| GET              | `/health`                | API + DB health (no auth)                |
| POST             | `/api/auth/register`     | Create account                           |
| POST             | `/api/auth/login`        | Login                                    |
| POST             | `/api/auth/refresh`      | Rotate tokens                            |
| POST             | `/api/auth/logout`       | Revoke refresh token                     |
| GET              | `/api/auth/me`           | Current user                             |
| CRUD             | `/api/folders`           | Folders (`/api/files` alias)             |
| GET              | `/api/folders/:id/notes` | Notes in a folder                        |
| POST             | `/api/notes`             | Create note / highlight                  |
| POST             | `/api/notes/capture`     | Full-page capture (upsert by URL)        |
| POST             | `/api/notes/pdf`         | Upload PDF (multipart)                   |
| GET              | `/api/notes/last-folder` | Last used folder id                      |
| GET/PATCH/DELETE | `/api/notes/:id`         | Note by id                               |
| POST             | `/api/ai/summarize`      | Summarize text (+ optional `saveToNote`) |

Protected routes require:

```http
Authorization: Bearer <accessToken>
```

---

## Design decisions

| Decision                         | Why                                        |
| -------------------------------- | ------------------------------------------ |
| Capture before RAG               | Empty library → nothing useful to retrieve |
| URL normalize + upsert           | Avoid duplicate full-page notes            |
| Highlight dedup via `SourcePage` | Merge overlaps; keep unrelated selections  |
| Refresh tokens hashed in DB      | Revocation + rotation                      |
| `/files` alias for folders       | Stable contract for the extension UI       |
| Provider-agnostic AI client      | Swap Groq/OpenAI via env                   |

---

## Scripts

```bash
npm run start:dev    # development
npm run start:prod   # production (after build)
npm run build
npm run test
npm run test:e2e

npx prisma studio    # DB UI on http://localhost:5555
```

Database backup (included utilities):

```powershell
.\scripts\backup-database.ps1      # 8-step backup with verification
.\scripts\verify-backup.ps1        # Restore test + checksum validation
```

---

## Project structure

```text
src/
├── auth/          # JWT, register, login, refresh
├── users/         # user management
├── folders/       # folder CRUD
├── notes/         # notes, capture, PDF, highlights
├── ai/            # AI summarization
├── health/        # liveness probe
├── prisma/        # ORM service
├── config/        # env validation
└── generated/     # Prisma client (auto-generated)

prisma/
├── schema.prisma  # 7 models
└── migrations/    # 2 applied migrations

scripts/
├── backup-database.ps1      # Production backup utility
└── verify-backup.ps1        # Restore verification test

docker-compose.yml            # PostgreSQL + pgvector
```

---

## Status

**Working MVP** with Phase 2 prep (pgvector ready)

- [x] Auth + user-scoped authorization
- [x] Folders & notes
- [x] Capture + highlight deduplication
- [x] AI summarize
- [x] PDF text extraction
- [x] Dockerized PostgreSQL + pgvector
- [x] Backup & disaster recovery
- [ ] Production deployment
- [ ] Semantic search / embeddings (Phase 2, in progress)
- [ ] Automated test coverage

---

## Related

- **Chrome extension:** load the `pagemind-extension` folder as an unpacked extension; point it at this API (`http://localhost:3000`).

---

## License

Private / UNLICENSED (change if you open-source the project).
