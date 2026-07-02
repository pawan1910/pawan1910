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
    <div
      style={{
        minHeight: '100vh',
        background: '#0f172a',
        color: '#f1f5f9',
        padding: '40px 16px',
      }}
    >
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 28,
          }}
        >
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Leaderboard</h1>
          <Link
            href="/game"
            style={{
              color: '#60a5fa',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            ← Back to map
          </Link>
        </div>

        {loading ? (
          <p style={{ color: '#64748b' }}>Loading…</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: '#64748b', fontSize: 13 }}>
                {['#', 'Player', 'Cells', 'Score'].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: h === '#' || h === 'Player' ? 'left' : 'right',
                      padding: '8px 0',
                      borderBottom: '1px solid #1e293b',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr key={entry.userId}>
                  <td
                    style={{
                      padding: '12px 0',
                      borderBottom: '1px solid #1e293b',
                      color: i < 3 ? ['#fbbf24', '#94a3b8', '#b45309'][i] : '#475569',
                      fontWeight: 600,
                    }}
                  >
                    {i + 1}
                  </td>
                  <td style={{ padding: '12px 0', borderBottom: '1px solid #1e293b' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          background: entry.color,
                          display: 'inline-block',
                          boxShadow: `0 0 4px ${entry.color}`,
                        }}
                      />
                      {entry.username}
                    </span>
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      padding: '12px 0',
                      borderBottom: '1px solid #1e293b',
                    }}
                  >
                    {entry.cellCount}
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      padding: '12px 0',
                      borderBottom: '1px solid #1e293b',
                      color: '#64748b',
                    }}
                  >
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
