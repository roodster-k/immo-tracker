// src/pages/PropertyDetail.jsx
import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, Save, Copy, Check, Phone, Mail, Tag, ExternalLink, MailPlus, Reply } from 'lucide-react'
import { getProperty, updateProperty, deleteProperty } from '../lib/api.js'
import { Button, Card, Select, Textarea, Input, Spinner, ScoreBar, StatusBadge } from '../components/ui.jsx'
import {
  CONTACT_STATUS_LABELS,
  CONTACT_STATUS_OPTIONS,
  formatPrice,
  formatDate,
  formatDateTime,
  gmailComposeUrl,
  STATUS_OPTIONS,
  getPropertyTag,
} from '../lib/utils.js'

function toDatetimeLocalValue(value) {
  if (!value) return ''
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return String(value).slice(0, 16)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

export default function PropertyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [savingContact, setSavingContact] = useState(false)
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [contactSaved, setContactSaved] = useState(false)
  const [contactStatus, setContactStatus] = useState('pas_contacte')
  const [emailSentAt, setEmailSentAt] = useState('')
  const [lastContactAt, setLastContactAt] = useState('')
  const [lastReplyAt, setLastReplyAt] = useState('')
  const [gmailThreadId, setGmailThreadId] = useState('')

  useEffect(() => {
    getProperty(id)
      .then(r => {
        setProperty(r.data)
        setStatus(r.data.status || 'nouveau')
        setNotes(r.data.notes || '')
        setContactStatus(r.data.contact_status || 'pas_contacte')
        setEmailSentAt(toDatetimeLocalValue(r.data.email_sent_at))
        setLastContactAt(toDatetimeLocalValue(r.data.last_contact_at))
        setLastReplyAt(toDatetimeLocalValue(r.data.last_reply_at))
        setGmailThreadId(r.data.gmail_thread_id || '')
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

  async function saveContactTracking(overrides = {}) {
    const payload = {
      contact_status: contactStatus,
      email_sent_at: emailSentAt || null,
      last_contact_at: lastContactAt || null,
      last_reply_at: lastReplyAt || null,
      gmail_thread_id: gmailThreadId || null,
      ...overrides,
    }

    setSavingContact(true)
    try {
      await updateProperty(id, payload)
      setProperty(p => ({ ...p, ...payload }))
      if (payload.contact_status !== undefined) setContactStatus(payload.contact_status || 'pas_contacte')
      if (payload.email_sent_at !== undefined) setEmailSentAt(toDatetimeLocalValue(payload.email_sent_at))
      if (payload.last_contact_at !== undefined) setLastContactAt(toDatetimeLocalValue(payload.last_contact_at))
      if (payload.last_reply_at !== undefined) setLastReplyAt(toDatetimeLocalValue(payload.last_reply_at))
      if (payload.gmail_thread_id !== undefined) setGmailThreadId(payload.gmail_thread_id || '')
      setContactSaved(true)
      setTimeout(() => setContactSaved(false), 2000)
    } finally {
      setSavingContact(false)
    }
  }

  async function markEmailSent() {
    const now = new Date().toISOString()
    const nextStatus = ['nouveau', 'a_contacter'].includes(status) ? 'contacte' : status
    setStatus(nextStatus)
    await saveContactTracking({
      contact_status: 'email_envoye',
      email_sent_at: emailSentAt || now,
      last_contact_at: now,
      status: nextStatus,
    })
  }

  async function markReplyReceived() {
    const now = new Date().toISOString()
    await saveContactTracking({
      contact_status: 'reponse_recue',
      last_reply_at: now,
    })
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
  const propertyTag = getPropertyTag(p)
  const gmailUrl = gmailComposeUrl(p)

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
            {propertyTag && (
              <div className="property-tag" style={{ marginBottom: 8 }}>
                <Tag size={11} /> {propertyTag}
              </div>
            )}
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
            <div className="chars-grid">
              {[
                ['Type de bien', p.type],
                ['Tag', propertyTag],
                ['Localisation', p.localisation],
                ['Adresse', p.adresse],
                ['Surface habitable', p.surface_hab ? `${p.surface_hab} m²` : null],
                ['Surface terrain', p.surface_terrain ? `${p.surface_terrain} m²` : null],
                ['Chambres', p.nb_chambres],
                ['État', p.etat],
                ['PEB', p.peb],
                ['Source', p.source],
                ['Lien annonce', p.url ? (
                  <a href={p.url} target="_blank" rel="noreferrer" style={{ color: 'var(--blue)', textDecoration: 'underline' }}>
                    Ouvrir la source
                  </a>
                ) : null],
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
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => window.open(gmailUrl, '_blank', 'noopener,noreferrer')}
                  style={{ marginLeft: 8 }}
                >
                  <MailPlus size={13} /> Ouvrir dans Gmail
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

          {p.url && (
            <Card>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, marginBottom: 10 }}>Annonce source</h2>
              <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5, marginBottom: 12 }}>
                Conserve le lien original pour suivre l'évolution du bien sur le portail.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => window.open(p.url, '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink size={13} /> Ouvrir l'annonce
              </Button>
            </Card>
          )}

          <Card>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, marginBottom: 10 }}>Suivi Gmail</h2>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5, marginBottom: 12 }}>
              Prépare le mail dans Gmail, puis garde ici la trace de l'envoi et des réponses.
            </p>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => window.open(gmailUrl, '_blank', 'noopener,noreferrer')}
              >
                <MailPlus size={13} /> Ouvrir dans Gmail
              </Button>
              <Button variant="secondary" size="sm" onClick={markEmailSent} disabled={savingContact}>
                <Mail size={13} /> Marquer envoyé
              </Button>
              <Button variant="secondary" size="sm" onClick={markReplyReceived} disabled={savingContact}>
                <Reply size={13} /> Réponse reçue
              </Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Select label="Suivi contact" value={contactStatus} onChange={e => setContactStatus(e.target.value)}>
                {CONTACT_STATUS_OPTIONS.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
              </Select>
              <Input
                label="Email envoyé le"
                type="datetime-local"
                value={emailSentAt}
                onChange={e => setEmailSentAt(e.target.value)}
              />
              <Input
                label="Dernier contact"
                type="datetime-local"
                value={lastContactAt}
                onChange={e => setLastContactAt(e.target.value)}
              />
              <Input
                label="Dernière réponse"
                type="datetime-local"
                value={lastReplyAt}
                onChange={e => setLastReplyAt(e.target.value)}
              />
              <Input
                label="Thread Gmail"
                value={gmailThreadId}
                onChange={e => setGmailThreadId(e.target.value)}
                placeholder="À renseigner plus tard si Gmail est connecté"
              />
              <div style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5 }}>
                Statut actuel : {CONTACT_STATUS_LABELS[p.contact_status || contactStatus] || contactStatus}
                {p.email_sent_at ? ` · envoyé le ${formatDateTime(p.email_sent_at)}` : ''}
                {p.last_reply_at ? ` · réponse le ${formatDateTime(p.last_reply_at)}` : ''}
              </div>
              <Button onClick={() => saveContactTracking()} disabled={savingContact}>
                {savingContact ? <Spinner size={13} /> : <Save size={13} />}
                {contactSaved ? 'Suivi enregistré' : 'Enregistrer le suivi Gmail'}
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
