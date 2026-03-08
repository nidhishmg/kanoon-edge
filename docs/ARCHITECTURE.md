# KanoonEdge Architecture

## Overview

KanoonEdge is an AI-powered legal intelligence platform designed for Indian lawyers. The system revolves around the concept of a **Case Room** — a dedicated workspace for each legal case.

## Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui patterns with Radix UI primitives
- **Icons**: Lucide React (SVG)
- **Animation**: Framer Motion
- **Charts**: Recharts
- **State Management**: Zustand
- **Server State**: TanStack Query
- **Form Validation**: React Hook Form + Zod

### Backend (Future Implementation)
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL (structured data)
- **Vector Database**: Pinecone (document embeddings)
- **Authentication**: Supabase Auth
- **File Storage**: AWS S3
- **AI**: Claude / GPT with RAG (Retrieval-Augmented Generation)

## Project Structure

```
kanoonedge/
├── frontend/           # Next.js application
│   ├── app/            # Page routes (App Router)
│   ├── components/     # Reusable UI components
│   │   ├── ui/         # Base UI primitives (Button, Card, etc.)
│   │   ├── layout/     # Layout components (Sidebar, Nav)
│   │   └── case-room/  # Case Room-specific components
│   ├── lib/            # Utilities, API client, stores
│   ├── types/          # TypeScript interfaces
│   └── public/         # Static assets
├── backend/            # FastAPI application
│   └── app/
│       ├── routers/    # API route handlers
│       ├── services/   # Business logic
│       ├── schemas/    # Pydantic request/response models
│       ├── models/     # SQLAlchemy ORM models
│       └── utils/      # Helper utilities
└── docs/               # Documentation
```

## Data Flow

### Document Processing Pipeline
1. User uploads document to Case Room
2. Backend stores file in S3
3. OCR extracts text from document
4. Text is chunked into segments
5. Segments are converted to vector embeddings
6. Embeddings stored in Pinecone

### AI Analysis Pipeline
1. System retrieves relevant document sections via vector search
2. Sections are evaluated against legal rules and precedents
3. AI identifies loopholes, contradictions, and gaps
4. Results are structured and returned to the frontend

### Chat Pipeline
1. User sends a question
2. Question is embedded and used for vector search
3. Relevant document sections are retrieved
4. Sections + question sent to LLM
5. LLM generates contextual response with citations

## Design System

### Color Palette
- Primary Background: `#0A0A0F`
- Card Background: `#13131F`
- Border: `#1E1E2E`
- Primary Accent (Gold): `#C9A84C`
- Text: `#F0F0F5`

### Typography
- UI: Inter
- Display: Playfair Display
- Code: JetBrains Mono

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | User authentication |
| GET | /api/auth/me | Get current user |
| GET | /api/cases | List case rooms |
| GET | /api/cases/:id | Get case room |
| GET | /api/documents/:caseId | List documents |
| POST | /api/documents/:caseId/upload | Upload document |
| GET | /api/analysis/:caseId | Get analysis results |
| POST | /api/analysis/:caseId/run | Run AI analysis |
| POST | /api/drafts/generate | Generate legal draft |
| POST | /api/chat/:caseId | Send chat message |
