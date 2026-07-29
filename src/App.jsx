import { useState, useCallback } from 'react'
import {
  format,
  isSameMonth,
} from 'date-fns'
import {
  CalendarDays, Video, PenSquare, Sparkles,
  Menu, LayoutDashboard, Sun, Moon, X
} from 'lucide-react'
import Calendar from './components/Calendar'
import DaySidebar from './components/DaySidebar'
import ExportDropdown from './components/ExportDropdown'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useTheme } from './hooks/useTheme'

function App() {
  const {
    data,
    getDayEntries,
    addEntry,
    updateEntry,
    deleteEntry,
    reorderEntry,
    getMonthDateKeys,
  } = useLocalStorage()

  const { theme, isDark, toggleTheme } = useTheme()

  const [selectedDate, setSelectedDate] = useState(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
    }
  }, [currentMonth])

  const handleCloseModal = useCallback(() => {
    setSelectedDate(null)
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

  return (
    <div className="min-h-screen bg-surface-muted">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo / Brand */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 
                              flex items-center justify-center shadow-sm shadow-primary-200
                              dark:shadow-primary-900 shrink-0">
                <PenSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-text tracking-tight truncate">ContentCanvas</h1>
                <p className="text-[10px] text-text-muted -mt-0.5 hidden xs:block">Content Planner</p>
              </div>
            </div>

            {/* Center navigation - hidden on mobile */}
            <nav className="hidden md:flex items-center gap-1">
              <button className="px-3 py-1.5 text-xs font-medium text-white
                                 bg-primary-600 rounded-lg flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" />
                Calendar
              </button>
              <button className="px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text 
                                 hover:bg-surface-hover rounded-lg flex items-center gap-1.5
                                 transition-colors duration-150">
                <LayoutDashboard className="w-3.5 h-3.5" />
                Dashboard
              </button>
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-1">
              {/* Stats */}
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-surface-muted rounded-lg">
                <Video className="w-3.5 h-3.5 text-text-muted" />
                <span className="text-xs font-medium text-text-secondary">{totalEntries || 0} this month</span>
              </div>

              {/* Export button */}
              <ExportDropdown
                data={data}
                currentYear={currentMonth.getFullYear()}
                currentMonth={currentMonth.getMonth()}
              />

              {/* Dark mode toggle */}
              <button
                onClick={toggleTheme}
                className="p-1.5 sm:p-2 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover
                           transition-all duration-200 relative group"
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                title={isDark ? 'Light mode' : 'Dark mode'}
              >
                {isDark ? (
                  <Sun className="w-4 h-4 group-hover:rotate-45 transition-transform duration-300" />
                ) : (
                  <Moon className="w-4 h-4 group-hover:-rotate-12 transition-transform duration-300" />
                )}
              </button>

              {/* Mobile menu */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-1.5 text-text-muted hover:text-text rounded-lg hover:bg-surface-hover transition-colors"
                aria-label="Open menu"
              >
                <Menu className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - flex layout for sidebar on large screens */}
      <main className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
        {/* Flex container: calendar + optional inline sidebar on xl */}
        <div className="flex gap-0 xl:gap-6">
          {/* Left: Calendar area */}
          <div className="flex-1 min-w-0 transition-all duration-300">
            {/* Hero / Intro */}
            <div className={`mb-4 sm:mb-6 ${selectedDate ? 'xl:mb-4' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-2xl font-bold text-text tracking-tight">
                    Content Calendar
                  </h2>
                  <p className="text-xs sm:text-sm text-text-muted mt-0.5 sm:mt-1 max-w-lg">
                    {selectedDate
                      ? 'Click a date to manage your content'
                      : 'Plan your social media content day by day.'
                    }
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-text-muted bg-surface
                                dark:bg-surface-hover px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-border shrink-0">
                  <Sparkles className="w-3 h-3.5 text-primary-500" />
                  <span className="hidden lg:inline">Click any date to start</span>
                  <span className="lg:hidden">Pick a date</span>
                </div>
              </div>
            </div>

            {/* Calendar */}
            <Calendar
              currentMonth={currentMonth}
              onMonthChange={handleMonthChange}
              onDayClick={handleDayClick}
              monthDateKeys={monthDateKeys}
              getDayEntries={getDayEntries}
              sidebarOpen={!!selectedDate}
            />

            {/* Footer stats */}
            <div className="mt-4 sm:mt-6 flex items-center justify-center gap-4 sm:gap-6 text-xs text-text-muted">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-primary-400 pulse-glow" />
                <span>Has content</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full ring-2 ring-primary-400 ring-offset-1 bg-primary-600
                                dark:ring-offset-surface dark:ring-primary-500" />
                <span>Today</span>
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
                />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer */}
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-surface shadow-2xl border-r border-border
                          flex flex-col animate-slide-in-left">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-4 h-14 border-b border-border-light">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 
                                flex items-center justify-center">
                  <PenSquare className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-bold text-text">ContentCanvas</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 p-3 space-y-1">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                           bg-primary-600
                           text-white text-sm font-medium"
              >
                <CalendarDays className="w-4 h-4" />
                Calendar
              </button>
              <button
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                           text-text-muted hover:text-text hover:bg-surface-hover
                           text-sm font-medium transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </button>
            </div>

            {/* Drawer Footer */}
            <div className="px-4 py-3 border-t border-border-light">
              <p className="text-[10px] text-text-muted text-center">
                ContentCanvas v1.0
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
