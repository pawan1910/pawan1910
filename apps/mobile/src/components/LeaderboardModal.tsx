import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { useGameStore } from '../store/gameStore'

interface LeaderboardModalProps {
  visible: boolean
  onClose: () => void
}

export default function LeaderboardModal({ visible, onClose }: LeaderboardModalProps) {
  const { leaderboard } = useGameStore()

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.overlay}>
        <View style={s.container}>
          <View style={s.header}>
            <Text style={s.title}>Leaderboard</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Text style={s.closeBtnText}>X</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={s.list}>
            {leaderboard.length === 0 ? (
              <Text style={s.empty}>No territories claimed yet.</Text>
            ) : (
              leaderboard.map((entry, index) => {
                let distText = ''
                if (entry.distance != null) {
                  distText = entry.distance > 1000 
                    ? `${(entry.distance / 1000).toFixed(1)} km` 
                    : `${Math.round(entry.distance)} m`
                }
                
                return (
                  <View key={entry.userId} style={s.row}>
                    <Text style={s.rank}>#{index + 1}</Text>
                    <View style={[s.colorDot, { backgroundColor: entry.color }]} />
                    <View style={s.userInfo}>
                      <Text style={s.username} numberOfLines={1}>{entry.username}</Text>
                      {distText ? <Text style={s.distance}>{distText} away</Text> : null}
                    </View>
                    <Text style={s.score}>{entry.cellCount} cells</Text>
                  </View>
                )
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    maxHeight: '80%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  title: {
    color: '#f1f5f9',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 8,
  },
  closeBtnText: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: 'bold',
  },
  list: {
    padding: 16,
  },
  empty: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  rank: {
    color: '#94a3b8',
    width: 30,
    fontWeight: 'bold',
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  username: {
    color: '#f1f5f9',
    fontWeight: '600',
  },
  distance: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  score: {
    color: '#3b82f6',
    fontWeight: 'bold',
  },
})
