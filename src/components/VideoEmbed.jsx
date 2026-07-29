import { useState, useEffect, useRef } from 'react'
import { parseVideoUrl, getEmbedUrl, getYouTubeThumbnail, getPlatformName, PLATFORMS } from '../utils/videoParser'
import { ExternalLink, AlertCircle, Loader2, Play, RefreshCw } from 'lucide-react'
import ImagePreview from './ImagePreview'

function YouTubeThumbnailFallback({ url, videoId, platformName }) {
  const thumbnail = getYouTubeThumbnail(videoId)

  return (
    <div className="relative bg-black">
      {thumbnail && (
        <img
          src={thumbnail}
          alt="Video thumbnail"
          className="w-full h-auto object-cover opacity-70"
          style={{ aspectRatio: '9/16', maxHeight: '360px' }}
        />
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-14 h-14 rounded-full bg-white/90 
                     hover:bg-white hover:scale-110 transition-all duration-200 
                     shadow-lg group"
          title="Play on YouTube"
        >
          <Play className="w-6 h-6 text-black ml-0.5" />
        </a>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-white/80 hover:text-white underline underline-offset-2"
        >
          Open in {platformName}
        </a>
      </div>
    </div>
  )
}

function EmbedContainer({ children, isInstagram, isPinterest, originalUrl, igHeight, pinterestHeight }) {
  if (isInstagram) {
    return (
      <div className="relative w-full overflow-hidden" style={{ maxHeight: `${igHeight}px` }}>
        <div className="w-full" style={{ minHeight: '450px' }}>
          {children}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none" />
        <a
          href={originalUrl || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 
                     bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg 
                     text-white text-xs font-medium transition-all duration-200
                     hover:scale-105 active:scale-95"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-3 h-3" />
          Open
        </a>
      </div>
    )
  }

  if (isPinterest) {
    return (
      <div className="relative w-full overflow-hidden" style={{ maxHeight: `${pinterestHeight}px` }}>
        <div className="w-full" style={{ minHeight: '350px' }}>
          {children}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
        <a
          href={originalUrl || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 
                     bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg 
                     text-white text-xs font-medium transition-all duration-200
                     hover:scale-105 active:scale-95"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-3 h-3" />
          Open
        </a>
      </div>
    )
  }

  return (
    <div className="relative w-full max-w-[400px] mx-auto" style={{ paddingBottom: '177.78%' }}>
      {children}
    </div>
  )
}

export default function VideoEmbed({ url }) {
  const [embedError, setEmbedError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [retryKey, setRetryKey] = useState(0)
  const loadingRef = useRef(true)
  const video = parseVideoUrl(url)
  const platformName = getPlatformName(video.platform)
  const embedUrl = getEmbedUrl(video)
  const isInstagram = video.platform === PLATFORMS.INSTAGRAM
  const isPinterest = video.platform === PLATFORMS.PINTEREST
  const isReel = isInstagram && video.type === 'reel'
  const igHeight = isReel ? 780 : 650
  const pinterestHeight = 500

  // Timeout: if iframe doesn't load in 12s, show fallback
  useEffect(() => {
    if (!embedUrl) return
    loadingRef.current = true
    setLoading(true)
    setEmbedError(false)

    const timer = setTimeout(() => {
      if (loadingRef.current) {
        setEmbedError(true)
        setLoading(false)
      }
    }, 12000)

    return () => {
      loadingRef.current = false
      clearTimeout(timer)
    }
  }, [embedUrl, retryKey])

  // Pinterest & Direct images: use ImagePreview component
  if (video.platform === PLATFORMS.PINTEREST || video.platform === PLATFORMS.IMAGE) {
    return <ImagePreview url={url} platform={video.platform} />
  }

  // Unknown platform
  if (!url || video.platform === PLATFORMS.UNKNOWN) {
    return (
      <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/30">
        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
        <p className="text-xs text-red-600 dark:text-red-400">
          Unknown or invalid video URL
        </p>
      </div>
    )
  }

  // No embed URL available
  if (!embedUrl) {
    return (
      <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-900/30">
        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Preview not available for this platform
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl overflow-hidden border border-border bg-black/5 dark:bg-white/5">
      {/* Platform Label */}
      <div className="flex items-center justify-between px-3 py-2 bg-surface border-b border-border">
        <div className="flex items-center gap-2">
          {isInstagram && (
            <span className="w-5 h-5 rounded flex items-center justify-center shrink-0 bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af]">
              <svg viewBox="0 0 24 24" className="w-3 h-3 text-white" fill="none" stroke="white" strokeWidth="2">
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <circle cx="12" cy="12" r="5" />
                <circle cx="17.5" cy="6.5" r="1.5" fill="white" />
              </svg>
            </span>
          )}
          {isPinterest && (
            <span className="w-5 h-5 rounded flex items-center justify-center shrink-0 bg-[#e60023] text-white text-[10px] font-bold">
              P
            </span>
          )}
          <span className="text-xs font-medium text-text-secondary">{platformName}</span>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 
                     transition-colors duration-150"
        >
          Open
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Embed Area */}
      <div className="relative bg-black">
        {loading && !embedError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
            <Loader2 className="w-6 h-6 text-white/70 animate-spin" />
          </div>
        )}
        {embedError ? (
          isInstagram ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8 px-6 bg-gradient-to-br from-[#f58529]/10 via-[#dd2a7b]/10 to-[#8134af]/10">
              <AlertCircle className="w-8 h-8 text-text-muted" />
              <p className="text-sm text-text-secondary text-center">
                Instagram preview failed to load
              </p>
              <div className="flex items-center gap-2">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 underline"
                >
                  Open in Instagram
                </a>
                <span className="text-text-muted">·</span>
                <button
                  onClick={() => {
                    setRetryKey(k => k + 1)
                    setEmbedError(false)
                    setLoading(true)
                    loadingRef.current = true
                  }}
                  className="flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 
                             hover:text-primary-700 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Retry
                </button>
              </div>
            </div>
          ) : isPinterest ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8 px-6 bg-[#e60023]/10">
              <AlertCircle className="w-8 h-8 text-text-muted" />
              <p className="text-sm text-text-secondary text-center">
                Pinterest preview failed to load
              </p>
              <div className="flex items-center gap-2">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 underline"
                >
                  Open in Pinterest
                </a>
                <span className="text-text-muted">·</span>
                <button
                  onClick={() => {
                    setRetryKey(k => k + 1)
                    setEmbedError(false)
                    setLoading(true)
                    loadingRef.current = true
                  }}
                  className="flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 
                             hover:text-primary-700 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <YouTubeThumbnailFallback url={url} videoId={video.id} platformName={platformName} />
          )
        ) : (
          <EmbedContainer isInstagram={isInstagram} isPinterest={isPinterest} originalUrl={url} igHeight={igHeight} pinterestHeight={pinterestHeight}>
            <iframe
              key={retryKey}
              src={embedUrl}
              title={`${platformName} video player`}
              className={`${isInstagram || isPinterest ? 'w-full' : 'absolute inset-0 w-full h-full'}`}
              style={isInstagram ? { height: `${igHeight}px`, border: 'none' } : isPinterest ? { height: `${pinterestHeight}px`, border: 'none' } : undefined}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen={!isInstagram && !isPinterest}
              scrolling={isInstagram || isPinterest ? 'no' : undefined}
              onLoad={() => { setLoading(false); loadingRef.current = false }}
            />
          </EmbedContainer>
        )}
      </div>

      {/* Retry bar when embed fails */}
      {embedError && (
        <div className="flex items-center justify-center gap-3 px-3 py-2.5 bg-surface border-t border-border">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-medium text-primary-600 
                       dark:text-primary-400 hover:text-primary-700 transition-colors"
          >
            Open in {platformName}
            <ExternalLink className="w-3 h-3" />
          </a>
          <span className="w-1 h-1 rounded-full bg-border-light" />
          <button
            onClick={() => {
              setRetryKey(k => k + 1)
              setEmbedError(false)
              setLoading(true)
              loadingRef.current = true
            }}
            className="flex items-center gap-1.5 text-xs font-medium text-primary-600 
                       dark:text-primary-400 hover:text-primary-700 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Retry Embed
          </button>
        </div>
      )}
    </div>
  )
}
