// src/pages/Settings.jsx
import React, { useEffect, useState } from 'react'
import { CheckCircle, ExternalLink, KeyRound, Save, ShieldCheck } from 'lucide-react'
import { getSettings, saveSettings } from '../lib/api.js'
import { Button, Input, Textarea, Card, Spinner } from '../components/ui.jsx'

export default function Settings() {
  const [form, setForm] = useState({ user_name: '', criteria: '', gemini_configured: false })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getSettings()
      .then(r => setForm(r.data || {}))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      await saveSettings({
        user_name: form.user_name || '',
        criteria: form.criteria || '',
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}><Spinner size={28} /></div>

  return (
    <div className="page-shell" style={{ maxWidth: 720 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Paramètres</h1>
          <p className="page-subtitle">Configuration de votre espace ImmoTracker.</p>
        </div>
      </div>

      {/* Gemini API */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ width: 40, height: 40, borderRadius: 'var(--r-md)', background: form.gemini_configured ? 'var(--green-l)' : 'var(--amber-l)', color: form.gemini_configured ? 'var(--green)' : 'var(--amber)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {form.gemini_configured ? <ShieldCheck size={20} /> : <KeyRound size={20} />}
          </div>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 750, marginBottom: 6 }}>Gemini</h2>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 10, lineHeight: 1.6 }}>
              La clé API se configure côté Cloudflare avec la variable secrète <code style={{ fontFamily: 'var(--font-mono)' }}>GEMINI_KEY</code>. Elle n'est pas stockée dans D1 et n'est jamais renvoyée au navigateur.
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 9px', borderRadius: 'var(--r-sm)', background: form.gemini_configured ? 'var(--green-l)' : 'var(--amber-l)', color: form.gemini_configured ? 'var(--green)' : 'var(--amber)', fontSize: 12, fontWeight: 700 }}>
              {form.gemini_configured ? 'Clé configurée' : 'Clé non détectée'}
            </div>
          </div>
        </div>
        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--blue)', marginTop: 8 }}
        >
          Obtenir une clé Gemini <ExternalLink size={11} />
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--green-l)', color: 'var(--green)', borderRadius: 'var(--r-sm)', fontSize: 14, marginBottom: 14, fontWeight: 600 }}>
          <CheckCircle size={15} /> Paramètres enregistrés dans Cloudflare D1
        </div>
      )}

      <Button onClick={handleSave} disabled={saving} size="lg">
        {saving ? <Spinner size={15} /> : <Save size={15} />}
        {saving ? 'Enregistrement…' : 'Sauvegarder les paramètres'}
      </Button>
    </div>
  )
}
