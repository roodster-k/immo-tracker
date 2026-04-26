-- Schema D1 Cloudflare — Immo Tracker
-- Run: wrangler d1 execute immo-tracker-db --file=schema.sql

CREATE TABLE IF NOT EXISTS properties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  type TEXT,
  price INTEGER,
  price_raw TEXT,
  surface_hab INTEGER,
  surface_terrain INTEGER,
  nb_chambres INTEGER,
  localisation TEXT,
  adresse TEXT,
  etat TEXT,
  peb TEXT,
  source TEXT,
  url TEXT,
  date_publication TEXT,
  contact_nom TEXT,
  contact_type TEXT,
  contact_tel TEXT,
  contact_email TEXT,
  email_contact TEXT,
  description TEXT,
  score INTEGER,
  score_raison TEXT,
  status TEXT DEFAULT 'nouveau',  -- nouveau | visite_planifiee | visite_faite | offre | archive
  notes TEXT,
  raw_annonce TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Default settings
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('criteria', ''),
  ('user_name', '');
