'use client'
import { useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useGameStore } from '@/store/gameStore'

export default function GameHUD() {
  const { user, cells, position, claimCell, cleanup } = useGameStore()
  const router = useRouter()

  const ownedCount = useMemo(() => {
    let n = 0
    cells.forEach((cell) => { if (cell.ownerId === user?.id) n++ })
    return n
  }, [cells, user])

  function handleClaim() {
    if (!position) return alert('Waiting for GPS fix…')
    claimCell(position.lat, position.lng)
  }

  function handleLogout() {
    cleanup()
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  return (
    <div className="glass-panel game-hud">
      <div className="game-hud-player">
        <span
          className="game-hud-player-dot"
          style={{
            background: user?.color || '#3b82f6',
            color: user?.color || '#3b82f6',
          }}
        />
        <span style={{ fontWeight: 600, fontSize: 15 }}>{user?.username}</span>
      </div>

      <div className="game-hud-stat">
        Cells: <strong>{ownedCount}</strong>
      </div>

      <button onClick={handleClaim} className="hud-btn-claim">
        Claim
      </button>

      <Link href="/leaderboard" className="hud-link">
        Leaderboard
      </Link>

      <button onClick={handleLogout} className="hud-btn-logout">
        Logout
      </button>
    </div>
  )
}
