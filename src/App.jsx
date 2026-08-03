import { useState, useCallback, useEffect, useRef } from 'react'
import {
  format,
  isSameMonth,
  startOfMonth,
  parse,
} from 'date-fns'
import {
  CalendarDays, Video, PenSquare,
  Menu, LayoutDashboard, Sun, Moon, X,
  Loader2, LogOut, Cloud, CloudCheck, CloudOff,
  Search, Sparkles, Undo2, Redo2, LayoutGrid,
} from 'lucide-react'
import Calendar from './components/Calendar'
import DaySidebar from './components/DaySidebar'
import ExportDropdown from './components/ExportDropdown'
import AuthScreen from './components/AuthScreen'
import KanbanBoard from './components/KanbanBoard'
import Dashboard from './components/Dashboard'
import SearchModal from './components/SearchModal'
import NotificationsPanel from './components/NotificationsPanel'
import AISettingsModal from './components/AISettingsModal'
import TagFilterBar from './components/TagFilterBar'
import TagManagerModal from './components/TagManagerModal'
import { getAllTags } from './utils/tags'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useTheme } from './hooks/useTheme'
import { supabase } from './lib/supabase'
import { notifyDueToday } from './utils/notifications'

function App() {
  const [session, setSession] = useState(null)

  useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => authListener?.subscription.unsubscribe()
  }, [])

  const userId = session?.user?.id

  const {
    data,
    syncState,
    retrySync,
    getDayEntries,
    addEntry,
    updateEntry,
    deleteEntry,
    reorderEntry,
    duplicateEntry,
    moveEntry,
    renameTag,
    deleteTag,
    bulkUpdateEntries,
    bulkDeleteEntries,
    bulkAddTag,
    undo,
    redo,
    canUndo,
    canRedo,
    getMonthDateKeys,
  } = useLocalStorage({ userId })

  const { isDark, toggleTheme } = useTheme()

  const [selectedDate, setSelectedDate] = useState(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeView, setActiveView] = useState('calendar') // 'calendar' | 'kanban' | 'dashboard'
  const [searchOpen, setSearchOpen] = useState(false)
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false)
  const [focusEntryId, setFocusEntryId] = useState(null)
  const [tagFilter, setTagFilter] = useState(null)
  const [tagManagerOpen, setTagManagerOpen] = useState(false)

  const allTagCounts = getAllTags(data)
  const tagSuggestions = allTagCounts.map(t => t.name)

  const handleRenameTag = useCallback((oldTag, newTag) => {
    renameTag(oldTag, newTag)
    // Keep the active filter pointing at the renamed tag
    if (tagFilter === oldTag) setTagFilter(newTag)
  }, [renameTag, tagFilter])

  const handleDeleteTag = useCallback((tag) => {
    deleteTag(tag)
    // Clear the filter if the deleted tag was active
    if (tagFilter === tag) setTagFilter(null)
  }, [deleteTag, tagFilter])

  const monthDateKeys = getMonthDateKeys(
    currentMonth.getFullYear(),
    currentMonth.getMonth()
  )

  const totalEntries = monthDateKeys.length

  const handleMonthChange = useCallback((newMonth) => {
    setCurrentMonth(newMonth)
  }, [])

  const handleDayClick = useCallback((day) => {
    if (isSameMonth(day, currentMonth)) {
      setSelectedDate(day)
      setFocusEntryId(null)
    }
  }, [currentMonth])

  const handleCloseModal = useCallback(() => {
    setSelectedDate(null)
    setFocusEntryId(null)
  }, [])

  const selectedDateKey = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null
  const selectedEntries = selectedDateKey ? getDayEntries(selectedDateKey) : []

  const handleAddEntry = useCallback((date, entry) => {
    const key = format(date, 'yyyy-MM-dd')
    addEntry(key, entry)
  }, [addEntry])

  const handleUpdateEntry = useCallback((date, entryId, updates) => {
    const key = format(date, 'yyyy-MM-dd')
    updateEntry(key, entryId, updates)
  }, [updateEntry])

  const handleDeleteEntry = useCallback((date, entryId) => {
    const key = format(date, 'yyyy-MM-dd')
    deleteEntry(key, entryId)
  }, [deleteEntry])

  const handleReorderEntry = useCallback((date, entryId, newIndex) => {
    const key = format(date, 'yyyy-MM-dd')
    reorderEntry(key, entryId, newIndex)
  }, [reorderEntry])

  const handleDuplicateEntry = useCallback((dateKey, entryId, targetDateKey) => {
    duplicateEntry(dateKey, entryId, targetDateKey)
  }, [duplicateEntry])

  const handleMoveEntry = useCallback((sourceDateKey, entryId, targetDateKey) => {
    moveEntry(sourceDateKey, entryId, targetDateKey)
    // Open the destination day and focus the moved entry for clear feedback
    const d = parse(targetDateKey, 'yyyy-MM-dd', new Date())
    if (!isNaN(d)) {
      setSelectedDate(d)
      setCurrentMonth(startOfMonth(d))
      setFocusEntryId(entryId)
    }
  }, [moveEntry])

  const handleLogout = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  }, [])

  // Open a specific date (used by search / kanban / notifications), optionally focusing an entry
  const openDate = useCallback((dateKey, focusId = null) => {
    const d = parse(dateKey, 'yyyy-MM-dd', new Date())
    if (isNaN(d)) return
    setSelectedDate(d)
    setCurrentMonth(startOfMonth(d))
    setActiveView('calendar')
    setFocusEntryId(focusId)
  }, [])

  // ── Undo/Redo keyboard shortcuts (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z / Ctrl+Y) ──
  useEffect(() => {
    const handler = (e) => {
      const target = e.target
      const typing =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if (typing) return
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return
      if (e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      } else if (e.key.toLowerCase() === 'y') {
        e.preventDefault()
        redo()
      } else if (e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo])

  // ── Due-today browser notification (once granted) ──
  const dataRef = useRef(data)
  dataRef.current = data
  useEffect(() => {
    if (!userId) return
    const check = () => notifyDueToday(dataRef.current)
    const t = setTimeout(check, 5000)
    const iv = setInterval(check, 30 * 60 * 1000)
    return () => {
      clearTimeout(t)
      clearInterval(iv)
    }
  }, [userId])

  if (!session) {
    return <AuthScreen />
  }

  const syncChip = {
    syncing: {
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
      label: 'Menyinkronkan…',
      cls: 'text-text-muted',
    },
    synced: {
      icon: <CloudCheck className="w-3 h-3 text-emerald-500" />,
      label: 'Tersimpan',
      cls: 'text-emerald-600 dark:text-emerald-400',
    },
    offline: {
      icon: <CloudOff className="w-3 h-3 text-amber-500" />,
      label: 'Offline',
      cls: 'text-amber-600 dark:text-amber-400',
    },
  }[syncState.status] || { icon: <Cloud className="w-3 h-3 text-text-muted" />, label: '', cls: 'text-text-muted' }

  const navItems = [
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
    { id: 'kanban', label: 'Kanban', icon: LayoutGrid },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ]

  return (
    <div className="min-h-screen bg-bg-page">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-2xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo / Brand */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600
                              flex items-center justify-center shadow-lg shadow-orange-500/20 shrink-0">
                <PenSquare className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-text tracking-tight truncate">ContentCanvas</h1>
                <p className="text-[10px] text-text-muted -mt-0.5 hidden xs:block">Content Planner</p>
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-1.5">
              {/* Undo / Redo */}
              <div className="flex items-center gap-0.5">
                <button
                  onClick={undo}
                  disabled={!canUndo}
                  className="p-2 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover
                             disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  aria-label="Undo (Ctrl+Z)"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
                <button
                  onClick={redo}
                  disabled={!canRedo}
                  className="p-2 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover
                             disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  aria-label="Redo (Ctrl+Shift+Z)"
                  title="Redo (Ctrl+Shift+Z)"
                >
                  <Redo2 className="w-4 h-4" />
                </button>
              </div>

              {/* Notifications */}
              <NotificationsPanel data={data} onOpenDate={openDate} />

              {/* AI Settings */}
              <button
                onClick={() => setAiSettingsOpen(true)}
                className="p-2 rounded-lg text-text-muted hover:text-violet-600 hover:bg-violet-50
                           dark:hover:bg-violet-900/30 transition-all duration-200"
                aria-label="AI settings"
                title="Pengaturan AI Assistant"
              >
                <Sparkles className="w-4 h-4" />
              </button>

              {/* Stats */}
              <div className="hidden lg:flex items-center gap-2 px-3.5 py-2 bg-surface-muted rounded-lg border border-border/50">
                <Video className="w-3.5 h-3.5 text-text-muted" />
                <span className="text-xs font-medium text-text-secondary">{totalEntries || 0} this month</span>
              </div>

              {/* Sync status */}
              {syncState.status !== 'local' && (
                <button
                  onClick={syncState.status === 'offline' ? retrySync : undefined}
                  className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg
                              bg-surface-muted border border-border/50
                              ${syncChip.cls}
                              ${syncState.status === 'offline'
                                ? 'cursor-pointer hover:bg-surface-hover active:scale-[0.97] transition-all'
                                : 'cursor-default'}`}
                  title={syncState.lastSyncedAt
                    ? `Terakhir sinkron: ${new Date(syncState.lastSyncedAt).toLocaleTimeString()}`
                    : syncState.error || 'Status sinkronisasi'}
                >
                  {syncChip.icon}
                  <span className="text-[11px] font-medium">{syncChip.label}</span>
                </button>
              )}

              {/* Menu */}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 text-text-muted hover:text-text rounded-lg hover:bg-surface-hover transition-colors"
                aria-label="Open menu"
                title="Menu"
              >
                <Menu className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Offline sync banner */}
      {syncState.status === 'offline' && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-2.5 flex items-center justify-between gap-3">
            <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2 min-w-0">
              <CloudOff className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {syncState.error || 'Tidak dapat terhubung ke server. Data tetap aman tersimpan di perangkat ini.'}
              </span>
            </p>
            <button
              onClick={retrySync}
              className="shrink-0 text-[11px] font-medium px-3 py-1.5 rounded-lg
                         bg-amber-500/10 hover:bg-amber-500/20
                         text-amber-700 dark:text-amber-400
                         border border-amber-300/50 transition-colors"
            >
              Coba lagi
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-8 py-6 sm:py-10">
        {/* Hero / Intro */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xl sm:text-3xl font-bold text-text tracking-tight">
                {activeView === 'kanban'
                  ? 'Production Pipeline'
                  : activeView === 'dashboard'
                    ? 'Dashboard & Insights'
                    : 'Content Calendar'}
              </h2>
              <p className="text-xs sm:text-sm text-text-muted mt-1.5 max-w-lg leading-relaxed">
                {activeView === 'kanban'
                  ? 'Seret konten antar kolom untuk mengubah status produksi.'
                  : activeView === 'dashboard'
                    ? 'Statistik konten, produktivitas, dan jadwal mendatang.'
                    : selectedDate
                      ? 'Manage your content ideas for this date.'
                      : 'Plan your social media content day by day.'
                    }
              </p>
            </div>
          </div>
        </div>

        {activeView === 'calendar' && (
          <div className="flex gap-0 xl:gap-8">
            {/* Left: Calendar area */}
            <div className="flex-1 min-w-0 transition-all duration-300">
              <div className="mb-4">
                <TagFilterBar tags={allTagCounts} activeTag={tagFilter} onChange={setTagFilter} onManage={() => setTagManagerOpen(true)} />
              </div>
              <Calendar
                currentMonth={currentMonth}
                onMonthChange={handleMonthChange}
                onDayClick={handleDayClick}
                getDayEntries={getDayEntries}
                sidebarOpen={!!selectedDate}
                onMoveEntry={handleMoveEntry}
                tagFilter={tagFilter}
              />

              {/* Footer stats */}
              <div className="mt-4 sm:mt-6 flex items-center justify-center gap-4 sm:gap-6 text-xs text-text-muted flex-wrap">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-primary-400 pulse-glow" />
                  <span>Has content</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full ring-2 ring-orange-400 ring-offset-1 bg-orange-600
                                  dark:ring-offset-surface dark:ring-orange-500" />
                  <span>Today</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Posted</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-sky-500" />
                  <span>Dot = status konten</span>
                </div>
                <div className="w-full sm:w-auto flex items-center justify-center gap-1.5 text-text-muted/70">
                  🖱️ Seret konten antar hari untuk memindahkan
                </div>
              </div>

              {/* Inline DaySidebar below calendar on screens below xl */}
              {selectedDate && (
                <div className="xl:hidden mt-6">
                  <DaySidebar
                    date={selectedDate}
                    entries={selectedEntries}
                    onAddEntry={handleAddEntry}
                    onUpdateEntry={handleUpdateEntry}
                    onDeleteEntry={handleDeleteEntry}
                    onReorderEntry={handleReorderEntry}
                    onClose={handleCloseModal}
                    onDuplicateEntry={handleDuplicateEntry}
                    focusEntryId={focusEntryId}
                    onOpenSettings={() => setAiSettingsOpen(true)}
                    tagSuggestions={tagSuggestions}
                  />
                </div>
              )}
            </div>

            {/* Right: Inline sidebar on xl+ screens */}
            {selectedDate && (
              <div className="hidden xl:block w-96 shrink-0">
                <div className="sticky top-24">
                  <DaySidebar
                    date={selectedDate}
                    entries={selectedEntries}
                    onAddEntry={handleAddEntry}
                    onUpdateEntry={handleUpdateEntry}
                    onDeleteEntry={handleDeleteEntry}
                    onReorderEntry={handleReorderEntry}
                    onClose={handleCloseModal}
                    onDuplicateEntry={handleDuplicateEntry}
                    focusEntryId={focusEntryId}
                    onOpenSettings={() => setAiSettingsOpen(true)}
                    tagSuggestions={tagSuggestions}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {activeView === 'kanban' && (
          <>
            <div className="mb-4">
              <TagFilterBar tags={allTagCounts} activeTag={tagFilter} onChange={setTagFilter} onManage={() => setTagManagerOpen(true)} />
            </div>
            <KanbanBoard
              data={data}
              onOpenEntry={openDate}
              onUpdateEntry={updateEntry}
              tagFilter={tagFilter}
              bulkUpdate={bulkUpdateEntries}
              bulkDelete={bulkDeleteEntries}
              bulkAddTag={bulkAddTag}
            />
          </>
        )}

        {activeView === 'dashboard' && (
          <Dashboard
            data={data}
            onOpenDate={openDate}
          />
        )}
      </main>

      {/* Navigation Drawer (menu) */}
      {menuOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />

          {/* Drawer */}
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-surface shadow-2xl border-l border-border
                          flex flex-col sidebar-panel">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-4 h-14 border-b border-border-light">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-orange-700 
                                flex items-center justify-center">
                  <PenSquare className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-bold text-text">ContentCanvas</span>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 p-3 space-y-4 overflow-y-auto">
              {/* Navigation */}
              <div className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const active = activeView === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setActiveView(item.id); setMenuOpen(false) }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                                  ${active
                                    ? 'bg-orange-500 text-white'
                                    : 'text-text-muted hover:text-text hover:bg-surface-hover'}`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  )
                })}
              </div>

              {/* Search */}
              <div className="space-y-1">
                <button
                  onClick={() => { setSearchOpen(true); setMenuOpen(false) }}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-text-muted hover:text-text
                             hover:bg-surface-hover text-sm font-medium transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <Search className="w-4 h-4" />
                    Cari konten
                  </span>
                  <kbd className="text-[9px] font-medium text-text-muted bg-surface-muted border border-border rounded px-1 py-0.5">Ctrl K</kbd>
                </button>
              </div>

              {/* Export */}
              <div>
                <p className="px-1 mb-1.5 text-[10px] font-semibold text-text-muted uppercase tracking-wide">Ekspor</p>
                <ExportDropdown
                  embedded
                  data={data}
                  currentYear={currentMonth.getFullYear()}
                  currentMonth={currentMonth.getMonth()}
                />
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="px-3 py-3 border-t border-border-light space-y-1">
              <button
                onClick={toggleTheme}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-muted hover:text-text
                           hover:bg-surface-hover text-sm font-medium transition-colors"
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {isDark ? 'Light mode' : 'Dark mode'}
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-muted hover:text-red-500
                           hover:bg-red-50 dark:hover:bg-red-900/30 text-sm font-medium transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Keluar
              </button>
              <p className="text-[10px] text-text-muted text-center pt-1">
                ContentCanvas v1.2 — Pipeline, AI & Dashboard
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Global Search Modal */}
      {searchOpen && (
        <SearchModal
          data={data}
          onClose={() => setSearchOpen(false)}
          onSelect={(dateKey, entryId) => {
            setSearchOpen(false)
            openDate(dateKey, entryId)
          }}
        />
      )}

      {/* AI Settings Modal */}
      {aiSettingsOpen && (
        <AISettingsModal onClose={() => setAiSettingsOpen(false)} />
      )}

      {/* Tag Manager Modal */}
      {tagManagerOpen && (
        <TagManagerModal
          tags={allTagCounts}
          onRename={handleRenameTag}
          onDelete={handleDeleteTag}
          onClose={() => setTagManagerOpen(false)}
        />
      )}
    </div>
  )
}

export default App
