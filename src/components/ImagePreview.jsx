import { useState, useEffect } from 'react'
import { getPlatformName, PLATFORMS } from '../utils/videoParser'
import { ExternalLink, AlertCircle, Loader2 } from 'lucide-react'

function DirectImage({ url }) {
  const [imgError, setImgError] = useState(false)
  const [loading, setLoading] = useState(true)

  return (
    <div className="relative bg-black">
      {loading && (
        <div className="flex items-center justify-center py-20 bg-gray-900">
          <Loader2 className="w-6 h-6 text-white/60 animate-spin" />
        </div>
      )}
      {imgError ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 px-6 bg-gray-50 dark:bg-gray-900">
          <AlertCircle className="w-8 h-8 text-text-muted" />
          <p className="text-sm text-text-secondary text-center">Failed to load image</p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 underline"
          >
            Open image directly
          </a>
        </div>
      ) : (
        <img
          src={url}
          alt="Content preview"
          className={`w-full h-auto object-contain max-h-[600px] mx-auto ${loading ? 'hidden' : 'block'}`}
          onLoad={() => setLoading(false)}
          onError={() => { setImgError(true); setLoading(false) }}
        />
      )}
    </div>
  )
}

function PinterestPreview({ url }) {
  const [imageUrl, setImageUrl] = useState(null)
  const [fetching, setFetching] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchImage() {
      const oembedUrl = `https://www.pinterest.com/oembed.json?url=${encodeURIComponent(url)}`
      const proxies = [
        // Try direct first (in case CORS works)
        (u) => u,
        // Then try corsproxy.io
        (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
        // Then try allorigins.win as fallback
        (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
      ]

      for (const proxyFn of proxies) {
        if (cancelled) return
        try {
          const res = await fetch(proxyFn(oembedUrl), { signal: AbortSignal.timeout(5000) })
          const text = await res.text()
          const data = JSON.parse(text)
          const thumb = data?.thumbnail_url || data?.url
          if (!cancelled && thumb) {
            setImageUrl(thumb)
            setFetching(false)
            return
          }
        } catch {
          // Try next proxy
        }
      }
      if (!cancelled) setFailed(true)
      if (!cancelled) setFetching(false)
    }

    fetchImage()
    return () => { cancelled = true }
  }, [url])

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-16 bg-gray-900">
        <Loader2 className="w-6 h-6 text-white/60 animate-spin" />
      </div>
    )
  }

  if (imageUrl) {
    return <DirectImage url={imageUrl} />
  }

  // Fallback: branded Pinterest card + Open button
  return (
    <div className="relative bg-[#e60023] overflow-hidden">
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/5" />
      <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/5" />
      <div className="relative flex flex-col items-center justify-center gap-3 py-10 px-6 text-center">
        <span className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#e60023] text-lg font-bold shadow-lg">P</span>
        <p className="text-sm font-semibold text-white">Pinterest Pin</p>
        <p className="text-xs text-white/70 max-w-[200px]">
          Auto-fetch failed. Open to view on Pinterest
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 
                     backdrop-blur-sm rounded-xl text-white text-sm font-semibold
                     transition-all duration-200 hover:scale-105 active:scale-95"
        >
          <ExternalLink className="w-4 h-4" />
          Open in Pinterest
        </a>
      </div>
    </div>
  )
}

export default function ImagePreview({ url, platform }) {
  const platformName = getPlatformName(platform)

  if (platform === PLATFORMS.PINTEREST) {
    return (
      <div className="rounded-xl overflow-hidden border border-border">
        <div className="flex items-center justify-between px-3 py-2 bg-surface border-b border-border">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded flex items-center justify-center shrink-0 bg-[#e60023] text-white text-[10px] font-bold">
              P
            </span>
            <span className="text-xs font-medium text-text-secondary">Pinterest</span>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 transition-colors duration-150"
          >
            Open
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <PinterestPreview url={url} />
      </div>
    )
  }

  if (platform === PLATFORMS.IMAGE) {
    return (
      <div className="rounded-xl overflow-hidden border border-border bg-black/5 dark:bg-white/5">
        <div className="flex items-center justify-between px-3 py-2 bg-surface border-b border-border">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded flex items-center justify-center shrink-0 bg-violet-500 text-white text-[10px]">
              🖼️
            </span>
            <span className="text-xs font-medium text-text-secondary">Image</span>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 transition-colors duration-150"
          >
            Open
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <DirectImage url={url} />
      </div>
    )
  }

  return null
}
