// src/pages/PropertyDetail.jsx
import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, Save, Copy, Check, Phone, Mail } from 'lucide-react'
import { getProperty, updateProperty, deleteProperty } from '../lib/api.js'
import { Button, Card, Select, Textarea, Spinner, ScoreBar, StatusBadge } from '../components/ui.jsx'
import { formatPrice, formatDate, STATUS_OPTIONS } from '../lib/utils.js'

export default function PropertyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getProperty(id)
      .then(r => {
        setProperty(r.data)
        setStatus(r.data.status || 'nouveau')
        setNotes(r.data.notes || '')
      })
      .catch(() => navigate('/biens'))
      .finally(() => setLoading(false))
  }, [id])

  async function handleSave() {
    setSaving(true)
    try {
      await updateProperty(id, { status, notes })
      setProperty(p => ({ ...p, status, notes }))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Supprimer ce bien définitivement ?')) return
    await deleteProperty(id)
    navigate('/biens')
  }

  async function copyEmail() {
    await navigator.clipboard.writeText(property?.email_contact || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}><Spinner size={28} /></div>
  if (!property) return null

  const p = property
  const score = p.score || 0

  return (
    <div className="page-shell" style={{ maxWidth: 940 }}>
      {/* Back */}
      <button onClick={() => navigate('/biens')} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink-3)', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 20 }}>
        <ArrowLeft size={15} /> Retour aux biens
      </button>

      {/* Hero */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--ink)', letterSpacing: '-0.02em', marginBottom: 6 }}>
              {p.title || `${p.type} — ${p.localisation}`}
            </h1>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.03em' }}>
              {p.price_raw || formatPrice(p.price)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <StatusBadge status={p.status} />
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: score >= 70 ? 'var(--green)' : score >= 45 ? 'var(--amber)' : 'var(--red)' }}>
              {score}<span style={{ fontSize: 14, color: 'var(--ink-3)' }}>/100</span>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <ScoreBar score={score} />
          {p.score_raison && <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 6 }}>{p.score_raison}</p>}
        </div>
      </div>

      <div className="detail-layout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Details */}
          <Card>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 16 }}>Caractéristiques</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                ['Type de bien', p.type],
                ['Localisation', p.localisation],
                ['Adresse', p.adresse],
                ['Surface habitable', p.surface_hab ? `${p.surface_hab} m²` : null],
                ['Surface terrain', p.surface_terrain ? `${p.surface_terrain} m²` : null],
                ['Chambres', p.nb_chambres],
                ['État', p.etat],
                ['PEB', p.peb],
                ['Source', p.source],
                ['Date publication', p.date_publication],
                ['Ajouté le', formatDate(p.created_at)],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{value}</div>
                </div>
              ))}
            </div>
            {p.description && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Description</div>
                <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.7 }}>{p.description}</p>
              </div>
            )}
          </Card>

          {/* Contact */}
          <Card>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 14 }}>Contact</h2>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 14 }}>
              {p.contact_nom && <div><div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Nom</div><div style={{ fontWeight: 500 }}>{p.contact_nom}</div></div>}
              {p.contact_type && <div><div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Type</div><div style={{ fontWeight: 500, textTransform: 'capitalize' }}>{p.contact_type}</div></div>}
              {p.contact_tel && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Téléphone</div>
                  <a href={`tel:${p.contact_tel}`} style={{ fontWeight: 500, color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Phone size={13} /> {p.contact_tel}
                  </a>
                </div>
              )}
              {p.contact_email && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Email</div>
                  <a href={`mailto:${p.contact_email}`} style={{ fontWeight: 500, color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Mail size={13} /> {p.contact_email}
                  </a>
                </div>
              )}
            </div>
            {p.email_contact && (
              <div style={{ paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Email suggéré</div>
                <div style={{ background: 'var(--paper-2)', borderRadius: 'var(--r-md)', padding: '12px 14px', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'var(--ink-2)', marginBottom: 10 }}>
                  {p.email_contact}
                </div>
                <Button variant="secondary" size="sm" onClick={copyEmail}>
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? 'Copié' : 'Copier'}
                </Button>
              </div>
            )}
            {!p.contact_nom && !p.contact_tel && !p.contact_email && !p.email_contact && (
              <p style={{ color: 'var(--ink-3)', fontSize: 14 }}>Aucune information de contact détectée pour ce bien.</p>
            )}
          </Card>
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Update status & notes */}
          <Card>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, marginBottom: 14 }}>Mon suivi</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Select label="Statut" value={status} onChange={e => setStatus(e.target.value)}>
                {STATUS_OPTIONS.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
              </Select>
              <Textarea
                label="Notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Impressions, questions, rendez-vous…"
                style={{ minHeight: 90 }}
              />
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Spinner size={13} /> : <Save size={13} />}
                {saved ? 'Enregistré' : 'Enregistrer'}
              </Button>
            </div>
          </Card>

          {/* Danger zone */}
          <Card style={{ border: '1px solid var(--red-l)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 500, color: 'var(--red)', marginBottom: 10 }}>Zone dangereuse</h3>
            <Button variant="danger" size="sm" onClick={handleDelete}>
              <Trash2 size={13} /> Supprimer ce bien
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
