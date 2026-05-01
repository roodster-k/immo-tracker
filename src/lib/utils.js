// src/lib/utils.js
import { clsx } from 'clsx'

export function cn(...args) { return clsx(...args) }

export function scoreClass(score) {
  if (score >= 70) return 'high'
  if (score >= 45) return 'mid'
  return 'low'
}

export function scoreBgClass(score) {
  if (score >= 70) return 'bg-score-high'
  if (score >= 45) return 'bg-score-mid'
  return 'bg-score-low'
}

export function formatPrice(price) {
  const value = Number(price)
  if (!Number.isFinite(value) || value <= 0) return '—'
  return new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value)
}

export function formatDate(str) {
  if (!str) return '—'
  try {
    return new Date(str).toLocaleDateString('fr-BE', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return str }
}

export function formatDateTime(str) {
  if (!str) return '—'
  try {
    return new Date(str).toLocaleString('fr-BE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch { return str }
}

export const STATUS_LABELS = {
  nouveau:          'Nouveau',
  a_contacter:      'À contacter',
  contacte:         'Contacté',
  a_relancer:       'À relancer',
  visite_planifiee: 'Visite planifiée',
  visite_faite:     'Visite faite',
  offre:            'Offre faite',
  dossier_envoye:   'Dossier envoyé',
  sous_option:      'Sous option',
  vendu:            'Vendu',
  archive:          'Archivé',
}

export const STATUS_OPTIONS = Object.entries(STATUS_LABELS)

export const CONTACT_STATUS_LABELS = {
  pas_contacte:      'Pas contacté',
  email_prepare:     'Email préparé',
  email_envoye:      'Email envoyé',
  reponse_recue:     'Réponse reçue',
  relance_a_faire:   'Relance à faire',
  relance_envoyee:   'Relance envoyée',
  clos_sans_reponse: 'Clos sans réponse',
}

export const CONTACT_STATUS_OPTIONS = Object.entries(CONTACT_STATUS_LABELS)

export const TYPE_LABELS = {
  maison:      'Maison',
  appartement: 'Appartement',
  terrain:     'Terrain',
  immeuble:    'Immeuble',
  autre:       'Autre',
}

export function getPropertyTag(p) {
  if (!p) return ''
  if (p.property_tag) return p.property_tag
  if (!p.localisation || !p.type) return ''
  return `${p.localisation} - ${TYPE_LABELS[p.type] || p.type}`
}

export function isFavorite(p) {
  return p?.favorite === true || p?.favorite === 1 || p?.favorite === '1'
}

export function extractFirstUrl(text) {
  const match = String(text || '').match(/https?:\/\/[^\s<>"']+/i)
  return match ? match[0].replace(/[),.;]+$/, '') : null
}

export function gmailComposeUrl(property) {
  const subject = `Demande d'information - ${property.title || getPropertyTag(property) || 'bien immobilier'}`
  const body = property.email_contact || [
    'Bonjour,',
    '',
    `Je vous contacte concernant ce bien : ${property.title || getPropertyTag(property) || 'bien immobilier'}.`,
    property.url ? `Lien de l'annonce : ${property.url}` : '',
    '',
    'Pourriez-vous me confirmer sa disponibilité et les prochaines possibilités de visite ?',
    '',
    "Merci d'avance,",
  ].filter(Boolean).join('\n')

  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: property.contact_email || '',
    su: subject,
    body,
  })

  return `https://mail.google.com/mail/?${params.toString()}`
}

export function csvRow(p) {
  const tag = getPropertyTag(p)
  const cols = [
    p.title, p.type, tag, p.price_raw, p.surface_hab ? p.surface_hab+'m²' : '',
    p.surface_terrain ? p.surface_terrain+'m²' : '', p.nb_chambres,
    p.localisation, p.adresse, p.etat, p.peb, p.source, p.date_publication,
    p.url,
    p.contact_nom, p.contact_type, p.contact_tel, p.contact_email,
    p.email_contact, isFavorite(p) ? 'Oui' : 'Non', p.score, STATUS_LABELS[p.status] || p.status,
    CONTACT_STATUS_LABELS[p.contact_status] || p.contact_status,
    p.email_sent_at, p.last_contact_at, p.last_reply_at, p.gmail_thread_id, p.notes,
  ]
  return cols.map(v => `"${(v ?? '').toString().replace(/"/g, '""')}"`).join(',')
}

export const CSV_HEADERS = [
  'Titre','Type','Tag','Prix','Surface hab.','Terrain','Chambres','Localisation',
  'Adresse','État','PEB','Source','Date pub.','Lien annonce','Contact','Type contact','Tél','Email',
  'Email suggéré',
  'Favori',
  'Score','Statut','Suivi contact','Email envoyé le','Dernier contact','Dernière réponse','Thread Gmail','Notes'
].map(v => `"${v}"`).join(',')
