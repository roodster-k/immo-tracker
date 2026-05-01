// functions/api/[[route]].js
// Cloudflare Pages Functions — handles /api/* routes
// Bindings required: DB (D1), GEMINI_KEY (secret via wrangler secret)

const URL_FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'fr-BE,fr;q=0.9,nl;q=0.8,en;q=0.7',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Upgrade-Insecure-Requests': '1',
}

function isHttpUrl(value) {
  try {
    const trimmed = value.trim()
    if (/\s/.test(trimmed)) return false

    const parsed = new URL(trimmed)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function normalizeUrlInput(value) {
  const trimmed = (value || '').trim()
  if (!trimmed || /\s/.test(trimmed)) return null
  if (isHttpUrl(trimmed)) return trimmed

  if (/^(?:www\.)?[\w-]+(?:\.[\w-]+)+(?:[/:?#].*)?$/i.test(trimmed)) {
    return `https://${trimmed}`
  }

  return null
}

function hostnameForUrl(value) {
  try {
    return new URL(value.trim()).hostname.toLowerCase()
  } catch {
    return ''
  }
}

function isImmowebUrl(value) {
  const hostname = hostnameForUrl(value)
  return hostname === 'immoweb.be' || hostname.endsWith('.immoweb.be')
}

function stripHtml(html) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&euro;/g, '€')
    .replace(/\s+/g, ' ')
    .trim()
}

function looksBlocked(text) {
  return [
    /just a moment/i,
    /please enable js/i,
    /disable any ad blocker/i,
    /captcha-delivery/i,
    /cf-challenge/i,
    /access denied/i,
  ].some(pattern => pattern.test(text))
}

async function fetchUrlText(rawUrl) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    const res = await fetch(rawUrl, {
      headers: URL_FETCH_HEADERS,
      redirect: 'follow',
      signal: controller.signal,
    })
    const html = await res.text()

    if (!res.ok) {
      return { ok: false, reason: `HTTP ${res.status}` }
    }

    if (looksBlocked(html)) {
      return { ok: false, reason: 'page anti-bot ou captcha' }
    }

    const text = stripHtml(html)
    if (text.length < 200 || looksBlocked(text)) {
      return { ok: false, reason: 'contenu insuffisant' }
    }

    return {
      ok: true,
      text: text.substring(0, 60000),
      finalUrl: res.url,
    }
  } catch (err) {
    const reason = err.name === 'AbortError' ? 'timeout' : err.message
    return { ok: false, reason }
  } finally {
    clearTimeout(timeout)
  }
}

function geminiText(data) {
  return data?.candidates?.[0]?.content?.parts
    ?.map(part => part.text || '')
    .join('\n')
    .trim()
}

function urlContextStatuses(data) {
  const metadata = data?.candidates?.[0]?.urlContextMetadata || data?.candidates?.[0]?.url_context_metadata
  const urls = metadata?.urlMetadata || metadata?.url_metadata || []
  return urls.map(item => item.urlRetrievalStatus || item.url_retrieval_status).filter(Boolean)
}

function hasUrlContextSuccess(data) {
  return urlContextStatuses(data).some(status => status === 'URL_RETRIEVAL_STATUS_SUCCESS')
}

function supabaseAuthConfig(env) {
  const supabaseUrl = (env.SUPABASE_URL || '').replace(/\/+$/, '')
  const supabaseAnonKey = env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY || ''
  return {
    enabled: Boolean(supabaseUrl && supabaseAnonKey),
    supabaseUrl,
    supabaseAnonKey,
  }
}

