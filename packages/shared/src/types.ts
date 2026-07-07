export interface User {
  id: string
  username: string
  email: string
  color: string
  score: number
  createdAt: string
}

export interface HexCell {
  h3Index: string
  ownerId: string | null
  ownerUsername: string | null
  ownerColor: string | null
  claimedAt: string | null
  boundary?: [number, number][]  // [[lat, lng], ...] pre-computed polygon vertices
}

export interface ClaimEvent {
  h3Index: string
  userId: string
  username: string
  color: string
  claimedAt: string
  previousOwnerId: string | null
}

export interface ClaimResponse {
  h3Index: string
  ownerId: string
  ownerUsername: string
  ownerColor: string
  claimedAt: string
  previousOwnerId: string | null
  eventType: 'claim' | 'reclaim'
}

export interface LeaderboardEntry {
  userId: string
  username: string
  color: string
  cellCount: number
  score: number
  distance?: number | null
}

export interface ServerToClientEvents {
  'cell:claimed': (event: ClaimEvent) => void
  'cells:init': (cells: HexCell[]) => void
  'user:joined': (user: Pick<User, 'id' | 'username' | 'color'>) => void
  'user:left': (userId: string) => void
}

export interface ClientToServerEvents {
  'cell:claim': (h3Index: string) => void
  'cells:subscribe': (h3Indices: string[]) => void
}

export const H3_RESOLUTION = 9
