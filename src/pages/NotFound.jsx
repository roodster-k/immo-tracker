import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Home } from 'lucide-react'
import { Button, Card } from '../components/ui.jsx'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="page-shell" style={{ maxWidth: 640 }}>
      <Card>
        <div style={{ width: 48, height: 48, borderRadius: 'var(--r-lg)', background: 'var(--paper-2)', color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
          <Home size={22} strokeWidth={1.8} />
        </div>
        <h1 className="page-title">Page introuvable</h1>
        <p className="page-subtitle" style={{ marginBottom: 20 }}>
          Cette adresse ne correspond à aucune vue de l'application.
        </p>
        <Button onClick={() => navigate('/')} variant="secondary">
          <ArrowLeft size={14} /> Retour au tableau de bord
        </Button>
      </Card>
    </div>
  )
}
