// src/pages/Settings.jsx
import React, { useEffect, useState } from 'react'
import { Save, Eye, EyeOff, ExternalLink } from 'lucide-react'
import { getSettings, saveSettings } from '../lib/api.js'
import { Button, Input, Textarea, Card, Spinner } from '../components/ui.jsx'

export default function Settings() {
  const [form, setForm] = useState({ gemini_key: '', user_name: '', criteria: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showKey, setShowKey] = useState(false)

  useEffect(() => {
    getSettings()
      .then(r => setForm(r.data || {}))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      await saveSettings(form)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}><Spinner size={28} /></div>

  return (
    <div style={{ maxWidth: 640, animation: 'fadeUp 0.35s ease both' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--ink)', letterSpacing: '-0.02em', marginBottom: 6 }}>
        Paramètres
      </h1>
      <p style={{ color: 'var(--ink-3)', fontSize: 15, marginBottom: 28 }}>
        Configuration de votre espace ImmoTracker.
      </p>

      {/* Gemini API */}
      <Card style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 6 }}>Clé API Gemini</h2>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 14, lineHeight: 1.6 }}>
          Utilisée pour extraire automatiquement les informations des annonces. Stockée de façon sécurisée dans Cloudflare Workers (variable secrète, jamais exposée au navigateur).
        </p>
        <div style={{ position: 'relative' }}>
          <input
            type={showKey ? 'text' : 'password'}
            value={form.gemini_key || ''}
            onChange={e => setForm(f => ({ ...f, gemini_key: e.target.value }))}
            placeholder="AIza…"
            style={{
              width: '100%', padding: '8px 40px 8px 12px', borderRadius: 'var(--r-sm)',
              border: '1px solid var(--border)', background: 'var(--paper)',
              fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink)', outline: 'none',
            }}
          />
          <button
            onClick={() => setShowKey(v => !v)}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)' }}
          >
            {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--blue)', marginTop: 8 }}
        >
          Obtenir une clé gratuitement <ExternalLink size={11} />
        </a>
      </Card>

      {/* User name */}
      <Card style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 6 }}>Votre nom</h2>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 14 }}>Utilisé pour signer automatiquement les emails de contact générés.</p>
        <Input
          value={form.user_name || ''}
          onChange={e => setForm(f => ({ ...f, user_name: e.target.value }))}
          placeholder="Ex : Marc Dupont"
        />
      </Card>

      {/* Criteria */}
      <Card style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 6 }}>Critères de recherche</h2>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 14, lineHeight: 1.6 }}>
          Ces critères sont transmis à Gemini lors de chaque analyse pour calculer un score d'adéquation personnalisé.
        </p>
        <Textarea
          value={form.criteria || ''}
          onChange={e => setForm(f => ({ ...f, criteria: e.target.value }))}
          placeholder="Ex : Maison 3+ chambres, budget max 380 000€, région Liège ou Namur, terrain minimum 300m², pas de copropriété, PEB C ou mieux si possible…"
          style={{ minHeight: 110 }}
        />
      </Card>

      {saved && (
        <div style={{ padding: '10px 14px', background: 'var(--green-l)', color: 'var(--green)', borderRadius: 'var(--r-sm)', fontSize: 14, marginBottom: 14, fontWeight: 500 }}>
          ✓ Paramètres enregistrés dans Cloudflare D1
        </div>
      )}

      <Button onClick={handleSave} disabled={saving} size="lg">
        {saving ? <Spinner size={15} /> : <Save size={15} />}
        {saving ? 'Enregistrement…' : 'Sauvegarder les paramètres'}
      </Button>
    </div>
  )
}
