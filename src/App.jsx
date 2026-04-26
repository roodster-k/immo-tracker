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
import NotFound from './pages/NotFound.jsx'

export default function App() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Aller au contenu</a>
      <Sidebar />
      <main id="main-content" className="app-main">
        <Routes>
          <Route path="/"           element={<Dashboard />} />
          <Route path="/add"        element={<AddProperty />} />
          <Route path="/biens"      element={<Properties />} />
          <Route path="/biens/:id"  element={<PropertyDetail />} />
          <Route path="/comparer"   element={<Compare />} />
          <Route path="/settings"   element={<Settings />} />
          <Route path="*"           element={<NotFound />} />
        </Routes>
      </main>
    </div>
  )
}
