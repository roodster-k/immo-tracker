// src/pages/Compare.jsx
import React, { useEffect, useState } from 'react'
import { getProperties } from '../lib/api.js'
import PropertyCard from '../components/PropertyCard.jsx'
import { Card, Empty, Spinner, ScoreBar } from '../components/ui.jsx'
import { formatPrice, STATUS_LABELS, getPropertyTag } from '../lib/utils.js'
import { ArrowDown, Check, Home } from 'lucide-react'

const MAX = 3

const COMPARE_FIELDS = [
  { key: 'property_tag', label: 'Tag', fn: p => getPropertyTag(p) || '—', mode: 'neutral' },
  { key: 'price', label: 'Prix', fn: p => p.price_raw || formatPrice(p.price), mode: 'lower' },
  { key: 'surface_hab', label: 'Surface hab.', fn: p => p.surface_hab ? `${p.surface_hab} m²` : '—', mode: 'higher' },
  { key: 'surface_terrain', label: 'Terrain', fn: p => p.surface_terrain ? `${p.surface_terrain} m²` : '—', mode: 'higher' },
  { key: 'nb_chambres', label: 'Chambres', fn: p => p.nb_chambres ?? '—', mode: 'higher' },
  { key: 'peb', label: 'PEB', fn: p => p.peb || '—', mode: 'neutral' },
  { key: 'etat', label: 'État', fn: p => p.etat || '—', mode: 'neutral' },
  { key: 'localisation', label: 'Localisation', fn: p => p.localisation || '—', mode: 'neutral' },
  { key: 'adresse', label: 'Adresse', fn: p => p.adresse || '—', mode: 'neutral' },
  { key: 'source', label: 'Source', fn: p => p.source || '—', mode: 'neutral' },
  { key: 'contact_type', label: 'Contact', fn: p => p.contact_type || '—', mode: 'neutral' },
  { key: 'status', label: 'Suivi', fn: p => STATUS_LABELS[p.status] || p.status || '—', mode: 'neutral' },
  { key: 'score', label: 'Score', fn: p => `${p.score || 0}/100`, mode: 'higher' },
]

export default function Compare() {
  const [properties, setProperties] = useState([])
  const [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getProperties()
      .then(r => setProperties(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function toggle(p) {
    setSelected(prev => {
      if (prev.find(x => x.id === p.id)) return prev.filter(x => x.id !== p.id)
      if (prev.length >= MAX) return prev
      return [...prev, p]
    })
  }

  const comparing = selected.length >= 2

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}><Spinner size={28} /></div>

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">Comparer des biens</h1>
          <p className="page-subtitle">
          Sélectionnez 2 ou 3 biens pour les comparer côte à côte.{' '}
          <span style={{ fontWeight: 600, color: 'var(--ink-2)' }}>{selected.length}/{MAX} sélectionnés</span>
          </p>
        </div>
      </div>

      {/* Selection grid */}
      {!comparing && (
        <div className="responsive-grid" style={{ marginBottom: 32 }}>
          {properties.length === 0 ? (
            <Empty icon={Home} title="Aucun bien à comparer" desc="Ajoutez d'abord des biens via la page d'ajout." />
          ) : properties.map(p => (
            <PropertyCard
              key={p.id}
              property={p}
              onSelect={toggle}
              selected={!!selected.find(x => x.id === p.id)}
            />
          ))}
        </div>
      )}

      {/* Comparison table */}
      {comparing && (
        <div style={{ animation: 'fadeUp 0.35s ease both' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 14, color: 'var(--ink-3)' }}>Comparaison de {selected.length} biens ·</span>
            <button
              onClick={() => setSelected([])}
              style={{ fontSize: 14, color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Modifier la sélection
            </button>
          </div>

          {/* Score banner */}
          <div className="compare-score-grid" style={{ gridTemplateColumns: `repeat(${selected.length}, 1fr)` }}>
            {selected.map(p => (
              <Card key={p.id} style={{ textAlign: 'center', background: p.score >= 70 ? 'var(--green-l)' : p.score >= 45 ? 'var(--gold-bg)' : 'var(--red-l)' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, marginBottom: 4, color: 'var(--ink-2)' }}>
                  {p.title || p.localisation}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--ink)', lineHeight: 1 }}>{p.score || 0}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 8 }}>/ 100</div>
                <ScoreBar score={p.score || 0} />
              </Card>
            ))}
          </div>

          {/* Table */}
          <Card className="table-scroll" style={{ padding: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--paper-2)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: 'var(--ink-3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', width: 130 }}>
                    Critère
                  </th>
                  {selected.map(p => (
                    <th key={p.id} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: 'var(--ink)', fontWeight: 600, borderLeft: '1px solid var(--border)' }}>
                      {p.title || `${p.type || 'Bien'} · ${p.localisation}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE_FIELDS.map(({ key, label, fn, mode }, ri) => {
                  const numVals = selected.map(p => typeof p[key] === 'number' ? p[key] : null).filter(v => v !== null)
                  const best = numVals.length > 1 && mode !== 'neutral'
                    ? (mode === 'lower' ? Math.min(...numVals) : Math.max(...numVals))
                    : null
                  const worst = numVals.length > 1 && mode !== 'neutral'
                    ? (mode === 'lower' ? Math.max(...numVals) : Math.min(...numVals))
                    : null

                  return (
                    <tr key={key} style={{ background: ri % 2 === 0 ? 'var(--paper)' : 'var(--paper-2)', borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '11px 16px', fontSize: 13, color: 'var(--ink-3)', fontWeight: 500 }}>{label}</td>
                      {selected.map((p, ci) => {
                        const val = fn(p)
                        const numVal = typeof p[key] === 'number' ? p[key] : null
                        const isBest = numVal !== null && numVal === best
                        const isWorst = numVal !== null && numVal === worst && best !== worst

                        return (
                          <td key={p.id} style={{ padding: '11px 16px', fontSize: 14, color: 'var(--ink)', borderLeft: '1px solid var(--border)', background: isBest ? 'rgba(45,106,79,0.06)' : isWorst ? 'rgba(181,32,13,0.04)' : 'transparent' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {isBest && <Check size={13} strokeWidth={2.2} style={{ color: 'var(--green)', flexShrink: 0 }} />}
                              {isWorst && <ArrowDown size={13} strokeWidth={2.2} style={{ color: 'var(--red)', flexShrink: 0 }} />}
                              {val}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  )
}
