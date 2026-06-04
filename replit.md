# Workspace

## Overview

Urban Arena — a production-style kiosk display system with a cinematic public display and a secure admin panel. Optimized for 21.5" vertical portrait kiosk screens.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/urban-arena)
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Auth**: JWT (jsonwebtoken + bcryptjs)
- **File uploads**: multer (stored in artifacts/api-server/uploads/)
- **Animations**: Framer Motion
- **Forms**: React Hook Form + Zod resolvers
- **Build**: esbuild (CJS bundle)

## Routes

### Public Display
- `/` → redirects to `/display`
- `/display` → Cinematic kiosk display with auto-sliding activity carousel; top-right corner has Settings + Fullscreen buttons
- `/display/config` → Device identity configuration (screen/location assignment, slide interval)

### Admin Panel
- `/admin/login` → Admin login (credentials: admin@urbanarana.com / admin123)
- `/admin/dashboard` → Dashboard with activity stats
- `/admin/activities` → Activity list (CRUD)
- `/admin/activities/new` → Create new activity
- `/admin/activities/:id/edit` → Edit activity + media upload + Screen Assignment section
- `/admin/locations` → Manage physical venues (CRUD dialog-based)
- `/admin/screens` → Manage individual TVs/kiosks (CRUD dialog-based, assigned to locations)
- `/admin/settings` → Branding and display settings

### API Endpoints (new)
- `GET/POST /api/admin/locations` — location CRUD (auth required)
- `PATCH/DELETE /api/admin/locations/:id` — location update/delete (auth required)
- `GET/POST /api/admin/screens` — screen CRUD (auth required)
- `PATCH/DELETE /api/admin/screens/:id` — screen update/delete (auth required)
- `GET /api/activities/display?screenId=&locationId=` — filtered display list (public)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   │   ├── src/routes/     # auth, activities, settings, uploads
│   │   └── uploads/        # User-uploaded files
│   └── urban-arena/        # React + Vite frontend
│       ├── src/pages/      # display, admin/*
│       ├── src/components/ # admin layout, media upload
│       └── public/images/  # AI-generated placeholder images
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
│       └── src/schema/     # admin-users, activities, settings, locations, screens
└── scripts/
    └── src/seed.ts         # Database seed script
```

## Seeded Demo Data

Run: `pnpm --filter @workspace/scripts run seed`

- Admin user: admin@urbanarana.com / admin123
- 3 demo activities: Tropical Paradise, Amazing Aurora, Urban Racing
- Default settings: EXPLORE heading, 5s slide interval, auto-slide on

## DB Schema

- **admin_users**: id, email, passwordHash, createdAt, updatedAt
- **activities**: id, name, slug, shortDescription, fullDescription, ageLimit, termsAndConditions, heroImageUrl, heroVideoUrl, cardImageUrl, thumbnailUrl, isActive, isFeatured, sortOrder, ctaText, createdAt, updatedAt
- **settings**: id, key, value, createdAt, updatedAt

## Settings Keys

- `overlay_heading` — large background word (default: "EXPLORE")
- `footer_text` — terms text in footer
- `auto_slide` — "true"/"false"
- `slide_interval` — seconds as string (default: "5")
- `display_mode` — "image_first", "video_first", "mixed"
- `brand_color` — hex color (default: "#e63535")

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

## Local development (Windows / CLI)

| Service | Port | URL |
| --- | --- | --- |
| Urban Arena UI (Vite) | **24725** | http://localhost:24725 |
| API (`@workspace/api-server`) | **8080** | http://localhost:8080 (proxy target for `/api`) |

1. Root `.env` from [.env.example](.env.example) (`DATABASE_URL`, `JWT_SECRET`, `PORT=8080` for API).
2. Terminal A: `pnpm --filter @workspace/api-server run dev`
3. Terminal B: `pnpm --filter @workspace/urban-arena run dev` — UI on **24725**; Vite proxies `/api` → `http://localhost:8080` ([vite.config.ts](artifacts/urban-arena/vite.config.ts), commit `d4621fd`).

Display: http://localhost:24725/display — Admin: http://localhost:24725/admin/login

More detail: [docs/LOCAL-DEV.md](docs/LOCAL-DEV.md). Do **not** use port 3000 locally (common conflict with other projects).

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API client and Zod schemas
- `pnpm --filter @workspace/db run push` — push schema to Supabase (set `DATABASE_URL` in root `.env`; see `.env.example`)
- `pnpm --filter @workspace/scripts run seed` — seed demo data
