import { useState, useMemo } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  eachDayOfInterval,
} from 'date-fns'
import { ChevronLeft, ChevronRight, CalendarDays, Plus, Play } from 'lucide-react'
import { parseVideoUrl, getPlatformIcon, getPlatformColor, getPlatformName, getVideoPreviewUrl } from '../utils/videoParser'
import { getStatus } from '../utils/status'
import { ENTRY_MIME, encodeEntryDrag, decodeEntryDrag, setEntryDragActive, isEntryDragActive } from '../utils/drag'

const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_NAMES_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MAX_VISIBLE_PREVIEWS = 3

function DayPreview({ entry, dateKey, onDragStart, onDragEnd }) {
  const [imgError, setImgError] = useState(false)
  const video = parseVideoUrl(entry.url)
  const platformColor = getPlatformColor(video.platform)
  const platformIcon = getPlatformIcon(video.platform)
  const previewUrl = getVideoPreviewUrl(video)
  const hasNotes = entry.notes || entry.concept || entry.hook
  const status = getStatus(entry.status)

  return (
    <div
      className="flex items-center gap-1 w-full group/preview cursor-grab active:cursor-grabbing"
      draggable
      title="Seret untuk pindah ke hari lain"
      onDragStart={(e) => {
        e.stopPropagation()
        e.dataTransfer.setData(ENTRY_MIME, encodeEntryDrag(dateKey, entry.id))
        e.dataTransfer.effectAllowed = 'move'
        setEntryDragActive(true)
        onDragStart?.()
      }}
      onDragEnd={(e) => {
        e.stopPropagation()
        setEntryDragActive(false)
        onDragEnd?.()
      }}
    >
      {/* Status dot */}
      <span className={`w-1.5 h-1.5 rounded-full ${status.dot} shrink-0`} title={`Status: ${status.label}`} />

      {/* Platform badge */}
      <span
        className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0
                   text-white text-[6px] font-bold ring-1 ring-white/60 dark:ring-black/30"
        style={{ backgroundColor: platformColor }}
        title={getPlatformName(video.platform)}
      >
        {platformIcon}
      </span>

      {/* YouTube thumbnail with fallback */}
      {previewUrl && !imgError && (
        <div className="relative w-8 h-[18px] rounded overflow-hidden shrink-0 border border-border/50">
          <img
            src={previewUrl}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImgError(true)}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <Play className="w-2 h-2 text-white/80" fill="white" />
          </div>
        </div>
      )}

      {/* Notes snippet */}
      {hasNotes && (
        <span className="text-[8px] text-text-muted truncate leading-tight min-w-0 flex-1">
          {entry.notes || entry.concept || entry.hook || ''}
        </span>
      )}
    </div>
  )
}

