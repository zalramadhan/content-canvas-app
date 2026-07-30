import { useState, useRef } from 'react'
import { isValidVideoUrl, parseVideoUrl, getPlatformName, PLATFORMS } from '../utils/videoParser'
import { Link, X, AlertCircle, Check } from 'lucide-react'

export default function AddVideoForm({ onAdd, onCancel }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = url.trim()

    if (!trimmed) {
      setError('Please enter a video URL')
      return
    }

    if (!isValidVideoUrl(trimmed)) {
      setError('Please enter a valid YouTube, TikTok, Instagram, Pinterest, or image URL')
      return
    }

    const parsed = parseVideoUrl(trimmed)
    onAdd({
      url: trimmed,
      platform: parsed.platform,
      platformId: parsed.id,
      notes: '',
      concept: '',
      hook: '',
      scenes: '',
      editing: '',
    })
    setUrl('')
    setError('')
    inputRef.current?.focus()
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
      <div className="relative">
        <div
          className={`
            flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all duration-200
            ${error
              ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/20'
              : focused
                ? 'border-primary-400 bg-primary-50/30 dark:bg-primary-900/20 shadow-sm shadow-primary-100 dark:shadow-primary-900/30'
                : 'border-border bg-surface hover:border-primary-200 dark:hover:border-primary-700'
            }
          `}
        >
          <Link className={`w-4 h-4 shrink-0 ${focused ? 'text-primary-500' : 'text-text-muted'}`} />
          <input
            ref={inputRef}
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value)
              setError('')
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onPaste={handlePaste}
            placeholder="Paste video URL from YouTube, TikTok, Instagram, Pinterest..."
            className="flex-1 text-sm bg-transparent border-none outline-none text-text 
                       placeholder:text-text-muted min-w-0"
            autoFocus
          />
          {url && (
            <button
              type="button"
              onClick={() => { setUrl(''); setError('') }}
              className="p-0.5 rounded hover:bg-surface-hover transition-colors"
            >
              <X className="w-3.5 h-3.5 text-text-muted" />
            </button>
          )}
        </div>

        {/* URL Detection */}
        {detected && detected.platform !== PLATFORMS.UNKNOWN && (
          <div className="flex items-center gap-1.5 px-1 pt-1.5">
            <Check className="w-3 h-3 text-green-500" />
            <span className="text-[11px] text-green-600 font-medium">
              {getPlatformName(detected.platform)} {detected.platform === PLATFORMS.PINTEREST || detected.platform === PLATFORMS.IMAGE ? 'link' : 'video'} detected
            </span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-1.5 px-1 pt-1.5">
            <AlertCircle className="w-3 h-3 text-red-400" />
            <span className="text-[11px] text-red-500">{error}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1">          <button
            type="submit"
            disabled={!url.trim()}
            className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-200 
                       dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-600 
                       text-white text-sm font-medium rounded-xl
                       transition-all duration-150 active:scale-[0.98]"
        >
          Add Video
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
