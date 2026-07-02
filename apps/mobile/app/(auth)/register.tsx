import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useRouter, Link } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL

export default function RegisterScreen() {
  const router = useRouter()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)

  async function handleRegister() {
    setLoading(true)
    try {
      const res = await fetch(`${SERVER_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) return Alert.alert('Error', data.error)
      await AsyncStorage.multiSet([['token', data.token], ['user', JSON.stringify(data.user)]])
      router.replace('/game')
    } catch {
      Alert.alert('Error', 'Network error — check server URL in .env')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={s.container}>
      <Text style={s.title}>Hex Territory</Text>
      <Text style={s.subtitle}>Create your account</Text>
      <TextInput style={s.input} placeholder="Username" placeholderTextColor="#475569"
        autoCapitalize="none" value={form.username}
        onChangeText={(v) => setForm((f) => ({ ...f, username: v }))} />
      <TextInput style={s.input} placeholder="Email" placeholderTextColor="#475569"
        keyboardType="email-address" autoCapitalize="none" value={form.email}
        onChangeText={(v) => setForm((f) => ({ ...f, email: v }))} />
      <TextInput style={s.input} placeholder="Password (min 8 chars)" placeholderTextColor="#475569"
        secureTextEntry value={form.password}
        onChangeText={(v) => setForm((f) => ({ ...f, password: v }))} />
      <TouchableOpacity style={s.btn} onPress={handleRegister} disabled={loading}>
        <Text style={s.btnText}>{loading ? 'Creating…' : 'Create Account'}</Text>
      </TouchableOpacity>
      <Link href="/(auth)/login" style={s.link}>Already have an account? Sign in</Link>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 28, backgroundColor: '#0f172a' },
  title: { fontSize: 30, fontWeight: '800', color: '#60a5fa', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#64748b', textAlign: 'center', marginBottom: 32 },
  input: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', borderRadius: 10,
    padding: 14, color: '#f1f5f9', fontSize: 15, marginBottom: 12 },
  btn: { backgroundColor: '#3b82f6', borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  link: { color: '#60a5fa', textAlign: 'center', marginTop: 20, fontSize: 14 },
})
