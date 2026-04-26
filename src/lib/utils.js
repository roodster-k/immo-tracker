// src/lib/utils.js
import { clsx } from 'clsx'

export function cn(...args) { return clsx(args) }

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
  if (!price) return '—'
  return new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(price)
}

export function formatDate(str) {
  if (!str) return '—'
  try {
    return new Date(str).toLocaleDateString('fr-BE', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return str }
}

export const STATUS_LABELS = {
  nouveau:          'Nouveau',
  visite_planifiee: 'Visite planifiée',
  visite_faite:     'Visite faite',
  offre:            'Offre',
  archive:          'Archivé',
}

export const STATUS_OPTIONS = Object.entries(STATUS_LABELS)

export const TYPE_LABELS = {
  maison:      'Maison',
  appartement: 'Appartement',
  terrain:     'Terrain',
  immeuble:    'Immeuble',
  autre:       'Autre',
}

export function csvRow(p) {
  const cols = [
    p.title, p.type, p.price_raw, p.surface_hab ? p.surface_hab+'m²' : '',
    p.surface_terrain ? p.surface_terrain+'m²' : '', p.nb_chambres,
    p.localisation, p.etat, p.peb, p.source, p.date_publication,
    p.contact_nom, p.contact_type, p.contact_tel, p.contact_email,
    p.score, STATUS_LABELS[p.status] || p.status, p.notes,
  ]
  return cols.map(v => `"${(v ?? '').toString().replace(/"/g, '""')}"`).join(',')
}

export const CSV_HEADERS = [
  'Titre','Type','Prix','Surface hab.','Terrain','Chambres','Localisation',
  'État','PEB','Source','Date pub.','Contact','Type contact','Tél','Email',
  'Score','Statut','Notes'
].map(v => `"${v}"`).join(',')
