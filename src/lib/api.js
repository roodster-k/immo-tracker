// src/lib/api.js
// All calls go through /api/* (Cloudflare Pages Functions in prod, Vite proxy in dev)

const BASE = '/api'

let getAuthToken = () => null

export function setAuthTokenGetter(fn) {
  getAuthToken = typeof fn === 'function' ? fn : () => null
}

async function req(path, options = {}) {
  const token = getAuthToken()
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const text = await res.text()
  let data = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    throw new Error(text || 'Réponse API invalide')
  }
  if (!res.ok || data.error) throw new Error(data.error || 'Erreur réseau')
  return data
}

// Properties
export const getProperties = (status) =>
  req(`/properties${status ? `?status=${status}` : ''}`)

export const getProperty = (id) => req(`/properties/${id}`)

export const createProperty = (body) =>
  req('/properties', { method: 'POST', body })

export const updateProperty = (id, body) =>
  req(`/properties/${id}`, { method: 'PUT', body })

export const rescoreProperty = (id, body = {}) =>
  req(`/properties/${id}/rescore`, { method: 'POST', body })

export const deleteProperty = (id) =>
  req(`/properties/${id}`, { method: 'DELETE' })

// Extract via Gemini (proxied through Worker)
export const extractAnnonce = (body) =>
  req('/extract', { method: 'POST', body })

// Sources (distinct sites/agencies from properties)
export const getSources = () => req('/sources')

// Settings
export const getSettings = () => req('/settings')
export const saveSettings = (body) =>
  req('/settings', { method: 'POST', body })
