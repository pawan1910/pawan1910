# Hex Territory — Build Plan

## What we're building

A GPS-based territory capture game. Players walk around the real world and claim
hexagonal grid cells (H3 resolution 9, ~174 m diameter) as their territory.
Other players can reclaim your cells. Real-time updates via Socket.io.

---

## Architecture at a glance

```
┌─────────────────────────────────────────────────────────────┐
│  Client (Web / Mobile)                                      │
│  ┌──────────────────┐    ┌──────────────────────────────┐  │
│  │  Next.js (web)   │    │  Expo React Native (mobile)  │  │
│  │  Leaflet + OSM   │    │  react-native-maps           │  │
│  │  Zustand store   │    │  expo-location GPS           │  │
│  └────────┬─────────┘    └──────────────┬───────────────┘  │
└───────────┼──────────────────────────────┼──────────────────┘
            │  REST + Socket.io            │
┌───────────▼──────────────────────────────▼──────────────────┐
│  Express Server (:4000)                                     │
│  ├── POST /api/auth/register|login  (JWT, bcrypt)           │
│  ├── GET  /api/territory/cells?bbox (PostGIS spatial query) │
│  ├── POST /api/territory/claim      (H3 + DB transaction)   │
│  ├── GET  /api/leaderboard                                  │
│  └── Socket.io  cell:claim → broadcast cell:claimed        │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  PostgreSQL + PostGIS                                       │
│  users │ hex_cells (h3_index PK, geom) │ territory_events  │
└─────────────────────────────────────────────────────────────┘
```

---

## Phases

### Phase 0 — Scaffold ✅ (done)
- [x] pnpm monorepo + Turborepo
- [x] `packages/shared` — TypeScript types, `H3_RESOLUTION`
- [x] `apps/server` — Express + Socket.io skeleton
- [x] `apps/web` — Next.js 14 App Router skeleton
- [x] `apps/mobile` — Expo 51 + Expo Router skeleton
- [x] `apps/server/src/db/schema.sql` — users, hex_cells, territory_events
- [x] `docker-compose.yml` for local PostGIS

---

### Phase 1 — Core game loop (start here)

**Goal:** Register → open map → tap/click to claim a hex cell → see it colored.
No real-time yet. Web only.

**Tasks:**
1. Start the database  
   ```bash
   docker compose up -d
   ```
2. Copy and fill env files  
   ```bash
   cp apps/server/.env.example apps/server/.env
   cp apps/web/.env.local.example apps/web/.env.local
   ```
3. Start server + web  
   ```bash
   pnpm dev
   ```
4. Register at http://localhost:3000/register
5. Verify the map loads and GPS dot appears
6. Click "Claim" → verify hex cell colors on map
7. Check DB: `SELECT * FROM hex_cells LIMIT 5;`

**What to test manually:**
- Register with two browsers/accounts
- Claim the same cell with account B (reclaim) — color should update
- Leaderboard at `/leaderboard` shows both users

---

### Phase 2 — Real-time sync

**Goal:** Two browser tabs see each other's claims instantly.

**Tasks:**
1. Verify Socket.io connection in browser DevTools (Network → WS)
2. Open two tabs, claim cells — both tabs should update without refresh
3. Debug: if updates don't appear, check `cell:claim` / `cell:claimed` events in
   server logs and browser console

**How it works:**
- Client POSTs `/api/territory/claim` (REST) → server writes to DB
- Client then emits `cell:claim` via Socket.io
- Server socket handler queries DB and broadcasts `cell:claimed` to ALL clients
- All clients update their Zustand store → map re-renders

---

### Phase 3 — Mobile app

**Goal:** Same game working on iOS/Android via Expo Go.

**Prerequisites:**
- Install Expo Go on your phone (free, App Store / Play Store)
- Your phone and laptop must be on the same Wi-Fi

**Tasks:**
1. Set `EXPO_PUBLIC_SERVER_URL` in `apps/mobile/.env` to your laptop's LAN IP
   ```
   EXPO_PUBLIC_SERVER_URL=http://192.168.x.x:4000
   ```
2. Start the mobile dev server  
   ```bash
   cd apps/mobile && pnpm start
   ```
3. Scan the QR code with Expo Go
4. Walk outside — GPS should place you on the map

**Note on maps:**
- iOS: Apple Maps (free, no API key)
- Android: requires Google Maps API key in `app.json` under
  `android.config.googleMaps.apiKey` (free tier: 28k loads/month)

---

### Phase 4 — Polish

**Goal:** Playable, not just functional.

Features to add (in rough priority order):
- [ ] Auto-claim while walking (uncomment the line in `HexMap.tsx`)
- [ ] Cooldown between claims (e.g. 5 s) to prevent spam
- [ ] Proximity check — can only claim cells within 50 m of GPS position
- [ ] Visual feedback: flash animation on claim/reclaim
- [ ] Cell tooltip: show owner name on hover/tap
- [ ] Mini-map inset showing territory overview

---

### Phase 5 — Deployment (all free)

| Service | What | URL |
|---------|------|-----|
| Supabase | PostgreSQL + PostGIS | supabase.com |
| Render.com | Express server | render.com |
| Vercel | Next.js web | vercel.com |
| Expo EAS | Mobile builds | expo.dev |

**Deploy order:**
1. Supabase: create project → run `schema.sql` in SQL editor → copy DB URL
2. Render: new Web Service → `apps/server` → set `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`
3. Vercel: import repo → root dir `apps/web` → set `NEXT_PUBLIC_SERVER_URL`
4. Mobile: update `.env` with production server URL → `eas build`

---

## Key files reference

| File | Purpose |
|------|---------|
| `packages/shared/src/types.ts` | All shared TS types + `H3_RESOLUTION` |
| `apps/server/src/db/schema.sql` | Run this once on any Postgres instance |
| `apps/server/src/routes/territory.ts` | Core claim logic (H3 + PostGIS) |
| `apps/server/src/socket/handlers.ts` | Real-time broadcast |
| `apps/web/src/store/gameStore.ts` | All client state (Zustand) |
| `apps/web/src/components/Map/HexMap.tsx` | Leaflet map + hex polygons |

---

## H3 resolution cheatsheet

Change `H3_RESOLUTION` in `packages/shared/src/types.ts`:

| Value | Cell diameter | Best for |
|-------|--------------|---------|
| 8 | ~460 m | Cycling / large areas |
| **9** | **~174 m** | **Walking (default)** |
| 10 | ~65 m | Fine-grained on foot |
| 11 | ~25 m | Very dense urban |
