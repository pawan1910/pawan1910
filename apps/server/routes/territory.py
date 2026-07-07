import os
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
import h3
import asyncpg
from db import get_db
from middleware.auth import require_auth

router = APIRouter()

H3_RESOLUTION = 9

class ClaimRequest(BaseModel):
    lat: float
    lng: float

@router.get("/cells")
async def get_cells(
    minLat: float,
    minLng: float,
    maxLat: float,
    maxLng: float,
    db: asyncpg.Connection = Depends(get_db)
):
    try:
        rows = await db.fetch(
            """
            SELECT hc.h3_index, hc.owner_id, hc.claimed_at,
                   u.username AS owner_username, u.color AS owner_color
            FROM hex_cells hc
            LEFT JOIN users u ON hc.owner_id = u.id
            WHERE hc.geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)
            """,
            minLng, minLat, maxLng, maxLat
        )
        
        return [
            {
                "h3Index": r["h3_index"],
                "ownerId": str(r["owner_id"]) if r["owner_id"] else None,
                "ownerUsername": r["owner_username"],
                "ownerColor": r["owner_color"],
                "claimedAt": r["claimed_at"].isoformat() + "Z" if r["claimed_at"] else None,
                "boundary": [list(coord) for coord in h3.cell_to_boundary(r["h3_index"])]
            }
            for r in rows
        ]
    except Exception as e:
        print(f"get_cells error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Server error"}
        )

@router.post("/claim")
async def claim(
    body: ClaimRequest,
    user: dict = Depends(require_auth),
    db: asyncpg.Connection = Depends(get_db)
):
    lat = body.lat
    lng = body.lng
    
    # Calculate H3 cell index and boundary
    try:
        h3_index = h3.latlng_to_cell(lat, lng, H3_RESOLUTION)
        boundary = h3.cell_to_boundary(h3_index) # list of (lat, lng)
        
        # Format vertices as 'lng lat' for PostGIS WKT (Polygon)
        coords = ", ".join([f"{blng} {blat}" for blat, blng in boundary])
        # WKT requires closing the polygon loop by repeating the first vertex
        geom_wkt = f"POLYGON(({coords}, {boundary[0][1]} {boundary[0][0]}))"
    except Exception as e:
        print(f"H3 conversion error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Missing or invalid coordinates"}
        )
        
    user_id = user["userId"]
    
    # Transactional claim logic
    async with db.transaction():
        # Get previous owner
        existing = await db.fetchrow(
            "SELECT owner_id FROM hex_cells WHERE h3_index = $1",
            h3_index
        )
        
        previous_owner_id = existing["owner_id"] if existing else None
        
        # Check if reclaim or clean claim
        # Since owner_id is UUID in Postgres, we want to match types
        is_reclaim = previous_owner_id is not None
        event_type = "reclaim" if is_reclaim else "claim"
        
        # 1. Upsert hex cell
        await db.execute(
            """
            INSERT INTO hex_cells (h3_index, owner_id, claimed_at, geom)
            VALUES ($1, $2, NOW(), ST_GeomFromText($3, 4326))
            ON CONFLICT (h3_index) DO UPDATE SET owner_id = $2, claimed_at = NOW()
            """,
            h3_index, user_id, geom_wkt
        )
        
        # 2. Insert event log
        # Make sure previous_owner_id is parsed correctly
        prev_id_uuid = None
        if previous_owner_id:
            prev_id_uuid = previous_owner_id
            
        await db.execute(
            """
            INSERT INTO territory_events (user_id, h3_index, previous_owner_id, event_type)
            VALUES ($1, $2, $3, $4)
            """,
            user_id, h3_index, prev_id_uuid, event_type
        )
        
        # 3. Update score
        score_diff = 2 if is_reclaim else 1
        await db.execute(
            "UPDATE users SET score = score + $1 WHERE id = $2",
            score_diff, user_id
        )
        
        # Fetch current user metadata (to return details)
        user_row = await db.fetchrow(
            "SELECT username, color FROM users WHERE id = $1",
            user_id
        )
        
        if not user_row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "User not found"}
            )
            
        return {
            "h3Index": h3_index,
            "ownerId": str(user_id),
            "ownerUsername": user_row["username"],
            "ownerColor": user_row["color"],
            "claimedAt": datetime.utcnow().isoformat() + "Z",
            "previousOwnerId": str(previous_owner_id) if previous_owner_id else None,
            "eventType": event_type
        }
