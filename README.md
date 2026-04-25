# AI Interviewer

AI Interviewer is a multi-tenant web platform for structured interview orchestration, coding assessments, AI-assisted evaluation, and reviewer oversight.

This README is aligned to the system baseline in `backend/docs/SRS.md` (v1.0).

## Why this project

The platform is built to support:

- Technical and non-technical interviews
- Text, voice, and optional proctoring workflows
- AI-assisted question generation and scoring
- Sandboxed code execution for coding rounds
- Human-in-the-loop review before final outcomes

## SRS-aligned scope (high level)

### Core capabilities

- Interview scheduling and access windows
- Role/template-based interview configuration
- Adaptive question flow with audit trails
- Rubric-based evaluation and feedback artifacts
- Proctoring event logging with advisory risk scoring
- Tenant-scoped knowledge base and content management

### Hard constraints (from SRS)

- No autonomous hiring/pass-fail decisions
- No cross-tenant data access
- No untrusted code execution outside isolated sandbox
- Proctoring outputs are advisory, not deterministic

See `backend/docs/SRS.md` for full FR/NFR/DR/NR/FM traceability.

## Repository layout

```text
ai-interviewer/
├── backend/                  # FastAPI backend (domain-driven modules)
│   ├── app/
│   ├── docs/
│   │   ├── SRS.md
│   │   ├── schema.sql
│   │   └── erd.dsl
│   ├── DockerFiles/
│   │   ├── infra/docker-compose.yaml
│   │   └── sandbox/
│   ├── requirements.txt
│   ├── .env.example
│   └── main.py
└── frontend/                 # React + Vite + TypeScript frontend
```

## Tech stack

### Backend

- Python, FastAPI, Uvicorn
- PostgreSQL (transactional data)
- Redis (caching/session state)
- Qdrant (vector search)
- Celery (background jobs)
- Structured logging + auditability focus

### Frontend

- React 18 + TypeScript + Vite
- Tailwind CSS + Radix UI
- React Query + React Router

### Runtime support

- Dockerized sandbox images (C++ / Java / Python)
- Docker compose for local infra services

## Quick start (local development)

### 1) Prerequisites

- Python 3.11+
- Node.js 18+
- Docker + Docker Compose

### 2) Start local infra

From `backend/DockerFiles/infra`:

```bash
docker compose up -d
```

This starts PostgreSQL, Redis, Qdrant, and embedding service.

### 3) Backend setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Then run backend:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Useful endpoints:

- `http://localhost:8000/health`
- `http://localhost:8000/health/database`
- `http://localhost:8000/docs` (when `DEBUG=true`)

### 4) Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on Vite default port (usually `http://localhost:5173`).

## Dockerized backend app

A production-style backend Dockerfile is available at `backend/Dockerfile`.

```bash
cd backend
docker build -t ai-interviewer-backend .
docker run --rm -p 8000:8000 ai-interviewer-backend
```

## Testing

### Backend tests

```bash
cd backend
pytest
```

### Frontend tests

```bash
cd frontend
npm test
```

## Data and architecture references

- SRS: `backend/docs/SRS.md`
- Database schema: `backend/docs/schema.sql`
- ER diagram source: `backend/docs/erd.dsl`
- Frontend integration notes: `backend/docs/FRONTEND-INTEGRATION-GUIDE.md`

## Environment configuration

Use `backend/.env.example` as the template for local configuration.

Required integration groups include:

- Database + Redis
- Qdrant + embedding service
- LLM provider keys (Groq/OpenAI/Anthropic/Gemini)
- Sandbox and JWT settings

## Security note

- Do not commit real credentials or API keys.
- Rotate any leaked secrets immediately and use environment/secret managers for shared environments.

## Current status

This repository contains active implementation for:

- Backend domains: auth, admin, candidate, interview, evaluation, coding, proctoring, audio
- Frontend app and integration scaffolding
- Schema-first evolution via SQL + ERD + docs

For requirement-level intent and compliance boundaries, always treat `backend/docs/SRS.md` as authoritative.
