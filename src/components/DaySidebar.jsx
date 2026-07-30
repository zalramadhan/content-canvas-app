import { useState, useEffect, useCallback, useRef } from 'react'
import { format } from 'date-fns'
import {
  X, Plus, Trash2, ChevronDown, ChevronUp, FileText,
  Lightbulb, Quote, Scissors,
  ExternalLink, GripVertical, Check, Clapperboard, Bookmark, Clock, Image, Link, AlertCircle, Loader2,
  Target, Hash, BookOpen, Gem, ArrowRight, LayoutGrid, Palette
} from 'lucide-react'
import VideoEmbed from './VideoEmbed'
import AddVideoForm from './AddVideoForm'
import { parseVideoUrl, getPlatformName, PLATFORMS } from '../utils/videoParser'

// ── Template Storage ──
const TEMPLATES_KEY = 'sceneTemplates'

function loadTemplates() {
  try {
    return JSON.parse(localStorage.getItem(TEMPLATES_KEY) || '[]')
  } catch { return [] }
}

function saveTemplates(templates) {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates))
}

const NOTE_FIELDS = [
  { key: 'concept', label: 'Concept', icon: Lightbulb, color: 'text-amber-500 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30', border: 'border-amber-200 dark:border-amber-700/50' },
  { key: 'notes', label: 'Notes', icon: FileText, color: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-900/40', border: 'border-gray-200 dark:border-gray-700/50' },
]

// ── Image Reference Preview (compact, for per-scene use) ──
function SceneImageRef({ url, onDelete }) {
  const [imageUrl, setImageUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const parsed = parseVideoUrl(url)
  const isPinterest = parsed.platform === PLATFORMS.PINTEREST

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)

    if (isPinterest) {
      const oembedUrl = `https://www.pinterest.com/oembed.json?url=${encodeURIComponent(url)}`
      const proxies = [
        (u) => u,
        (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
        (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
      ];
      (async () => {
        for (const proxyFn of proxies) {
          if (cancelled) return
          try {
            const res = await fetch(proxyFn(oembedUrl), { signal: AbortSignal.timeout(5000) })
            const text = await res.text()
            const data = JSON.parse(text)
            const thumb = data?.thumbnail_url || data?.url
            if (!cancelled && thumb) {
              setImageUrl(thumb)
              setLoading(false)
              return
            }
          } catch {}
        }
        if (!cancelled) { setError(true); setLoading(false) }
      })()
    } else {
      // Direct image
      setImageUrl(url)
      setLoading(false)
    }

    return () => { cancelled = true }
  }, [url, isPinterest])

  return (
    <div className="relative group/ref rounded-lg overflow-hidden border border-border bg-black/5 dark:bg-white/5">
      {loading && (
        <div className="flex items-center justify-center py-10 bg-surface-muted">
          <Loader2 className="w-5 h-5 text-text-muted animate-spin" />
        </div>
      )}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center gap-2 py-6 px-4 bg-surface-muted">
          <AlertCircle className="w-5 h-5 text-text-muted" />
          <p className="text-[10px] text-text-muted text-center">Failed to load preview</p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-primary-600 hover:text-primary-700 underline"
          >
            Open link
          </a>
        </div>
      )}
      {imageUrl && !loading && (
        <div className="relative">
          <img
            src={imageUrl}
            alt="Reference"
            className="w-full h-auto object-cover max-h-[200px]"
            onError={() => setError(true)}
          />
          <div className="absolute inset-0 bg-black/0 group-hover/ref:bg-black/10 transition-colors duration-200" />
        </div>
      )}
      {!loading && isPinterest && (
        <div className="px-2 py-1 bg-surface border-t border-border flex items-center justify-between">
          <span className="text-[9px] text-text-muted">Pinterest</span>
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-[9px] text-primary-600 hover:underline">
            Open
          </a>
        </div>
      )}
      <button
        onClick={onDelete}
        className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/50 hover:bg-black/70
                   text-white opacity-0 group-hover/ref:opacity-100 transition-all z-10"
        title="Remove image"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}

function SceneImageReferences({ imageRefs = [], onAdd, onDelete }) {
  const [newUrl, setNewUrl] = useState('')
  const [showInput, setShowInput] = useState(false)
  const inputRef = useRef(null)

  const handleAdd = () => {
    const url = newUrl.trim()
    if (!url) return
    // Basic URL validation
    if (!url.startsWith('http://') && !url.startsWith('https://')) return
    onAdd(url)
    setNewUrl('')
    setShowInput(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
    if (e.key === 'Escape') {
      setShowInput(false)
      setNewUrl('')
    }
  }

  useEffect(() => {
    if (showInput) inputRef.current?.focus()
  }, [showInput])

  return (
    <div>
      <label className="text-[10px] font-medium text-text-muted mb-1.5 flex items-center gap-1">
        <Image className="w-3 h-3 text-violet-500" />
        <span>Image References</span>
        {imageRefs.length > 0 && (
          <span className="text-[9px] text-violet-400 dark:text-violet-300 font-medium">
            {imageRefs.length}
          </span>
        )}
      </label>

      {imageRefs.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-2">
          {imageRefs.map((refUrl, idx) => (
            <SceneImageRef
              key={idx}
              url={refUrl}
              onDelete={() => onDelete(idx)}
            />
          ))}
        </div>
      )}

      {showInput ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-surface">
            <Link className="w-3.5 h-3.5 text-text-muted shrink-0" />
            <input
              ref={inputRef}
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Paste image or Pinterest URL..."
              className="flex-1 text-xs bg-transparent border-none outline-none text-text placeholder:text-text-muted"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={!newUrl.trim()}
            className="shrink-0 px-3 py-1.5 text-xs font-medium text-white
                       bg-violet-600 hover:bg-violet-700 disabled:bg-gray-300 dark:disabled:bg-gray-700
                       disabled:text-gray-500 rounded-lg transition-all duration-150 active:scale-95"
          >
            Add
          </button>
          <button
            onClick={() => { setShowInput(false); setNewUrl('') }}
            className="shrink-0 p-1.5 text-text-muted hover:text-text hover:bg-surface-hover rounded-lg transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowInput(true)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg
                     border-2 border-dashed border-violet-200 dark:border-violet-700/50
                     text-[11px] font-medium text-violet-500 dark:text-violet-400
                     hover:bg-violet-50/50 dark:hover:bg-violet-900/20
                     hover:border-violet-300 dark:hover:border-violet-600
                     transition-all duration-200"
        >
          <Plus className="w-3 h-3" />
          Add Image Reference
        </button>
      )}
    </div>
  )
}

// ── Content Strategy ──

const STORY_BEAT_LABELS = [
  'Opening Hook',
  'Context / Problem',
  'Rising Action',
  'Turning Point',
  'Solution / Climax',
  'Closing / CTA',
  'Personal Story',
  'Myth vs Fact',
  'Question & Answer',
  'Before vs After',
  'Tips & Tricks',
  'Behind the Scenes',
]

const CTA_OPTIONS = [
  'Follow / Subscribe',
  'Like this video',
  'Comment your thoughts',
  'Share with friends',
  'Save for later',
  'Link in Bio / Description',
  'Tag someone',
  'Try this at home',
  'Vote / Poll',
  'Buy / Order now',
  'Visit website',
  'Join community',
]

