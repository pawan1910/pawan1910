# Database Setup Guide

## Schema overview

The game uses 3 tables:

```
users
├── id            UUID  (primary key)
├── username      VARCHAR(50)  unique
├── email         VARCHAR(255) unique
├── password_hash VARCHAR(255)
├── color         VARCHAR(7)   — player's hex colour e.g. #3B82F6
├── score         INTEGER      — total points earned
└── created_at    TIMESTAMPTZ

hex_cells
├── h3_index      VARCHAR(20)  (primary key) — e.g. "89283082837ffff"
├── owner_id      UUID  → users.id
├── claimed_at    TIMESTAMPTZ
└── geom          GEOMETRY(POLYGON, 4326)  — PostGIS polygon for spatial queries

territory_events   (audit log — every claim/reclaim is recorded)
├── id                UUID  (primary key)
├── user_id           UUID  → users.id
├── h3_index          VARCHAR(20)
├── previous_owner_id UUID  → users.id  (null on first claim)
├── event_type        VARCHAR(10)  CHECK IN ('claim', 'reclaim')
└── created_at        TIMESTAMPTZ
```

---

## Option A — Supabase (free, recommended, no install)

### 1. Create a project

1. Go to https://supabase.com → **Start for free**
2. Sign in with GitHub / Google
3. Click **New project**
4. Fill in:
   - **Name**: `hex-territory`
   - **Database password**: choose a strong password and **save it** — you'll need it
   - **Region**: pick the one closest to you
5. Click **Create new project** — wait ~1 minute for it to spin up

---

### 2. Run the schema

1. In the left sidebar click **SQL Editor**
2. Click **New query**
3. Paste the SQL below and click **Run** (▶)

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username      VARCHAR(50)  UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  color         VARCHAR(7)   NOT NULL DEFAULT '#3B82F6',
  score         INTEGER      DEFAULT 0,
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hex_cells (
  h3_index   VARCHAR(20) PRIMARY KEY,
  owner_id   UUID        REFERENCES users(id) ON DELETE SET NULL,
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  geom       GEOMETRY(POLYGON, 4326)
);

CREATE INDEX IF NOT EXISTS idx_hex_cells_owner ON hex_cells(owner_id);
CREATE INDEX IF NOT EXISTS idx_hex_cells_geom  ON hex_cells USING GIST(geom);

CREATE TABLE IF NOT EXISTS territory_events (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID REFERENCES users(id),
  h3_index          VARCHAR(20) NOT NULL,
  previous_owner_id UUID REFERENCES users(id),
  event_type        VARCHAR(10) NOT NULL CHECK (event_type IN ('claim', 'reclaim')),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_user    ON territory_events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_created ON territory_events(created_at DESC);
```

You should see: **Success. No rows returned**

---

### 3. Get the connection string

Supabase moved this in their 2024 UI update. There are **two ways** to find it:

#### Way 1 — "Connect" button (newest UI)
1. At the very top of your project page, click the green **Connect** button
2. In the panel that opens, select the **URI** tab (or "Connection string" tab)
3. Copy the string that looks like:
   ```
   postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
   ```

#### Way 2 — Project Settings (older UI path)
1. Click the **gear icon ⚙** at the bottom of the left sidebar → **Project Settings**
2. Click **Database** in the settings menu
3. Scroll down to the **"Connection string"** section
4. Select the **URI** tab
5. Copy the connection string

> **Important:** Replace `[YOUR-PASSWORD]` in the string with the password you set when creating the project.

---

### 4. Put it in your .env

Open `apps/server/.env` and replace the `DATABASE_URL` line:

```env
DATABASE_URL=postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-xx.pooler.supabase.com:5432/postgres
JWT_SECRET=pick-any-long-random-string-eg-abc123xyz789secret
CORS_ORIGIN=http://localhost:3000
PORT=4000
NODE_ENV=development
```

---

## Option B — Local PostgreSQL + Docker

If you have Docker installed:

```bash
# from the project root
docker compose up -d
# schema is applied automatically via docker-entrypoint-initdb.d
```

Then use:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hex_territory
```

---

## Verify tables were created

In Supabase left sidebar → **Table Editor** — you should see three tables:

- `users`
- `hex_cells`
- `territory_events`

If they don't appear, re-run the SQL from Step 2.
