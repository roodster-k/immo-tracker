# Contexte projet - ImmoTracker

## Objectif de l'application

ImmoTracker est une application personnelle de suivi de recherche immobiliere.

Son role attendu est de permettre a un utilisateur de :

- coller le contenu d'une annonce immobiliere, ou une URL quand le site autorise la lecture serveur ;
- extraire automatiquement les informations importantes avec Gemini ;
- attribuer un score au bien selon ses criteres personnels ;
- sauvegarder les biens dans une base Cloudflare D1 ;
- suivre l'avancement de chaque bien avec un statut et des notes ;
- comparer plusieurs biens ;
- exporter les donnees en CSV ;
- generer et conserver un email de contact pour le vendeur ou l'agence.

Le projet vise donc un usage concret de type "CRM immobilier personnel" pour centraliser une recherche d'achat ou d'investissement.

## Etat actuel du projet

L'application dispose d'une base fonctionnelle :

- frontend React/Vite ;
- backend Cloudflare Pages Functions ;
- stockage Cloudflare D1 ;
- extraction Gemini via `/api/extract` ;
- pages principales : tableau de bord, ajout, liste, detail, comparaison, parametres ;
- export CSV ;
- configuration Cloudflare via `wrangler.toml` ;
- build de production fonctionnel avec `npm run build`.

## Correctifs appliques

### Extraction et import des annonces

- Ajout d'une recuperation URL cote backend avec en-tetes navigateur et detection des pages bloquees.
- Ajout du fallback Gemini URL Context quand un site bloque le fetch serveur.
- Ajout d'une erreur explicite quand ni le fetch serveur ni URL Context ne peuvent lire la page, afin d'eviter les fiches inventees.
- Durcissement du prompt Gemini : interdiction d'inventer prix, adresse, surface, PEB, contact ou description.
- Parsing JSON Gemini plus robuste.
- Normalisation des champs numeriques (`price`, surfaces, chambres, score).
- Normalisation des valeurs `"null"`, `"n/a"` et chaines vides en vrais `null`.

Limite connue : l'URL Immoweb seule peut rester bloquee dans l'environnement Cloudflare Worker. Dans ce cas, l'application refuse l'import au lieu de creer une fausse fiche. Le chemin fiable consiste a coller le texte visible de l'annonce.

### Persistance des donnees

- `email_contact` est maintenant sauvegarde en base.
- `email_contact` est affiche sur la page detail et peut etre copie.
- L'export CSV inclut l'email suggere.
- La route `PUT /api/properties/:id` utilise une whitelist de champs modifiables.

### Parametres Gemini

- Le champ "Cle API Gemini" a ete retire de l'interface.
- `/api/settings` ne renvoie plus `gemini_key`.
- `/api/settings` expose uniquement un statut `gemini_configured`.
- La cle Gemini doit rester configuree comme secret Cloudflare via `GEMINI_KEY`.

Commande de reference :

```bash
npx wrangler pages secret put GEMINI_KEY --project-name=immo-tracker
```

### UX/UI et responsive

- Navigation desktop conservee en sidebar.
- Navigation mobile transformee en barre basse.
- Layout principal responsive avec `min-height: 100dvh`.
- Ajout d'un skip link pour l'accessibilite clavier.
- Cartes de biens rendues vraiment cliquables et focusables au clavier.
- Ajout d'etats focus, hover et active sur les controles.
- Remplacement des empty states a emojis par des icones.
- Ajout d'une page 404.
- Ajout d'un favicon.
- Detail bien responsive en une colonne sur mobile.
- Comparaison rendue scrollable horizontalement si necessaire.

### Corrections metier

- Le prix moyen du dashboard ne divise plus par zero quand aucun prix n'est disponible.
- La comparaison applique une strategie par champ :
  - prix : plus bas = meilleur ;
  - surface, terrain, chambres, score : plus haut = meilleur ;
  - PEB, etat, localisation, source, contact : neutre.
- Le tri et l'affichage des cartes gerent mieux les valeurs manquantes.

## Audit des 3 annonces de test

Les 3 biens de test ont ete importes et relus en D1 local apres corrections :

- Immoweb Uccle : maison, 725000 EUR, 240 m2 habitables, 1700 m2 de terrain, 4 chambres, PEB D.
- Zimmo Antwerpen : appartement, 239000 EUR, 72 m2, 1 chambre, adresse Pelikaanstraat 42, PEB 358 kWh/m2.
- Century 21 Jette : studio/appartement, 109000 EUR, 25 m2, adresse Avenue de l'exposition 408, PEB F.

Validation effectuee :

- build Vite avec `npm run build` ;
- test API local `/api/settings` sans exposition de `gemini_key` ;
- test API local `/api/properties` ;
- verification navigateur locale sur `http://localhost:8790` : dashboard, liste, detail, comparaison, parametres et 404.

## Verdict sur la completude

L'application est maintenant beaucoup plus fiable pour un prototype personnel et une demonstration.

Elle peut :

- stocker des biens ;
- afficher des statistiques ;
- comparer des biens avec une logique metier plus correcte ;
- appeler Gemini si la cle est configuree cote Cloudflare ;
- refuser un import URL inaccessible au lieu de creer une fiche hallucinee ;
- conserver l'email de contact genere ;
- fonctionner correctement sur mobile et desktop ;
- exporter les donnees importantes en CSV.

Elle n'est pas encore prete pour un usage public sans protection d'acces ni durcissement supplementaire.

## Manques restants

### 1. Absence d'authentification

L'application n'a pas encore de login.

Si elle est deployee publiquement sur Cloudflare Pages, toute personne connaissant l'URL peut potentiellement appeler les routes API :

- lire les biens ;
- ajouter des biens ;
- modifier des biens ;
- supprimer des biens ;
- lire les parametres non sensibles.

Solution recommandee :

- activer Cloudflare Access devant l'application ;
- limiter l'acces a ton email ;
- plus tard, si besoin, ajouter une vraie authentification applicative.

### 2. Validation serveur encore incomplete

Les donnees sont mieux normalisees, mais il faut encore valider strictement :

- `score` entre 0 et 100 ;
- `price` numerique positif ;
- `status` dans la liste autorisee ;
- `type` dans la liste autorisee ;
- tailles maximum pour `notes`, `description`, `raw_annonce`.

### 3. Gestion avancee des sites anti-bot

Immoweb et certains portails peuvent bloquer les fetchs serveur depuis Cloudflare Worker.

Options possibles :

- conserver le mode "texte colle" comme chemin fiable ;
- ajouter un bookmarklet ou une extension navigateur pour capturer le texte visible ;
- ajouter une integration scraping dediee avec respect des conditions des sites ;
- proposer un import manuel structure quand l'URL est bloquee.

### 4. Tests automatises

Il n'y a pas encore de suite de tests versionnee.

Tests recommandes :

- tests unitaires pour `utils.js` ;
- tests API pour CRUD properties ;
- test de non-regression sur extraction Gemini avec mock ;
- tests UI de base sur dashboard, ajout, liste, detail, comparaison ;
- CI GitHub Actions avec `npm run build`.

### 5. Deploiement et securite

Avant un usage reel avec des donnees personnelles :

- activer Cloudflare Access ;
- verifier les bindings D1 en production ;
- configurer `GEMINI_KEY` comme secret Pages ;
- verifier les regles CORS ;
- ajouter une politique de retention/suppression des donnees si necessaire.

### 6. Dependances a surveiller

`npm audit` peut signaler des vulnerabilites liees a l'outillage dev (`vite`, `wrangler`, `undici` via miniflare). A traiter separement pour eviter de melanger refonte UX et mise a jour d'outillage.
