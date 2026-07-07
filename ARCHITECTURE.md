# Hex Territory — Full-Stack Architecture & File Catalog

This document explains the design, code file structure, and technical mechanics of the **Hex Territory** full-stack game, showing how the Python backend and Next.js frontend cooperate.

---

## 1. System Architecture Overview

Hex Territory is structured as a **Monorepo** managed with `pnpm` workspaces and `Turborepo` for orchestrating builds and tasks.

```
                  ┌───────────────────────────────┐
                  │      Client Web Browser       │
                  │    (Next.js 14 App Router)    │
                  └──────────┬─────────────▲──────┘
                             │             │
                    HTTP REST│             │Socket.io
                             ▼             │
             ┌─────────────────────────────┴──────┐
             │       Python Backend Service       │
             │     (FastAPI + python-socketio)    │
             └──────────────────────┬─────────────┘
                                    │
                                    │asyncpg (TCP)
                                    ▼
             ┌────────────────────────────────────┐
             │       PostgreSQL + PostGIS         │
             │  (users, hex_cells, event logs)    │
             └────────────────────────────────────┘
```

*   **REST API**: Handles high-level transactions like registration, login, loading the leaderboard, and submitting new cell claims.
*   **WebSockets**: Delivers real-time map updates (syncing cell ownership across players instantly).
*   **PostGIS & Uber H3**: Manages the spatial indexing of the 2D earth surface into resolution 9 hexagons (~174 meters in diameter).

---

## 2. The Python Backend (`apps/server`)

The server is built with **FastAPI** (running on **Uvicorn**) and **python-socketio** mounted on the root path.

### Detailed File Catalog

#### 📁 Root Files

##### 📄 [main.py](file:///Users/pawan/Documents/projects/hex-territory/apps/server/main.py)
*   **Role**: Application entry point.
*   **Mechanics**:
    *   Initializes the `FastAPI` instance.
    *   Configures CORS rules to allow cross-origin requests from the Next.js dev server (`localhost:3000`, `3001`, `3002`, etc.) and production domains.
    *   Registers routers for `/api/auth`, `/api/territory`, and `/api/leaderboard`.
    *   Registers lifespan listeners to warm up the database connection pool on startup and close it on shutdown.
    *   Mounts the Socket.IO ASGI application (`socket_app`) to handle real-time WebSockets on the same port.

##### 📄 [db.py](file:///Users/pawan/Documents/projects/hex-territory/apps/server/db.py)
*   **Role**: Database client configuration.
*   **Mechanics**:
    *   Initializes a connection pool using `asyncpg` to allow fast, concurrent async queries to PostgreSQL.
    *   Injects SSL context dynamically for remote databases (like Supabase) while allowing unencrypted connections for local development.
    *   Exposes `get_db()` as a FastAPI dependency to yield database connections inside routes.

##### 📄 [socket_handlers.py](file:///Users/pawan/Documents/projects/hex-territory/apps/server/socket_handlers.py)
*   **Role**: WebSocket connection and event handling.
*   **Mechanics**:
    *   Verifies JWT tokens during the initial connection handshake. Refuses connections if the token is invalid or missing.
    *   Listens for `cell:claim` events, queries the database for the new owner's details, and broadcasts the event `cell:claimed` to all connected clients.
    *   Broadcasts `user:left` to notify clients when a player disconnects.

##### 📄 [requirements.txt](file:///Users/pawan/Documents/projects/hex-territory/apps/server/requirements.txt)
*   **Role**: Python dependencies specification.
*   **Dependencies**: `fastapi`, `uvicorn`, `python-socketio`, `asyncpg` (Postgres driver), `PyJWT` (tokens), `bcrypt` (passwords), and `h3` (geospatial indexing).

#### 📁 Routes & Middleware (`apps/server/routes` & `apps/server/middleware`)

##### 📄 [middleware/auth.py](file:///Users/pawan/Documents/projects/hex-territory/apps/server/middleware/auth.py)
*   **Role**: JWT Route Protection.
*   **Mechanics**: Extracts the `Bearer <token>` from the HTTP `Authorization` header, decodes and verifies it using the `JWT_SECRET`, and injects the user's details (`userId`, `username`) into protected FastAPI routes. Raises a custom JSON-formatted `AuthException` if unauthorized.

##### 📄 [routes/auth.py](file:///Users/pawan/Documents/projects/hex-territory/apps/server/routes/auth.py)
*   **Role**: Authentication API endpoints.
*   **Endpoints**:
    *   `POST /api/auth/register`: Hashes passwords using `bcrypt`, generates a random profile color, inserts the new user into the database, and returns a signed 7-day JWT token.
    *   `POST /api/auth/login`: Checks the input credentials, validates the hashed password using `bcrypt.checkpw`, and returns a JWT token.

