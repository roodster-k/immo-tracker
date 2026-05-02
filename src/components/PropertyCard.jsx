// src/components/PropertyCard.jsx
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Bed, Ruler, MapPin, Calendar, Tag, Star, StickyNote } from 'lucide-react'
import { ScorePill, StatusBadge, Card } from './ui.jsx'
import { formatPrice, formatDate, getPropertyTag, isFavorite } from '../lib/utils.js'

export default function PropertyCard({ property, onSelect, selected, onToggleFavorite }) {
  const navigate = useNavigate()
  const p = property
  const propertyTag = getPropertyTag(p)
  const favorite = isFavorite(p)
  const score = p.score || 0
  const scoreAccent = score >= 70 ? 'var(--green)' : score >= 45 ? 'var(--gold)' : 'var(--red)'
  const open = () => onSelect ? onSelect(p) : navigate(`/biens/${p.id}`)

  return (
    <Card
      style={{
        cursor: 'pointer',
        outline: selected ? '2px solid var(--gold)' : 'none',
        outlineOffset: 2,
        borderLeft: `3px solid ${scoreAccent}`,
        padding: '1.1rem 1.1rem 1.1rem 1rem',
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
      {/* Top row: title + favorite + score */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 9 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
            {favorite && (
              <Star size={13} fill="currentColor" style={{ color: 'var(--gold)', flexShrink: 0, marginTop: 3 }} aria-hidden="true" />
            )}
            <div
              className="line-clamp-2"
              style={{ fontFamily: 'var(--font-body)', fontSize: 14.5, fontWeight: 550, color: 'var(--ink)', lineHeight: 1.35 }}
            >
              {p.title || `${p.type || 'Bien'} — ${p.localisation || '?'}`}
            </div>
          </div>

          {propertyTag && (
            <div className="property-tag" style={{ marginBottom: 5 }}>
              <Tag size={10} aria-hidden="true" /> {propertyTag}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--ink-3)', fontSize: 12.5 }}>
            <MapPin size={11} aria-hidden="true" />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.adresse || p.localisation || '—'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          {onToggleFavorite && (
            <button
              type="button"
              className={`favorite-button${favorite ? ' is-active' : ''}`}
              onClick={e => {
                e.preventDefault()
                e.stopPropagation()
                onToggleFavorite(p)
              }}
              aria-label={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              title={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            >
              <Star size={13} fill={favorite ? 'currentColor' : 'none'} aria-hidden="true" />
            </button>
          )}
          <ScorePill score={score} />
        </div>
      </div>

      {/* Price */}
      <div style={{
        fontSize: 19,
        fontWeight: 650,
        color: 'var(--ink)',
        marginBottom: 11,
        letterSpacing: '-0.025em',
        lineHeight: 1.1,
      }}>
        {p.price_raw || formatPrice(p.price)}
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 14, fontSize: 12.5, color: 'var(--ink-2)', marginBottom: 11, flexWrap: 'wrap' }}>
        {p.nb_chambres && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Bed size={12} aria-hidden="true" /> {p.nb_chambres} ch.
          </span>
        )}
        {p.surface_hab && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Ruler size={12} aria-hidden="true" /> {p.surface_hab} m²
          </span>
        )}
        {p.peb && p.peb !== 'non précisé' && (
          <span style={{
            fontWeight: 700,
            fontSize: 11,
            padding: '1px 7px',
            background: pebColor(p.peb),
            borderRadius: 4,
            color: pebTextColor(p.peb),
            letterSpacing: '0.02em',
          }}>
            PEB {p.peb}
          </span>
        )}
        {p.etat && p.etat !== 'non précisé' && (
          <span style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}>{p.etat}</span>
        )}
      </div>

      {/* Notes preview */}
      {p.notes && (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 5,
          marginBottom: 10,
          padding: '5px 8px',
          background: 'var(--surface-2, rgba(0,0,0,0.03))',
          borderRadius: 6,
          fontSize: 12,
          color: 'var(--ink-2)',
          lineHeight: 1.4,
        }}>
          <StickyNote size={11} style={{ flexShrink: 0, marginTop: 2, color: 'var(--gold)' }} aria-hidden="true" />
          <span className="line-clamp-2">{p.notes}</span>
        </div>
      )}

      {/* Footer */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 10,
        borderTop: '1px solid var(--border)',
      }}>
        <StatusBadge status={p.status || 'nouveau'} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--ink-3)' }}>
          {p.source && <span style={{ fontWeight: 500 }}>{p.source}</span>}
          {p.created_at && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Calendar size={10} aria-hidden="true" /> {formatDate(p.created_at)}
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
  return ['C', 'D'].includes(peb) ? '#101114' : '#ffffff'
}
