import React, { useState } from 'react'
import { LockKeyhole, LogIn } from 'lucide-react'
import { useAuth } from '../lib/AuthContext.jsx'
import { Button, Card, Input, Spinner } from '../components/ui.jsx'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email.trim(), password)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <Card className="auth-card">
        <div style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--ink)', color: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <LockKeyhole size={20} />
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, lineHeight: 1.05, letterSpacing: '-0.03em', marginBottom: 8 }}>
          Immo Tracker
        </h1>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.6, marginBottom: 22 }}>
          Connecte-toi pour accéder à ton suivi immobilier.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 13 }}>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <Input
            label="Mot de passe"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            minLength={6}
            required
          />

          {error && (
            <div style={{ padding: '9px 11px', borderRadius: 'var(--r-sm)', background: 'var(--red-l)', color: 'var(--red)', fontSize: 13, fontWeight: 600 }}>
              {error}
            </div>
          )}

          <Button type="submit" size="lg" disabled={loading || !email.trim() || !password}>
            {loading ? <Spinner size={15} /> : <LogIn size={15} />}
            {loading ? 'Connexion...' : 'Se connecter'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
