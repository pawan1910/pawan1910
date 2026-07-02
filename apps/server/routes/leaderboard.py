import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status
from db import get_db

router = APIRouter()

@router.get("/")
async def get_leaderboard(db: asyncpg.Connection = Depends(get_db)):
    try:
        rows = await db.fetch(
            """
            SELECT u.id AS "userId", u.username, u.color, u.score,
                   COUNT(hc.h3_index)::int AS "cellCount"
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
                "cellCount": r["cellCount"]
            }
            for r in rows
        ]
    except Exception as e:
        print(f"Leaderboard error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Server error"}
        )
