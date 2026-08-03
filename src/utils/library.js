// ── Reusable Caption & Hashtag Library (localStorage) ──

const CAPTIONS_KEY = 'contentcanvas_caption_library'
const HASHTAGS_KEY = 'contentcanvas_hashtag_library'

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

function save(key, list) {
  try {
    localStorage.setItem(key, JSON.stringify(list))
  } catch (e) {
    console.warn('Failed to save library:', e)
  }
}

// ── Captions ──
export function loadCaptions() {
  return load(CAPTIONS_KEY, [])
}

export function saveCaptions(list) {
  save(CAPTIONS_KEY, list)
}

export function addCaptionToLibrary({ title, text }) {
  const list = loadCaptions()
  const item = {
    id: crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2),
    title: title || text.slice(0, 40),
    text,
    createdAt: new Date().toISOString(),
  }
  list.unshift(item)
  saveCaptions(list)
  return item
}

export function deleteCaptionFromLibrary(id) {
  saveCaptions(loadCaptions().filter((c) => c.id !== id))
}

// ── Hashtag sets ──
export function loadHashtagSets() {
  return load(HASHTAGS_KEY, [])
}

export function saveHashtagSets(list) {
  save(HASHTAGS_KEY, list)
}

export function addHashtagSetToLibrary({ name, tags }) {
  const list = loadHashtagSets()
  const item = {
    id: crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2),
    name: name || `Set ${list.length + 1}`,
    tags: tags.filter(Boolean),
    createdAt: new Date().toISOString(),
  }
  list.unshift(item)
  saveHashtagSets(list)
  return item
}

export function deleteHashtagSetFromLibrary(id) {
  saveHashtagSets(loadHashtagSets().filter((s) => s.id !== id))
}
