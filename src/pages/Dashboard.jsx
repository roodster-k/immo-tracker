// src/pages/Dashboard.jsx
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Home, Eye, Star, PlusCircle, ArrowRight, MapPinned, BadgeCheck, MailCheck, Building2, Euro, Ruler } from 'lucide-react'
import { getProperties } from '../lib/api.js'
import { CONTACT_STATUS_LABELS, formatPrice, STATUS_LABELS, TYPE_LABELS, getPropertyTag, getDisplaySource } from '../lib/utils.js'
import { Card, Button, ScoreBar, StatusBadge, Spinner, Empty } from '../components/ui.jsx'

const DEMAND_STATUSES = new Set(['sous_option', 'vendu'])

function isApartment(property) {
  const label = `${property.type || ''} ${getPropertyTag(property)}`.toLowerCase()
  return label.includes('appartement') || label.includes('studio')
}

function positiveNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : null
}

function average(values) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null
}

function groupDemandByZone(properties) {
  const grouped = new Map()

  properties.forEach(property => {
    const zone = property.localisation || property.adresse || 'Zone non précisée'
    const item = grouped.get(zone) || {
      zone,
      count: 0,
      sold: 0,
      option: 0,
      apartments: 0,
      types: new Set(),
    }

    item.count += 1
    item.sold += property.status === 'vendu' ? 1 : 0
    item.option += property.status === 'sous_option' ? 1 : 0
    item.apartments += isApartment(property) ? 1 : 0
    if (property.type) item.types.add(TYPE_LABELS[property.type] || property.type)
    grouped.set(zone, item)
  })

  return Array.from(grouped.values())
    .map(item => ({ ...item, types: Array.from(item.types) }))
    .sort((a, b) => b.count - a.count || b.apartments - a.apartments)
    .slice(0, 5)
}

function groupApartmentDemandByZone(properties) {
  const grouped = new Map()

  properties.forEach(property => {
    const zone = property.localisation || property.adresse || 'Zone non précisée'
    const item = grouped.get(zone) || {
      zone,
      count: 0,
      sold: 0,
      option: 0,
      prices: [],
      surfaces: [],
      properties: [],
    }

    const price = positiveNumber(property.price)
    const surface = positiveNumber(property.surface_hab)

    item.count += 1
    item.sold += property.status === 'vendu' ? 1 : 0
    item.option += property.status === 'sous_option' ? 1 : 0
    if (price) item.prices.push(price)
    if (surface) item.surfaces.push(surface)
    item.properties.push(property)
    grouped.set(zone, item)
  })

  return Array.from(grouped.values())
    .map(item => ({
      ...item,
      avgPrice: average(item.prices),
      avgSurface: average(item.surfaces),
      minPrice: item.prices.length ? Math.min(...item.prices) : null,
      maxPrice: item.prices.length ? Math.max(...item.prices) : null,
      properties: item.properties.sort((a, b) => {
        const statusRank = (a.status === 'sous_option' ? 0 : 1) - (b.status === 'sous_option' ? 0 : 1)
        if (statusRank) return statusRank
        return new Date(b.created_at || 0) - new Date(a.created_at || 0)
      }),
    }))
    .sort((a, b) => b.count - a.count || b.option - a.option || a.zone.localeCompare(b.zone))
}