async function verifySupabaseUser(request, env) {
  const config = supabaseAuthConfig(env)
  if (!config.enabled) return { ok: true, user: null }

  const authorization = request.headers.get('Authorization') || ''
  if (!authorization.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Connexion requise' }
  }

  const res = await fetch(`${config.supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: config.supabaseAnonKey,
      Authorization: authorization,
    },
  })

  if (!res.ok) return { ok: false, status: 401, error: 'Session invalide ou expirée' }

  return { ok: true, user: await res.json() }
}

function parseGeminiJson(text) {
  const cleaned = text.replace(/```json|```/g, '').trim()
  // Toujours extraire l'objet JSON via regex — évite les erreurs si Gemini
  // ajoute du texte après le JSON (ex: explications, notes)
  const jsonText = cleaned.match(/\{[\s\S]*\}/)?.[0]
  if (!jsonText) throw new Error('Réponse Gemini sans JSON exploitable')
  return JSON.parse(jsonText)
}

function toInteger(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'string' && /^(null|n\/a|na|undefined)$/i.test(value.trim())) return null
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value)

  const raw = String(value)
    .replace(/\s/g, '')
    .replace(/[^\d,.-]/g, '')

  if (!raw) return null

  const normalized = raw
    .replace(/[.,](?=\d{3}(\D|$))/g, '')
    .replace(',', '.')

  const number = Number.parseFloat(normalized)
  return Number.isFinite(number) ? Math.round(number) : null
}

function normalizeScalar(value) {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') return value

  const trimmed = value.trim()
  if (!trimmed || /^(null|n\/a|na|undefined)$/i.test(trimmed)) return null
  return trimmed
}

function dbValue(value) {
  return value === undefined ? null : value
}

function normalizeFavorite(value) {
  return value === true || value === 1 || value === '1' || value === 'true' ? 1 : 0
}

async function readSettings(db) {
  const { results } = await db.prepare('SELECT key, value FROM settings').all()
  return Object.fromEntries(results.map(row => [row.key, row.value]))
}

function normalizeTypeLabel(type) {
  if (!type) return null
  const value = String(type).trim().toLowerCase()
  if (!value) return null
  if (value.includes('appartement') || value.includes('studio')) return 'Appartement'
  if (value.includes('maison') || value.includes('villa')) return 'Maison'
  if (value.includes('terrain')) return 'Terrain'
  if (value.includes('immeuble')) return 'Immeuble'
  if (value.includes('autre')) return 'Autre'
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function normalizeCityLabel(localisation) {
  if (!localisation) return null
  const city = String(localisation)
    .split(/[,\n]/)[0]
    .replace(/\b\d{4}\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  return city || null
}

function normalizePropertyTag(tag) {
  if (!tag) return null
  const normalized = String(tag)
    .replace(/[–—]/g, '-')
    .replace(/\s*-\s*/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized ? normalized.slice(0, 80) : null
}

function buildPropertyTag(property) {
  const geminiTag = normalizePropertyTag(property.property_tag)
  if (geminiTag) return geminiTag

  const city = normalizeCityLabel(property.localisation)
  const type = normalizeTypeLabel(property.type)
  return city && type ? `${city} - ${type}` : null
}

function normalizeStatusSuggestion(value) {
  if (!value) return null
  const normalized = String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_')

  if (['sous_option', 'option', 'offre_sous_option', 'sous_offre'].includes(normalized)) return 'sous_option'
  if (['vendu', 'vendue', 'sold'].includes(normalized)) return 'vendu'
  return null
}

function buildScoreContext(property) {
  return {
    title: property.title,
    type: property.type,
    price: property.price,
    price_raw: property.price_raw,
    surface_hab: property.surface_hab,
    surface_terrain: property.surface_terrain,
    nb_chambres: property.nb_chambres,
    localisation: property.localisation,
    adresse: property.adresse,
    etat: property.etat,
    peb: property.peb,
    source: property.source,
    description: property.description,
  }
}

function normalizeExtracted(extracted) {
  const cleaned = Object.fromEntries(
    Object.entries(extracted).map(([key, value]) => [key, normalizeScalar(value)])
  )

  return {
    ...cleaned,
    price: toInteger(cleaned.price),
    surface_hab: toInteger(cleaned.surface_hab),
    surface_terrain: toInteger(cleaned.surface_terrain),
    nb_chambres: toInteger(cleaned.nb_chambres),
    score: toInteger(cleaned.score),
    property_tag: buildPropertyTag(cleaned),
    status_suggestion: normalizeStatusSuggestion(cleaned.status_suggestion),
  }
}

export async function onRequest(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const path = url.pathname.replace('/api', '')
  const method = request.method

  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  if (method === 'OPTIONS') {
    return new Response(null, { headers: cors })
  }

  const json = (data, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json', ...cors },
    })

  try {
    // ── GET /api/auth/config ─────────────────────────────────────────────
    if (path === '/auth/config' && method === 'GET') {
      const config = supabaseAuthConfig(env)
      return json({
        ok: true,
        data: {
          auth_enabled: config.enabled,
          supabase_url: config.enabled ? config.supabaseUrl : '',
          supabase_anon_key: config.enabled ? config.supabaseAnonKey : '',
        },
      })
    }

    const auth = await verifySupabaseUser(request, env)
    if (!auth.ok) return json({ error: auth.error }, auth.status)

    // ── POST /api/extract ─────────────────────────────────────────────────
    if (path === '/extract' && method === 'POST') {
      const body = await request.json()
      let { annonce, source, criteria, user_name } = body
      const geminiKey = env.GEMINI_KEY

      if (!geminiKey) return json({ error: 'GEMINI_KEY non configurée' }, 500)

      if (!String(criteria || '').trim() || !String(user_name || '').trim()) {
        const savedSettings = await readSettings(env.DB)
        criteria = String(criteria || '').trim() || savedSettings.criteria || ''
        user_name = String(user_name || '').trim() || savedSettings.user_name || ''
      }

      const originalAnnonce = (annonce || '').trim()
      const urlAnnonce = normalizeUrlInput(originalAnnonce)
      const isUrlAnnonce = Boolean(urlAnnonce)
      let useUrlContext = false
      let fetchFailureReason = ''

      if (isUrlAnnonce) {
        const fetched = isImmowebUrl(urlAnnonce)
          ? { ok: false, reason: 'Immoweb bloque le fetch serveur direct, essai via Gemini URL Context' }
          : await fetchUrlText(urlAnnonce)

        if (fetched.ok) {
          annonce = `URL source : ${urlAnnonce}
URL finale : ${fetched.finalUrl}

CONTENU TEXTE DE L'ANNONCE :
${fetched.text}`
        } else {
          fetchFailureReason = fetched.reason
          useUrlContext = true
          annonce = urlAnnonce
        }
      }

      const prompt = `Tu es un assistant spécialisé en immobilier belge. Analyse cette annonce et retourne UNIQUEMENT un objet JSON valide, sans markdown ni backticks.

Règles strictes :
- Utilise uniquement des informations présentes dans l'annonce ou récupérées via l'outil URL Context.
- Si l'annonce est une URL, utilise l'outil URL Context pour lire cette URL avant de répondre.
- Ne recopie jamais les exemples ou valeurs du format attendu comme s'il s'agissait de données.
- N'invente pas d'adresse, de prix, de contact, de PEB, de surface ou de description.
- Pour "adresse", extrais uniquement l'adresse postale exacte si elle est présente dans l'annonce. Ne mets pas seulement la commune dans ce champ.
- Pour "localisation", indique la commune, ville ou zone principale, sans recopier l'adresse complète.
- Pour "peb", indique une classe A-G seulement si elle est explicitement présente. Sinon conserve la valeur énergétique disponible, par exemple "358 kWh/m²", ou "non précisé".
- Pour "description", rédige un résumé fidèle de 2 à 4 phrases incluant les pièces/surfaces, l'état, l'énergie et les atouts de localisation quand ces éléments sont présents.
- Pour "property_tag", génère un libellé court "Ville - Type de bien", par exemple "Uccle - Maison" ou "Antwerpen - Appartement". Utilise la commune/ville principale et le type normalisé ; si une des deux informations manque, retourne null.
- Si CRITÈRES ACHETEUR est renseigné, "score" est obligatoire et doit être un nombre entier de 0 à 100.
- Calcule "score" en comparant le bien aux CRITÈRES ACHETEUR : budget, zone, type, surface, chambres, PEB, état, travaux, rendement ou autres priorités présentes.
- Pour "score_raison", donne une justification concrète en 1 à 2 phrases : points forts, écarts aux critères, et incertitudes si des données manquent.
- Si CRITÈRES ACHETEUR est "non renseignés", retourne score null et score_raison null.
- Pour "status_suggestion", retourne "sous_option" uniquement si l'annonce indique explicitement que le bien est sous option/offre sous option, "vendu" uniquement si elle indique explicitement que le bien est vendu, sinon null.
- Le nom signataire ci-dessous sert uniquement à rédiger "email_contact". Ne l'utilise jamais comme "contact_nom" de l'annonce.
- Si le contenu réel de l'annonce est inaccessible, retourne {"error":"CONTENU_ANNONCE_INACCESSIBLE"}.

ANNONCE :
${annonce}

SOURCE : ${source || 'non précisée'}
CRITÈRES ACHETEUR : ${criteria || 'non renseignés'}
NOM SIGNATAIRE POUR L'EMAIL : ${user_name || 'non renseigné'}

Format JSON attendu (tous les champs, null si inconnu) :
{
  "title": string|null,
  "type": "maison"|"appartement"|"terrain"|"immeuble"|"autre"|null,
  "property_tag": string|null,
  "price": number|null,
  "price_raw": string|null,
  "surface_hab": number|null,
  "surface_terrain": number|null,
  "nb_chambres": number|null,
  "localisation": string|null,
  "adresse": string|null,
  "etat": "neuf"|"bon état"|"à rénover"|"à rafraîchir"|"non précisé"|string|null,
  "peb": "A"|"B"|"C"|"D"|"E"|"F"|"G"|"non précisé"|string|null,
  "source": "Immoweb"|"Zimmo"|"Century 21"|"Agence"|"Particulier"|"Autre"|null,
  "date_publication": string|null,
  "contact_nom": string|null,
  "contact_type": "agence"|"particulier"|null,
  "contact_tel": string|null,
  "contact_email": string|null,
  "description": string|null,
  "score": number|null,
  "score_raison": string|null,
  "email_contact": string|null,
  "status_suggestion": "sous_option"|"vendu"|null
}`

      const geminiPayload = {
        contents: [{ parts: [{ text: prompt }] }],
      }

      if (useUrlContext) {
        geminiPayload.tools = [{ url_context: {} }]
      }

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(geminiPayload),
        }
      )

      const geminiData = await geminiRes.json()
      if (geminiData.error) return json({ error: geminiData.error.message }, 500)

      const text = geminiText(geminiData)
      if (!text) {
        const detail = useUrlContext
          ? ` (fetch: ${fetchFailureReason || 'échec'}; URL Context: ${urlContextStatuses(geminiData).join(', ') || 'aucun accès'})`
          : ''
        return json({ error: `Réponse Gemini vide ou bloquée${detail}` }, 502)
      }

      const extracted = normalizeExtracted(parseGeminiJson(text))

      if (extracted.error === 'CONTENU_ANNONCE_INACCESSIBLE') {
        const urlContextOk = hasUrlContextSuccess(geminiData)
        const urlContextStatus = urlContextStatuses(geminiData).join(', ') || 'aucun accès'
        const detail = useUrlContext
          ? ` (fetch: ${fetchFailureReason || 'échec'}; URL Context: ${urlContextOk ? 'OK' : urlContextStatus})`
          : ''
        return json({ error: `Impossible de récupérer le contenu de cette URL${detail}. Colle le texte complet de l'annonce pour éviter une extraction inventée.` }, 422)
      }

      return json({ ok: true, data: extracted })
    }

    // ── GET /api/properties ───────────────────────────────────────────────
    if (path === '/properties' && method === 'GET') {
      const status = url.searchParams.get('status')
      let query = 'SELECT * FROM properties'
      let params = []
      if (status) {
        query += ' WHERE status = ?'
        params = [status]
      }
      query += ' ORDER BY created_at DESC'
      const { results } = await env.DB.prepare(query).bind(...params).all()
      return json({ ok: true, data: results })
    }

    // ── POST /api/properties ──────────────────────────────────────────────
    if (path === '/properties' && method === 'POST') {
      const body = await request.json()
      const {
        title, type, property_tag, price, price_raw, surface_hab, surface_terrain,
        nb_chambres, localisation, adresse, etat, peb, source, url: propUrl,
        date_publication, contact_nom, contact_type, contact_tel, contact_email,
        email_contact, description, score, score_raison, favorite = 0, status = 'nouveau', notes,
        contact_status = 'pas_contacte', email_sent_at = null, last_contact_at = null,
        last_reply_at = null, gmail_thread_id = null, raw_annonce
      } = body

      const stmt = env.DB.prepare(`
        INSERT INTO properties (
          title, type, property_tag, price, price_raw, surface_hab, surface_terrain,
          nb_chambres, localisation, adresse, etat, peb, source, url,
          date_publication, contact_nom, contact_type, contact_tel, contact_email,
          email_contact, description, score, score_raison, favorite, status, notes, contact_status,
          email_sent_at, last_contact_at, last_reply_at, gmail_thread_id, raw_annonce
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `)
      const values = [
        title, type, property_tag, price, price_raw, surface_hab, surface_terrain,
        nb_chambres, localisation, adresse, etat, peb, source, propUrl,
        date_publication, contact_nom, contact_type, contact_tel, contact_email,
        email_contact, description, score, score_raison, normalizeFavorite(favorite), status, notes, contact_status,
        email_sent_at, last_contact_at, last_reply_at, gmail_thread_id, raw_annonce
      ].map(dbValue)

      const result = await stmt.bind(...values).run()

      return json({ ok: true, id: result.meta.last_row_id })
    }

    // ── POST /api/properties/:id/rescore ─────────────────────────────────
    const matchRescore = path.match(/^\/properties\/(\d+)\/rescore$/)
    if (matchRescore && method === 'POST') {
      const id = matchRescore[1]
      const geminiKey = env.GEMINI_KEY
      if (!geminiKey) return json({ error: 'GEMINI_KEY non configurée' }, 500)

      const property = await env.DB.prepare('SELECT * FROM properties WHERE id = ?').bind(id).first()
      if (!property) return json({ error: 'Not found' }, 404)

      const body = await request.json().catch(() => ({}))
      const savedSettings = await readSettings(env.DB)
      const criteria = String(body.criteria || savedSettings.criteria || '').trim()
      if (!criteria) return json({ error: 'Critères de recherche non configurés' }, 422)

      const prompt = `Tu es un analyste immobilier belge. Recalcule uniquement le score d'adéquation de ce bien avec les critères acheteur.

Retourne UNIQUEMENT un objet JSON valide, sans markdown ni backticks.

Règles :
- Utilise uniquement le CONTEXTE BIEN ci-dessous.
- Compare le bien aux CRITÈRES ACHETEUR : budget, zone, type, surface, chambres, PEB, état, travaux, rendement ou autres priorités présentes.
- "score" est obligatoire : nombre entier de 0 à 100.
- "score_raison" est obligatoire : 1 à 2 phrases concrètes avec les points forts, les écarts aux critères et les incertitudes si des données manquent.
- N'invente aucune caractéristique absente.

CRITÈRES ACHETEUR :
${criteria}

CONTEXTE BIEN :
${JSON.stringify(buildScoreContext(property), null, 2)}

Format JSON attendu :
{
  "score": number,
  "score_raison": string
}`

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      )

      const geminiData = await geminiRes.json()
      if (geminiData.error) return json({ error: geminiData.error.message }, 500)

      const text = geminiText(geminiData)
      if (!text) return json({ error: 'Réponse Gemini vide ou bloquée' }, 502)

      const scored = normalizeExtracted(parseGeminiJson(text))
      if (scored.score === null || !scored.score_raison) {
        return json({ error: 'Réponse Gemini sans score exploitable' }, 502)
      }

      await env.DB.prepare(
        'UPDATE properties SET score = ?, score_raison = ?, updated_at = datetime(\'now\') WHERE id = ?'
      ).bind(scored.score, scored.score_raison, id).run()

      return json({ ok: true, data: { id: Number(id), score: scored.score, score_raison: scored.score_raison } })
    }

    // ── GET /api/properties/:id ───────────────────────────────────────────
    const matchId = path.match(/^\/properties\/(\d+)$/)
    if (matchId) {
      const id = matchId[1]

      if (method === 'GET') {
        const row = await env.DB.prepare('SELECT * FROM properties WHERE id = ?').bind(id).first()
        if (!row) return json({ error: 'Not found' }, 404)
        return json({ ok: true, data: row })
      }

      if (method === 'PUT') {
        const body = await request.json()
        
        const allowedKeys = [
          'title', 'type', 'property_tag', 'price', 'price_raw', 'surface_hab', 'surface_terrain',
          'nb_chambres', 'localisation', 'adresse', 'etat', 'peb', 'source', 'url',
          'date_publication', 'contact_nom', 'contact_type', 'contact_tel', 'contact_email',
          'email_contact', 'description', 'score', 'score_raison', 'favorite', 'status', 'notes',
          'contact_status', 'email_sent_at', 'last_contact_at', 'last_reply_at',
          'gmail_thread_id', 'raw_annonce'
        ];
        
        const filteredKeys = Object.keys(body).filter(k => allowedKeys.includes(k));
        
        if (filteredKeys.length === 0) return json({ error: 'No valid fields provided' }, 400);

        const fields = filteredKeys.map(k => `${k} = ?`).join(', ')
        const values = filteredKeys.map(k => k === 'favorite' ? normalizeFavorite(body[k]) : dbValue(body[k]))
        
        await env.DB.prepare(
          `UPDATE properties SET ${fields}, updated_at = datetime('now') WHERE id = ?`
        ).bind(...values, id).run()
        return json({ ok: true })
      }

      if (method === 'DELETE') {
        await env.DB.prepare('DELETE FROM properties WHERE id = ?').bind(id).run()
        return json({ ok: true })
      }
    }

    // ── GET/POST /api/settings ────────────────────────────────────────────
    if (path === '/settings' && method === 'GET') {
      const { results } = await env.DB.prepare('SELECT key, value FROM settings').all()
      const settings = Object.fromEntries(
        results
          .filter(r => r.key !== 'gemini_key')
          .map(r => [r.key, r.value])
      )
      settings.gemini_configured = Boolean(env.GEMINI_KEY)
      return json({ ok: true, data: settings })
    }

    if (path === '/settings' && method === 'POST') {
      const body = await request.json()
      const allowedSettings = ['criteria', 'user_name']
      for (const [key, value] of Object.entries(body).filter(([key]) => allowedSettings.includes(key))) {
        await env.DB.prepare(
          'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'
        ).bind(key, value).run()
      }
      return json({ ok: true })
    }

    return json({ error: 'Route non trouvée' }, 404)
  } catch (err) {
    return json({ error: err.message }, 500)
  }
}
