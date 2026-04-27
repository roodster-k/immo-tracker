// src/components/PropertyCard.jsx
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Bed, Ruler, MapPin, Calendar, Tag } from 'lucide-react'
import { ScorePill, StatusBadge, Card } from './ui.jsx'
import { formatPrice, formatDate, getPropertyTag } from '../lib/utils.js'

export default function PropertyCard({ property, onSelect, selected }) {
  const navigate = useNavigate()
  const p = property
  const propertyTag = getPropertyTag(p)
  const open = () => onSelect ? onSelect(p) : navigate(`/biens/${p.id}`)

  return (
    <Card
      style={{
        cursor: 'pointer',
        outline: selected ? '2px solid var(--gold)' : 'none',
        outlineOffset: 2,
        transition: 'box-shadow 0.15s, transform 0.15s',
      }}
      onClick={open}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          open()
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={onSelect ? Boolean(selected) : undefined}
      className="animate-fadeup clickable-card"
    >
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div className="line-clamp-2" style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: 'var(--ink)', lineHeight: 1.35, marginBottom: 4 }}>
            {p.title || `${p.type || 'Bien'} — ${p.localisation || '?'}`}
          </div>
          {propertyTag && (
            <div className="property-tag" style={{ marginBottom: 6 }}>
              <Tag size={11} /> {propertyTag}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--ink-3)', fontSize: 13 }}>
            <MapPin size={12} />
            {p.localisation || '—'}
          </div>
        </div>
        <ScorePill score={p.score || 0} />
      </div>

      {/* Price */}
      <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink)', marginBottom: 12, letterSpacing: '-0.02em' }}>
        {p.price_raw || formatPrice(p.price)}
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--ink-2)', marginBottom: 12, flexWrap: 'wrap' }}>
        {p.nb_chambres && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Bed size={13} /> {p.nb_chambres} ch.
          </span>
        )}
        {p.surface_hab && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Ruler size={13} /> {p.surface_hab} m²
          </span>
        )}
        {p.peb && p.peb !== 'non précisé' && (
          <span style={{ fontWeight: 600, fontSize: 12, padding: '1px 7px', background: pebColor(p.peb), borderRadius: 4, color: pebTextColor(p.peb) }}>
            PEB {p.peb}
          </span>
        )}
        {p.etat && p.etat !== 'non précisé' && (
          <span style={{ color: 'var(--ink-3)' }}>{p.etat}</span>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
        <StatusBadge status={p.status || 'nouveau'} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-3)' }}>
          {p.source && <span style={{ fontWeight: 500 }}>{p.source}</span>}
          {p.created_at && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Calendar size={11} /> {formatDate(p.created_at)}
            </span>
          )}
        </div>
      </div>
    </Card>
  )
}

function pebColor(peb) {
  const map = { A: '#00733E', B: '#47A832', C: '#B0CB1F', D: '#F5E100', E: '#F5A500', F: '#E8490F', G: '#C01027' }
  return map[peb] || '#888'
}

function pebTextColor(peb) {
  // Light backgrounds (C, D) need dark text for WCAG contrast
  return ['C', 'D'].includes(peb) ? '#101114' : '#ffffff'
}
