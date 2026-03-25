# YachtWorx v2.0

> **Yacht management on easy mode.**
> A full-stack SaaS platform connecting yacht owners with elite marine service professionals.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript) ![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite) ![Supabase](https://img.shields.io/badge/Supabase-Ready-3ECF8E?logo=supabase) ![Tailwind](https://img.shields.io/badge/Tailwind-3-38BDF8?logo=tailwindcss)

---

## Features

- **Boat Owner Dashboard** — Fleet overview, vessel health scores, maintenance tracking
- **Boat Profile System** — Full vessel spec management with AI autofill from marine database
- **Component Tracker** — Per-component health scoring with service interval tracking
- **Document Vault** — Secure maintenance record storage (PDF, JPG, PNG, HEIC — up to 20 MB)
- **Marketplace** — Browse and book verified marine service providers
- **Service Requests** — Manage maintenance jobs end-to-end
- **Provider Dashboard** — Separate view for service professionals
- **Dual Mode** — Runs with mock data out of the box; wire up Supabase for full persistence

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 8 |
| Styling | Tailwind CSS (custom navy/ocean/teal palette) |
| State | Zustand |
| Routing | React Router v7 |
| Animations | Framer Motion |
| Charts | Recharts |
| Backend / Auth | Supabase (PostgreSQL, Auth, Storage) |
| Icons | Lucide React |

---

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/bharatsbhat20/yachtworx_v2.0.git
cd yachtworx_v2.0
npm install --legacy-peer-deps
```

### 2. Run in demo mode (no Supabase needed)

```bash
npm run dev
```

The app starts at `http://localhost:5173` with mock data pre-loaded.

**Demo credentials:**

| Role | Email | Password |
|------|-------|----------|
| Boat Owner | `james@yachtworx.io` | `Password1` |
| Service Provider | `marcus@pacificmarine.com` | `Password1` |

---

## Connecting to Supabase (live mode)

### 1. Create a Supabase project

Sign up free at [supabase.com](https://supabase.com) and create a new project.

### 2. Run the database schema

In the Supabase Dashboard → **SQL Editor**, paste and run the contents of [`supabase/schema.sql`](./supabase/schema.sql).

This creates:
- `profiles` — extends `auth.users` (auto-populated via trigger on signup)
- `boats` — vessel records with full spec fields
- `boat_components` — per-vessel maintenance components with service intervals
- `maintenance_documents` — document metadata (file stored in Storage)
- `boat_specs_cache` — shared AI autofill cache (speeds up spec lookups)
- All Row Level Security (RLS) policies
- `updated_at` auto-triggers on every table

### 3. Create the Storage bucket

In Supabase Dashboard → **Storage**, create a private bucket named **`documents`**.

> Storage RLS policies in `schema.sql` enforce that users can only access their own files via the path pattern `{owner_id}/{boat_id}/{doc_id}/{filename}`.

### 4. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

Find these in Supabase Dashboard → **Settings → API**.

> ⚠️ Use the **anon / public** key only — never the `service_role` key in the frontend.

### 5. Restart the dev server

```bash
npm run dev
```

The app automatically detects the env vars and switches to live mode. Sign up with a real email to create your first account.

**Tip:** During development, go to Supabase Dashboard → **Authentication → Settings** and enable **"Disable email confirmations"** to skip email verification.

---

## Project Structure

```
yachtworx_v2.0/
├── supabase/
│   └── schema.sql                        # Full DB schema, RLS, triggers, storage policies
├── docs/
│   └── trd/
│       └── module-01-boat-owner-account-and-boat-profile.md  # TRD v2.0
├── src/
│   ├── lib/
│   │   ├── supabase.ts                   # Supabase client + isDemoMode flag
│   │   └── supabaseTypes.ts              # DB row types + bidirectional mappers
│   ├── services/
│   │   ├── autofill.ts                   # AI spec autofill (localStorage or Supabase cache)
│   │   └── storageService.ts             # File upload/download with progress
│   ├── store/
│   │   ├── authStore.ts                  # Auth (demo mock or Supabase Auth)
│   │   ├── boatStore.ts                  # Boat/component/document CRUD (dual mode)
│   │   └── serviceStore.ts               # Service requests
│   ├── utils/
│   │   └── healthScore.ts                # Vessel health score calculation (TRD §4.6)
│   ├── types/
│   │   └── index.ts                      # All TypeScript interfaces and enums
│   ├── data/
│   │   └── mockData.ts                   # Demo seed data
│   ├── components/
│   │   ├── boats/
│   │   │   ├── AddBoatWizard.tsx         # 3-step add vessel wizard with AI autofill
│   │   │   ├── ComponentManager.tsx      # Component health tracking UI
│   │   │   └── MaintenanceUploadModal.tsx # Document upload with progress
│   │   ├── layout/
│   │   │   └── Navbar.tsx
│   │   └── ui/                           # Reusable UI components
│   └── pages/
│       ├── Landing.tsx
│       ├── AuthPage.tsx
│       ├── OwnerDashboard.tsx
│       ├── BoatProfile.tsx
│       ├── Marketplace.tsx
│       ├── ServiceRequests.tsx
│       ├── Documents.tsx
│       ├── Messages.tsx
│       ├── ProviderDashboard.tsx
│       └── ProviderLanding.tsx
├── .env.example                          # Copy to .env.local and fill in Supabase credentials
└── README.md
```

---

## Health Score System (TRD §4.6)

Components are scored based on days until/since their last service:

| Status | Score | Band |
|--------|-------|------|
| > 30 days until due | 100 | 🟢 Good |
| 15–30 days until due | 70 | 🟢 Good |
| 0–14 days until due | 40 | 🟡 Fair |
| 1–30 days overdue | 20 | 🔴 Needs Attention |
| > 30 days overdue | 0 | 🔴 Needs Attention |

Vessel health = average of all component scores. Bands: **Good (80–100)**, **Fair (50–79)**, **Needs Attention (0–49)**.

---

## AI Autofill

When adding a vessel, YachtWorx looks up specs (length, beam, draft, engine, etc.) by make/model/year. Results are cached for 365 days (hit) or 7 days (miss).

- **Demo mode** → cache in `localStorage`
- **Live mode** → cache in the shared `boat_specs_cache` Supabase table

---

## Available Scripts

```bash
npm run dev        # Start dev server (http://localhost:5173)
npm run build      # Production build
npm run preview    # Preview production build locally
npm run lint       # ESLint
```

---

## Roadmap

- [ ] Module 2: Service Provider Profiles & Verification
- [ ] Module 3: Marketplace & Booking System
- [ ] Module 4: Real-time Messaging
- [ ] Module 5: Analytics & Reporting
- [ ] Mobile app (React Native)

---

## License

MIT — free to use, fork, and build on.
