# Hex Territory

GPS-based territory capture game. Walk around and claim H3 hexagonal grid cells as your territory. Battle other players in real-time.

## Stack

| Layer | Tech | Free Hosting |
|-------|------|-------------|
| Web | Next.js 14 (App Router) | Vercel |
| Mobile | Expo 51 (React Native) | Expo Go (dev) |
| Server | Express + Socket.io | Render.com |
| Database | PostgreSQL + PostGIS | Supabase |
| Grid | H3 (resolution 9) | — |
| Maps | OpenStreetMap (web) / Apple/Google Maps (mobile) | Free |

## Prerequisites

- Node.js 20+
- pnpm 9+ (`npm i -g pnpm`)
- Docker (optional, for local DB) **OR** a [Supabase](https://supabase.com) project

---

## Local Setup

### 1. Install dependencies

```bash
cd hex-territory
pnpm install
```

### 2. Start the database

**Option A — Docker (recommended for local dev):**
```bash
docker compose up -d
# Schema is auto-applied from apps/server/src/db/schema.sql
```

**Option B — Supabase (free hosted):**
1. Create a project at https://supabase.com (free tier)
2. Run `apps/server/src/db/schema.sql` in the Supabase SQL editor
3. Copy the connection string from Settings → Database

### 3. Configure environment variables

```bash
# Server
cp apps/server/.env.example apps/server/.env
# Edit DATABASE_URL and JWT_SECRET

# Web
cp apps/web/.env.local.example apps/web/.env.local

# Mobile
cp apps/mobile/.env.example apps/mobile/.env
```

For mobile dev on a real device, replace `localhost` with your machine's local IP:
```
EXPO_PUBLIC_SERVER_URL=http://192.168.x.x:4000
```

### 4. Run everything

```bash
pnpm dev
# Starts: server (:4000) + web (:3000) in parallel
```

Mobile separately:
```bash
cd apps/mobile
pnpm start   # Scan QR with Expo Go app
```

---

## Deployment (Free Tier)

### Database → Supabase
1. Create project at https://supabase.com
2. Run `schema.sql` in SQL Editor
3. Use the connection string as `DATABASE_URL`

### Server → Render.com
1. Connect GitHub repo at https://render.com
2. New → Web Service → `apps/server`
3. Build: `pnpm install && pnpm build`
4. Start: `node dist/index.js`
5. Set env vars: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`

> Note: Render free tier spins down after 15 min inactivity. Use Railway ($5 free credit) for always-on.

### Web → Vercel
1. Import repo at https://vercel.com
2. Root directory: `apps/web`
3. Set `NEXT_PUBLIC_SERVER_URL` to your Render URL

### Mobile → Expo EAS (free builds)
```bash
npm i -g eas-cli
eas login
cd apps/mobile
eas build --platform all --profile preview
```

---

## Architecture

```
hex-territory/
├── apps/
│   ├── web/          Next.js — map UI, auth, leaderboard
│   ├── mobile/       Expo — native map, GPS tracking
│   └── server/       Express + Socket.io — REST API + real-time
└── packages/
    └── shared/       TypeScript types + H3_RESOLUTION constant
```

### Key flows

**Claiming a cell:**
1. Client sends `POST /api/territory/claim` with `{ lat, lng }`
2. Server converts coords → H3 index (res 9)
3. Server upserts `hex_cells`, logs `territory_events`, updates score in a transaction
4. Server returns cell data; client emits `cell:claim` via Socket.io
5. Socket handler broadcasts `cell:claimed` to all connected clients

**Real-time sync:**
- On map move, client fetches `/api/territory/cells?bbox=...` (PostGIS spatial query)
- Socket.io pushes instant updates when any player claims a cell

---

## H3 Resolution

Resolution 9 cells are ~0.1 km² (~174 m diameter) — good for walking.
Change `H3_RESOLUTION` in `packages/shared/src/types.ts` to tune granularity.

| Resolution | Diameter | Use case |
|-----------|----------|----------|
| 8 | ~460 m | City blocks |
| 9 | ~174 m | Walking (default) |
| 10 | ~65 m | Fine-grained |
