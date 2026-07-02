import { create } from 'zustand'
import { io, type Socket } from 'socket.io-client'
import type {
  HexCell,
  ClaimEvent,
  ClaimResponse,
  ServerToClientEvents,
  ClientToServerEvents,
  User,
} from '@hex-territory/shared'

interface GameState {
  user: Pick<User, 'id' | 'username' | 'color'> | null
  token: string | null
  cells: Map<string, HexCell>
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null
  position: { lat: number; lng: number } | null

  init: (token: string, user: Pick<User, 'id' | 'username' | 'color'>) => void
  cleanup: () => void
  setPosition: (lat: number, lng: number) => void
  claimCell: (lat: number, lng: number) => Promise<void>
  loadCells: (bounds: { minLat: number; minLng: number; maxLat: number; maxLng: number }) => Promise<void>
}

export const useGameStore = create<GameState>((set, get) => ({
  user: null,
  token: null,
  cells: new Map(),
  socket: null,
  position: null,

  init(token, user) {
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
      process.env.NEXT_PUBLIC_SERVER_URL!,
      { auth: { token } },
    )

    socket.on('cell:claimed', (event: ClaimEvent) => {
      set((state) => {
        const cells = new Map(state.cells)
        cells.set(event.h3Index, {
          h3Index: event.h3Index,
          ownerId: event.userId,
          ownerUsername: event.username,
          ownerColor: event.color,
          claimedAt: event.claimedAt,
        })
        return { cells }
      })
    })

    set({ token, user, socket })
  },

  cleanup() {
    get().socket?.disconnect()
    set({ socket: null, user: null, token: null, cells: new Map(), position: null })
  },

  setPosition(lat, lng) {
    set({ position: { lat, lng } })
  },

  async loadCells({ minLat, minLng, maxLat, maxLng }) {
    const { token } = get()
    if (!token) return
    const params = new URLSearchParams({
      minLat: String(minLat),
      minLng: String(minLng),
      maxLat: String(maxLat),
      maxLng: String(maxLng),
    })
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/territory/cells?${params}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      if (!res.ok) return
      const data: HexCell[] = await res.json()
      set((state) => {
        const cells = new Map(state.cells)
        data.forEach((cell) => cells.set(cell.h3Index, cell))
        return { cells }
      })
    } catch (err: unknown) {
      console.error('loadCells error', err)
    }
  },

  async claimCell(lat, lng) {
    const { token, socket } = get()
    if (!token) return
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/territory/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ lat, lng }),
      })
      if (!res.ok) return
      const cell: ClaimResponse = await res.json()
      socket?.emit('cell:claim', cell.h3Index)
      set((state) => {
        const cells = new Map(state.cells)
        cells.set(cell.h3Index, {
          h3Index: cell.h3Index,
          ownerId: cell.ownerId,
          ownerUsername: cell.ownerUsername,
          ownerColor: cell.ownerColor,
          claimedAt: cell.claimedAt,
        })
        return { cells }
      })
    } catch (err: unknown) {
      console.error('claimCell error', err)
    }
  },
}))
