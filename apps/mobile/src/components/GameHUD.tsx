import { useMemo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useGameStore } from '../store/gameStore'

interface GameHUDProps {
  onShowLeaderboard: () => void
}

export default function GameHUD({ onShowLeaderboard }: GameHUDProps) {
  const { user, cells, position, claimCell, cleanup } = useGameStore()
  const router = useRouter()

  const ownedCount = useMemo(() => {
    let n = 0
    cells.forEach((cell) => { if (cell.ownerId === user?.id) n++ })
    return n
  }, [cells, user])

  async function handleLogout() {
    cleanup()
    await AsyncStorage.multiRemove(['token', 'user'])
    router.replace('/(auth)/login')
  }

  return (
    <View style={s.hud}>
      <View style={s.userBadge}>
        <View style={[s.dot, { backgroundColor: user?.color || '#3b82f6' }]} />
        <Text style={s.username}>{user?.username}</Text>
      </View>
      <Text style={s.stat}>
        <Text style={s.statNum}>{ownedCount}</Text> cells
      </Text>
      <TouchableOpacity
        style={s.claimBtn}
        onPress={() => position && claimCell(position.lat, position.lng)}
        activeOpacity={0.8}
      >
        <Text style={s.claimBtnText}>Claim</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.lbBtn} onPress={onShowLeaderboard}>
        <Text style={s.lbBtnText}>Rank</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.outBtn} onPress={handleLogout}>
        <Text style={s.outBtnText}>Out</Text>
      </TouchableOpacity>
    </View>
  )
}

const s = StyleSheet.create({
  hud: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(15,23,42,0.88)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  userBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  username: { color: '#f1f5f9', fontWeight: '600', fontSize: 13 },
  stat: { color: '#94a3b8', fontSize: 13 },
  statNum: { color: '#f1f5f9', fontWeight: '700' },
  claimBtn: { backgroundColor: '#3b82f6', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  claimBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  lbBtn: { backgroundColor: '#475569', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  lbBtnText: { color: '#f1f5f9', fontSize: 12, fontWeight: '600' },
  outBtn: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6 },
  outBtnText: { color: '#64748b', fontSize: 12 },
})
