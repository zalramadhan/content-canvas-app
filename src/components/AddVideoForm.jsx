import { useState, useRef } from 'react'
import { isValidVideoUrl, parseVideoUrl, getPlatformName, PLATFORMS } from '../utils/videoParser'
import { Link, X, AlertCircle, Check, Video, Lightbulb } from 'lucide-react'

export default function AddVideoForm({ onAdd, onCancel, initialType = 'video' }) {
  const [headline, setHeadline] = useState('')
  const [contentType, setContentType] = useState(initialType)
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [focused, setFocused] = useState(false)
  const headlineRef = useRef(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmedHeadline = headline.trim()
    const trimmedUrl = url.trim()

    if (!trimmedHeadline) {
      setHeadline('')
      headlineRef.current?.focus()
      return
    }

    let parsed = null
    if (trimmedUrl) {
      if (!isValidVideoUrl(trimmedUrl)) {
        setError('URL tidak valid. Masukkan link YouTube, TikTok, Instagram, Pinterest, atau gambar.')
        return
      }
      parsed = parseVideoUrl(trimmedUrl)
    }

    onAdd({
      headline: trimmedHeadline,
      url: trimmedUrl || '',
      platform: parsed?.platform || 'unknown',
      platformId: parsed?.id || null,
      contentType,
      notes: '',
      concept: '',
      hook: '',
      strategy: '',
      scenes: '',
      carousel: '',
      editing: '',
    })
    setHeadline('')
    setUrl('')
    setError('')
    headlineRef.current?.focus()
  }

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').trim()
    if (isValidVideoUrl(pasted)) {
      setError('')
    }
  }

  const detected = url.trim() ? parseVideoUrl(url.trim()) : null

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Headline / Idea Title */}
      <div className="relative">
        <div
          className={`
            flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all duration-200
            ${focused && !headline.trim()
              ? 'border-amber-400 bg-amber-50/30 dark:bg-amber-900/20 shadow-sm shadow-amber-100 dark:shadow-amber-900/30'
              : 'border-border bg-surface hover:border-amber-200 dark:hover:border-amber-700'
            }
          `}
        >
          <Lightbulb className={`w-4 h-4 shrink-0 ${headline.trim() ? 'text-amber-500' : 'text-text-muted'}`} />
          <input
            ref={headlineRef}
            type="text"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="What's your idea? (required)"
            className="flex-1 text-sm bg-transparent border-none outline-none text-text 
                       placeholder:text-text-muted min-w-0 font-medium"
            autoFocus
          />
          {headline && (
            <button
              type="button"
              onClick={() => setHeadline('')}
              className="p-0.5 rounded hover:bg-surface-hover transition-colors"
            >
              <X className="w-3.5 h-3.5 text-text-muted" />
            </button>
          )}
        </div>
      </div>

      {/* Content Type Toggle */}
      <div className="flex items-center gap-1 p-0.5 bg-surface-muted rounded-lg">
        <button
          type="button"
          onClick={() => setContentType('video')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
                     transition-all duration-150 ${
            contentType === 'video'
              ? 'bg-surface text-text shadow-sm ring-1 ring-orange-200 dark:ring-orange-700'
              : 'text-text-muted hover:text-text'
          }`}
        >
          <Video className="w-3.5 h-3.5" />
          <span>Reel / Shorts</span>
        </button>
        <button
          type="button"
          onClick={() => setContentType('carousel')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
                     transition-all duration-150 ${
            contentType === 'carousel'
              ? 'bg-surface text-text shadow-sm ring-1 ring-orange-200 dark:ring-orange-700'
              : 'text-text-muted hover:text-text'
          }`}
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8M12 17v4" />
          </svg>
          <span>Carousel</span>
        </button>
      </div>

      {/* URL (opsional) */}
      <div className="relative">
        <div
          className={`
            flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-200
            ${error
              ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/20'
              : focused
                ? 'border-orange-400 bg-orange-50/30 dark:bg-orange-900/20'
                : 'border-border bg-surface hover:border-orange-200 dark:hover:border-orange-700'
            }
          `}
        >
          <Link className={`w-3.5 h-3.5 shrink-0 ${url ? 'text-orange-500' : 'text-text-muted/50'}`} />
          <input
            type="url"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError('') }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onPaste={handlePaste}
            placeholder={`Paste reference URL (optional) — YouTube, TikTok, Instagram...`}
            className="flex-1 text-xs bg-transparent border-none outline-none text-text 
                       placeholder:text-text-muted/60 min-w-0"
          />
          {url && (
            <button
              type="button"
              onClick={() => { setUrl(''); setError('') }}
              className="p-0.5 rounded hover:bg-surface-hover transition-colors"
            >
              <X className="w-3 h-3 text-text-muted" />
            </button>
          )}
        </div>

        {/* URL Detection */}
        {detected && detected.platform !== PLATFORMS.UNKNOWN && (
          <div className="flex items-center gap-1.5 px-1 pt-1">
            <Check className="w-3 h-3 text-green-500" />
            <span className="text-[10px] text-green-600 font-medium">
              {getPlatformName(detected.platform)} {detected.platform === PLATFORMS.PINTEREST || detected.platform === PLATFORMS.IMAGE ? 'link' : 'reference'} detected
            </span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-1.5 px-1 pt-1">
            <AlertCircle className="w-3 h-3 text-red-400" />
            <span className="text-[10px] text-red-500">{error}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={!headline.trim()}
          className="flex-1 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 
                     dark:disabled:bg-[oklch(0.46_0.11_59.05_/_0.25)] disabled:text-gray-400 dark:disabled:text-gray-600 
                     text-white text-sm font-semibold rounded-xl shadow-sm shadow-orange-500/20
                     transition-all duration-150 active:scale-[0.98]"
        >
          Add Idea
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text 
                       hover:bg-surface-hover rounded-xl transition-all duration-150"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
