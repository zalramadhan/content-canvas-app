const PLATFORMS = {
  YOUTUBE: 'youtube',
  TIKTOK: 'tiktok',
  INSTAGRAM: 'instagram',
  PINTEREST: 'pinterest',
  IMAGE: 'image',
  UNKNOWN: 'unknown',
}

function parseYouTube(url) {
  const patterns = [
    // Regular video: watch?v=, youtu.be/, /embed/
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    // Shorts: with or without @channelname prefix
    /youtube\.com\/(?:@[\w.-]+\/)?shorts\/([a-zA-Z0-9_-]{11})/,
    // Live streaming URLs
    /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return { platform: PLATFORMS.YOUTUBE, id: match[1] }
  }
  return null
}

function parseTikTok(url) {
  // Match: tiktok.com/@username/video/VIDEO_ID or vm.tiktok.com/SHORT_URL
  const patterns = [
    /tiktok\.com\/@[\w.-]+\/video\/(\d+)/,
    /vm\.tiktok\.com\/([\w]+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return { platform: PLATFORMS.TIKTOK, id: match[1] }
  }
  return null
}

function parseInstagram(url) {
  // Match: instagram.com/p/SHORTCODE/ or instagram.com/reel/SHORTCODE/
  const patterns = [
    /instagram\.com\/(p|reel|tv)\/([a-zA-Z0-9_-]+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return { platform: PLATFORMS.INSTAGRAM, id: match[2], type: match[1] }
  }
  return null
}

function parsePinterest(url) {
  // Match: pinterest.com/pin/PIN_ID/ or pin.it/SHORTCODE
  const patterns = [
    /pinterest\.com\/pin\/([a-zA-Z0-9_-]+)/,
    /pin\.it\/([a-zA-Z0-9_-]+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return { platform: PLATFORMS.PINTEREST, id: match[1] }
  }
  return null
}

function parseDirectImage(url) {
  // Match direct image URLs ending in common extensions
  const imagePattern = /\.(jpe?g|png|gif|webp|svg)(\?.*)?$/i
  if (imagePattern.test(url)) {
    return { platform: PLATFORMS.IMAGE, id: url }
  }
  return null
}

export function parseVideoUrl(url) {
  if (!url || typeof url !== 'string') return { platform: PLATFORMS.UNKNOWN, id: null }

  const trimmed = url.trim()

  let result = parseYouTube(trimmed)
  if (result) return result

  result = parseTikTok(trimmed)
  if (result) return result

  result = parseInstagram(trimmed)
  if (result) return result

  result = parsePinterest(trimmed)
  if (result) return result

  result = parseDirectImage(trimmed)
  if (result) return result

  return { platform: PLATFORMS.UNKNOWN, id: null }
}

export function getEmbedUrl(video) {
  if (!video || !video.id) return null

  switch (video.platform) {
    case PLATFORMS.YOUTUBE: {
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      return `https://www.youtube.com/embed/${video.id}?autoplay=0&rel=0&origin=${encodeURIComponent(origin)}`
    }
    case PLATFORMS.TIKTOK:
      return `https://www.tiktok.com/embed/v2/${video.id}`
    case PLATFORMS.INSTAGRAM: {
      const path = video.type === 'reel' ? 'reel' : 'p'
      return `https://www.instagram.com/${path}/${video.id}/embed/?hidecaption=true`
    }
    // Pinterest: no embed available, handled by ImagePreview
    case PLATFORMS.PINTEREST:
      return null
    default:
      return null
  }
}

export function getPlatformIcon(platform) {
  switch (platform) {
    case PLATFORMS.YOUTUBE: return '▶'
    case PLATFORMS.TIKTOK: return '♪'
    case PLATFORMS.INSTAGRAM: return '📷'
    case PLATFORMS.PINTEREST: return 'P'
    case PLATFORMS.IMAGE: return '🖼️'
    default: return '🔗'
  }
}

export function getPlatformColor(platform) {
  switch (platform) {
    case PLATFORMS.YOUTUBE: return '#ff0000'
    case PLATFORMS.TIKTOK: return '#000000'
    case PLATFORMS.INSTAGRAM: return '#e4405f'
    case PLATFORMS.PINTEREST: return '#e60023'
    case PLATFORMS.IMAGE: return '#8b5cf6'
    default: return '#6b7280'
  }
}

export function getPlatformName(platform) {
  switch (platform) {
    case PLATFORMS.YOUTUBE: return 'YouTube'
    case PLATFORMS.TIKTOK: return 'TikTok'
    case PLATFORMS.INSTAGRAM: return 'Reference'
    case PLATFORMS.PINTEREST: return 'Pinterest'
    case PLATFORMS.IMAGE: return 'Image'
    default: return 'Unknown'
  }
}

export function isValidVideoUrl(url) {
  return parseVideoUrl(url).platform !== PLATFORMS.UNKNOWN
}

/**
 * Get YouTube thumbnail URL from a video ID.
 * Uses mqdefault (320×180) for calendar previews.
 */
export function getYouTubeThumbnail(videoId) {
  if (!videoId) return null
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
}

/**
 * Get a preview URL for the calendar view.
 * Currently only YouTube thumbnails are reliably available.
 */
export function getVideoPreviewUrl(video) {
  if (!video || !video.id) return null
  if (video.platform === PLATFORMS.YOUTUBE) {
    return getYouTubeThumbnail(video.id)
  }
  return null
}


export { PLATFORMS }
