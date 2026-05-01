# ImmoTracker — Suivi immobilier intelligent

Application React + Cloudflare Pages/D1/Workers pour suivre vos recherches immobilières avec extraction automatique via Gemini AI.

## Stack technique

- **Frontend** : React 18 + Vite
- **Hébergement** : Cloudflare Pages
- **Base de données** : Cloudflare D1 (SQLite serverless, gratuit)
- **Backend** : Cloudflare Pages Functions (Workers)
- **IA** : Google Gemini 2.5 Flash (via clé API)

## Fonctionnalités

- 🏠 **Extraction automatique** d'annonces (Immoweb, Zimmo, Century 21…)
- ⭐ **Score d'intérêt** basé sur vos critères personnels
- 📊 **Tableau de bord** avec statistiques
- 🔍 **Comparaison** côte à côte de 2-3 biens
- 📧 **Email de contact** généré automatiquement
- 🗄️ **Historique persistant** dans Cloudflare D1
- 📥 **Export CSV** pour Google Sheets

---

## Déploiement sur Cloudflare Pages

### 1. Prérequis

```bash
npm install -g wrangler
wrangler login
```

### 2. Créer la base D1

```bash
wrangler d1 create immo-tracker-db
```

Copier le `database_id` retourné et le coller dans `wrangler.toml` :

```toml
[[d1_databases]]
binding = "DB"
database_name = "immo-tracker-db"
database_id = "COLLER_ICI_VOTRE_ID"
```

### 3. Initialiser le schéma SQL

```bash
wrangler d1 execute immo-tracker-db --file=schema.sql
```

### 4. Ajouter la clé Gemini comme secret

```bash
wrangler secret put GEMINI_KEY
# → coller votre clé AIza... quand demandé
```

### 4bis. Protéger l'accès avec Supabase Auth

Créer un projet Supabase, activer l'authentification email/password, puis ajouter ces variables dans Cloudflare Pages :

```bash
npx wrangler pages secret put SUPABASE_URL --project-name=immo-tracker
npx wrangler pages secret put SUPABASE_ANON_KEY --project-name=immo-tracker
```

En local, ajouter les mêmes valeurs dans `.dev.vars`. Si ces variables ne sont pas configurées, l'application reste ouverte pour faciliter le développement.

### 5. Build et déploiement

```bash
npm install
npm run build
wrangler pages deploy dist --project-name=immo-tracker
```

### 6. Lier D1 au projet Pages

Dans le dashboard Cloudflare → Pages → immo-tracker → Settings → Functions → D1 database bindings :
- Variable name : `DB`
- D1 database : `immo-tracker-db`

---

## Développement local

```bash
npm install
npm run dev
```

Pour tester les fonctions Cloudflare localement :

```bash
# Terminal 1 : Vite dev server
npm run dev

# Terminal 2 : Wrangler (Workers + D1 local)
wrangler pages dev dist --d1=DB:immo-tracker-db
```

---

## Structure du projet

```
immo-tracker/
├── functions/
│   └── api/
│       └── [[route]].js     # Cloudflare Pages Functions (API)
├── src/
│   ├── components/
│   │   ├── Sidebar.jsx
│   │   ├── PropertyCard.jsx
│   │   └── ui.jsx
│   ├── lib/
│   │   ├── api.js           # Appels API client
│   │   └── utils.js         # Helpers
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── AddProperty.jsx
│   │   ├── Properties.jsx
│   │   ├── PropertyDetail.jsx
│   │   ├── Compare.jsx
│   │   └── Settings.jsx
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── schema.sql               # Schéma base D1
├── wrangler.toml            # Config Cloudflare
├── vite.config.js
└── package.json
```

---

## Configuration initiale (in-app)

Une fois déployé, aller dans **Paramètres** :
1. Coller votre clé Gemini API (obtenir sur [aistudio.google.com](https://aistudio.google.com/app/apikey))
2. Renseigner votre nom (pour les emails de contact)
3. Décrire vos critères de recherche immobilière

---

## Routes API

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | /api/extract | Extraction Gemini d'une annonce |
| GET | /api/properties | Liste tous les biens |
| POST | /api/properties | Créer un bien |
| GET | /api/properties/:id | Détail d'un bien |
| PUT | /api/properties/:id | Mettre à jour un bien |
| DELETE | /api/properties/:id | Supprimer un bien |
| GET | /api/settings | Lire les paramètres |
| POST | /api/settings | Sauvegarder les paramètres |
