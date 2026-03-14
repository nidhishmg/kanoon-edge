# KanoonEdge

KanoonEdge is India’s AI-powered legal co-pilot for practicing advocates. It combines structured case management, AI document analysis, loophole detection, legal drafting, and a secure client communication portal in one platform.

## Key Features

- AI Case Analysis: procedural loophole detection, contradictions, and argument generation
- Smart Case Room: documents, hearings, tasks, deadlines, and timeline in one workspace
- Client Portal: secure share links, profile collection, document uploads, and messaging
- Draft Generation: AI-generated legal documents from case data
- Legal Database: IndianKanoon-integrated research search workflow

## Tech Stack

- Frontend: Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion, Recharts
- Backend: FastAPI, SQLAlchemy, SQLite (development) / PostgreSQL (production), Google Gemini 2.5 Flash
- Auth: JWT access tokens

## Running Locally

### Backend

1. `cd backend`
2. `python -m venv venv`
3. Windows: `venv\Scripts\activate`
4. Mac/Linux: `source venv/bin/activate`
5. `pip install -r requirements.txt`
6. Copy `.env.example` to `.env` and fill required values
7. `python -m uvicorn app.main:app --reload`

### Frontend

1. `cd frontend`
2. `npm install`
3. Copy `.env.local.example` to `.env.local`
4. Set `NEXT_PUBLIC_API_URL=http://localhost:8000/api`
5. `npm run dev`

## Environment Variables

Backend environment variables are documented in `backend/.env.example`.

Important:

- `GEMINI_API_KEY` is required for AI-powered analysis and drafting.
- `DATABASE_URL` is optional in development (SQLite fallback), required for PostgreSQL production deployments.