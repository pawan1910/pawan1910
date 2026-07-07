'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) return setError(data.error)
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      router.push('/game')
    } catch {
      setError('Network error — is the server running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="glass-panel auth-card">
        <h1>Hex Territory</h1>
        <h2>Create your account</h2>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <input
              type="text"
              placeholder="Username"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              required
              minLength={3}
              maxLength={50}
            />
          </div>
          <div className="input-group">
            <input
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <div className="input-group">
            <input
              type="password"
              placeholder="Password (min 8 characters)"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
              minLength={8}
            />
          </div>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>
        <p>
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
