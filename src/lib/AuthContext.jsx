import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { setAuthTokenGetter } from './api.js'
import {
  getAuthConfig,
  loadStoredSession,
  refreshSession,
  saveStoredSession,
  signInWithPassword,
  signOut as supabaseSignOut,
  signUpWithPassword,
} from './supabaseAuth.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [ready, setReady] = useState(false)
  const [authEnabled, setAuthEnabled] = useState(false)
  const [config, setConfig] = useState(null)
  const [session, setSession] = useState(null)
  const tokenRef = useRef(null)

  useEffect(() => {
    setAuthTokenGetter(() => tokenRef.current)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const nextConfig = await getAuthConfig()
        if (cancelled) return
        setConfig(nextConfig)
        setAuthEnabled(Boolean(nextConfig.auth_enabled))

        if (!nextConfig.auth_enabled) {
          setReady(true)
          return
        }

        let stored = loadStoredSession()
        const expiresSoon = stored?.expires_at && stored.expires_at < Math.floor(Date.now() / 1000) + 60
        if (stored?.refresh_token && expiresSoon) {
          stored = await refreshSession(nextConfig, stored.refresh_token)
        }

        if (stored?.access_token) {
          tokenRef.current = stored.access_token
          saveStoredSession(stored)
          setSession(stored)
        } else {
          saveStoredSession(null)
        }
      } catch {
        saveStoredSession(null)
      } finally {
        if (!cancelled) setReady(true)
      }
    }

    init()
    return () => { cancelled = true }
  }, [])

  async function signIn(email, password) {
    const nextSession = await signInWithPassword(config, email, password)
    tokenRef.current = nextSession?.access_token || null
    saveStoredSession(nextSession)
    setSession(nextSession)
    return nextSession
  }

  async function signUp(email, password) {
    const result = await signUpWithPassword(config, email, password)
    if (result?.access_token) {
      tokenRef.current = result.access_token
      saveStoredSession(result)
      setSession(result)
    }
    return result
  }

  async function signOut() {
    const token = tokenRef.current
    tokenRef.current = null
    saveStoredSession(null)
    setSession(null)
    if (config?.auth_enabled) await supabaseSignOut(config, token)
  }

  return (
    <AuthContext.Provider value={{ ready, authEnabled, config, session, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