export default function Calendar({ currentMonth, onMonthChange, onDayClick, getDayEntries, sidebarOpen, onMoveEntry, tagFilter }) {
  const [today] = useState(new Date())
  const [dragOverKey, setDragOverKey] = useState(null)
  const [isEntryDragging, setIsEntryDragging] = useState(false)

  const clearDrag = () => {
    setDragOverKey(null)
    setIsEntryDragging(false)
  }

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)

  const days = useMemo(() => {
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [calendarStart, calendarEnd])

  const prevMonth = () => onMonthChange(subMonths(currentMonth, 1))
  const nextMonth = () => onMonthChange(addMonths(currentMonth, 1))
  const goToToday = () => onMonthChange(new Date())

  const dateKey = (date) => format(date, 'yyyy-MM-dd')

  const getEntriesForDay = (date) => {
    if (!getDayEntries) return []
    return getDayEntries(dateKey(date))
  }

  return (
    <div className="bg-surface rounded-2xl border border-border/50 overflow-hidden">
      {/* Calendar Header */}
      <div className="px-5 pt-5 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays className="w-4 h-4 text-primary-400" />
          <h2 className="text-sm font-semibold text-text tracking-tight">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-[11px] font-medium text-text-secondary
                       hover:text-text hover:bg-surface-hover rounded-lg transition-all duration-150"
          >
            Today
          </button>
          <div className="flex items-center">
            <button
              onClick={prevMonth}
              className="p-1.5 text-text-muted hover:text-text hover:bg-surface-hover
                         rounded-lg transition-all duration-150"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 text-text-muted hover:text-text hover:bg-surface-hover
                         rounded-lg transition-all duration-150"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="px-4 pb-4">
        {/* Day names */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_NAMES_SHORT.map((day, i) => (
            <div
              key={i}
              className="text-center text-[11px] font-medium text-text-muted/60 py-1.5"
              title={DAY_NAMES_FULL[i]}
            >
              <span className="hidden xs:inline">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][i]}</span>
              <span className="xs:hidden">{day}</span>
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-px bg-border/20 rounded-xl overflow-hidden">
          {days.map((day, idx) => {
            const inMonth = isSameMonth(day, currentMonth)
            const todayMatch = isSameDay(day, today)
            const allEntries = getEntriesForDay(day)
            const entries = tagFilter
              ? allEntries.filter(e => (e.tags || []).includes(tagFilter))
              : allEntries
            const contentCount = entries.length
            const isWeekend = day.getDay() === 0 || day.getDay() === 6
            const visiblePreviews = entries.slice(0, MAX_VISIBLE_PREVIEWS)
            const hasMore = entries.length > MAX_VISIBLE_PREVIEWS
            const cellKey = dateKey(day)
            const isDropTarget = inMonth && dragOverKey === cellKey

            return (
              <button
                key={idx}
                onClick={() => onDayClick(day)}
                onDragOver={(e) => {
                  if (!inMonth) return
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  setDragOverKey(cellKey)
                }}
                onDragLeave={(e) => {
                  if (e.currentTarget.contains(e.relatedTarget)) return
                  setDragOverKey((k) => (k === cellKey ? null : k))
                }}
                onDrop={(e) => {
                  if (!inMonth) return
                  e.preventDefault()
                  const data = decodeEntryDrag(e.dataTransfer.getData(ENTRY_MIME))
                  if (data) onMoveEntry?.(data.dateKey, data.id, cellKey)
                  setEntryDragActive(false)
                  clearDrag()
                }}
                className={`
                  relative p-1.5 transition-all duration-150
                  flex flex-col items-stretch gap-0.5 group
                  ${inMonth
                    ? 'bg-surface hover:bg-surface-hover cursor-pointer'
                    : 'bg-transparent cursor-default'
                  }
                  ${todayMatch
                    ? 'bg-orange-50 dark:bg-orange-900/20 ring-1 ring-inset ring-orange-400 dark:ring-orange-500/50'
                    : ''
                  }
                  ${isDropTarget
                    ? 'ring-2 ring-inset ring-primary-500 bg-primary-50/70 dark:bg-primary-900/20'
                    : ''
                  }
                  ${contentCount > 0
                    ? sidebarOpen ? 'min-h-[56px] xs:min-h-[60px] sm:min-h-[68px]' : 'min-h-[60px] xs:min-h-[68px] sm:min-h-[76px]'
                    : 'min-h-[36px] xs:min-h-[40px] sm:min-h-[44px]'
                  }
                  ${!inMonth ? 'pointer-events-none' : ''}
                `}
              >
                {/* Day number row */}
                <div className="flex items-center justify-between px-0.5">
                  <span
                    className={`
                      text-[11px] sm:text-xs font-medium leading-tight
                      ${todayMatch
                        ? 'bg-orange-500 text-white w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded-full text-[9px] sm:text-[10px]'
                        : inMonth
                          ? isWeekend ? 'text-text-muted' : 'text-text'
                          : 'text-text-muted'
                      }
                    `}
                  >
                    {format(day, 'd')}
                  </span>

                  {/* Content count badge */}
                  {contentCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1
                                     text-[9px] font-bold text-white leading-none rounded-full
                                     bg-orange-500">
                      {contentCount}
                    </span>
                  )}
                </div>

                {/* Mini previews - hidden on smallest screens when sidebar is open */}
                {contentCount > 0 && inMonth && (
                  <div className={`flex-col gap-0.5 mt-0.5 px-0.5 ${sidebarOpen ? 'hidden xs:flex' : 'flex'}`}>
                    {visiblePreviews.map((entry, i) => (
                      <DayPreview
                        key={entry.id || i}
                        entry={entry}
                        dateKey={cellKey}
                        onDragStart={() => setIsEntryDragging(true)}
                        onDragEnd={clearDrag}
                      />
                    ))}
                    {hasMore && (
                      <span className="text-[7px] text-text-muted font-medium pl-[18px]">
                        +{entries.length - MAX_VISIBLE_PREVIEWS} more
                      </span>
                    )}
                  </div>
                )}

                {/* Add button overlay on hover */}
                {inMonth && (
                  <div className="absolute inset-0 rounded-xl flex items-start justify-end p-1
                                  opacity-0 group-hover:opacity-100 transition-all duration-200">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-orange-500 to-orange-600
                                    shadow-sm shadow-orange-500/30 flex items-center justify-center text-white
                                    hover:shadow-md hover:shadow-orange-500/40 hover:scale-110 active:scale-95
                                    transition-all duration-200">
                      <Plus className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                    </div>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Drop hint while dragging an entry */}
        {(isEntryDragging || isEntryDragActive()) && (
          <div className="px-4 pb-4 pt-1">
            <p className="text-[10px] font-medium text-primary-600 dark:text-primary-400
                            bg-primary-50 dark:bg-primary-900/30
                            border border-dashed border-primary-300 dark:border-primary-700
                            rounded-lg py-1.5 text-center">
              Lepaskan di tanggal tujuan untuk memindahkan konten
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
