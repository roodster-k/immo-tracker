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

function parseGeminiJson(text) {
  const cleaned = text.replace(/```json|```/g, '').trim()
  const jsonText = cleaned.startsWith('{')
    ? cleaned
    : cleaned.match(/\{[\s\S]*\}/)?.[0]

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
    // ── POST /api/extract ─────────────────────────────────────────────────
    if (path === '/extract' && method === 'POST') {
      const body = await request.json()
      let { annonce, source, criteria, user_name } = body
      const geminiKey = env.GEMINI_KEY

      if (!geminiKey) return json({ error: 'GEMINI_KEY non configurée' }, 500)

      const originalAnnonce = (annonce || '').trim()
      const isUrlAnnonce = isHttpUrl(originalAnnonce)
      let useUrlContext = false
      let fetchFailureReason = ''

      if (isUrlAnnonce) {
        const fetched = await fetchUrlText(originalAnnonce)

        if (fetched.ok) {
          annonce = `URL source : ${originalAnnonce}
URL finale : ${fetched.finalUrl}

CONTENU TEXTE DE L'ANNONCE :
${fetched.text}`
        } else {
          fetchFailureReason = fetched.reason
          useUrlContext = true
          annonce = originalAnnonce
        }
      }

      const prompt = `Tu es un assistant spécialisé en immobilier belge. Analyse cette annonce et retourne UNIQUEMENT un objet JSON valide, sans markdown ni backticks.

Règles strictes :
- Utilise uniquement des informations présentes dans l'annonce ou récupérées via l'outil URL Context.
- Si l'annonce est une URL, utilise l'outil URL Context pour lire cette URL avant de répondre.
- Ne recopie jamais les exemples ou valeurs du format attendu comme s'il s'agissait de données.
- N'invente pas d'adresse, de prix, de contact, de PEB, de surface ou de description.
- Pour "peb", indique une classe A-G seulement si elle est explicitement présente. Sinon conserve la valeur énergétique disponible, par exemple "358 kWh/m²", ou "non précisé".
- Pour "description", rédige un résumé fidèle de 2 à 4 phrases incluant les pièces/surfaces, l'état, l'énergie et les atouts de localisation quand ces éléments sont présents.
- Pour "property_tag", génère un libellé court "Ville - Type de bien", par exemple "Uccle - Maison" ou "Antwerpen - Appartement". Utilise la commune/ville principale et le type normalisé ; si une des deux informations manque, retourne null.
- Pour "status_suggestion", retourne "sous_option" uniquement si l'annonce indique explicitement que le bien est sous option/offre sous option, "vendu" uniquement si elle indique explicitement que le bien est vendu, sinon null.
- Si le contenu réel de l'annonce est inaccessible, retourne {"error":"CONTENU_ANNONCE_INACCESSIBLE"}.

ANNONCE :
${annonce}

SOURCE : ${source || 'non précisée'}
CRITÈRES ACHETEUR : ${criteria || 'non renseignés'}
NOM SIGNATAIRE : ${user_name || 'moi'}

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

      if (useUrlContext && !hasUrlContextSuccess(geminiData)) {
        const status = urlContextStatuses(geminiData).join(', ') || 'aucun statut'
        return json({ error: `Impossible de récupérer le contenu de cette URL (fetch: ${fetchFailureReason || 'échec inconnu'}; URL Context: ${status}). Colle le texte complet de l'annonce pour éviter une extraction inventée.` }, 422)
      }

      const text = geminiText(geminiData)
      if (!text) return json({ error: 'Réponse Gemini vide ou bloquée' }, 502)

      const extracted = normalizeExtracted(parseGeminiJson(text))
      if (extracted.error) return json({ error: 'Contenu de l’annonce inaccessible : colle le texte complet de l’annonce.' }, 422)

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
        email_contact, description, score, score_raison, notes,
        contact_status = 'pas_contacte', email_sent_at = null, last_contact_at = null,
        last_reply_at = null, gmail_thread_id = null, raw_annonce
      } = body

      const stmt = env.DB.prepare(`
        INSERT INTO properties (
          title, type, property_tag, price, price_raw, surface_hab, surface_terrain,
          nb_chambres, localisation, adresse, etat, peb, source, url,
          date_publication, contact_nom, contact_type, contact_tel, contact_email,
          email_contact, description, score, score_raison, notes, contact_status,
          email_sent_at, last_contact_at, last_reply_at, gmail_thread_id, raw_annonce
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `)
      const result = await stmt.bind(
        title, type, property_tag, price, price_raw, surface_hab, surface_terrain,
        nb_chambres, localisation, adresse, etat, peb, source, propUrl,
        date_publication, contact_nom, contact_type, contact_tel, contact_email,
        email_contact, description, score, score_raison, notes, contact_status,
        email_sent_at, last_contact_at, last_reply_at, gmail_thread_id, raw_annonce
      ).run()

      return json({ ok: true, id: result.meta.last_row_id })
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
          'email_contact', 'description', 'score', 'score_raison', 'status', 'notes',
          'contact_status', 'email_sent_at', 'last_contact_at', 'last_reply_at',
          'gmail_thread_id', 'raw_annonce'
        ];
        
        const filteredKeys = Object.keys(body).filter(k => allowedKeys.includes(k));
        
        if (filteredKeys.length === 0) return json({ error: 'No valid fields provided' }, 400);

        const fields = filteredKeys.map(k => `${k} = ?`).join(', ')
        const values = filteredKeys.map(k => body[k])
        
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
