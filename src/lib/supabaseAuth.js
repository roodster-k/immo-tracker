const STORAGE_KEY = 'immo-tracker.supabase.session'

async function readJson(res) {
  const text = await res.text()
  let data = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    throw new Error(text || 'Réponse Supabase invalide')
  }
  if (!res.ok || data.error) {
    throw new Error(data.error_description || data.msg || data.message || data.error || 'Erreur Supabase Auth')
  }
  return data
}

function normalizeSession(data) {
  if (!data?.access_token) return null
  const expiresAt = data.expires_at || Math.floor(Date.now() / 1000) + (data.expires_in || 3600)
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: expiresAt,
    token_type: data.token_type || 'bearer',
    user: data.user || null,
  }
}

function authHeaders(config, token) {
  return {
    apikey: config.supabase_anon_key,
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export async function getAuthConfig() {
  const res = await fetch('/api/auth/config')
  const data = await readJson(res)
  return data.data || {}
}

export function loadStoredSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveStoredSession(session) {
  if (!session) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export async function signInWithPassword(config, email, password) {
  const res = await fetch(`${config.supabase_url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: authHeaders(config),
    body: JSON.stringify({ email, password }),
  })
  return normalizeSession(await readJson(res))
}

export async function signUpWithPassword(config, email, password) {
  const res = await fetch(`${config.supabase_url}/auth/v1/signup`, {
    method: 'POST',
    headers: authHeaders(config),
    body: JSON.stringify({ email, password }),
  })
  const data = await readJson(res)
  return normalizeSession(data) || { user: data.user || null, needsConfirmation: true }
}

export async function refreshSession(config, refreshToken) {
  if (!refreshToken) return null
  const res = await fetch(`${config.supabase_url}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: authHeaders(config),
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
  return normalizeSession(await readJson(res))
}

export async function signOut(config, token) {
  if (!token) return
  await fetch(`${config.supabase_url}/auth/v1/logout`, {
    method: 'POST',
    headers: authHeaders(config, token),
  }).catch(() => {})
}