export default function Dashboard() {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getProperties()
      .then(r => setProperties(r.data || []))
      .catch(() => setProperties([]))
      .finally(() => setLoading(false))
  }, [])

  const total = properties.length
  const avgScore = total ? Math.round(properties.reduce((s, p) => s + (p.score || 0), 0) / total) : 0
  const topBiens = [...properties].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 5)
  const byStatus = properties.reduce((acc, p) => {
    acc[p.status || 'nouveau'] = (acc[p.status || 'nouveau'] || 0) + 1
    return acc
  }, {})
  const priced = properties.filter(p => Number.isFinite(Number(p.price)))
  const avgPrice = priced.length ? Math.round(priced.reduce((s, p) => s + Number(p.price), 0) / priced.length) : null
  const demandSignals = properties.filter(p => DEMAND_STATUSES.has(p.status))
  const topDemandZones = groupDemandByZone(demandSignals)
  const apartmentDemand = demandSignals.filter(isApartment).length
  const apartmentDemandItems = demandSignals.filter(isApartment)
  const apartmentDemandZones = groupApartmentDemandByZone(apartmentDemandItems)
  const apartmentSold = apartmentDemandItems.filter(p => p.status === 'vendu').length
  const apartmentOption = apartmentDemandItems.filter(p => p.status === 'sous_option').length
  const apartmentDemandPrices = apartmentDemandItems.map(p => positiveNumber(p.price)).filter(Boolean)
  const apartmentDemandSurfaces = apartmentDemandItems.map(p => positiveNumber(p.surface_hab)).filter(Boolean)
  const apartmentAvgPrice = average(apartmentDemandPrices)
  const apartmentAvgSurface = average(apartmentDemandSurfaces)
  const emailsSent = properties.filter(p => p.email_sent_at || ['email_envoye', 'reponse_recue', 'relance_a_faire', 'relance_envoyee'].includes(p.contact_status)).length
  const repliesReceived = properties.filter(p => p.last_reply_at || p.contact_status === 'reponse_recue').length
  const bySite = [...properties
    .reduce((acc, p) => {
      const site = getDisplaySource(p)
      if (site && site !== '—') acc.set(site, (acc.get(site) || 0) + 1)
      return acc
    }, new Map())
    .entries()]
    .sort((a, b) => b[1] - a[1])

  const byContactStatus = properties.reduce((acc, p) => {
    const contactStatus = p.contact_status || 'pas_contacte'
    acc[contactStatus] = (acc[contactStatus] || 0) + 1
    return acc
  }, {})

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spinner size={32} />
      </div>
    )
  }

  const kpis = [
    { label: 'Biens suivis',          value: total,                                          icon: Home,       color: 'var(--blue)',   borderColor: 'var(--blue)' },
    { label: 'Score moyen',            value: `${avgScore}/100`,                               icon: Star,       color: 'var(--gold)',   borderColor: 'var(--gold)' },
    { label: 'Prix moyen',             value: avgPrice ? formatPrice(avgPrice) : '—',          icon: TrendingUp, color: 'var(--green)',  borderColor: 'var(--green)' },
    { label: 'En visite',              value: (byStatus.visite_planifiee || 0) + (byStatus.visite_faite || 0), icon: Eye, color: 'var(--red)', borderColor: 'var(--red)' },
    { label: 'Sous option / vendus',   value: demandSignals.length,                            icon: BadgeCheck, color: 'var(--amber)',  borderColor: 'var(--amber)' },
    { label: 'Réponses reçues',        value: `${repliesReceived}/${emailsSent}`,              icon: MailCheck,  color: 'var(--green)',  borderColor: 'var(--green)' },
  ]

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tableau de bord</h1>
          <p className="page-subtitle">
            {total === 0
              ? 'Aucun bien suivi pour le moment.'
              : `${total} bien${total > 1 ? 's' : ''} en suivi`}
          </p>
        </div>
      </div>

      {total === 0 ? (
        <Empty
          icon={Home}
          title="Commencez votre recherche"
          desc="Ajoutez votre premier bien pour démarrer le suivi."
        />
      ) : (
        <>
          {/* KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 28 }}>
            {kpis.map(({ label, value, icon: Icon, color, borderColor }) => (
              <Card key={label} style={{ borderTop: `3px solid ${borderColor}`, paddingTop: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 'var(--r-sm)',
                    background: 'var(--paper-2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon size={15} style={{ color }} aria-hidden="true" />
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500, lineHeight: 1.3 }}>{label}</span>
                </div>
                <div style={{ fontSize: 23, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--ink)', lineHeight: 1 }}>
                  {value}
                </div>
              </Card>
            ))}
          </div>

          {/* Zones les plus demandées */}
          <Card style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--ink)', fontWeight: 400 }}>
                  Zones les plus demandées
                </h2>
                <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>
                  Basé sur les biens marqués sous option ou vendus.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="property-tag"><MapPinned size={10} aria-hidden="true" /> {topDemandZones.length} zone{topDemandZones.length > 1 ? 's' : ''}</span>
                <span className="property-tag"><Home size={10} aria-hidden="true" /> {apartmentDemand} appt{apartmentDemand > 1 ? 's' : ''}</span>
              </div>
            </div>

            {topDemandZones.length === 0 ? (
              <p style={{ fontSize: 14, color: 'var(--ink-3)' }}>Aucun bien sous option ou vendu pour le moment.</p>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {topDemandZones.map((zone, i) => (
                  <div
                    key={zone.zone}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) auto',
                      gap: 14,
                      alignItems: 'center',
                      padding: '11px 14px',
                      background: i === 0 ? 'var(--gold-bg)' : 'var(--paper-2)',
                      borderRadius: 'var(--r-md)',
                      border: i === 0 ? '1px solid rgba(201,168,76,0.20)' : '1px solid transparent',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {zone.zone}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                        {zone.types.length ? zone.types.join(', ') : 'Type non précisé'} · {zone.apartments} appt{zone.apartments > 1 ? 's' : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>{zone.count} {zone.count > 1 ? 'signaux' : 'signal'}</span>
                      {zone.option > 0 && <span className="status-sous_option" style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>{zone.option} option</span>}
                      {zone.sold > 0 && <span className="status-vendu" style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>{zone.sold} vendu{zone.sold > 1 ? 's' : ''}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Appartements déjà pris */}
          <Card style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--ink)', fontWeight: 400 }}>
                  Appartements déjà pris
                </h2>
                <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>
                  Appartements et studios marqués sous option ou vendus.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="property-tag"><Building2 size={10} aria-hidden="true" /> {apartmentDemandItems.length} appt{apartmentDemandItems.length > 1 ? 's' : ''}</span>
                <span className="status-sous_option" style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>{apartmentOption} option</span>
                <span className="status-vendu" style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>{apartmentSold} vendu{apartmentSold > 1 ? 's' : ''}</span>
              </div>
            </div>

            {apartmentDemandItems.length === 0 ? (
              <p style={{ fontSize: 14, color: 'var(--ink-3)' }}>Aucun appartement sous option ou vendu pour le moment.</p>
            ) : (
              <>
                {/* Mini KPIs appartements */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
                  {[
                    { label: 'Zones actives',   value: apartmentDemandZones.length,                                          icon: MapPinned },
                    { label: 'Prix moyen',       value: apartmentAvgPrice ? formatPrice(apartmentAvgPrice) : '—',             icon: Euro },
                    { label: 'Surface moyenne',  value: apartmentAvgSurface ? `${apartmentAvgSurface} m²` : '—',              icon: Ruler },
                  ].map(({ label, value, icon: Icon }) => (
                    <div
                      key={label}
                      style={{
                        padding: '10px 12px',
                        background: 'var(--paper-2)',
                        borderRadius: 'var(--r-md)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 500 }}>
                        <Icon size={12} aria-hidden="true" /> {label}
                      </div>
                      <div style={{ fontSize: 19, lineHeight: 1, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
                        {value}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                  {apartmentDemandZones.map(zone => (
                    <div key={zone.zone} className="apartment-demand-zone">
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {zone.zone}
                        </div>
                        <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap', marginTop: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>{zone.count} {zone.count > 1 ? 'signaux' : 'signal'}</span>
                          {zone.option > 0 && <span className="status-sous_option" style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>{zone.option} option</span>}
                          {zone.sold > 0 && <span className="status-vendu" style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>{zone.sold} vendu{zone.sold > 1 ? 's' : ''}</span>}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gap: 6, fontSize: 12.5, color: 'var(--ink-2)' }}>
                        {[
                          ['Prix moyen',  zone.avgPrice  ? formatPrice(zone.avgPrice)  : '—'],
                          ['Fourchette',  zone.minPrice && zone.maxPrice ? `${formatPrice(zone.minPrice)} – ${formatPrice(zone.maxPrice)}` : '—'],
                          ['Surface moy.', zone.avgSurface ? `${zone.avgSurface} m²`   : '—'],
                        ].map(([label, val]) => (
                          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                            <span>{label}</span>
                            <strong style={{ color: 'var(--ink)', fontWeight: 700, textAlign: 'right' }}>{val}</strong>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'grid', gap: 6 }}>
                        {zone.properties.slice(0, 3).map(property => (
                          <button
                            key={property.id}
                            type="button"
                            onClick={() => navigate(`/biens/${property.id}`)}
                            className="apartment-demand-link"
                          >
                            <span style={{ minWidth: 0 }}>
                              <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, fontSize: 13 }}>
                                {property.title || getPropertyTag(property) || 'Appartement'}
                              </span>
                              <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11.5, color: 'var(--ink-3)', marginTop: 1 }}>
                                {property.price_raw || formatPrice(property.price)} · {STATUS_LABELS[property.status] || property.status}
                              </span>
                            </span>
                            <ArrowRight size={13} aria-hidden="true" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>

          {/* Bottom layout: top biens + sidecards */}
          <div className="dashboard-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 20, alignItems: 'start' }}>
            {/* Meilleurs biens */}
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--ink)', fontWeight: 400 }}>
                  Meilleurs biens
                </h2>
                <Button variant="ghost" size="sm" onClick={() => navigate('/biens')}>
                  Voir tous <ArrowRight size={13} aria-hidden="true" />
                </Button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {topBiens.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => navigate(`/biens/${p.id}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 12px',
                      borderRadius: 'var(--r-md)',
                      background: i === 0 ? 'var(--gold-bg)' : 'var(--paper-2)',
                      border: i === 0 ? '1px solid rgba(201,168,76,0.20)' : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'background 0.15s, transform 0.15s',
                      width: '100%',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: i === 0 ? 'var(--gold)' : 'var(--paper-3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                      color: i === 0 ? '#fff' : 'var(--ink-3)',
                      flexShrink: 0,
                    }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 550, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.title || `${p.type} — ${p.localisation}`}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 1 }}>
                        {p.price_raw || formatPrice(p.price)} · {getPropertyTag(p) || p.localisation}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, minWidth: 80 }}>
                      <ScoreBar score={p.score || 0} />
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', textAlign: 'right', marginTop: 3 }}>
                        {p.score || 0}/100
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Par statut */}
              <Card>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--ink)', fontWeight: 400, marginBottom: 14 }}>
                  Par statut
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {Object.entries(byStatus).map(([status, count]) => (
                    <div key={status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <StatusBadge status={status} />
                      <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>{count}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Sources */}
              {bySite.length > 0 && (
                <Card>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--ink)', fontWeight: 400, marginBottom: 14 }}>
                    Sources
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {bySite.map(([site, count]) => (
                      <div key={site} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                          {site}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', flexShrink: 0 }}>{count}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Suivi contact */}
              <Card>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--ink)', fontWeight: 400, marginBottom: 14 }}>
                  Suivi contact
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {Object.entries(CONTACT_STATUS_LABELS).map(([contactStatus, label]) =>
                    byContactStatus[contactStatus] ? (
                      <div key={contactStatus} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{label}</span>
                        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>{byContactStatus[contactStatus]}</span>
                      </div>
                    ) : null
                  )}
                </div>
              </Card>

              {/* CTA card */}
              <Card style={{ background: 'var(--ink)', border: 'none' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, color: '#F5F4F1', marginBottom: 8, fontWeight: 400, lineHeight: 1.2 }}>
                  Nouveau bien ?
                </div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 16, lineHeight: 1.6 }}>
                  Colle une annonce et laisse Gemini extraire toutes les informations automatiquement.
                </p>
                <Button variant="gold" onClick={() => navigate('/add')}>
                  <PlusCircle size={14} aria-hidden="true" /> Ajouter un bien
                </Button>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
