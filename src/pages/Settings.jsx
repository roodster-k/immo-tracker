// src/pages/Settings.jsx
import React, { useEffect, useState } from 'react'
import { CheckCircle, ExternalLink, KeyRound, RefreshCw, Save, ShieldCheck } from 'lucide-react'
import { getProperties, getSettings, rescoreProperty, saveSettings } from '../lib/api.js'
import { Button, Input, Textarea, Card, Spinner } from '../components/ui.jsx'

export default function Settings() {
  const [form, setForm] = useState({ user_name: '', criteria: '', gemini_configured: false })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [rescoring, setRescoring] = useState(false)
  const [rescoreProgress, setRescoreProgress] = useState(null)

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

  async function handleRescoreAll() {
    setRescoring(true)
    setRescoreProgress({ done: 0, total: 0, errors: 0 })
    try {
      const res = await getProperties()
      const properties = res.data || []
      setRescoreProgress({ done: 0, total: properties.length, errors: 0 })

      let errors = 0
      for (const property of properties) {
        try {
          await rescoreProperty(property.id, { criteria: form.criteria || '' })
        } catch {
          errors += 1
        }
        setRescoreProgress(progress => ({
          done: (progress?.done || 0) + 1,
          total: properties.length,
          errors,
        }))
      }
    } finally {
      setRescoring(false)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
      <Spinner size={28} />
    </div>
  )

  const h2Style = {
    fontFamily: 'var(--font-display)',
    fontSize: 19,
    fontWeight: 400,
    color: 'var(--ink)',
    marginBottom: 6,
  }

  const descStyle = {
    fontSize: 13,
    color: 'var(--ink-3)',
    marginBottom: 14,
    lineHeight: 1.65,
  }

  return (
    <div className="page-shell" style={{ maxWidth: 720 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Paramètres</h1>
          <p className="page-subtitle">Configuration de votre espace ImmoTracker.</p>
        </div>
      </div>

      {/* Gemini API */}
      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 'var(--r-md)',
            background: form.gemini_configured ? 'var(--green-l)' : 'var(--amber-l)',
            color: form.gemini_configured ? 'var(--green)' : 'var(--amber)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            {form.gemini_configured
              ? <ShieldCheck size={20} aria-hidden="true" />
              : <KeyRound size={20} aria-hidden="true" />}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={h2Style}>Gemini API</h2>
            <p style={descStyle}>
              La clé API se configure côté Cloudflare avec la variable secrète{' '}
              <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, padding: '1px 5px', background: 'var(--paper-2)', borderRadius: 4 }}>
                GEMINI_KEY
              </code>.
              Elle n'est pas stockée dans D1 et n'est jamais renvoyée au navigateur.
            </p>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 999,
              background: form.gemini_configured ? 'var(--green-l)' : 'var(--amber-l)',
              color: form.gemini_configured ? 'var(--green)' : 'var(--amber)',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.01em',
            }}>
              {form.gemini_configured ? '✓ Clé configurée' : 'Clé non détectée'}
            </div>
            <div style={{ marginTop: 10 }}>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12.5, color: 'var(--blue)', textDecoration: 'underline' }}
              >
                Obtenir une clé Gemini <ExternalLink size={11} aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </Card>

      {/* User name */}
      <Card style={{ marginBottom: 18 }}>
        <h2 style={h2Style}>Votre nom</h2>
        <p style={descStyle}>Utilisé pour signer automatiquement les emails de contact générés par Gemini.</p>
        <Input
          value={form.user_name || ''}
          onChange={e => setForm(f => ({ ...f, user_name: e.target.value }))}
          placeholder="Ex : Marc Dupont"
        />
      </Card>

      {/* Criteria */}
      <Card style={{ marginBottom: 18 }}>
        <h2 style={h2Style}>Critères de recherche</h2>
        <p style={descStyle}>
          Ces critères sont transmis à Gemini lors de chaque analyse pour calculer un score d'adéquation personnalisé (0–100).
        </p>
        <Textarea
          value={form.criteria || ''}
          onChange={e => setForm(f => ({ ...f, criteria: e.target.value }))}
          placeholder="Ex : Maison 3+ chambres, budget max 380 000€, région Liège ou Namur, terrain minimum 300m², pas de copropriété, PEB C ou mieux si possible…"
          style={{ minHeight: 110 }}
        />
      </Card>

      {/* Rescore */}
      <Card style={{ marginBottom: 24 }}>
        <h2 style={h2Style}>Recalcul des scores</h2>
        <p style={descStyle}>
          Relance le scoring de tous vos biens avec les critères actuellement saisis ci-dessus.
        </p>
        <Button
          onClick={handleRescoreAll}
          disabled={rescoring || !form.criteria?.trim()}
          variant="secondary"
        >
          {rescoring ? <Spinner size={15} /> : <RefreshCw size={15} aria-hidden="true" />}
          {rescoring ? 'Recalcul en cours…' : 'Recalculer tous les scores'}
        </Button>

        {rescoreProgress && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginTop: 14,
            padding: '9px 12px',
            borderRadius: 'var(--r-sm)',
            background: rescoreProgress.errors ? 'var(--amber-l)' : 'var(--paper-2)',
            fontSize: 13,
            fontWeight: 600,
            color: rescoreProgress.errors ? 'var(--amber)' : 'var(--ink-3)',
          }}>
            {rescoring && <Spinner size={13} />}
            {rescoreProgress.done}/{rescoreProgress.total} bien{rescoreProgress.total > 1 ? 's' : ''} traité{rescoreProgress.done > 1 ? 's' : ''}
            {rescoreProgress.errors ? ` · ${rescoreProgress.errors} erreur${rescoreProgress.errors > 1 ? 's' : ''}` : ''}
          </div>
        )}
      </Card>

      {/* Success feedback */}
      {saved && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 14px',
          background: 'var(--green-l)',
          color: 'var(--green)',
          borderRadius: 'var(--r-sm)',
          fontSize: 13.5,
          marginBottom: 14,
          fontWeight: 600,
          border: '1px solid rgba(29,106,78,0.20)',
        }}>
          <CheckCircle size={15} aria-hidden="true" /> Paramètres enregistrés dans Cloudflare D1
        </div>
      )}

      <Button onClick={handleSave} disabled={saving} size="lg">
        {saving ? <Spinner size={15} /> : <Save size={15} aria-hidden="true" />}
        {saving ? 'Enregistrement…' : 'Sauvegarder les paramètres'}
      </Button>
    </div>
  )
}
