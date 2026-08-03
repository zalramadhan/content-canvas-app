// ── AI Content Assistant ──
// Browser-only generation via provider APIs with CORS support.
// API keys are stored locally (localStorage) — never sent anywhere but the provider.

export const PROVIDERS = {
  gemini: {
    id: 'gemini',
    label: 'Google Gemini',
    desc: 'Gratis & mudah — ambil API key di Google AI Studio',
    defaultModel: 'gemini-2.0-flash',
    models: ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-pro'],
  },
  groq: {
    id: 'groq',
    label: 'Groq (Llama)',
    desc: 'Cepat & gratis — API key di console.groq.com',
    defaultModel: 'llama-3.3-70b-versatile',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
  },
}

const CONFIG_KEY = 'contentcanvas_ai_config'

export function loadAIConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveAIConfig(cfg) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg))
}

export function clearAIConfig() {
  localStorage.removeItem(CONFIG_KEY)
}

// ── Raw generation ──
async function generateGemini(apiKey, model, system, user) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { temperature: 0.9, maxOutputTokens: 1024 },
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Gemini error ${res.status}: ${body.slice(0, 300)}`)
  }
  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || ''
  if (!text) throw new Error('Gemini tidak mengembalikan hasil.')
  return text
}

async function generateGroq(apiKey, model, system, user) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.9,
      max_tokens: 1024,
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        { role: 'user', content: user },
      ],
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Groq error ${res.status}: ${body.slice(0, 300)}`)
  }
  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content || ''
  if (!text) throw new Error('Groq tidak mengembalikan hasil.')
  return text
}

export async function generateText({ provider, apiKey, model, systemPrompt, userPrompt }) {
  if (!apiKey) throw new Error('API key belum diisi. Buka pengaturan AI untuk menambahkan.')
  const cfg = PROVIDERS[provider] || PROVIDERS.gemini
  const m = model || cfg.defaultModel
  if (provider === 'groq') return generateGroq(apiKey, m, systemPrompt, userPrompt)
  return generateGemini(apiKey, m, systemPrompt, userPrompt)
}

// ── Parsing helpers ──
function splitLines(text) {
  return text
    .split('\n')
    .map((l) => l.replace(/^[-*•\d.)#\s]+/, '').trim())
    .filter(Boolean)
}

function extractHashtags(text) {
  const tags = [...new Set(text.match(/#[\w]+/g) || [])]
    .map((t) => t.replace(/^#/, ''))
    .filter(Boolean)
  return tags.slice(0, 20)
}

// ── Task-specific generators ──
function buildContext(entry) {
  const parts = []
  if (entry.headline) parts.push(`Topik/Headline: ${entry.headline}`)
  if (entry.concept) parts.push(`Konsep: ${entry.concept}`)
  if (entry.notes) parts.push(`Catatan: ${entry.notes}`)
  if (entry.contentType === 'carousel') parts.push('Format: Carousel')
  else parts.push('Format: Reel/Shorts')
  if (entry.platform && entry.platform !== 'unknown') parts.push(`Platform: ${entry.platform}`)
  return parts.join('\n')
}

const SYSTEM_BASE =
  'Kamu adalah asisten konten kreator sosial media Indonesia. Jawab ringkas, langsung pada poin, tanpa basa-basi, tanpa pengulangan kalimat pengantar.'

export async function generateHooks(cfg, entry, count = 5) {
  const user = `${SYSTEM_BASE}\n\nBuat ${count} hook/pertanyaan pembuka yang menarik untuk konten sosial media.\n${buildContext(entry)}\n\nFormat: satu hook per baris, maksimal 1 kalimat tiap hook. Mulai langsung dengan hook pertama.`
  const text = await generateText({
    provider: cfg.provider,
    apiKey: cfg.apiKey,
    model: cfg.model,
    systemPrompt: SYSTEM_BASE,
    userPrompt: user,
  })
  return splitLines(text).slice(0, count)
}

export async function generateCaptions(cfg, entry, count = 3) {
  const user = `${SYSTEM_BASE}\n\nBuat ${count} pilihan caption postingan (dengan emoji, CTA di akhir) untuk konten sosial media.\n${buildContext(entry)}\n\nFormat: satu caption per baris, pisahkan antar caption dengan baris kosong, maksimal 120 kata per caption. Mulai langsung dengan caption pertama.`
  const text = await generateText({
    provider: cfg.provider,
    apiKey: cfg.apiKey,
    model: cfg.model,
    systemPrompt: SYSTEM_BASE,
    userPrompt: user,
  })
  // Captions may span multiple lines; split on double newline first
  const blocks = text
    .split(/\n\s*\n/)
    .map((b) => b.replace(/^\d+[.)]\s*/, '').trim())
    .filter(Boolean)
  if (blocks.length > 1) return blocks.slice(0, count)
  // Fallback: treat each line as a caption
  return splitLines(text).slice(0, count)
}

export async function generateHashtags(cfg, entry, count = 15) {
  const user = `${SYSTEM_BASE}\n\nBuat ${count} hashtag relevan (campur Indonesia & Inggris, popular + niche) untuk konten sosial media.\n${buildContext(entry)}\n\nFormat: tulis semua hashtag dalam satu baris, dipisah spasi, diawali tanda #. Mulai langsung dengan hashtag.`
  const text = await generateText({
    provider: cfg.provider,
    apiKey: cfg.apiKey,
    model: cfg.model,
    systemPrompt: SYSTEM_BASE,
    userPrompt: user,
  })
  return extractHashtags(text).slice(0, count)
}
