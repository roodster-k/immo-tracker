// src/pages/Dashboard.jsx
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Home, Eye, Star, PlusCircle, ArrowRight, MapPinned, BadgeCheck, MailCheck } from 'lucide-react'
import { getProperties } from '../lib/api.js'
import { CONTACT_STATUS_LABELS, formatPrice, STATUS_LABELS, TYPE_LABELS, getPropertyTag } from '../lib/utils.js'
import { Card, Button, ScoreBar, StatusBadge, Spinner, Empty } from '../components/ui.jsx'

const DEMAND_STATUSES = new Set(['sous_option', 'vendu'])

function isApartment(property) {
  const label = `${property.type || ''} ${getPropertyTag(property)}`.toLowerCase()
  return label.includes('appartement') || label.includes('studio')
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
  const emailsSent = properties.filter(p => p.email_sent_at || ['email_envoye', 'reponse_recue', 'relance_a_faire', 'relance_envoyee'].includes(p.contact_status)).length
  const repliesReceived = properties.filter(p => p.last_reply_at || p.contact_status === 'reponse_recue').length
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

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tableau de bord</h1>
          <p className="page-subtitle">
          {total === 0 ? 'Aucun bien suivi pour le moment.' : `${total} bien${total > 1 ? 's' : ''} en suivi`}
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 28 }}>
            {[
              { label: 'Biens suivis', value: total, icon: Home, color: 'var(--blue)' },
              { label: 'Score moyen', value: `${avgScore}/100`, icon: Star, color: 'var(--gold)' },
              { label: 'Prix moyen', value: avgPrice ? formatPrice(avgPrice) : '—', icon: TrendingUp, color: 'var(--green)' },
              { label: 'En visite', value: (byStatus.visite_planifiee || 0) + (byStatus.visite_faite || 0), icon: Eye, color: 'var(--red)' },
              { label: 'Sous option / vendus', value: demandSignals.length, icon: BadgeCheck, color: 'var(--amber)' },
              { label: 'Réponses reçues', value: `${repliesReceived}/${emailsSent}`, icon: MailCheck, color: 'var(--green)' },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label} style={{ background: 'var(--paper)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--paper-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={16} style={{ color }} />
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500 }}>{label}</span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--ink)' }}>{value}</div>
              </Card>
            ))}
          </div>

          <Card style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--ink)' }}>Zones les plus demandées</h2>
                <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 3 }}>
                  Basé sur les biens marqués sous option ou vendus.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className="property-tag"><MapPinned size={11} /> {topDemandZones.length} zone{topDemandZones.length > 1 ? 's' : ''}</span>
                <span className="property-tag"><Home size={11} /> {apartmentDemand} appartement{apartmentDemand > 1 ? 's' : ''}</span>
              </div>
            </div>

            {topDemandZones.length === 0 ? (
              <p style={{ fontSize: 14, color: 'var(--ink-3)' }}>Aucun bien sous option ou vendu pour le moment.</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {topDemandZones.map(zone => (
                  <div key={zone.zone} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 14, alignItems: 'center', padding: '10px 12px', background: 'var(--paper-2)', borderRadius: 'var(--r-md)' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 650, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {zone.zone}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                        {zone.types.length ? zone.types.join(', ') : 'Type non précisé'} · {zone.apartments} appartement{zone.apartments > 1 ? 's' : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: 12, fontWeight: 650, color: 'var(--ink-2)' }}>{zone.count} {zone.count > 1 ? 'signaux' : 'signal'}</span>
                      {zone.option > 0 && <span className="status-sous_option" style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>{zone.option} option</span>}
                      {zone.sold > 0 && <span className="status-vendu" style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>{zone.sold} vendu{zone.sold > 1 ? 's' : ''}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div className="dashboard-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 20, alignItems: 'start' }}>
            {/* Top biens */}
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--ink)' }}>Meilleurs biens</h2>
                <Button variant="ghost" size="sm" onClick={() => navigate('/biens')}>
                  Voir tous <ArrowRight size={14} />
                </Button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {topBiens.map((p, i) => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/biens/${p.id}`)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '10px 12px', borderRadius: 'var(--r-md)',
                      background: i === 0 ? 'var(--gold-bg)' : 'var(--paper-2)',
                      cursor: 'pointer', transition: 'background 0.15s',
                    }}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: i === 0 ? 'var(--gold)' : 'var(--paper-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: i === 0 ? '#fff' : 'var(--ink-3)', flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.title || `${p.type} — ${p.localisation}`}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{p.price_raw || formatPrice(p.price)} · {getPropertyTag(p) || p.localisation}</div>
                    </div>
                    <div>
                      <ScoreBar score={p.score || 0} />
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', textAlign: 'right', marginTop: 2 }}>{p.score || 0}/100</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Status breakdown + CTA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Card>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--ink)', marginBottom: 14 }}>Par statut</h2>
                {Object.entries(byStatus).map(([status, count]) => (
                  <div key={status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <StatusBadge status={status} />
                    <span style={{ fontWeight: 600, fontSize: 16 }}>{count}</span>
                  </div>
                ))}
              </Card>

              <Card>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--ink)', marginBottom: 14 }}>Suivi contact</h2>
                {Object.entries(CONTACT_STATUS_LABELS).map(([contactStatus, label]) => (
                  byContactStatus[contactStatus] ? (
                    <div key={contactStatus} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{label}</span>
                      <span style={{ fontWeight: 600, fontSize: 16 }}>{byContactStatus[contactStatus]}</span>
                    </div>
                  ) : null
                ))}
              </Card>

              <Card style={{ background: 'var(--ink)', border: 'none' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--paper)', marginBottom: 8 }}>
                  Nouveau bien ?
                </div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 16, lineHeight: 1.5 }}>
                  Colle une annonce et laisse Gemini extraire toutes les informations automatiquement.
                </p>
                <Button variant="gold" onClick={() => navigate('/add')}>
                  <PlusCircle size={15} /> Ajouter un bien
                </Button>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
