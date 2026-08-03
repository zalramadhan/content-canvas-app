import { useMemo } from 'react'
import { format, parse } from 'date-fns'
import {
  LayoutDashboard, CalendarDays, TrendingUp, CheckCircle2, Flame, Clock, Play, CheckSquare, ListChecks,
  Eye, ThumbsUp, MessageCircle, Share2, Trophy,
} from 'lucide-react'
import { getPlatformColor, getPlatformName, parseVideoUrl } from '../utils/videoParser'
import { STATUSES, getStatus } from '../utils/status'
import { getUpcomingItems } from '../utils/notifications'

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const PLATFORM_COLOR_BY_NAME = {
  'YouTube': getPlatformColor('youtube'),
  'TikTok': getPlatformColor('tiktok'),
  'Reference': getPlatformColor('instagram'),
  'Pinterest': getPlatformColor('pinterest'),
  'Image': getPlatformColor('image'),
  'Unknown': getPlatformColor('unknown'),
}

function collectAll(data) {
  const rows = []
  for (const [dateKey, entries] of Object.entries(data || {})) {
    for (const entry of entries || []) {
      rows.push({ dateKey, entry })
    }
  }
  return rows.sort((a, b) => a.dateKey.localeCompare(b.dateKey))
}

function monthLabel(dateKey) {
  return dateKey.slice(0, 7) // yyyy-MM
}

