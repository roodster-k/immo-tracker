// src/pages/AddProperty.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Save, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react'
import { extractAnnonce, createProperty, getSettings } from '../lib/api.js'
import { Button, Textarea, Select, Card, Spinner, ScoreBar } from '../components/ui.jsx'
import { STATUS_LABELS, STATUS_OPTIONS, extractFirstUrl } from '../lib/utils.js'

const SOURCES = ['auto-détecté', 'Immoweb', 'Zimmo', 'Century 21', 'Athome', 'Agence', 'Particulier', 'Autre']

export default function AddProperty() {
  const navigate = useNavigate()
  const [annonce, setAnnonce] = useState('')
  const [source, setSource] = useState('auto-détecté')
  const [loading, setLoading] = useState(false)
  const [extracted, setExtracted] = useState(null)
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState('nouveau')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [emailCopied, setEmailCopied] = useState(false)
  const [showEmail, setShowEmail] = useState(false)
  const [settings, setSettings] = useState({})

  useEffect(() => {
    getSettings().then(r => setSettings(r.data || {})).catch(() => {})
  }, [])

  async function handleExtract() {
    if (!annonce.trim()) return setError('Colle le texte de l\'annonce d\'abord.')
    setError('')
    setLoading(true)
    setExtracted(null)
    try {
      const res = await extractAnnonce({
        annonce,
        source: source !== 'auto-détecté' ? source : undefined,
        criteria: settings.criteria,
        user_name: settings.user_name,
      })
      if (res.data?.status_suggestion) {
        setStatus(res.data.status_suggestion)
      }
      setExtracted(res.data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!extracted) return
    setSaving(true)
    try {
      const payload = {
        ...extracted,
        notes,
        status,
        raw_annonce: annonce,
        url: extractFirstUrl(annonce),
      }
      const res = await createProperty(payload)
      navigate(`/biens/${res.id}`)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function copyEmail() {
    await navigator.clipboard.writeText(extracted?.email_contact || '')
    setEmailCopied(true)
    setTimeout(() => setEmailCopied(false), 2000)
  }

  const score = extracted?.score || 0

  return (
    <div className="page-shell" style={{ maxWidth: 820 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Ajouter un bien</h1>
          <p className="page-subtitle">
            Colle le texte complet d'une annonce, ou une URL quand le site autorise la lecture serveur.
          </p>
        </div>
      </div>

      <Card style={{ marginBottom: 20 }}>
        <div className="annonce-bar" style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <Textarea
              label="Texte ou URL de l'annonce"
              id="annonce"
              value={annonce}
              onChange={e => setAnnonce(e.target.value)}
              placeholder="Colle ici le contenu de l'annonce (Immoweb, Zimmo, Century 21…)"
              style={{ minHeight: 130 }}
            />
          </div>
          <div className="source-wrapper" style={{ width: 160 }}>
            <Select label="Source" id="source" value={source} onChange={e => setSource(e.target.value)}>
              {SOURCES.map(s => <option key={s}>{s}</option>)}
            </Select>
          </div>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: 'var(--red-l)', color: 'var(--red)', borderRadius: 'var(--r-sm)', fontSize: 14, marginBottom: 12 }}>
            {error}
          </div>
        )}

        <Button onClick={handleExtract} disabled={loading || !annonce.trim()}>
          {loading ? <Spinner size={15} /> : <Sparkles size={15} />}
          {loading ? 'Analyse en cours…' : 'Analyser avec Gemini'}
        </Button>
      </Card>

      {extracted && (
        <div style={{ animation: 'fadeUp 0.35s ease both' }}>
          {/* Score banner */}
          <Card style={{ marginBottom: 20, background: score >= 70 ? 'var(--green-l)' : score >= 45 ? 'var(--gold-bg)' : 'var(--red-l)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ textAlign: 'center', minWidth: 64 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, lineHeight: 1, color: 'var(--ink)' }}>{score}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>/ 100</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{extracted.title}</div>
                <ScoreBar score={score} />
                <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 6 }}>{extracted.score_raison}</div>
              </div>
            </div>
          </Card>

          {/* Fields grid */}
          <Card style={{ marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 16 }}>Informations extraites</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
              {[
                ['Type', extracted.type],
                ['Tag', extracted.property_tag],
                ['Prix', extracted.price_raw],
                ['Surface hab.', extracted.surface_hab ? `${extracted.surface_hab} m²` : null],
                ['Terrain', extracted.surface_terrain ? `${extracted.surface_terrain} m²` : null],
                ['Chambres', extracted.nb_chambres],
                ['Localisation', extracted.localisation],
                ['Adresse', extracted.adresse],
                ['État', extracted.etat],
                ['PEB', extracted.peb],
                ['Source', extracted.source],
                ['Date pub.', extracted.date_publication],
                ['Statut détecté', extracted.status_suggestion ? STATUS_LABELS[extracted.status_suggestion] : null],
              ].map(([label, value]) => value ? (
                <div key={label}>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>{value}</div>
                </div>
              ) : null)}
            </div>
            {extracted.description && (
              <div style={{ paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Description</div>
                <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6 }}>{extracted.description}</p>
              </div>
            )}
          </Card>

          {/* Contact */}
          <Card style={{ marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 12 }}>Contact</h2>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {[
                ['Nom', extracted.contact_nom],
                ['Type', extracted.contact_type],
                ['Tél', extracted.contact_tel],
                ['Email', extracted.contact_email],
              ].map(([label, value]) => value ? (
                <div key={label}>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{value}</div>
                </div>
              ) : null)}
            </div>

            {extracted.email_contact && (
              <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <button
                  onClick={() => setShowEmail(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: 'var(--ink-2)', marginBottom: 8 }}
                >
                  {showEmail ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  Email de contact suggéré
                </button>
                {showEmail && (
                  <div>
                    <div style={{ background: 'var(--paper-2)', borderRadius: 'var(--r-sm)', padding: '12px 14px', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'var(--ink)', marginBottom: 8 }}>
                      {extracted.email_contact}
                    </div>
                    <Button variant="secondary" size="sm" onClick={copyEmail}>
                      {emailCopied ? <Check size={13} /> : <Copy size={13} />}
                      {emailCopied ? 'Copié !' : 'Copier l\'email'}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Save section */}
          <Card>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 14 }}>Enregistrer le bien</h2>
            <div className="form-grid" style={{ marginBottom: 14 }}>
              <Textarea
                label="Notes personnelles"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Impressions, questions à poser, date de visite…"
                style={{ minHeight: 80 }}
              />
              <Select label="Statut" value={status} onChange={e => setStatus(e.target.value)}>
                {STATUS_OPTIONS.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
              </Select>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Spinner size={14} /> : <Save size={14} />}
              {saving ? 'Enregistrement…' : 'Sauvegarder dans D1'}
            </Button>
          </Card>
        </div>
      )}
    </div>
  )
}
