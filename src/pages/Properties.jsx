// src/pages/Properties.jsx
import React, { useEffect, useState } from 'react'
import { Search, Download, SlidersHorizontal } from 'lucide-react'
import { getProperties, updateProperty } from '../lib/api.js'
import PropertyCard from '../components/PropertyCard.jsx'
import { Button, Spinner, Empty } from '../components/ui.jsx'
import {
  CONTACT_STATUS_LABELS,
  ACTIVE_STATUS_OPTIONS,
  ARCHIVE_STATUS_OPTIONS,
  ARCHIVE_STATUSES,
  CSV_HEADERS,
  csvRow,
  getPropertyTag,
  getDisplaySource,
  isFavorite,
} from '../lib/utils.js'

function usePersistedFilter(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try { return localStorage.getItem(key) ?? defaultValue } catch { return defaultValue }
  })
  function set(v) {
    setValue(v)
    try { localStorage.setItem(key, v) } catch {}
  }
  return [value, set]
}

export default function Properties({ mode = 'active' }) {
  const prefix = mode === 'archives' ? 'arch' : 'biens'
  const isArchive = mode === 'archives'
  const statusOptions = isArchive ? ARCHIVE_STATUS_OPTIONS : ACTIVE_STATUS_OPTIONS

  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = usePersistedFilter(`${prefix}_search`, '')
  const [statusFilter, setStatusFilter] = usePersistedFilter(`${prefix}_status`, 'all')
  const [sourceFilter, setSourceFilter] = usePersistedFilter(`${prefix}_source`, 'all')
  const [favoriteFilter, setFavoriteFilter] = usePersistedFilter(`${prefix}_favorite`, 'all')
  const [sortBy, setSortBy] = usePersistedFilter(`${prefix}_sort`, 'date')

  useEffect(() => {
    getProperties()
      .then(r => setProperties(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Guard against a persisted status that doesn't belong to this mode
  const validStatus = statusFilter === 'all' || statusOptions.some(([v]) => v === statusFilter)
  const effectiveStatusFilter = validStatus ? statusFilter : 'all'

  // Derive distinct sources from loaded properties (with domain resolution for Agence/Particulier)
  const availableSources = [...properties
    .reduce((acc, p) => {
      const site = getDisplaySource(p)
      if (site && site !== '—') acc.set(site, (acc.get(site) || 0) + 1)
      return acc
    }, new Map())
    .entries()]
    .sort((a, b) => b[1] - a[1])

  const baseProperties = properties.filter(p => {
    const inArchive = ARCHIVE_STATUSES.has(p.status)
    return isArchive ? inArchive : !inArchive
  })

  const filtered = baseProperties
    .filter(p => {
      const q = search.toLowerCase()
      if (q && ![
        p.title,
        getPropertyTag(p),
        p.localisation,
        p.adresse,
        p.type,
        p.source,
        p.contact_nom,
        CONTACT_STATUS_LABELS[p.contact_status],
      ].some(v => v?.toLowerCase().includes(q))) return false
      if (effectiveStatusFilter !== 'all' && p.status !== effectiveStatusFilter) return false
      if (sourceFilter !== 'all' && getDisplaySource(p) !== sourceFilter) return false
      if (favoriteFilter === 'favorites' && !isFavorite(p)) return false
      return true
    })
    .sort((a, b) => {
      const favoriteRank = Number(isFavorite(b)) - Number(isFavorite(a))
      if (favoriteRank) return favoriteRank
      if (sortBy === 'score') return (b.score || 0) - (a.score || 0)
      if (sortBy === 'price') return (a.price || 0) - (b.price || 0)
      return new Date(b.created_at) - new Date(a.created_at)
    })

  async function toggleFavorite(property) {
    const favorite = isFavorite(property) ? 0 : 1
    setProperties(items => items.map(item => item.id === property.id ? { ...item, favorite } : item))
    try {
      await updateProperty(property.id, { favorite })
    } catch {
      setProperties(items => items.map(item => item.id === property.id ? { ...item, favorite: property.favorite } : item))
    }
  }

  function exportCSV() {
    const content = [CSV_HEADERS, ...baseProperties.map(csvRow)].join('\n')
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `immo-tracker-${isArchive ? 'archives-' : ''}${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  const selectStyle = {
    padding: '8px 12px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r-sm)',
    background: 'var(--paper)',
    fontFamily: 'var(--font-body)',
    fontSize: 14,
    color: 'var(--ink)',
    outline: 'none',
    cursor: 'pointer',
  }

  const title = isArchive ? 'Archives' : 'Mes biens'
  const countLabel = isArchive
    ? `${baseProperties.length} bien${baseProperties.length !== 1 ? 's' : ''} archivé${baseProperties.length !== 1 ? 's' : ''}`
    : `${baseProperties.length} bien${baseProperties.length !== 1 ? 's' : ''} en suivi`

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">
            {countLabel}
            {filtered.length !== baseProperties.length && ` · ${filtered.length} affiché${filtered.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={exportCSV} disabled={!baseProperties.length}>
          <Download size={14} aria-hidden="true" /> Exporter CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-wrapper" style={{ position: 'relative', flex: '1 1 220px', minWidth: 0 }}>
          <Search
            size={14}
            aria-hidden="true"
            style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', pointerEvents: 'none' }}
          />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un bien…"
            className="ui-input"
            style={{
              width: '100%',
              paddingLeft: 34,
              paddingRight: 12,
              paddingTop: 8,
              paddingBottom: 8,
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-sm)',
              background: 'var(--paper)',
              color: 'var(--ink)',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              outline: 'none',
            }}
          />
        </div>

        <SlidersHorizontal size={15} style={{ color: 'var(--ink-3)', flexShrink: 0 }} aria-hidden="true" />

        <select
          value={effectiveStatusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="filter-select ui-input"
          style={selectStyle}
        >
          <option value="all">Tous les statuts</option>
          {statusOptions.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
        </select>

        {availableSources.length > 0 && (
          <select
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value)}
            className="filter-select ui-input"
            style={selectStyle}
          >
            <option value="all">Toutes les sources</option>
            {availableSources.map(([site, count]) => (
              <option key={site} value={site}>{site} ({count})</option>
            ))}
          </select>
        )}

        <select
          value={favoriteFilter}
          onChange={e => setFavoriteFilter(e.target.value)}
          className="filter-select ui-input"
          style={selectStyle}
        >
          <option value="all">Tous les biens</option>
          <option value="favorites">Favoris seulement</option>
        </select>

        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="filter-select ui-input"
          style={selectStyle}
        >
          <option value="date">Plus récents</option>
          <option value="score">Meilleur score</option>
          <option value="price">Prix croissant</option>
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
          <Spinner size={28} />
        </div>
      ) : filtered.length === 0 ? (
        <Empty
          icon={Search}
          title="Aucun résultat"
          desc={isArchive ? 'Aucun bien archivé pour le moment.' : 'Modifiez vos filtres ou ajoutez un nouveau bien.'}
        />
      ) : (
        <div className="responsive-grid">
          {filtered.map((p, i) => (
            <div key={p.id} style={{ animationDelay: `${i * 0.045}s` }}>
              <PropertyCard property={p} onToggleFavorite={toggleFavorite} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
