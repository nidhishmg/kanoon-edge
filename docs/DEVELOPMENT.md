# KanoonEdge — Development Guide

## Prerequisites

- Node.js 18+
- Python 3.10+
- npm

## Getting Started

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:3000`.

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The backend runs at `http://localhost:8000`.
API docs available at `http://localhost:8000/docs`.

## Project Navigation

### Key Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/auth/login` | Login page |
| `/dashboard` | Main dashboard |
| `/dashboard/case-rooms` | Case rooms list |
| `/dashboard/case-rooms/[id]` | Case room workspace |
| `/dashboard/drafts` | Generated drafts |
| `/dashboard/hearings` | Hearing schedule |
| `/dashboard/legal-database` | Legal search |
| `/dashboard/settings` | Account settings |

### Key Files

| File | Purpose |
|------|---------|
| `lib/api.ts` | API client with mock data simulation |
| `lib/store.ts` | Zustand state stores |
| `lib/mock-data.ts` | Mock data for all entities |
| `lib/utils.ts` | Utility functions |
| `types/index.ts` | TypeScript interfaces |

## Replacing Mock Data with Real APIs

The frontend uses a centralized API client at `lib/api.ts`. To connect to real backend endpoints:

1. Update each method in `api.ts` to make actual HTTP requests
2. Remove the `delay()` calls
3. Replace mock data returns with `fetch()` or `axios` calls
4. TanStack Query handles caching and refetching automatically

Example:
```typescript
// Before (mock)
getAll: async (): Promise<CaseRoom[]> => {
  await delay(600);
  return mockCaseRooms;
}

// After (real API)
getAll: async (): Promise<CaseRoom[]> => {
  const res = await fetch('/api/cases');
  return res.json();
}
```

## Adding New Features

1. Add types in `types/index.ts`
2. Add mock data in `lib/mock-data.ts`
3. Add API methods in `lib/api.ts`
4. Create components in `components/`
5. Create pages in `app/`
