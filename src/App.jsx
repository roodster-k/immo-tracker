// src/App.jsx
import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar.jsx'
import Dashboard from './pages/Dashboard.jsx'
import AddProperty from './pages/AddProperty.jsx'
import Properties from './pages/Properties.jsx'
import PropertyDetail from './pages/PropertyDetail.jsx'
import Compare from './pages/Compare.jsx'
import Settings from './pages/Settings.jsx'

export default function App() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{
        marginLeft: 220,
        flex: 1,
        padding: '2rem 2.5rem',
        minHeight: '100vh',
        background: 'var(--paper)',
      }}>
        <Routes>
          <Route path="/"           element={<Dashboard />} />
          <Route path="/add"        element={<AddProperty />} />
          <Route path="/biens"      element={<Properties />} />
          <Route path="/biens/:id"  element={<PropertyDetail />} />
          <Route path="/comparer"   element={<Compare />} />
          <Route path="/settings"   element={<Settings />} />
        </Routes>
      </main>
    </div>
  )
}
