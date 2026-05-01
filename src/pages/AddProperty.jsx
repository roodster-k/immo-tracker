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
  const [settingsLoading, setSettingsLoading] = useState(true)

  useEffect(() => {
    getSettings()
      .then(r => setSettings(r.data || {}))
      .catch(() => {})
      .finally(() => setSettingsLoading(false))
  }, [])

  async function handleExtract() {
    if (!annonce.trim()) return setError('Colle le texte de l\'annonce d\'abord.')
    if (settingsLoading) return setError('Les paramètres Gemini chargent encore. Réessaie dans une seconde.')
    setError('')
    setLoading(true)
    setExtracted(null)
    try {
      const res = await extractAnnonce({
        annonce,
        source: source !== 'auto-détecté' ? source : undefined,
        criteria: settings.criteria || '',
        user_name: settings.user_name || '',
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
  const scoreColor = score >= 70 ? 'var(--green)' : score >= 45 ? 'var(--amber)' : 'var(--red)'
  const scoreBg = score >= 70 ? 'var(--green-l)' : score >= 45 ? 'var(--gold-bg)' : 'var(--red-l)'
  const scoreBorder = score >= 70 ? 'rgba(29,106,78,0.20)' : score >= 45 ? 'rgba(201,168,76,0.22)' : 'rgba(184,33,13,0.18)'

  const fieldLabelStyle = {
    fontSize: 10.5,
    color: 'var(--ink-3)',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    marginBottom: 3,
    fontWeight: 600,
  }

  return (
    <div className="page-shell" style={{ maxWidth: 840 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Ajouter un bien</h1>
          <p className="page-subtitle">
            Colle le texte complet d'une annonce, ou une URL quand le site autorise la lecture serveur.
          </p>
        </div>
      </div>

      {/* Input card */}
      <Card style={{ marginBottom: 20 }}>
        <div className="annonce-bar" style={{ display: 'flex', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
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
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            padding: '10px 14px',
            background: 'var(--red-l)',
            color: 'var(--red)',
            borderRadius: 'var(--r-sm)',
            fontSize: 13.5,
            marginBottom: 12,
            border: '1px solid rgba(184,33,13,0.15)',
          }}>
            {error}
          </div>
        )}

        <Button onClick={handleExtract} disabled={loading || settingsLoading || !annonce.trim()}>
          {loading ? <Spinner size={15} /> : <Sparkles size={15} aria-hidden="true" />}
          {loading ? 'Analyse en cours…' : settingsLoading ? 'Chargement paramètres…' : 'Analyser avec Gemini'}
        </Button>
      </Card>

      {extracted && (
        <div style={{ animation: 'fadeUp 0.35s ease both' }}>
          {/* Score banner */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            padding: '18px 22px',
            background: scoreBg,
            border: `1px solid ${scoreBorder}`,
            borderRadius: 'var(--r-lg)',
            marginBottom: 18,
          }}>
            <div style={{ textAlign: 'center', minWidth: 68, flexShrink: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, lineHeight: 1, color: scoreColor, fontWeight: 400 }}>
                {score}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>/ 100</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 650, fontSize: 15, marginBottom: 6, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {extracted.title || 'Bien immobilier'}
              </div>
              <ScoreBar score={score} />
              {extracted.score_raison && (
                <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 7, lineHeight: 1.6 }}>
                  {extracted.score_raison}
                </div>
              )}
            </div>
          </div>

          {/* Extracted fields */}
          <Card style={{ marginBottom: 18 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 400, marginBottom: 18, color: 'var(--ink)' }}>
              Informations extraites
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 18, marginBottom: 16 }}>
              {[
                ['Type',            extracted.type],
                ['Tag',             extracted.property_tag],
                ['Prix',            extracted.price_raw],
                ['Surface hab.',    extracted.surface_hab ? `${extracted.surface_hab} m²` : null],
                ['Terrain',         extracted.surface_terrain ? `${extracted.surface_terrain} m²` : null],
                ['Chambres',        extracted.nb_chambres],
                ['Localisation',    extracted.localisation],
                ['Adresse',         extracted.adresse],
                ['État',            extracted.etat],
                ['PEB',             extracted.peb],
                ['Source',          extracted.source],
                ['Date pub.',       extracted.date_publication],
                ['Statut détecté',  extracted.status_suggestion ? STATUS_LABELS[extracted.status_suggestion] : null],
              ].map(([label, value]) => value ? (
                <div key={label}>
                  <div style={fieldLabelStyle}>{label}</div>
                  <div style={{ fontSize: 14.5, fontWeight: 550, color: 'var(--ink)' }}>{value}</div>
                </div>
              ) : null)}
            </div>

            {extracted.description && (
              <div style={{ paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <div style={fieldLabelStyle}>Description</div>
                <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.75 }}>{extracted.description}</p>
              </div>
            )}
          </Card>

          {/* Contact */}
          <Card style={{ marginBottom: 18 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 400, marginBottom: 14, color: 'var(--ink)' }}>
              Contact
            </h2>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {[
                ['Nom',   extracted.contact_nom],
                ['Type',  extracted.contact_type],
                ['Tél',   extracted.contact_tel],
                ['Email', extracted.contact_email],
              ].map(([label, value]) => value ? (
                <div key={label}>
                  <div style={fieldLabelStyle}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 550, color: 'var(--ink)' }}>{value}</div>
                </div>
              ) : null)}
            </div>

            {extracted.email_contact && (
              <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <button
                  onClick={() => setShowEmail(v => !v)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--ink-2)',
                    marginBottom: 10,
                    padding: 0,
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {showEmail ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
                  Email de contact suggéré
                </button>
                {showEmail && (
                  <div>
                    <div style={{
                      background: 'var(--paper-2)',
                      borderRadius: 'var(--r-md)',
                      padding: '12px 14px',
                      fontSize: 13,
                      lineHeight: 1.75,
                      whiteSpace: 'pre-wrap',
                      color: 'var(--ink)',
                      marginBottom: 10,
                      border: '1px solid var(--border)',
                    }}>
                      {extracted.email_contact}
                    </div>
                    <Button variant="secondary" size="sm" onClick={copyEmail}>
                      {emailCopied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
                      {emailCopied ? 'Copié !' : 'Copier l\'email'}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Save section */}
          <Card>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 400, marginBottom: 16, color: 'var(--ink)' }}>
              Enregistrer le bien
            </h2>
            <div className="form-grid" style={{ marginBottom: 16 }}>
              <Textarea
                label="Notes personnelles"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Impressions, questions à poser, date de visite…"
                style={{ minHeight: 82 }}
              />
              <Select label="Statut" value={status} onChange={e => setStatus(e.target.value)}>
                {STATUS_OPTIONS.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
              </Select>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Spinner size={14} /> : <Save size={14} aria-hidden="true" />}
              {saving ? 'Enregistrement…' : 'Sauvegarder dans D1'}
            </Button>
          </Card>
        </div>
      )}
    </div>
  )
}
