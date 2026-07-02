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
    <div
      style={{
        position: 'absolute',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(15,23,42,0.85)',
        color: '#f1f5f9',
        borderRadius: 14,
        padding: '10px 18px',
        display: 'flex',
        gap: 16,
        alignItems: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.1)',
        whiteSpace: 'nowrap',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span
          style={{
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: user?.color || '#3b82f6',
            display: 'inline-block',
            boxShadow: `0 0 6px ${user?.color || '#3b82f6'}`,
          }}
        />
        <span style={{ fontWeight: 600, fontSize: 14 }}>{user?.username}</span>
      </div>

      <div style={{ fontSize: 13, color: '#94a3b8' }}>
        Cells: <strong style={{ color: '#f1f5f9' }}>{ownedCount}</strong>
      </div>

      <button
        onClick={handleClaim}
        style={{
          background: '#3b82f6',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '7px 16px',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: 13,
          transition: 'background 0.2s',
        }}
      >
        Claim
      </button>

      <Link
        href="/leaderboard"
        style={{ fontSize: 13, color: '#93c5fd', textDecoration: 'none', fontWeight: 500 }}
      >
        Board
      </Link>

      <button
        onClick={handleLogout}
        style={{
          background: 'transparent',
          color: '#64748b',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          padding: '6px 12px',
          cursor: 'pointer',
          fontSize: 12,
        }}
      >
        Out
      </button>
    </div>
  )
}
