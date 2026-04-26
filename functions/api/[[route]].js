// functions/api/[[route]].js
// Cloudflare Pages Functions — handles /api/* routes
// Bindings required: DB (D1), GEMINI_KEY (secret via wrangler secret)

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
      const { annonce, source, criteria, user_name } = await request.json()
      const geminiKey = env.GEMINI_KEY

      if (!geminiKey) return json({ error: 'GEMINI_KEY non configurée' }, 500)

      const prompt = `Tu es un assistant spécialisé en immobilier belge. Analyse cette annonce et retourne UNIQUEMENT un objet JSON valide, sans markdown ni backticks.

ANNONCE :
${annonce}

SOURCE : ${source || 'non précisée'}
CRITÈRES ACHETEUR : ${criteria || 'non renseignés'}
NOM SIGNATAIRE : ${user_name || 'moi'}

JSON attendu (tous les champs, null si inconnu) :
{
  "title": "titre court du bien",
  "type": "maison|appartement|terrain|immeuble|autre",
  "price": 285000,
  "price_raw": "285 000 €",
  "surface_hab": 145,
  "surface_terrain": 500,
  "nb_chambres": 3,
  "localisation": "ville/commune",
  "adresse": "adresse complète ou null",
  "etat": "neuf|bon état|à rénover|à rafraîchir|non précisé",
  "peb": "A|B|C|D|E|F|G|non précisé",
  "source": "Immoweb|Zimmo|Century 21|Agence|Particulier|Autre",
  "date_publication": "date ou null",
  "contact_nom": "nom agence ou vendeur",
  "contact_type": "agence|particulier",
  "contact_tel": "tel ou null",
  "contact_email": "email ou null",
  "description": "résumé en 2-3 phrases des points clés du bien",
  "score": 72,
  "score_raison": "explication courte du score selon les critères",
  "email_contact": "email complet et professionnel en français pour contacter le vendeur, signé par ${user_name || 'moi'}"
}`

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      )

      const geminiData = await geminiRes.json()
      if (geminiData.error) return json({ error: geminiData.error.message }, 500)

      let text = geminiData.candidates[0].content.parts[0].text.trim()
      text = text.replace(/```json|```/g, '').trim()
      const extracted = JSON.parse(text)

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
        title, type, price, price_raw, surface_hab, surface_terrain,
        nb_chambres, localisation, adresse, etat, peb, source, url: propUrl,
        date_publication, contact_nom, contact_type, contact_tel, contact_email,
        description, score, score_raison, notes, raw_annonce
      } = body

      const stmt = env.DB.prepare(`
        INSERT INTO properties (
          title, type, price, price_raw, surface_hab, surface_terrain,
          nb_chambres, localisation, adresse, etat, peb, source, url,
          date_publication, contact_nom, contact_type, contact_tel, contact_email,
          description, score, score_raison, notes, raw_annonce
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `)
      const result = await stmt.bind(
        title, type, price, price_raw, surface_hab, surface_terrain,
        nb_chambres, localisation, adresse, etat, peb, source, propUrl,
        date_publication, contact_nom, contact_type, contact_tel, contact_email,
        description, score, score_raison, notes, raw_annonce
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
        const fields = Object.keys(body).map(k => `${k} = ?`).join(', ')
        const values = Object.values(body)
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
      const settings = Object.fromEntries(results.map(r => [r.key, r.value]))
      return json({ ok: true, data: settings })
    }

    if (path === '/settings' && method === 'POST') {
      const body = await request.json()
      for (const [key, value] of Object.entries(body)) {
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
