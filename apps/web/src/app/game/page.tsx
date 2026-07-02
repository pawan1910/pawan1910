'use client'
import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGameStore } from '@/store/gameStore'
import GameHUD from '@/components/HUD/GameHUD'

// Leaflet requires the browser's window object — disable SSR
const HexMap = dynamic(() => import('@/components/Map/HexMap'), { ssr: false })

export default function GamePage() {
  const router = useRouter()
  const { init, cleanup } = useGameStore()

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userRaw = localStorage.getItem('user')
    if (!token || !userRaw) return router.replace('/login')
    init(token, JSON.parse(userRaw))
    return cleanup
  }, [router, init, cleanup])

  return (
    <div style={{ height: '100dvh', position: 'relative' }}>
      <HexMap />
      <GameHUD />
    </div>
  )
}
