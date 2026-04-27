// src/pages/Properties.jsx
import React, { useEffect, useState } from 'react'
import { Search, Download } from 'lucide-react'
import { getProperties } from '../lib/api.js'
import PropertyCard from '../components/PropertyCard.jsx'
import { Button, Spinner, Empty } from '../components/ui.jsx'
import { CONTACT_STATUS_LABELS, STATUS_OPTIONS, CSV_HEADERS, csvRow, getPropertyTag } from '../lib/utils.js'

export default function Properties() {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('date')

  useEffect(() => {
    getProperties()
      .then(r => setProperties(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = properties
    .filter(p => {
      const q = search.toLowerCase()
      if (q && ![
        p.title,
        getPropertyTag(p),
        p.localisation,
        p.type,
        p.source,
        p.contact_nom,
        CONTACT_STATUS_LABELS[p.contact_status],
      ].some(v => v?.toLowerCase().includes(q))) return false
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'score') return (b.score || 0) - (a.score || 0)
      if (sortBy === 'price') return (a.price || 0) - (b.price || 0)
      return new Date(b.created_at) - new Date(a.created_at)
    })

  function exportCSV() {
    const content = [CSV_HEADERS, ...properties.map(csvRow)].join('\n')
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `immo-tracker-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">Mes biens</h1>
          <p className="page-subtitle">{properties.length} bien{properties.length !== 1 ? 's' : ''} en suivi</p>
        </div>
        <Button variant="secondary" size="sm" onClick={exportCSV} disabled={!properties.length}>
          <Download size={14} /> Exporter CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-wrapper" style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un bien…"
            className="ui-input"
            style={{
              width: '100%', paddingLeft: 34, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
              border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
              background: 'var(--paper)', color: 'var(--ink)',
              fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none',
            }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="filter-select ui-input"
          style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', background: 'var(--paper)', fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--ink)', outline: 'none' }}
        >
          <option value="all">Tous les statuts</option>
          {STATUS_OPTIONS.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
        </select>

        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="filter-select ui-input"
          style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', background: 'var(--paper)', fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--ink)', outline: 'none' }}
        >
          <option value="date">Plus récents</option>
          <option value="score">Meilleur score</option>
          <option value="price">Prix croissant</option>
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}><Spinner size={28} /></div>
      ) : filtered.length === 0 ? (
        <Empty icon={Search} title="Aucun résultat" desc="Modifiez vos filtres ou ajoutez un nouveau bien." />
      ) : (
        <div className="responsive-grid">
          {filtered.map((p, i) => (
            <div key={p.id} style={{ animationDelay: `${i * 0.05}s` }}>
              <PropertyCard property={p} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
