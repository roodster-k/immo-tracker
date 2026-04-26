// src/pages/Dashboard.jsx
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Home, Eye, Star, PlusCircle, ArrowRight } from 'lucide-react'
import { getProperties } from '../lib/api.js'
import { formatPrice, STATUS_LABELS } from '../lib/utils.js'
import { Card, Button, ScoreBar, StatusBadge, Spinner, Empty } from '../components/ui.jsx'

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
                      <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{p.price_raw || formatPrice(p.price)} · {p.localisation}</div>
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
