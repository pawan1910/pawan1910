# pyrefly: ignore [missing-import]
import asyncpg
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status, Query
from db import get_db

router = APIRouter()

@router.get("")
@router.get("/")
async def get_leaderboard(
    lat: float = Query(None),
    lng: float = Query(None),
    db: asyncpg.Connection = Depends(get_db)
):
    try:
        if lat is not None and lng is not None:
            # Calculate distance if lat/lng are provided
            rows = await db.fetch(
                """
                SELECT u.id AS "userId", u.username, u.color, u.score,
                       COUNT(hc.h3_index)::int AS "cellCount",
                       MIN(ST_Distance(ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, hc.geom::geography)) AS distance
                FROM users u
                LEFT JOIN hex_cells hc ON hc.owner_id = u.id
                GROUP BY u.id
                ORDER BY "cellCount" DESC, u.score DESC
                LIMIT 20
                """,
                lng, lat
            )
        else:
            rows = await db.fetch(
                """
                SELECT u.id AS "userId", u.username, u.color, u.score,
                       COUNT(hc.h3_index)::int AS "cellCount",
                       NULL AS distance
                FROM users u
                LEFT JOIN hex_cells hc ON hc.owner_id = u.id
                GROUP BY u.id
                ORDER BY "cellCount" DESC, u.score DESC
                LIMIT 20
                """
            )
        
        return [
            {
                "userId": str(r["userId"]),
                "username": r["username"],
                "color": r["color"],
                "score": r["score"],
                "cellCount": r["cellCount"],
                "distance": r["distance"]
            }
            for r in rows
        ]
    except Exception as e:
        print(f"Leaderboard error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Server error"}
        )
