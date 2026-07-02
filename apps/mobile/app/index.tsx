import { useEffect } from 'react'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { View, ActivityIndicator } from 'react-native'

export default function IndexScreen() {
  const router = useRouter()
  useEffect(() => {
    AsyncStorage.getItem('token').then((token) => {
      router.replace(token ? '/game' : '/(auth)/login')
    })
  }, [router])
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
      <ActivityIndicator color="#3b82f6" />
    </View>
  )
}
