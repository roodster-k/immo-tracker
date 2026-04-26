// src/lib/api.js
// All calls go through /api/* (Cloudflare Pages Functions in prod, Vite proxy in dev)

const BASE = '/api'

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const data = await res.json()
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

export const deleteProperty = (id) =>
  req(`/properties/${id}`, { method: 'DELETE' })

// Extract via Gemini (proxied through Worker)
export const extractAnnonce = (body) =>
  req('/extract', { method: 'POST', body })

// Settings
export const getSettings = () => req('/settings')
export const saveSettings = (body) =>
  req('/settings', { method: 'POST', body })
