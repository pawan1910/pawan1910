import os
from datetime import datetime
# pyrefly: ignore [missing-import]
import socketio
# pyrefly: ignore [missing-import]
import jwt
from db import get_db_pool

JWT_SECRET = os.getenv("JWT_SECRET", "hex-territory-secret-2024-xyz789abc")

sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins=[])

@sio.event
async def connect(sid, environ, auth):
    if not auth or 'token' not in auth:
        print(f"[ws] Connection refused: missing auth/token")
        raise socketio.exceptions.ConnectionRefusedError('Unauthorized')
    
    token = auth['token']
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        user_id = payload['userId']
        username = payload['username']
        
        await sio.save_session(sid, {
            'userId': user_id,
            'username': username
        })
        print(f"[ws] {username} connected ({user_id})")
    except Exception as e:
        print(f"[ws] Connection refused: invalid token ({e})")
        raise socketio.exceptions.ConnectionRefusedError('Invalid token')

@sio.on('cell:claim')
async def on_cell_claim(sid, h3_index):
    session = await sio.get_session(sid)
    user_id = session.get('userId')
    
    if not user_id:
        return
        
    try:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT u.username, u.color
                FROM hex_cells hc
                JOIN users u ON hc.owner_id = u.id
                WHERE hc.h3_index = $1
                """,
                h3_index
            )
            
            if not row:
                return
                
            await sio.emit('cell:claimed', {
                'h3Index': h3_index,
                'userId': str(user_id),
                'username': row['username'],
                'color': row['color'],
                'claimedAt': datetime.utcnow().isoformat() + 'Z',
                'previousOwnerId': None
            })
    except Exception as e:
        print(f"[ws] cell:claim error: {e}")

@sio.event
async def disconnect(sid):
    session = await sio.get_session(sid)
    user_id = session.get('userId') if session else None
    username = session.get('username') if session else None
    if user_id:
        print(f"[ws] {username} disconnected ({user_id})")
        await sio.emit('user:left', str(user_id))