function ContentStrategy({ value, onChange }) {
  const [expanded, setExpanded] = useState(true)

  // Parse strategy data
  let data = { keyMessage: '', hooks: [], storytelling: [], cta: '', hashtags: [] }
  try {
    const parsed = JSON.parse(value || '{}')
    if (parsed && typeof parsed === 'object') {
      data = {
        keyMessage: parsed.keyMessage || '',
        hooks: Array.isArray(parsed.hooks) ? parsed.hooks : [],
        storytelling: Array.isArray(parsed.storytelling) ? parsed.storytelling : [],
        cta: parsed.cta || '',
        hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
      }
    }
  } catch {}

  const save = (newData) => {
    const hasContent = newData.keyMessage || newData.hooks.length > 0 || newData.storytelling.length > 0 || newData.cta || newData.hashtags.length > 0
    onChange('strategy', hasContent ? JSON.stringify(newData) : '')
  }

  const updateField = (field, val) => {
    save({ ...data, [field]: val })
  }

  // Compute collapsed summary
  const hookCount = data.hooks.length
  const storyCount = data.storytelling.length
  const tagCount = data.hashtags.length
  const summaryParts = []
  if (data.keyMessage) summaryParts.push(`💎 ${data.keyMessage.slice(0, 25)}`)
  if (hookCount > 0) summaryParts.push(`💬 ${hookCount}`)
  if (storyCount > 0) summaryParts.push(`📖 ${storyCount}`)
  if (data.cta) summaryParts.push(`🚀`)
  if (tagCount > 0) summaryParts.push(`#${tagCount}`)
  const summary = summaryParts.join(' · ')

  return (
    <div className="rounded-xl border border-emerald-200 dark:border-emerald-700/50 overflow-hidden transition-all duration-200">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2.5
                   bg-emerald-50 dark:bg-emerald-900/30 hover:opacity-80 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Target className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold text-text">Content Strategy</span>
          {summary && (
            <span className="text-[10px] text-text-muted bg-white/60 dark:bg-surface-hover/60 px-1.5 py-0.5 rounded-full truncate max-w-[180px]">
              {summary}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-text-muted shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-text-muted shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="p-3 space-y-4 bg-surface">
          {/* Key Message */}
          <div>
            <label className="text-[10px] font-medium text-text-muted mb-1.5 flex items-center gap-1">
              <Gem className="w-3 h-3 text-emerald-500" />
              <span>Key Message / Core Value</span>
            </label>
            <textarea
              value={data.keyMessage}
              onChange={(e) => updateField('keyMessage', e.target.value)}
              placeholder="What's the main message you want to deliver?"
              rows={2}
              className="w-full text-sm bg-surface border border-emerald-200 dark:border-emerald-700/50
                         rounded-lg px-3 py-2 text-text outline-none
                         focus:border-emerald-400 transition-colors
                         resize-none placeholder:text-text-muted"
            />
          </div>

          {/* Hooks (multiple) */}
          <HooksList
            hooks={data.hooks}
            onChange={(hooks) => updateField('hooks', hooks)}
          />

          {/* Storytelling */}
          <StorytellingList
            beats={data.storytelling}
            onChange={(beats) => updateField('storytelling', beats)}
          />

          {/* CTA */}
          <div>
            <label className="text-[10px] font-medium text-text-muted mb-1.5 flex items-center gap-1">
              <ArrowRight className="w-3 h-3 text-emerald-500" />
              <span>Call to Action</span>
            </label>
            <div className="relative">
              <input
                type="text"
                list="cta-options"
                value={data.cta}
                onChange={(e) => updateField('cta', e.target.value)}
                placeholder="Select or type CTA..."
                className="w-full text-sm bg-surface border border-emerald-200 dark:border-emerald-700/50
                           rounded-lg px-3 py-2 text-text outline-none
                           focus:border-emerald-400 transition-colors placeholder:text-text-muted"
              />
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
              <datalist id="cta-options">
                {CTA_OPTIONS.map(opt => (
                  <option key={opt} value={opt} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Hashtags */}
          <HashtagInput
            hashtags={data.hashtags}
            onChange={(tags) => updateField('hashtags', tags)}
          />
        </div>
      )}
    </div>
  )
}

// ── Hooks List (multiple hooks) ──
function HooksList({ hooks = [], onChange }) {
  const [newHook, setNewHook] = useState('')

  const addHook = () => {
    const text = newHook.trim()
    if (!text) return
    onChange([...hooks, text])
    setNewHook('')
  }

  const deleteHook = (idx) => {
    onChange(hooks.filter((_, i) => i !== idx))
  }

  return (
    <div>
      <label className="text-[10px] font-medium text-text-muted mb-1.5 flex items-center gap-1">
        <Quote className="w-3 h-3 text-blue-500" />
        <span>Hooks</span>
        {hooks.length > 0 && (
          <span className="text-[9px] text-blue-400 font-medium bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-full">
            {hooks.length}
          </span>
        )}
      </label>

      {hooks.length > 0 && (
        <div className="space-y-1 mb-2">
          {hooks.map((hook, idx) => (
            <div
              key={idx}
              className="group flex items-start gap-2 py-1.5 px-2 rounded-lg
                         bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40"
            >
              <span className="text-[10px] font-bold text-blue-400 mt-0.5 shrink-0">#{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <textarea
                  value={hook}
                  onChange={(e) => {
                    const updated = hooks.map((h, i) => i === idx ? e.target.value : h)
                    onChange(updated)
                  }}
                  rows={1}
                  className="w-full text-sm bg-transparent border-none outline-none resize-none
                             text-text placeholder:text-text-muted leading-relaxed"
                />
              </div>
              <button
                onClick={() => deleteHook(idx)}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-text-muted
                           hover:text-red-500 transition-all shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newHook}
          onChange={(e) => setNewHook(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newHook.trim()) {
              e.preventDefault()
              addHook()
            }
          }}
          placeholder="Add a hook..."
          className="flex-1 text-xs bg-surface border border-blue-200 dark:border-blue-700/50
                     rounded-lg px-2.5 py-1.5 text-text outline-none
                     focus:border-blue-400 transition-colors placeholder:text-text-muted"
        />
        <button
          onClick={addHook}
          disabled={!newHook.trim()}
          className="shrink-0 px-2.5 py-1.5 text-xs font-medium text-white
                     bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700
                     rounded-lg transition-all duration-150 active:scale-95"
        >
          + Hook
        </button>
      </div>
    </div>
  )
}

// ── Storytelling Beats ──
function StorytellingList({ beats = [], onChange }) {
  const [newBeatLabel, setNewBeatLabel] = useState('')
  const [showLabelPicker, setShowLabelPicker] = useState(false)
  const pickerRef = useRef(null)

  const addBeat = (label) => {
    const beatLabel = label || newBeatLabel.trim() || `Beat ${beats.length + 1}`
    onChange([...beats, { label: beatLabel, text: '' }])
    setNewBeatLabel('')
    setShowLabelPicker(false)
  }

  const deleteBeat = (idx) => {
    onChange(beats.filter((_, i) => i !== idx))
  }

  const updateBeat = (idx, field, val) => {
    onChange(beats.map((b, i) => i === idx ? { ...b, [field]: val } : b))
  }

  // Close picker on click outside
  useEffect(() => {
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowLabelPicker(false)
      }
    }
    if (showLabelPicker) {
      document.addEventListener('mousedown', handler)
      return () => document.removeEventListener('mousedown', handler)
    }
  }, [showLabelPicker])

  return (
    <div>
      <label className="text-[10px] font-medium text-text-muted mb-1.5 flex items-center gap-1">
        <BookOpen className="w-3 h-3 text-amber-600" />
        <span>Storytelling / Narrative Flow</span>
        {beats.length > 0 && (
          <span className="text-[9px] text-amber-500 font-medium bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full">
            {beats.length} beat{beats.length > 1 ? 's' : ''}
          </span>
        )}
      </label>

      {beats.length > 0 && (
        <div className="space-y-2 mb-3">
          {beats.map((beat, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-amber-200 dark:border-amber-700/50
                         bg-amber-50/30 dark:bg-amber-900/10 overflow-hidden group/beat"
            >
              <div className="flex items-center justify-between px-2.5 py-1.5 bg-amber-50/50 dark:bg-amber-900/20">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span className="text-[9px] font-bold text-amber-500 shrink-0">{idx + 1}.</span>
                  <input
                    type="text"
                    list={`beat-labels-${idx}`}
                    value={beat.label}
                    onChange={(e) => updateBeat(idx, 'label', e.target.value)}
                    className="text-[11px] font-semibold text-text bg-transparent border-none
                               outline-none min-w-0 flex-1"
                  />
                  <datalist id={`beat-labels-${idx}`}>
                    {STORY_BEAT_LABELS.map(l => (
                      <option key={l} value={l} />
                    ))}
                  </datalist>
                </div>
                <button
                  onClick={() => deleteBeat(idx)}
                  className="opacity-0 group-hover/beat:opacity-100 p-0.5 rounded text-text-muted
                             hover:text-red-500 transition-all shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="px-2.5 py-2">
                <textarea
                  value={beat.text}
                  onChange={(e) => updateBeat(idx, 'text', e.target.value)}
                  placeholder={`Write your ${beat.label.toLowerCase()} narration...`}
                  rows={2}
                  className="w-full text-xs bg-transparent border-none outline-none resize-none
                             text-text placeholder:text-text-muted leading-relaxed"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="relative" ref={pickerRef}>
        {showLabelPicker ? (
          <div className="bg-surface border border-border rounded-lg p-2 shadow-lg">
            <div className="grid grid-cols-2 gap-1 mb-2">
              {STORY_BEAT_LABELS.map(label => (
                <button
                  key={label}
                  onClick={() => addBeat(label)}
                  className="text-[10px] text-left px-2 py-1.5 rounded-lg hover:bg-amber-50
                             dark:hover:bg-amber-900/20 text-text hover:text-amber-700
                             transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 border-t border-border-light pt-2">
              <input
                type="text"
                value={newBeatLabel}
                onChange={(e) => setNewBeatLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); addBeat() }
                }}
                placeholder="Or type custom..."
                className="flex-1 text-xs bg-surface-muted border border-border rounded-lg px-2 py-1.5
                           text-text outline-none placeholder:text-text-muted"
              />
              <button
                onClick={() => addBeat()}
                className="shrink-0 px-2.5 py-1.5 text-xs font-medium text-white
                           bg-amber-500 hover:bg-amber-600 rounded-lg transition-all active:scale-95"
              >
                Add
              </button>
              <button
                onClick={() => setShowLabelPicker(false)}
                className="shrink-0 p-1.5 text-text-muted hover:bg-surface-hover rounded-lg"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowLabelPicker(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg
                       border-2 border-dashed border-amber-200 dark:border-amber-700/50
                       text-[11px] font-medium text-amber-500 dark:text-amber-400
                       hover:bg-amber-50/50 dark:hover:bg-amber-900/20
                       hover:border-amber-300 dark:hover:border-amber-600
                       transition-all duration-200"
          >
            <Plus className="w-3 h-3" />
            Add Story Beat
          </button>
        )}
      </div>
    </div>
  )
}

// ── Hashtag Input ──
function HashtagInput({ hashtags = [], onChange }) {
  const [input, setInput] = useState('')

  const addTag = () => {
    let tag = input.trim()
    if (!tag) return
    // Remove leading # if user typed it
    tag = tag.replace(/^#/, '')
    if (hashtags.includes(tag)) return
    onChange([...hashtags, tag])
    setInput('')
  }

  const deleteTag = (idx) => {
    onChange(hashtags.filter((_, i) => i !== idx))
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
    if (e.key === ',' || e.key === ' ') {
      e.preventDefault()
      addTag()
    }
    if (e.key === 'Backspace' && !input && hashtags.length > 0) {
      onChange(hashtags.slice(0, -1))
    }
  }

  return (
    <div>
      <label className="text-[10px] font-medium text-text-muted mb-1.5 flex items-center gap-1">
        <Hash className="w-3 h-3 text-violet-500" />
        <span>Hashtags / Keywords</span>
        {hashtags.length > 0 && (
          <span className="text-[9px] text-violet-400 font-medium">{hashtags.length}</span>
        )}
      </label>

      {hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {hashtags.map((tag, idx) => (
            <span
              key={idx}
              className="group/tag inline-flex items-center gap-1 px-2 py-1 rounded-full
                         bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300
                         text-[11px] font-medium border border-violet-200 dark:border-violet-700/50"
            >
              <span>#{tag}</span>
              <button
                onClick={() => deleteTag(idx)}
                className="p-0.5 rounded-full hover:bg-violet-200 dark:hover:bg-violet-800
                           transition-colors opacity-0 group-hover/tag:opacity-100"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type hashtag and press Enter..."
          className="flex-1 text-xs bg-surface border border-violet-200 dark:border-violet-700/50
                     rounded-lg px-2.5 py-1.5 text-text outline-none
                     focus:border-violet-400 transition-colors placeholder:text-text-muted"
        />
        <button
          onClick={addTag}
          disabled={!input.trim()}
          className="shrink-0 px-2.5 py-1.5 text-xs font-medium text-white
                     bg-violet-500 hover:bg-violet-600 disabled:bg-gray-300 dark:disabled:bg-gray-700
                     rounded-lg transition-all duration-150 active:scale-95"
        >
          Add
        </button>
      </div>
      <p className="text-[9px] text-text-muted mt-1">
        Press Enter, Space or comma to add. Backspace to delete last.
      </p>
    </div>
  )
}

// ── Carousel Canvas ──

const LAYOUT_OPTIONS = [
  'Image Top, Text Bottom',
  'Text Top, Image Bottom',
  'Image Left, Text Right',
  'Text Left, Image Right',
  'Full Image',
  'Full Text',
  'Centered Content',
  'Split Screen',
  'Grid / Collage',
  'Story / Highlight',
  'Before & After',
  'Question Card',
]

function CarouselSlide({ slide, index, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(true)
  const hasDesign = slide.colorPalette || slide.typography || slide.layout || slide.designNotes || slide.designGuide

  return (
    <div className="rounded-xl border border-orange-200 dark:border-orange-700/50 overflow-hidden transition-all duration-200 group/slide">
      {/* Slide Header */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-surface border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-5 h-5 rounded-lg bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center text-[10px] font-bold text-orange-600 dark:text-orange-400 shrink-0">
            {index + 1}
          </span>
          <span className="text-xs font-semibold text-text">Slide {index + 1}</span>
          {(slide.script || hasDesign) && (
            <span className="text-[10px] text-text-muted flex items-center gap-1">
              {slide.script && '📝'}
              {hasDesign && '🎨'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded-lg text-text-muted hover:bg-surface-hover transition-all"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          <button
            onClick={onDelete}
            className="p-1 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-3 space-y-3 bg-surface">
          {/* Script / Copy */}
          <div>
            <label className="text-[10px] font-medium text-text-muted mb-1.5 flex items-center gap-1">
              <span>📝</span> Script / Copy
            </label>
            <textarea
              value={slide.script || ''}
              onChange={(e) => onUpdate('script', e.target.value)}
              placeholder="Write the copy for this slide..."
              rows={3}
              className="w-full text-sm bg-surface border border-orange-200 dark:border-orange-700/50
                         rounded-lg px-3 py-2 text-text outline-none
                         focus:border-orange-400 transition-colors
                         resize-none placeholder:text-text-muted"
            />
          </div>

          {/* 🎨 Design Guide — Detailed */}
          <div className="rounded-xl border border-purple-200 dark:border-purple-700/50 overflow-hidden">
            <div className="px-3 py-2 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-200 dark:border-purple-700/50 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-purple-500" />
              <span className="text-[11px] font-semibold text-text">Design Guide</span>
              {hasDesign && <span className="text-[9px] text-purple-400">✓</span>}
            </div>
            <div className="p-3 space-y-3 bg-surface">
              {/* Color Palette */}
              <div>
                <label className="text-[10px] font-medium text-text-muted mb-1 flex items-center gap-1">
                  <span>🎨</span> Color Palette
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={slide.colorPalette || ''}
                    onChange={(e) => onUpdate('colorPalette', e.target.value)}
                    placeholder="e.g. Purple (#7C3AED), White, Dark Gray"
                    className="flex-1 text-xs bg-surface border border-purple-200 dark:border-purple-700/50
                               rounded-lg px-2.5 py-1.5 text-text outline-none
                               focus:border-purple-400 transition-colors placeholder:text-text-muted"
                  />
                </div>
              </div>

              {/* Typography */}
              <div>
                <label className="text-[10px] font-medium text-text-muted mb-1 flex items-center gap-1">
                  <span>🔤</span> Typography / Font
                </label>
                <input
                  type="text"
                  value={slide.typography || ''}
                  onChange={(e) => onUpdate('typography', e.target.value)}
                  placeholder="e.g. Poppins Bold 32pt, Inter Regular 16pt"
                  className="w-full text-xs bg-surface border border-purple-200 dark:border-purple-700/50
                             rounded-lg px-2.5 py-1.5 text-text outline-none
                             focus:border-purple-400 transition-colors placeholder:text-text-muted"
                />
              </div>

              {/* Layout */}
              <div>
                <label className="text-[10px] font-medium text-text-muted mb-1 flex items-center gap-1">
                  <span>📐</span> Layout Structure
                </label>
                <div className="relative">
                  <input
                    type="text"
                    list="layout-options"
                    value={slide.layout || ''}
                    onChange={(e) => onUpdate('layout', e.target.value)}
                    placeholder="Select or type layout..."
                    className="w-full text-xs bg-surface border border-purple-200 dark:border-purple-700/50
                               rounded-lg px-2.5 py-1.5 text-text outline-none
                               focus:border-purple-400 transition-colors placeholder:text-text-muted"
                  />
                  <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                  <datalist id="layout-options">
                    {LAYOUT_OPTIONS.map(opt => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Additional Design Notes */}
              <div>
                <label className="text-[10px] font-medium text-text-muted mb-1 flex items-center gap-1">
                  <span>✏️</span> Additional Notes
                </label>
                <textarea
                  value={slide.designNotes || ''}
                  onChange={(e) => onUpdate('designNotes', e.target.value)}
                  placeholder="Gradients, shadows, icons, illustrations, moods..."
                  rows={2}
                  className="w-full text-xs bg-surface border border-purple-200 dark:border-purple-700/50
                             rounded-lg px-2.5 py-1.5 text-text outline-none
                             focus:border-purple-400 transition-colors
                             resize-none placeholder:text-text-muted"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CarouselCanvas({ value, onChange }) {
  const [expanded, setExpanded] = useState(!!(value && value !== '[]'))

  // Parse slides
  let slides = []
  try {
    slides = JSON.parse(value || '[]')
    if (!Array.isArray(slides)) slides = []
  } catch { slides = [] }

  const saveSlides = (newSlides) => {
    onChange('carousel', newSlides.length > 0 ? JSON.stringify(newSlides) : '')
  }

  const addSlide = () => {
    saveSlides([...slides, {
      script: '',
      colorPalette: '',
      typography: '',
      layout: '',
      designNotes: ''
    }])
  }

  const deleteSlide = (index) => {
    saveSlides(slides.filter((_, i) => i !== index))
  }

  const updateSlide = (index, field, val) => {
    saveSlides(slides.map((s, i) =>
      i === index ? { ...s, [field]: val } : s
    ))
  }

  return (
    <div className="rounded-xl border border-orange-200 dark:border-orange-700/50 overflow-hidden transition-all duration-200">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2.5
                   bg-orange-50 dark:bg-orange-900/30 hover:opacity-80 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <LayoutGrid className="w-4 h-4 text-orange-500 dark:text-orange-400 shrink-0" />
          <span className="text-xs font-semibold text-text">Carousel Canvas</span>
          {slides.length > 0 && (
            <span className="text-[10px] text-text-muted bg-white/60 dark:bg-surface-hover/60 px-1.5 py-0.5 rounded-full">
              {slides.length} slide{slides.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-text-muted shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-text-muted shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="p-3 space-y-3 bg-surface">
          {slides.length === 0 && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <LayoutGrid className="w-8 h-8 text-orange-300 dark:text-orange-600 mb-2" />
              <p className="text-xs text-text-muted mb-3">No slides yet — start building your carousel!</p>
            </div>
          )}

          {slides.map((slide, idx) => (
            <CarouselSlide
              key={idx}
              slide={slide}
              index={idx}
              onUpdate={(field, val) => updateSlide(idx, field, val)}
              onDelete={() => deleteSlide(idx)}
            />
          ))}

          <button
            onClick={addSlide}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                       border-2 border-dashed border-orange-200 dark:border-orange-700/50
                       text-xs font-medium text-orange-600 dark:text-orange-400
                       hover:bg-orange-50/50 dark:hover:bg-orange-900/20
                       hover:border-orange-300 dark:hover:border-orange-600
                       transition-all duration-200 group"
          >
            <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform duration-300" />
            Add Slide
          </button>
        </div>
      )}
    </div>
  )
}

function NoteField({ field, value, onChange }) {
  const Icon = field.icon
  const [expanded, setExpanded] = useState(!!value)

  return (
    <div className={`rounded-xl border ${field.border} overflow-hidden transition-all duration-200`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between px-3 py-2.5 ${field.bg} hover:opacity-80 transition-colors`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Icon className={`w-4 h-4 ${field.color} shrink-0`} />
          <span className="text-xs font-semibold text-text">{field.label}</span>
          {value && (
            <span className="text-[10px] text-text-muted bg-white/60 dark:bg-surface-hover/60 px-1.5 py-0.5 rounded truncate max-w-[120px]">
              {value.length > 20 ? value.slice(0, 20) + '...' : value}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-text-muted" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
        )}
      </button>
      {expanded && (
        <div className="px-3 py-3 bg-surface">
          <textarea
            value={value || ''}
            onChange={(e) => onChange(field.key, e.target.value)}
            placeholder={`Write your ${field.label.toLowerCase()} here...`}
            rows={4}
            className="w-full text-sm text-text bg-transparent border-none outline-none resize-none
                       placeholder:text-text-muted leading-relaxed"
          />
        </div>
      )}
    </div>
  )
}

function SceneCard({ scene, index, onUpdate, onDelete, onAddChecklist, onToggleChecklist, onDeleteChecklist, onSaveTemplate, onDragStart, onDragOver, onDrop, onDragEnd, isDragging, isDropTarget }) {
  const [expanded, setExpanded] = useState(true)
  const [newItem, setNewItem] = useState('')
  const [saved, setSaved] = useState(false)
  const savedTimerRef = useRef(null)
  const checklist = scene.checklist || []
  const doneCount = checklist.filter(c => c.done).length
  const imageRefs = scene.imageRefs || []
  const hasContent = scene.script || scene.camera || scene.cameraAngle || scene.shotType || scene.location || scene.duration || scene.editing || imageRefs.length > 0 || checklist.length > 0

  useEffect(() => {
    return () => clearTimeout(savedTimerRef.current)
  }, [])

  const handleSaveTemplate = () => {
    const name = scene.scene || `Scene ${index + 1}`
    onSaveTemplate({
      name,
      script: scene.script,
      cameraAngle: scene.cameraAngle,
      shotType: scene.shotType,
      location: scene.location,
      duration: scene.duration || '',
      editing: scene.editing || '',
      imageRefs: scene.imageRefs || [],
      checklist: scene.checklist || []
    })
    setSaved(true)
    clearTimeout(savedTimerRef.current)
    savedTimerRef.current = setTimeout(() => setSaved(false), 1500)
  }

  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', String(index))
    e.dataTransfer.effectAllowed = 'move'
    requestAnimationFrame(() => onDragStart(index))
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    onDragOver(index, e.clientY)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const fromIdx = parseInt(e.dataTransfer.getData('text/plain'))
    if (!isNaN(fromIdx) && fromIdx !== index) {
      onDrop(fromIdx, index)
    }
  }

  const handleDragEnd = () => onDragEnd()

  return (
    <div
      className={`rounded-xl border bg-surface-muted overflow-hidden transition-all duration-200 group/scene
        ${isDragging
          ? 'opacity-40 scale-[0.97] border-indigo-400 dark:border-indigo-500 shadow-lg shadow-indigo-200/30 dark:shadow-indigo-800/40'
          : 'border-border'
        }
        ${isDropTarget === 'before' ? 'mt-1 border-t-2 border-t-indigo-500' : ''}
        ${isDropTarget === 'after' ? 'mb-1 border-b-2 border-b-indigo-500' : ''}
        ${!isDragging ? 'hover:border-indigo-200 dark:hover:border-indigo-700' : ''}
      `}
      draggable={!saved}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
    >
      {/* Scene Header */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-surface border-b border-border">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="cursor-grab active:cursor-grabbing p-0.5 rounded text-text-muted hover:text-indigo-500
                       hover:bg-indigo-50 dark:hover:text-indigo-400 dark:hover:bg-indigo-900/30
                       transition-colors duration-150 shrink-0"
            onMouseDown={(e) => e.stopPropagation()}
            title="Drag to reorder scene"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </span>
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
            Scene {scene.scene}
          </span>
          {hasContent && (
            <span className="text-[10px] text-text-muted truncate flex items-center gap-1">
              {scene.script && '📝'}
              {(scene.cameraAngle || scene.shotType) && '🎥'}
              {scene.location && '📍'}
              {scene.duration && `⏱️${scene.duration}`}
              {scene.editing && '✂️'}
              {imageRefs.length > 0 && `🖼️${imageRefs.length}`}
              {checklist.length > 0 && `✓${doneCount}/${checklist.length}`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <div className="flex items-center gap-0.5 opacity-0 group-hover/scene:opacity-100 transition-opacity duration-150">
            {saved ? (
              <span className="px-1.5 py-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                Saved!
              </span>
            ) : (
              <button
                onClick={handleSaveTemplate}
                className="p-1 rounded-lg text-text-muted hover:text-indigo-500 hover:bg-indigo-50
                           dark:hover:bg-indigo-900/30 transition-all"
                title="Save as template"
              >
                <Bookmark className="w-3 h-3" />
              </button>
            )}
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded-lg text-text-muted hover:bg-surface-hover transition-all"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          <button
            onClick={onDelete}
            className="p-1 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Scene Number */}
            <div>
              <label className="text-[10px] font-medium text-text-muted mb-1 block">Scene Number</label>
              <input
                type="text"
                value={scene.scene}
                onChange={(e) => onUpdate('scene', e.target.value)}
                className="w-full text-sm bg-surface border border-border rounded-lg px-3 py-1.5
                           text-text outline-none focus:border-indigo-400 transition-colors"
              />
            </div>
            {/* Duration */}
            <div>
              <label className="text-[10px] font-medium text-text-muted mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Duration
              </label>
              <input
                type="text"
                value={scene.duration || ''}
                onChange={(e) => onUpdate('duration', e.target.value)}
                placeholder="e.g. 0:30, 1:00, 2:15..."
                className="w-full text-sm bg-surface border border-border rounded-lg px-3 py-1.5
                           text-text outline-none focus:border-indigo-400 transition-colors
                           placeholder:text-text-muted"
              />
            </div>
          </div>

          {/* Script */}
          <div>
            <label className="text-[10px] font-medium text-text-muted mb-1.5 flex items-center gap-1">
              <span>📝</span> Script / Dialog
            </label>
            <textarea
              value={scene.script || ''}
              onChange={(e) => onUpdate('script', e.target.value)}
              placeholder="Write the script or dialog for this scene..."
              rows={3}
              className="w-full text-sm bg-surface border border-border rounded-lg px-3 py-2
                         text-text outline-none focus:border-indigo-400 transition-colors
                         resize-none placeholder:text-text-muted"
            />
          </div>

          {/* Camera Angle */}
          <div>
            <label className="text-[10px] font-medium text-text-muted mb-1.5 flex items-center gap-1">
              <span>🎥</span> Camera Angle
            </label>
            <div className="relative">
              <input
                type="text"
                list="camera-angles"
                value={scene.cameraAngle || ''}
                onChange={(e) => onUpdate('cameraAngle', e.target.value)}
                placeholder="Select or type camera angle..."
                className="w-full text-sm bg-surface border border-border rounded-lg px-3 py-2
                           text-text outline-none focus:border-indigo-400 transition-colors
                           placeholder:text-text-muted"
              />
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
              <datalist id="camera-angles">
                <option value="45-Degree Angle" />
                <option value="Aerial / Top-Down" />
                <option value="Bird's Eye View" />
                <option value="Bottom Angle" />
                <option value="Canted Angle" />
                <option value="Dutch Angle / Tilted" />
                <option value="Eye Level" />
                <option value="Front / Straight Angle" />
                <option value="Ground Level" />
                <option value="High Angle" />
                <option value="Hip Level" />
                <option value="Low Angle" />
                <option value="Overhead Shot" />
                <option value="Profile Shot" />
                <option value="Rear / Over-the-Back" />
                <option value="Reverse Angle" />
                <option value="Shoulder Level" />
                <option value="Side Angle" />
                <option value="Three-Quarter Angle" />
                <option value="Top Angle" />
                <option value="Worm's Eye View" />
              </datalist>
            </div>
          </div>

          {/* Shot Type */}
          <div>
            <label className="text-[10px] font-medium text-text-muted mb-1.5 flex items-center gap-1">
              <span>📐</span> Shot Type
            </label>
            <div className="relative">
              <input
                type="text"
                list="shot-types"
                value={scene.shotType || ''}
                onChange={(e) => onUpdate('shotType', e.target.value)}
                placeholder="Select or type shot type..."
                className="w-full text-sm bg-surface border border-border rounded-lg px-3 py-2
                           text-text outline-none focus:border-indigo-400 transition-colors
                           placeholder:text-text-muted"
              />
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
              <datalist id="shot-types">
                <option value="B-Roll" />
                <option value="Close-Up (CU)" />
                <option value="Cowboy Shot" />
                <option value="Crane Shot" />
                <option value="Crash Zoom" />
                <option value="Cross-Cutting" />
                <option value="Cutaway" />
                <option value="Dissolve Shot" />
                <option value="Dolly / Tracking Shot" />
                <option value="Dutch Tilt" />
                <option value="Establishing Shot" />
                <option value="Extreme Close-Up (ECU)" />
                <option value="Extreme Wide Shot (EWS)" />
                <option value="Follow Shot" />
                <option value="Freeze Frame" />
                <option value="Handheld Shot" />
                <option value="Insert Shot" />
                <option value="Jump Cut" />
                <option value="Long Shot (LS)" />
                <option value="Macro Shot" />
                <option value="Master Shot" />
                <option value="Match Cut" />
                <option value="Medium Close-Up (MCU)" />
                <option value="Medium Shot (MS)" />
                <option value="Montage" />
                <option value="Over-the-Shoulder (OTS)" />
                <option value="Pan Shot" />
                <option value="Pickup Shot" />
                <option value="Point of View (POV)" />
                <option value="Pull Focus / Rack Focus" />
                <option value="Reaction Shot" />
                <option value="Reverse Shot" />
                <option value="Slow Motion" />
                <option value="Split Screen" />
                <option value="Steadicam Shot" />
                <option value="Tilt Shot" />
                <option value="Time-Lapse" />
                <option value="Two-Shot" />
                <option value="Whip Pan" />
                <option value="Wide Shot (WS)" />
                <option value="Wipe Shot" />
                <option value="Zoom Shot" />
              </datalist>
            </div>
          </div>

          {/* Image References */}
          <SceneImageReferences
            imageRefs={imageRefs}
            onAdd={(url) => onUpdate('imageRefs', [...imageRefs, url])}
            onDelete={(idx) => onUpdate('imageRefs', imageRefs.filter((_, i) => i !== idx))}
          />

          {/* Location / Setting */}
          <div>
            <label className="text-[10px] font-medium text-text-muted mb-1.5 flex items-center gap-1">
              <span>📍</span> Location / Setting
            </label>
            <div className="relative">
              <input
                type="text"
                list="scene-locations"
                value={scene.location || ''}
                onChange={(e) => onUpdate('location', e.target.value)}
                placeholder="Select or type location..."
                className="w-full text-sm bg-surface border border-border rounded-lg px-3 py-2
                           text-text outline-none focus:border-indigo-400 transition-colors
                           placeholder:text-text-muted"
              />
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
              <datalist id="scene-locations">
                <option value="Indoor Studio" />
                <option value="Outdoor Location" />
                <option value="Office" />
                <option value="Home / Interior" />
                <option value="Street / Urban" />
                <option value="Nature / Park" />
                <option value="Beach / Waterfront" />
                <option value="Cafe / Restaurant" />
                <option value="Car / Vehicle" />
                <option value="Rooftop" />
                <option value="Warehouse" />
                <option value="Green Screen / Virtual" />
                <option value="Night Scene" />
                <option value="Bathroom" />
                <option value="Bedroom" />
                <option value="Kitchen" />
                <option value="Living Room" />
              </datalist>
            </div>
          </div>

          {/* Production Checklist */}
          <div>
            <label className="text-[10px] font-medium text-text-muted mb-1.5 block">Production Checklist</label>
            <div className="space-y-1">
              {checklist.map((item, ci) => (
                <div key={ci} className="flex items-start gap-2 group/item py-1 px-1 rounded-lg hover:bg-surface-hover/50 transition-colors">
                  <button
                    onClick={() => onToggleChecklist(ci)}
                    className={`mt-0.5 w-4 h-4 min-w-[16px] rounded border-2 flex items-center justify-center
                               shrink-0 transition-all duration-150 active:scale-90
                      ${item.done
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                        : 'border-text-muted/40 hover:border-indigo-400 hover:bg-indigo-50/50'
                      }`}
                  >
                    {item.done && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                  </button>
                  <span className={`text-sm flex-1 pt-0.5 leading-relaxed ${
                    item.done ? 'line-through text-text-muted/60' : 'text-text'
                  }`}>
                    {item.text}
                  </span>
                  <button
                    onClick={() => onDeleteChecklist(ci)}
                    className="opacity-0 group-hover/item:opacity-100 p-0.5 rounded text-text-muted hover:text-red-500 transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-1.5 pl-1">
                <input
                  type="text"
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newItem.trim()) {
                      e.preventDefault()
                      onAddChecklist(newItem.trim())
                      setNewItem('')
                    }
                  }}
                  placeholder="Add production item..."
                  className="flex-1 text-sm bg-transparent border-none outline-none text-text placeholder:text-text-muted"
                />
                {newItem.trim() && (
                  <button
                    onClick={() => { onAddChecklist(newItem.trim()); setNewItem('') }}
                    className="shrink-0 px-2.5 py-1 text-xs font-medium text-white
                               bg-indigo-600 hover:bg-indigo-700 rounded-lg
                               transition-all duration-150 active:scale-95"
                  >
                    Add
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Editing Notes */}
          <div>
            <label className="text-[10px] font-medium text-text-muted mb-1.5 flex items-center gap-1">
              <Scissors className="w-3 h-3 text-rose-500" />
              <span>Editing Notes</span>
              {scene.editing && <span className="text-[9px] text-rose-400 font-medium">✂️</span>}
            </label>
            <textarea
              value={scene.editing || ''}
              onChange={(e) => onUpdate('editing', e.target.value)}
              placeholder="Editing instructions, cuts, transitions, color grading, etc..."
              rows={3}
              className="w-full text-sm bg-surface border border-rose-200 dark:border-rose-700/50 rounded-lg px-3 py-2
                         text-text outline-none focus:border-rose-400 transition-colors
                         resize-none placeholder:text-text-muted"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function SceneField({ value, onChange }) {
  const [expanded, setExpanded] = useState(!!(value && value !== '[]'))
  const [templates, setTemplates] = useState(loadTemplates)
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [sceneDragState, setSceneDragState] = useState({ draggedIndex: null, targetIndex: null, position: null })
  const pickerRef = useRef(null)

  // Parse scenes
  let scenes = []
  let totalChecklist = 0
  let doneChecklist = 0
  try {
    scenes = JSON.parse(value || '[]')
    if (!Array.isArray(scenes)) scenes = []
    scenes.forEach(s => {
      if (s.checklist && Array.isArray(s.checklist)) {
        s.checklist.forEach(c => { if (c.done) doneChecklist++ })
        totalChecklist += s.checklist.length
      }
    })
  } catch { scenes = [] }

  const saveScenes = (newScenes) => {
    onChange('scenes', newScenes.length > 0 ? JSON.stringify(newScenes) : '')
  }

  const addScene = (templateData) => {
    const newScene = templateData
      ? {
          scene: String(scenes.length + 1),
          script: templateData.script || '',
          cameraAngle: templateData.cameraAngle || '',
          shotType: templateData.shotType || '',
          location: templateData.location || '',
          duration: templateData.duration || '',
          editing: templateData.editing || '',
          imageRefs: templateData.imageRefs || [],
          checklist: (templateData.checklist || []).map(c => ({ text: c.text, done: false }))
        }
      : {
          scene: String(scenes.length + 1),
          script: '',
          cameraAngle: '',
          shotType: '',
          location: '',
          duration: '',
          editing: '',
          imageRefs: [],
          checklist: []
        }
    saveScenes([...scenes, newScene])
    setShowTemplatePicker(false)
  }

  const deleteScene = (index) => {
    const updated = scenes
      .filter((_, i) => i !== index)
      .map((s, i) => ({ ...s, scene: String(i + 1) }))
    saveScenes(updated)
    setSceneDragState({ draggedIndex: null, targetIndex: null, position: null })
  }

  const updateSceneField = (index, field, val) => {
    const updated = scenes.map((s, i) =>
      i === index ? { ...s, [field]: val } : s
    )
    saveScenes(updated)
  }

  const addChecklistItem = (sceneIndex, text) => {
    const updated = scenes.map((s, i) =>
      i === sceneIndex
        ? { ...s, checklist: [...(s.checklist || []), { text, done: false }] }
        : s
    )
    saveScenes(updated)
  }

  const toggleChecklistItem = (sceneIndex, itemIndex) => {
    const updated = scenes.map((s, i) =>
      i === sceneIndex
        ? {
            ...s,
            checklist: s.checklist.map((c, j) =>
              j === itemIndex ? { ...c, done: !c.done } : c
            )
          }
        : s
    )
    saveScenes(updated)
  }

  const deleteChecklistItem = (sceneIndex, itemIndex) => {
    const updated = scenes.map((s, i) =>
      i === sceneIndex
        ? { ...s, checklist: s.checklist.filter((_, j) => j !== itemIndex) }
        : s
    )
    saveScenes(updated)
  }

  // ── Scene Drag & Drop ──
  const handleSceneDragStart = useCallback((index) => {
    setSceneDragState(prev => ({ ...prev, draggedIndex: index }))
  }, [])

  const handleSceneDragOver = useCallback((targetIndex, clientY) => {
    setSceneDragState(prev => {
      if (prev.draggedIndex === targetIndex) return { ...prev, targetIndex: null, position: null }
      // Estimate position based on mouse Y
      const cards = document.querySelectorAll('[data-scene-index]')
      const targetEl = cards[targetIndex]
      if (!targetEl) return { ...prev, targetIndex, position: 'after' }
      const rect = targetEl.getBoundingClientRect()
      const midY = rect.top + rect.height / 2
      return { ...prev, targetIndex, position: clientY < midY ? 'before' : 'after' }
    })
  }, [])

  const handleSceneDrop = useCallback((fromIndex, toIndex) => {
    const { position } = sceneDragState
    if (fromIndex === toIndex) {
      setSceneDragState({ draggedIndex: null, targetIndex: null, position: null })
      return
    }
    let newIndex
    if (fromIndex < toIndex) {
      newIndex = position === 'before' ? toIndex - 1 : toIndex
    } else {
      newIndex = position === 'after' ? toIndex + 1 : toIndex
    }
    newIndex = Math.max(0, Math.min(scenes.length - 1, newIndex))
    if (newIndex !== fromIndex) {
      const updated = [...scenes]
      const [moved] = updated.splice(fromIndex, 1)
      updated.splice(newIndex, 0, moved)
      const renumbered = updated.map((s, i) => ({ ...s, scene: String(i + 1) }))
      saveScenes(renumbered)
    }
    setSceneDragState({ draggedIndex: null, targetIndex: null, position: null })
  }, [scenes, sceneDragState])

  const handleSceneDragEnd = useCallback(() => {
    setSceneDragState({ draggedIndex: null, targetIndex: null, position: null })
  }, [])

  const handleSaveTemplate = (templateData) => {
    const existing = loadTemplates()
    const newTemplate = {
      id: `tpl_${Date.now()}`,
      name: templateData.name || 'Untitled',
      script: templateData.script || '',
      cameraAngle: templateData.cameraAngle || '',
      shotType: templateData.shotType || '',
      location: templateData.location || '',
      duration: templateData.duration || '',
      editing: templateData.editing || '',
      imageRefs: templateData.imageRefs || [],
      checklist: (templateData.checklist || []).map(c => ({ text: c.text, done: false })),
      createdAt: new Date().toISOString()
    }
    const updated = [...existing, newTemplate]
    saveTemplates(updated)
    setTemplates(updated)
  }

  const handleDeleteTemplate = (templateId) => {
    const updated = templates.filter(t => t.id !== templateId)
    saveTemplates(updated)
    setTemplates(updated)
  }

  // Close picker on click outside
  useEffect(() => {
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowTemplatePicker(false)
      }
    }
    if (showTemplatePicker) {
      document.addEventListener('mousedown', handler)
      return () => document.removeEventListener('mousedown', handler)
    }
  }, [showTemplatePicker])

  const progressText = scenes.length > 0
    ? totalChecklist > 0
      ? `✓ ${doneChecklist}/${totalChecklist}`
      : `${scenes.length} scene${scenes.length > 1 ? 's' : ''}`
    : ''

  return (
    <div className="rounded-xl border border-indigo-200 dark:border-indigo-700/50 overflow-hidden transition-all duration-200">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2.5
                   bg-indigo-50 dark:bg-indigo-900/30 hover:opacity-80 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Clapperboard className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
          <span className="text-xs font-semibold text-text">Scene Production</span>
          {progressText && (
            <span className="text-[10px] text-text-muted bg-white/60 dark:bg-surface-hover/60 px-1.5 py-0.5 rounded-full">
              {progressText}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-text-muted shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-text-muted shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="p-3 space-y-3 bg-surface">
          {scenes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Clapperboard className="w-8 h-8 text-indigo-300 dark:text-indigo-600 mb-2" />
              <p className="text-xs text-text-muted mb-3">No scenes yet — start planning your production!</p>
            </div>
          )}

          {scenes.map((scene, idx) => {
            const isDragging = sceneDragState.draggedIndex === idx
            const isDropTarget = !isDragging && sceneDragState.targetIndex === idx ? sceneDragState.position : null

            return (
              <div key={idx} data-scene-index={idx}>
                <SceneCard
                  scene={scene}
                  index={idx}
                  onUpdate={(field, val) => updateSceneField(idx, field, val)}
                  onDelete={() => deleteScene(idx)}
                  onSaveTemplate={handleSaveTemplate}
                  onAddChecklist={(text) => addChecklistItem(idx, text)}
                  onToggleChecklist={(itemIdx) => toggleChecklistItem(idx, itemIdx)}
                  onDeleteChecklist={(itemIdx) => deleteChecklistItem(idx, itemIdx)}
                  onDragStart={handleSceneDragStart}
                  onDragOver={handleSceneDragOver}
                  onDrop={handleSceneDrop}
                  onDragEnd={handleSceneDragEnd}
                  isDragging={isDragging}
                  isDropTarget={isDropTarget}
                />
              </div>
            )
          })}

          {/* Add Scene & Templates */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => addScene()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
                         border-2 border-dashed border-indigo-200 dark:border-indigo-700/50
                         text-xs font-medium text-indigo-600 dark:text-indigo-400
                         hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20
                         hover:border-indigo-300 dark:hover:border-indigo-600
                         transition-all duration-200 group"
            >
              <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform duration-300" />
              Add Scene
            </button>
            <div className="relative" ref={pickerRef}>
              <button
                onClick={() => setShowTemplatePicker(!showTemplatePicker)}
                className={'flex items-center gap-1.5 px-3 py-2.5 rounded-xl border-2 text-xs font-medium ' +
                  'transition-all duration-200 whitespace-nowrap ' +
                  (showTemplatePicker
                    ? 'border-indigo-400 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                    : 'border-indigo-200 dark:border-indigo-700/50 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 hover:border-indigo-300')}
              >
                <Bookmark className={`w-3.5 h-3.5 ${templates.length === 0 ? 'opacity-40' : ''}`} />
                Templates
                {templates.length > 0 && (
                  <span className="text-[10px] font-bold bg-indigo-200 dark:bg-indigo-700 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded-full">
                    {templates.length}
                  </span>
                )}
              </button>

              {/* Template Picker Dropdown */}
              {showTemplatePicker && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-surface border border-border rounded-xl
                                shadow-lg shadow-black/10 z-50 overflow-hidden">
                  <div className="px-3 py-2 border-b border-border-light flex items-center justify-between">
                    <span className="text-xs font-semibold text-text">Scene Templates</span>
                    <button
                      onClick={() => setShowTemplatePicker(false)}
                      className="p-0.5 rounded text-text-muted hover:text-text hover:bg-surface-hover"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  {templates.length === 0 ? (
                    <div className="px-3 py-6 text-center">
                      <Bookmark className="w-6 h-6 text-text-muted/50 mx-auto mb-2" />
                      <p className="text-xs text-text-muted">
                        No templates yet.<br />
                        Hover a scene and click 💾 to save it as a template.
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto p-1 space-y-0.5">
                      {templates.map(tpl => (
                        <div
                          key={tpl.id}
                          className="group/tpl flex items-center gap-2 px-2 py-2 rounded-lg
                                     hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer
                                     transition-colors"
                          onClick={() => {
                            addScene(tpl)
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-text truncate">{tpl.name}</div>
                            <div className="text-[10px] text-text-muted truncate mt-0.5">
                              {tpl.script ? `📝 ${tpl.script.slice(0, 40)}` : ''}
                              {(tpl.cameraAngle || tpl.shotType) ? `${tpl.script ? ' · ' : ''}🎥 ${(tpl.cameraAngle || tpl.shotType || '').slice(0, 30)}` : ''}
                              {tpl.location ? `${(tpl.script || tpl.cameraAngle || tpl.shotType) ? ' · ' : ''}📍 ${tpl.location.slice(0, 25)}` : ''}
                              {tpl.duration ? `${(tpl.script || tpl.cameraAngle || tpl.shotType || tpl.location) ? ' · ' : ''}⏱️${tpl.duration}` : ''}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteTemplate(tpl.id)
                            }}
                            className="p-1 rounded-lg opacity-0 group-hover/tpl:opacity-100
                                       text-text-muted hover:text-red-500 hover:bg-red-50
                                       dark:hover:bg-red-900/30 transition-all shrink-0"
                            title="Delete template"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Multi-Reference Component ──
function MultiReference({ primaryUrl, refsJson, onUpdateRefs, hasUrl }) {
  const [expanded, setExpanded] = useState(true)
  const [newRefUrl, setNewRefUrl] = useState('')
  const [showInput, setShowInput] = useState(false)
  const inputRef = useRef(null)

  // Parse refs JSON
  const refs = (() => { try { const r = JSON.parse(refsJson || '[]'); return Array.isArray(r) ? r : [] } catch { return [] } })()
  const totalCount = (hasUrl ? 1 : 0) + refs.length

  useEffect(() => {
    if (showInput) inputRef.current?.focus()
  }, [showInput])

  const addRef = () => {
    const url = newRefUrl.trim()
    if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) return
    onUpdateRefs(JSON.stringify([...refs, url]))
    setNewRefUrl('')
    setShowInput(false)
  }

  const deleteRef = (idx) => {
    onUpdateRefs(JSON.stringify(refs.filter((_, i) => i !== idx)))
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden transition-all duration-200">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2
                   bg-surface hover:bg-surface-hover transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <svg className="w-4 h-4 text-primary-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          <span className="text-xs font-semibold text-text">Reference</span>
          {totalCount > 0 && (
            <span className="text-[10px] text-text-muted bg-white/60 dark:bg-surface-hover/60 px-1.5 py-0.5 rounded-full">
              {totalCount}
            </span>
          )}
          {!expanded && totalCount > 0 && (
            <span className="text-[10px] text-text-muted truncate max-w-[120px]">
              {hasUrl ? primaryUrl?.length > 30 ? primaryUrl.slice(0, 30) + '...' : primaryUrl : `${refs.length} more`}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-text-muted shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-text-muted shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="bg-surface-muted">
          {/* Primary URL embed */}
          {hasUrl && (
            <div className="border-b border-border last:border-b-0">
              <VideoEmbed url={primaryUrl} />
            </div>
          )}

          {/* Additional refs */}
          {refs.map((refUrl, idx) => (
            <RefEmbed
              key={idx}
              url={refUrl}
              index={idx}
              onDelete={() => deleteRef(idx)}
            />
          ))}

          {/* Add ref input */}
          <div className="p-3 border-t border-border">
            {showInput ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-surface">
                  <Link className="w-3.5 h-3.5 text-text-muted shrink-0" />
                  <input
                    ref={inputRef}
                    type="url"
                    value={newRefUrl}
                    onChange={(e) => setNewRefUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); addRef() }
                      if (e.key === 'Escape') { setShowInput(false); setNewRefUrl('') }
                    }}
                    placeholder="Paste reference URL..."
                    className="flex-1 text-xs bg-transparent border-none outline-none text-text placeholder:text-text-muted"
                  />
                </div>
                <button
                  onClick={addRef}
                  disabled={!newRefUrl.trim()}
                  className="shrink-0 px-3 py-1.5 text-xs font-medium text-white
                             bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-700
                             disabled:text-gray-500 rounded-lg transition-all duration-150 active:scale-95"
                >
                  Add
                </button>
                <button
                  onClick={() => { setShowInput(false); setNewRefUrl('') }}
                  className="shrink-0 p-1.5 text-text-muted hover:text-text hover:bg-surface-hover rounded-lg transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowInput(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg
                           border-2 border-dashed border-primary-200 dark:border-primary-700/50
                           text-[11px] font-medium text-primary-600 dark:text-primary-400
                           hover:bg-primary-50/50 dark:hover:bg-primary-900/20
                           hover:border-primary-300 dark:hover:border-primary-600
                           transition-all duration-200"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Reference
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Single Ref Embed (mini collapsible for additional refs) ──
function RefEmbed({ url, index, onDelete }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="border-b border-border last:border-b-0 group/ref">
      <div className="flex items-center justify-between px-3 py-1.5 bg-surface/50 border-b border-border">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 min-w-0 flex-1"
        >
          <span className="text-[10px] font-medium text-text-muted bg-surface-muted px-1.5 py-0.5 rounded shrink-0">
            #{index + 2}
          </span>
          <span className="text-[11px] text-text truncate min-w-0">
            {url.length > 40 ? url.slice(0, 40) + '...' : url}
          </span>
          {expanded ? <ChevronUp className="w-3 h-3 text-text-muted shrink-0 ml-auto" /> : <ChevronDown className="w-3 h-3 text-text-muted shrink-0 ml-auto" />}
        </button>
        <button
          onClick={onDelete}
          className="ml-1 p-1 rounded text-text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30
                     opacity-0 group-hover/ref:opacity-100 transition-all shrink-0"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      {expanded && (
        <div className="bg-surface-muted">
          <VideoEmbed url={url} />
        </div>
      )}
    </div>
  )
}

function VideoCard({ entry, onUpdate, onDelete, index, onDragStart, onDragOver, onDragEnd, onDrop, isDragging, isDropTarget }) {
  const [collapsed, setCollapsed] = useState(true)
  const video = parseVideoUrl(entry.url)
  const hasNotes = entry.scenes || entry.carousel || entry.strategy || entry.notes || entry.concept || entry.headline
  const isCarousel = entry.contentType === 'carousel'
  const hasUrl = !!(entry.url && entry.url.trim())


  // Helper to get collapsed preview text
  const getCollapsedPreview = () => {
    // Headline is always shown as primary preview
    if (entry.headline) return `💡 ${entry.headline}`
    if (entry.notes) return entry.notes
    if (entry.concept) return entry.concept
    // Content Strategy preview
    if (entry.strategy) {
      try {
        const s = JSON.parse(entry.strategy)
        const parts = []
        if (s.keyMessage) parts.push(`💎 ${s.keyMessage.slice(0, 20)}`)
        if (s.hooks?.length) parts.push(`💬 ${s.hooks.length}`)
        if (s.storytelling?.length) parts.push(`📖 ${s.storytelling.length}`)
        if (s.cta) parts.push(`🚀`)
        if (s.hashtags?.length) parts.push(`#${s.hashtags.length}`)
        if (parts.length > 0) return parts.join(' · ')
      } catch {}
    }
    // Carousel
    if (isCarousel && entry.carousel) {
      try {
        const slides = JSON.parse(entry.carousel)
        if (Array.isArray(slides) && slides.length > 0) {
          return `📷 ${slides.length} slide${slides.length > 1 ? 's' : ''}`
        }
      } catch {}
    }
    // Scenes
    if (entry.scenes) {
      try {
        const parsed = JSON.parse(entry.scenes)
        if (Array.isArray(parsed) && parsed.length > 0) {
          let total = 0, done = 0
          parsed.forEach(s => {
            if (s.checklist) {
              s.checklist.forEach(c => { if (c.done) done++; total++ })
            }
          })
          return total > 0 ? `🎬 ${done}/${total}` : `🎬 ${parsed.length} scenes`
        }
      } catch {}
    }
    return ''
  }

  const updateField = (key, value) => {
    onUpdate(entry.id, { [key]: value })
  }

  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', entry.id)
    e.dataTransfer.effectAllowed = 'move'
    requestAnimationFrame(() => {
      onDragStart(entry.id)
    })
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    onDragOver(entry.id, e.clientY)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const draggedId = e.dataTransfer.getData('text/plain')
    if (draggedId !== entry.id) {
      onDrop(draggedId, entry.id)
    }
  }

  const handleDragEnd = () => {
    onDragEnd()
  }

  return (
    <div
      className={`
        bg-surface rounded-xl border overflow-hidden card-shadow
        transition-all duration-200
        ${isDragging
          ? 'opacity-40 scale-[0.97] border-primary-400 dark:border-primary-500 shadow-lg shadow-primary-200/30 dark:shadow-primary-800/40'
          : collapsed ? 'border-border' : 'hover:card-shadow-hover border-border'
        }
        ${collapsed ? 'hover:bg-surface-hover/50 cursor-pointer' : ''}
        ${isDropTarget === 'before' ? 'border-t-2 border-t-primary-500' : ''}
        ${isDropTarget === 'after' ? 'border-b-2 border-b-primary-500' : ''}
      `}
      onClick={() => setCollapsed(!collapsed)}
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
    >
      {/* Collapsed: minimal row view */}
      {collapsed ? (
        <div className="px-3 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span
              className="cursor-grab active:cursor-grabbing p-0.5 rounded
                         text-text-muted hover:text-primary-500 hover:bg-primary-50
                         dark:hover:text-primary-400 dark:hover:bg-primary-900/30
                         transition-colors duration-150"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              title="Drag to reorder"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </span>
            <span className="text-[10px] font-semibold text-text-muted bg-surface-muted px-2 py-0.5 rounded-full shrink-0">
              #{index + 1}
            </span>
            {isCarousel ? (
              <span className="text-[10px] font-medium shrink-0 px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center gap-1">
                📷 Carousel
              </span>
            ) : (
              <span className="text-[10px] font-medium shrink-0 px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                🎬 Reel / Shorts
              </span>
            )}
            {hasNotes && (
              <span className="text-xs text-text truncate min-w-0">
                {getCollapsedPreview()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            <a
              href={entry.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded-lg text-text-muted hover:text-primary-600 hover:bg-primary-50 transition-all"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(entry.id) }}
              className="p-1 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 transition-all"
            >
              <Trash2 className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setCollapsed(false) }}
              className="p-1 rounded-lg text-primary-500 hover:bg-primary-50 transition-all"
              title="Expand"
            >
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Entry Header - Top */}
          <div className="px-3 pt-3 pb-2 border-b border-border-light">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="cursor-grab active:cursor-grabbing p-0.5 rounded
                             text-text-muted hover:text-primary-500 hover:bg-primary-50
                             dark:hover:text-primary-400 dark:hover:bg-primary-900/30
                             transition-colors duration-150"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  title="Drag to reorder"
                >
                  <GripVertical className="w-3.5 h-3.5" />
                </span>
                <span className="text-[10px] font-semibold text-text-muted bg-surface-muted px-2 py-0.5 rounded-full shrink-0">
                  #{index + 1}
                </span>
                {isCarousel ? (
                  <span className="text-xs font-semibold truncate min-w-0 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full">
                    📷 Carousel
                  </span>
                ) : (
                  <span className="text-xs font-semibold truncate min-w-0 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                    🎬 Reel / Shorts
                  </span>
                )}
                {/* Headline title — beside badge */}
                {entry.headline && (
                  <span className="text-sm font-semibold text-text truncate min-w-0" onClick={(e) => e.stopPropagation()}>
                    💡 {entry.headline}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                <a
                  href={entry.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded-lg text-text-muted hover:text-primary-600 hover:bg-primary-50 transition-all"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  onClick={() => onDelete(entry.id)}
                  className="p-1 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setCollapsed(true)}
                  className="p-1 rounded-lg text-text-muted hover:text-primary-600 hover:bg-primary-50 transition-all"
                  title="Collapse"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Concept (above video embed) */}
          <div className="px-3 pb-0" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-1.5">
              {NOTE_FIELDS.slice(0, 1).map(field => (
                <NoteField
                  key={field.key}
                  field={field}
                  value={entry[field.key]}
                  onChange={updateField}
                />
              ))}
            </div>
          </div>

          {/* Reference — collapsible, multi-URL */}
          <div className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
            <MultiReference
              primaryUrl={entry.url}
              refsJson={entry.refs}
              onUpdateRefs={(refs) => updateField('refs', refs)}
              hasUrl={hasUrl}
            />
          </div>

          {/* Notes Section - ordered: Content Strategy → Scenes / Carousel → Notes */}
          <div className="p-3 space-y-1.5" onClick={(e) => e.stopPropagation()}>
            {/* Content Strategy (hidden for carousel) */}
            {!isCarousel && (
              <ContentStrategy
                value={entry.strategy}
                onChange={updateField}
              />
            )}
            {/* Scene Production (for reel/shorts) or Carousel Canvas (for carousel) */}
            {isCarousel ? (
              <CarouselCanvas
                value={entry.carousel}
                onChange={updateField}
              />
            ) : (
              <SceneField
                value={entry.scenes}
                onChange={updateField}
              />
            )}
            {/* Notes */}
            {NOTE_FIELDS.slice(1).map(field => (
              <NoteField
                key={field.key}
                field={field}
                value={entry[field.key]}
                onChange={updateField}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function DaySidebar({ date, entries, onAddEntry, onUpdateEntry, onDeleteEntry, onReorderEntry, onClose }) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [dragState, setDragState] = useState({ draggedId: null, targetId: null, position: null })
  const dateStr = format(date, 'EEEE, MMMM d, yyyy')

  // Close on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // ── Drag & Drop ──
  const handleDragStart = useCallback((id) => {
    setDragState(prev => ({ ...prev, draggedId: id }))
  }, [])

  const handleDragOver = useCallback((targetId, clientY) => {
    setDragState(prev => {
      if (prev.draggedId === targetId) return { ...prev, targetId: null, position: null }
      const targetEl = document.querySelector(`[data-entry-id="${targetId}"]`)
      if (!targetEl) return { ...prev, targetId, position: 'after' }
      const rect = targetEl.getBoundingClientRect()
      const midY = rect.top + rect.height / 2
      return { ...prev, targetId, position: clientY < midY ? 'before' : 'after' }
    })
  }, [])

  const handleDrop = useCallback((draggedId, targetId) => {
    const currentIndex = entries.findIndex(e => e.id === draggedId)
    const targetIndex = entries.findIndex(e => e.id === targetId)
    if (currentIndex === -1 || targetIndex === -1) {
      setDragState({ draggedId: null, targetId: null, position: null })
      return
    }
    const { position } = dragState
    let newIndex
    if (currentIndex < targetIndex) {
      newIndex = position === 'before' ? targetIndex - 1 : targetIndex
    } else if (currentIndex > targetIndex) {
      newIndex = position === 'after' ? targetIndex + 1 : targetIndex
    } else {
      newIndex = currentIndex
    }
    newIndex = Math.max(0, Math.min(entries.length - 1, newIndex))
    if (newIndex !== currentIndex) {
      onReorderEntry(date, draggedId, newIndex)
    }
    setDragState({ draggedId: null, targetId: null, position: null })
  }, [entries, dragState, onReorderEntry, date])

  const handleDragEnd = useCallback(() => {
    setDragState({ draggedId: null, targetId: null, position: null })
  }, [])

  return (
    <aside
      className="
        w-full h-auto max-h-[calc(100vh-8rem)] shadow-lg border rounded-2xl
        bg-surface border-border
        shadow-black/10
        flex flex-col overflow-hidden
      "
    >
        {/* Header */}
        <div className="shrink-0 px-4 py-3 border-b border-border-light flex items-center justify-between bg-surface">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-text truncate">
              {format(date, 'MMMM d')}
            </h2>
            <p className="text-[11px] text-text-muted truncate">{dateStr}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-medium text-text-muted bg-surface-muted px-2 py-0.5 rounded-full">
              {entries.length}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover 
                         transition-all duration-150"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Add Video - fixed top section */}
        <div className="shrink-0 px-4 pt-3 pb-3 border-b border-border-light bg-surface">
          {/* Drag hint */}
          {dragState.draggedId && (
            <div className="flex items-center gap-2 px-3 py-2 bg-primary-50 dark:bg-primary-900/30
                            rounded-xl border border-primary-200 dark:border-primary-700/50 text-xs text-primary-700 dark:text-primary-300">
              <GripVertical className="w-3.5 h-3.5" />
              <span>Drag to reorder</span>
            </div>
          )}

          {/* Add Form or Button */}
          {showAddForm ? (
            <div className="bg-surface-muted rounded-xl p-3 border border-border">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-text">New Idea</h3>
                <button onClick={() => setShowAddForm(false)} className="text-xs text-text-muted hover:text-text">
                  Cancel
                </button>
              </div>
              <AddVideoForm
                onAdd={(entry) => {
                  onAddEntry(date, entry)
                  setShowAddForm(false)
                }}
              />
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl
                         border-2 border-dashed border-border hover:border-primary-300
                         text-text-muted hover:text-primary-600 hover:bg-primary-50/50
                         transition-all duration-200 group"
            >
              <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
              <span className="text-sm font-medium">Add Idea</span>
            </button>
          )}
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4 space-y-3">
          {/* Empty State */}
          {entries.length === 0 && !showAddForm && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center mb-3">
                <ExternalLink className="w-6 h-6 text-primary-400" />
              </div>
              <h3 className="text-sm font-semibold text-text mb-1">No content yet</h3>
              <p className="text-xs text-text-muted">
                Start by adding your first content idea!
              </p>
            </div>
          )}

          {/* Video Cards */}
          {entries.map((entry, idx) => {
            const isDragging = dragState.draggedId === entry.id
            const isDropTarget = !isDragging && dragState.targetId === entry.id ? dragState.position : null

            return (
              <div key={entry.id} data-entry-id={entry.id}>
                <VideoCard
                  entry={entry}
                  index={idx}
                  onUpdate={(id, updated) => onUpdateEntry(date, id, updated)}
                  onDelete={(id) => onDeleteEntry(date, id)}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  onDrop={handleDrop}
                  isDragging={isDragging}
                  isDropTarget={isDropTarget}
                />
              </div>
            )
          })}
        </div>
      </aside>
  )
}
