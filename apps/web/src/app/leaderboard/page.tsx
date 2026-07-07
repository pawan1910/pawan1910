'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { LeaderboardEntry } from '@hex-territory/shared'

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/leaderboard`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setEntries)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="leaderboard-container">
      <div className="glass-panel leaderboard-card">
        <div className="leaderboard-header">
          <h1>Global Leaderboard</h1>
          <Link href="/game" className="leaderboard-back-link">
            ← Back to Map
          </Link>
        </div>

        {loading ? (
          <p style={{ color: '#64748b', textAlign: 'center', padding: 20 }}>Loading scores…</p>
        ) : (
          <table className="cyber-table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>Rank</th>
                <th style={{ textAlign: 'left' }}>Player</th>
                <th style={{ textAlign: 'right' }}>Cells</th>
                <th style={{ textAlign: 'right' }}>Score</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr key={entry.userId}>
                  <td style={{ textAlign: 'center' }}>
                    {i < 3 ? (
                      <span className={`rank-badge rank-${i + 1}`}>{i + 1}</span>
                    ) : (
                      <span className="rank-badge rank-other">{i + 1}</span>
                    )}
                  </td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          background: entry.color,
                          display: 'inline-block',
                          boxShadow: `0 0 6px ${entry.color}`,
                        }}
                      />
                      <span style={{ fontWeight: 500 }}>{entry.username}</span>
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{entry.cellCount}</td>
                  <td style={{ textAlign: 'right', color: '#60a5fa', fontWeight: 600 }}>
                    {entry.score}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
