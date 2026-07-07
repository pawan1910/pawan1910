import { useEffect, useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Location from 'expo-location'
import HexMap from '../src/components/HexMap'
import GameHUD from '../src/components/GameHUD'
import LeaderboardModal from '../src/components/LeaderboardModal'
import { useGameStore } from '../src/store/gameStore'

export default function GameScreen() {
  const router = useRouter()
  const { init, cleanup, setPosition } = useGameStore()
  const [showLeaderboard, setShowLeaderboard] = useState(false)

  useEffect(() => {
    let locationSub: Location.LocationSubscription | null = null

    async function setup() {
      const [token, userRaw] = await AsyncStorage.multiGet(['token', 'user'])
      if (!token[1] || !userRaw[1]) return router.replace('/(auth)/login')

      init(token[1], JSON.parse(userRaw[1]))

      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') return

      locationSub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 5 },
        ({ coords }) => setPosition(coords.latitude, coords.longitude),
      )
    }

    setup()
    return () => {
      locationSub?.remove()
      cleanup()
    }
  }, [router, init, cleanup, setPosition])

  return (
    <View style={s.container}>
      <HexMap />
      <GameHUD onShowLeaderboard={() => setShowLeaderboard(true)} />
      <LeaderboardModal visible={showLeaderboard} onClose={() => setShowLeaderboard(false)} />
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
})