export default function Dashboard({ data, onOpenDate }) {
  const stats = useMemo(() => {
    const rows = collectAll(data)
    const total = rows.length
    const days = new Set(rows.map((r) => r.dateKey)).size

    const platforms = {}
    const statuses = {}
    const types = { video: 0, carousel: 0 }
    const weekdays = Array(7).fill(0)
    const months = {}
    let checklistTotal = 0
    let checklistDone = 0
    const postedDays = new Set()
    const mTotals = { views: 0, likes: 0, comments: 0, shares: 0 }
    const topContent = []

    for (const { dateKey, entry } of rows) {
      if (entry.status === 'posted') postedDays.add(dateKey)

      const metric = entry.metrics || {}
      mTotals.views += Number(metric.views) || 0
      mTotals.likes += Number(metric.likes) || 0
      mTotals.comments += Number(metric.comments) || 0
      mTotals.shares += Number(metric.shares) || 0
      if ((Number(metric.views) || 0) > 0) {
        topContent.push({ headline: entry.headline || 'Tanpa judul', views: Number(metric.views) || 0, dateKey })
      }
      const video = parseVideoUrl(entry.url || '')
      const pname = getPlatformName(video.platform)
      platforms[pname] = (platforms[pname] || 0) + 1

      const st = entry.status || 'idea'
      statuses[st] = (statuses[st] || 0) + 1

      const t = entry.contentType === 'carousel' ? 'carousel' : 'video'
      types[t]++

      const d = parse(dateKey, 'yyyy-MM-dd', new Date())
      if (!isNaN(d)) weekdays[d.getDay()]++

      const m = monthLabel(dateKey)
      months[m] = (months[m] || 0) + 1

      try {
        const scenes = JSON.parse(entry.scenes || '[]')
        if (Array.isArray(scenes)) {
          scenes.forEach((s) => {
            ;(s.checklist || []).forEach((c) => {
              checklistTotal++
              if (c.done) checklistDone++
            })
          })
        }
      } catch { /* ignore */ }
    }

    const posted = statuses.posted || 0
    const ready = statuses.ready || 0
    const inProgress = total - posted

    // Last 6 months trend (content count)
    const now = new Date()
    const trend = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      trend.push({ key, label: format(d, 'MMM'), count: months[key] || 0 })
    }
    const maxTrend = Math.max(1, ...trend.map((t) => t.count))
    const maxWeekday = Math.max(1, ...weekdays)

    // Streak: consecutive days with ≥1 posted entry (ending today or yesterday)
    const dayKey = (d) => format(d, 'yyyy-MM-dd')
    let streak = 0
    const cursor = new Date()
    if (!postedDays.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1)
    while (postedDays.has(dayKey(cursor))) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    }

    // Posts in the last 7 days
    const weekAgoKey = dayKey(new Date(Date.now() - 6 * 86400000))
    const weekPosts = rows.filter(r => r.dateKey >= weekAgoKey && r.entry.status === 'posted').length

    // Views trend last 6 months
    const viewsTrend = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      let count = 0
      for (const r of rows) {
        if (r.dateKey.startsWith(key)) count += Number(r.entry.metrics?.views) || 0
      }
      viewsTrend.push({ key, label: format(d, 'MMM'), count })
    }
    const maxViews = Math.max(1, ...viewsTrend.map((t) => t.count))
    const maxTopViews = Math.max(1, ...topContent.map((t) => t.views))
    const topFive = topContent.sort((a, b) => b.views - a.views).slice(0, 5)
    const hasMetrics = mTotals.views > 0 || mTotals.likes > 0 || mTotals.comments > 0 || mTotals.shares > 0

    return {
      total, days, platforms, statuses, types, weekdays, months,
      posted, ready, inProgress, checklistTotal, checklistDone, trend, maxTrend, maxWeekday,
      streak, weekPosts, mTotals, topFive, maxTopViews, viewsTrend, maxViews, hasMetrics,
    }
  }, [data])

  const upcoming = useMemo(() => getUpcomingItems(data, 7), [data])

  const statCards = [
    { label: 'Total konten', value: stats.total, icon: CalendarDays, color: 'from-primary-500 to-primary-600', sub: `${stats.days} hari aktif` },
    { label: 'Diposting', value: stats.posted, icon: CheckCircle2, color: 'from-emerald-500 to-emerald-600', sub: stats.total ? Math.round((stats.posted / stats.total) * 100) + '% dari semua' : '—' },
    { label: 'Siap upload', value: stats.ready, icon: TrendingUp, color: 'from-teal-500 to-teal-600', sub: 'status Ready' },
    { label: '🔥 Streak', value: stats.streak, icon: Flame, color: 'from-orange-500 to-orange-600', sub: `${stats.weekPosts} post 7 hari terakhir` },
    { label: 'Total views', value: stats.mTotals.views.toLocaleString('id-ID'), icon: Eye, color: 'from-sky-500 to-sky-600', sub: `${stats.mTotals.likes.toLocaleString('id-ID')} 👍 · ${stats.mTotals.comments.toLocaleString('id-ID')} 💬` },
  ]

  const platformMax = Math.max(1, ...Object.values(stats.platforms))

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {statCards.map((c) => {
          const Icon = c.icon
          return (
            <div key={c.label} className="bg-surface rounded-2xl border border-border/50 p-4 sm:p-5
                                            hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-200">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center
                              shadow-lg shadow-black/5 mb-3`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-text tracking-tight">{c.value}</p>
              <p className="text-[11px] font-medium text-text-muted mt-0.5">{c.label}</p>
              <p className="text-[10px] text-text-muted/70 mt-0.5">{c.sub}</p>
            </div>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Trend last 6 months */}
        <div className="bg-surface rounded-2xl border border-border/50 p-5">
          <h3 className="text-xs font-bold text-text flex items-center gap-1.5 mb-4">
            <TrendingUp className="w-3.5 h-3.5 text-primary-500" /> Tren 6 bulan
          </h3>
          <div className="flex items-end gap-3 h-28">
            {stats.trend.map((t) => (
              <div key={t.key} className="flex-1 flex flex-col items-center gap-1.5 group">
                <span className="text-[10px] font-semibold text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                  {t.count}
                </span>
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-primary-600 to-primary-400
                             transition-all duration-300 group-hover:from-primary-500 group-hover:to-primary-300
                             min-h-[4px]"
                  style={{ height: `${Math.max(4, (t.count / stats.maxTrend) * 100)}%` }}
                />
                <span className="text-[10px] text-text-muted">{t.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Weekday distribution */}
        <div className="bg-surface rounded-2xl border border-border/50 p-5">
          <h3 className="text-xs font-bold text-text flex items-center gap-1.5 mb-4">
            <CalendarDays className="w-3.5 h-3.5 text-orange-500" /> Hari paling produktif
          </h3>
          <div className="space-y-2">
            {stats.weekdays.map((count, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-8 text-[10px] font-medium text-text-muted shrink-0">{WEEKDAY_SHORT[i]}</span>
                <div className="flex-1 h-2.5 rounded-full bg-surface-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-500"
                    style={{ width: `${(count / stats.maxWeekday) * 100}%` }}
                  />
                </div>
                <span className="w-5 text-right text-[10px] font-semibold text-text-secondary">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Status pipeline */}
        <div className="bg-surface rounded-2xl border border-border/50 p-5">
          <h3 className="text-xs font-bold text-text flex items-center gap-1.5 mb-4">
            <ListChecks className="w-3.5 h-3.5 text-violet-500" /> Pipeline produksi
          </h3>
          <div className="space-y-2">
            {STATUSES.map((s) => {
              const count = stats.statuses[s.id] || 0
              const pct = stats.total ? Math.round((count / stats.total) * 100) : 0
              return (
                <div key={s.id} className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${s.dot} shrink-0`} />
                  <span className="w-16 text-[10px] font-medium text-text-secondary shrink-0">{s.label}</span>
                  <div className="flex-1 h-2.5 rounded-full bg-surface-muted overflow-hidden">
                    <div className={`h-full rounded-full ${s.dot} transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-5 text-right text-[10px] font-semibold text-text-secondary">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Platform breakdown */}
        <div className="bg-surface rounded-2xl border border-border/50 p-5">
          <h3 className="text-xs font-bold text-text flex items-center gap-1.5 mb-4">
            <Play className="w-3.5 h-3.5 text-rose-500" /> Breakdown platform
          </h3>
          <div className="space-y-2.5">
            {Object.entries(stats.platforms).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
              <div key={name} className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                      style={{ backgroundColor: PLATFORM_COLOR_BY_NAME[name] || '#6b7280' }}>
                  {name.slice(0, 1)}
                </span>
                <span className="w-24 text-[11px] font-medium text-text truncate shrink-0">{name}</span>
                <div className="flex-1 h-2.5 rounded-full bg-surface-muted overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-fuchsia-500 transition-all duration-500"
                       style={{ width: `${(count / platformMax) * 100}%` }} />
                </div>
                <span className="w-6 text-right text-[11px] font-semibold text-text-secondary">{count}</span>
              </div>
            ))}
            {Object.keys(stats.platforms).length === 0 && (
              <p className="text-[11px] text-text-muted">Belum ada data platform.</p>
            )}
          </div>

          {/* Types + checklist */}
          <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-border/40">
            <div className="text-center">
              <p className="text-lg font-bold text-text">{stats.types.video}</p>
              <p className="text-[10px] text-text-muted">🎬 Reel/Shorts</p>
            </div>
            <div className="text-center border-x border-border/40">
              <p className="text-lg font-bold text-text">{stats.types.carousel}</p>
              <p className="text-[10px] text-text-muted">📷 Carousel</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-text">
                {stats.checklistTotal ? `${stats.checklistDone}/${stats.checklistTotal}` : '—'}
              </p>
              <p className="text-[10px] text-text-muted flex items-center justify-center gap-1">
                <CheckSquare className="w-2.5 h-2.5" /> Checklist produksi
              </p>
            </div>
          </div>
        </div>

        {/* Upcoming */}
        <div className="bg-surface rounded-2xl border border-border/50 p-5">
          <h3 className="text-xs font-bold text-text flex items-center gap-1.5 mb-4">
            <Clock className="w-3.5 h-3.5 text-amber-500" /> Jadwal 7 hari ke depan
          </h3>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {upcoming.length === 0 && (
              <p className="text-[11px] text-text-muted py-6 text-center">
                🎉 Tidak ada jadwal konten belum ter-posting minggu ini.
              </p>
            )}
            {upcoming.map(({ dateKey, entry }) => {
              const status = getStatus(entry.status)
              const d = parse(dateKey, 'yyyy-MM-dd', new Date())
              return (
                <button
                  key={`${dateKey}-${entry.id}`}
                  onClick={() => onOpenDate(dateKey)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border/50
                             hover:border-primary-300 dark:hover:border-primary-700 hover:bg-primary-50/30
                             dark:hover:bg-primary-900/10 transition-all duration-150 text-left"
                >
                  <div className="shrink-0 text-center w-11">
                    <p className="text-base font-bold text-text leading-none">{format(d, 'd')}</p>
                    <p className="text-[9px] text-text-muted uppercase mt-0.5">{format(d, 'EEE')}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-text truncate">{entry.headline || 'Tanpa judul'}</p>
                    <p className="text-[10px] text-text-muted truncate">
                      {entry.contentType === 'carousel' ? '📷 Carousel' : '🎬 Reel/Shorts'}
                      {entry.platform && entry.platform !== 'unknown' ? ` · ${getPlatformName(entry.platform)}` : ''}
                    </p>
                  </div>
                  <span className={`shrink-0 text-[9px] font-semibold px-2 py-0.5 rounded-full ${status.softBg} ${status.softText}`}>
                    {status.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content performance */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Metrics summary */}
        <div className="bg-surface rounded-2xl border border-border/50 p-5">
          <h3 className="text-xs font-bold text-text flex items-center gap-1.5 mb-4">
            <Trophy className="w-3.5 h-3.5 text-amber-500" /> Ringkasan metrik
          </h3>
          {stats.hasMetrics ? (
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: 'Views', value: stats.mTotals.views, icon: Eye, color: 'text-sky-500' },
                { label: 'Likes', value: stats.mTotals.likes, icon: ThumbsUp, color: 'text-blue-500' },
                { label: 'Comments', value: stats.mTotals.comments, icon: MessageCircle, color: 'text-fuchsia-500' },
                { label: 'Shares', value: stats.mTotals.shares, icon: Share2, color: 'text-emerald-500' },
              ].map(m => {
                const Icon = m.icon
                return (
                  <div key={m.label} className="rounded-xl border border-border/50 bg-surface-muted/40 p-3">
                    <Icon className={`w-3.5 h-3.5 ${m.color} mb-1.5`} />
                    <p className="text-lg font-bold text-text leading-none">{m.value.toLocaleString('id-ID')}</p>
                    <p className="text-[10px] text-text-muted mt-1">{m.label}</p>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-[11px] text-text-muted py-6 text-center">
              Belum ada metrik. Isi views/likes di kartu konten (seksi 📊 Metrics).
            </p>
          )}
        </div>

        {/* Top content */}
        <div className="bg-surface rounded-2xl border border-border/50 p-5">
          <h3 className="text-xs font-bold text-text flex items-center gap-1.5 mb-4">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Top konten (views)
          </h3>
          {stats.topFive.length > 0 ? (
            <div className="space-y-2.5">
              {stats.topFive.map((c, i) => (
                <div key={`${c.dateKey}-${i}`} className="flex items-center gap-2">
                  <span className="w-4 text-[10px] font-bold text-text-muted shrink-0">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-text truncate">{c.headline}</p>
                    <div className="h-2 rounded-full bg-surface-muted overflow-hidden mt-1">
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                           style={{ width: `${(c.views / stats.maxTopViews) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-text-secondary shrink-0">{c.views.toLocaleString('id-ID')}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-text-muted py-6 text-center">Belum ada data views.</p>
          )}
        </div>

        {/* Views trend */}
        <div className="bg-surface rounded-2xl border border-border/50 p-5">
          <h3 className="text-xs font-bold text-text flex items-center gap-1.5 mb-4">
            <Eye className="w-3.5 h-3.5 text-sky-500" /> Tren views 6 bulan
          </h3>
          <div className="flex items-end gap-3 h-28">
            {stats.viewsTrend.map((t) => (
              <div key={t.key} className="flex-1 flex flex-col items-center gap-1.5 group">
                <span className="text-[10px] font-semibold text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                  {t.count.toLocaleString('id-ID')}
                </span>
                <div className="w-full rounded-t-lg bg-gradient-to-t from-sky-600 to-sky-400
                                transition-all duration-300 group-hover:from-sky-500 group-hover:to-sky-300 min-h-[4px]"
                     style={{ height: `${Math.max(4, (t.count / stats.maxViews) * 100)}%` }} />
                <span className="text-[10px] text-text-muted">{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {stats.total === 0 && (
        <div className="text-center py-8">
          <LayoutDashboard className="w-10 h-10 text-text-muted/40 mx-auto mb-3" />
          <p className="text-sm text-text-muted">Belum ada data — mulai tambah konten di kalender!</p>
        </div>
      )}
    </div>
  )
}