##### 📄 [routes/territory.py](file:///Users/pawan/Documents/projects/hex-territory/apps/server/routes/territory.py)
*   **Role**: Core map API endpoints.
*   **Endpoints**:
    *   `GET /api/territory/cells`: Accepts query parameters (`minLat`, `minLng`, `maxLat`, `maxLng`) and queries the PostGIS database using `ST_MakeEnvelope` to return all captured cells in the map view.
    *   `POST /api/territory/claim` (Protected): Converts coords to H3 indices, maps the cell boundaries to a PostGIS Polygon WKT format, and runs a database transaction to:
        1. Check if the cell has a previous owner (deciding if it is a claim or reclaim).
        2. Upsert the cell in `hex_cells`.
        3. Insert a log in `territory_events`.
        4. Update the player's score.

##### 📄 [routes/leaderboard.py](file:///Users/pawan/Documents/projects/hex-territory/apps/server/routes/leaderboard.py)
*   **Role**: Leaderboard calculations.
*   **Endpoint**: `GET /api/leaderboard` returns the top 20 players sorted by the count of their claimed cells and score using a JOIN grouping.

---

## 3. The Web Frontend (`apps/web`)

The frontend is a single-page application (SPA) built using **Next.js 14** (App Router) and styled with **Vanilla CSS** and **Glassmorphism panels**.

### Detailed File Catalog

#### 📁 Configuration & State

##### 📄 [package.json](file:///Users/pawan/Documents/projects/hex-territory/apps/web/package.json)
*   **Role**: Node package dependencies (Next.js, Zustand, Socket.io-client, Leaflet).

##### 📄 [src/store/gameStore.ts](file:///Users/pawan/Documents/projects/hex-territory/apps/web/src/store/gameStore.ts)
*   **Role**: Global State Management (Zustand).
*   **Mechanics**:
    *   Manages player authentication state (`user`, `token`).
    *   Initializes the WebSocket connection and listens for `'cell:claimed'` updates from the server.
    *   Stores and updates a local Map of visible hex cells.
    *   Manages coordinates loading and user location GPS triggers.

#### 📁 CSS & Design

##### 📄 [src/app/globals.css](file:///Users/pawan/Documents/projects/hex-territory/apps/web/src/app/globals.css)
*   **Role**: Design System and styling presets.
*   **Key Classes**:
    *   `.glass-panel`: Frosted glass blur effect (`backdrop-filter`) with custom card animations.
    *   `.cyber-table`: Style sheets for the leaderboard grids.
    *   `.auth-page` / `.auth-card`: Radial gradient page styles and input layouts.

#### 📁 Components

##### 📄 [src/components/Map/HexMap.tsx](file:///Users/pawan/Documents/projects/hex-territory/apps/web/src/components/Map/HexMap.tsx)
*   **Role**: Geospatial Leaflet map render.
*   **Mechanics**:
    *   Binds to the DOM map container.
    *   Loads **CartoDB Voyager** high-contrast map tiles.
    *   Tracks browser geolocation and moves the map viewport to follow the user.
    *   Renders H3 polygons dynamically on the map, using different outline weights and stroke styles (dashed for unowned, solid neon for owned).

##### 📄 [src/components/HUD/GameHUD.tsx](file:///Users/pawan/Documents/projects/hex-territory/apps/web/src/components/HUD/GameHUD.tsx)
*   **Role**: Floating Game HUD overlay.
*   **Mechanics**:
    *   Displays current logged-in username and owned cells counter.
    *   Features a pulsing indicator dot matching the player's random avatar color.
    *   Exposes a **Claim** button that converts the current GPS coordinates into a territory capture transaction.

---

## 4. Key Gameplay Flows Explained

### A. Viewport Grid Render Flow
1. User moves the map in the browser.
2. `HexMap.tsx` catches the `moveend` Leaflet event and extracts the bounding coordinates (`minLat`, `minLng`, `maxLat`, `maxLng`).
3. It dispatches a `loadCells()` call inside `gameStore.ts`.
4. The client fetches `/api/territory/cells?bounds...`.
5. The FastAPI backend triggers a spatial overlap search on PostgreSQL using PostGIS.
6. The database returns captured grid cells, which are merged into the Zustand store, prompting the map to re-draw the hexagons in the viewport.

### B. Grid Capture Flow
1. User walks to a new area and clicks **Claim** on the HUD.
2. The client fetches user GPS coordinates and submits a POST request to `/api/territory/claim` (containing `{ lat, lng }`).
3. The server uses `h3-js` (in Python) to convert coordinates to an H3 index.
4. The backend runs a PostgreSQL transaction to update tables (`hex_cells`, `territory_events`, `users`), returns a 200 OK, and commits.
5. The client receives the response, updates the local store, and emits `cell:claim` via WebSockets.
6. The Python Socket.IO server receives this socket event and broadcasts `cell:claimed` to all other connected browsers, causing their maps to update immediately.
