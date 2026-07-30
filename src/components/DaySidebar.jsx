import { useState, useEffect, useCallback, useRef } from 'react'
import { format } from 'date-fns'
import {
  X, Plus, Trash2, ChevronDown, ChevronUp, FileText,
  Lightbulb, Quote, Scissors,
  ExternalLink, GripVertical, Check, List, Type, Clapperboard, Bookmark
} from 'lucide-react'
import VideoEmbed from './VideoEmbed'
import AddVideoForm from './AddVideoForm'
import { parseVideoUrl, getPlatformName } from '../utils/videoParser'

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
  { key: 'hook', label: 'Hook', icon: Quote, color: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30', border: 'border-blue-200 dark:border-blue-700/50' },
  { key: 'editing', label: 'Editing', icon: Scissors, color: 'text-rose-500 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/30', border: 'border-rose-200 dark:border-rose-700/50' },
  { key: 'notes', label: 'Notes', icon: FileText, color: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-900/40', border: 'border-gray-200 dark:border-gray-700/50' },
]

function ChecklistField({ items, onChange, fieldColor }) {
  const [newItemText, setNewItemText] = useState('')
  const inputRef = useRef(null)

  const addItem = () => {
    const text = newItemText.trim()
    if (!text) return
    onChange([...items, { text, done: false }])
    setNewItemText('')
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const toggleItem = (index) => {
    onChange(items.map((item, i) =>
      i === index ? { ...item, done: !item.done } : item
    ))
  }

  const deleteItem = (index) => {
    onChange(items.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addItem()
    }
  }

  return (
    <div className="space-y-1">
      {items.map((item, i) => (
        <div
          key={i}
          className="flex items-start gap-2.5 group/item py-1 px-1 rounded-lg
                     hover:bg-surface-hover/50 transition-colors"
        >
          <button
            onClick={() => toggleItem(i)}
            className={`mt-0.5 w-4.5 h-4.5 min-w-[18px] min-h-[18px] rounded-md border-2 flex items-center justify-center
                       shrink-0 transition-all duration-150 active:scale-90
              ${item.done
                ? 'bg-primary-600 border-primary-600 text-white shadow-sm shadow-primary-200/50'
                : 'border-text-muted/40 hover:border-primary-400 hover:bg-primary-50/50'
              }`}
          >
            {item.done && <Check className="w-3 h-3" strokeWidth={3} />}
          </button>
          <span
            className={`flex-1 text-sm leading-relaxed pt-0.5 transition-all duration-150 ${
              item.done
                ? 'line-through text-text-muted/60'
                : 'text-text'
            }`}
          >
            {item.text}
          </span>
          <button
            onClick={() => deleteItem(i)}
            className="opacity-0 group-hover/item:opacity-100 p-1 rounded-lg
                       text-text-muted hover:text-red-500 hover:bg-red-50
                       dark:hover:bg-red-900/30 transition-all"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2 pt-1.5 px-1">
        <div className="w-4.5 h-4.5 min-w-[18px] rounded-md border-2 border-dashed border-text-muted/30" />
        <input
          ref={inputRef}
          type="text"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add checklist item..."
          className="flex-1 text-sm bg-transparent border-none outline-none text-text placeholder:text-text-muted"
        />
        {newItemText.trim() && (
          <button
            onClick={addItem}
            className="shrink-0 px-2.5 py-1 text-xs font-medium text-white
                       bg-primary-600 hover:bg-primary-700 rounded-lg
                       transition-all duration-150 active:scale-95"
          >
            Add
          </button>
        )}
      </div>
    </div>
  )
}

function NoteField({ field, value, onChange }) {
  const Icon = field.icon
  const [expanded, setExpanded] = useState(!!value)
  const isProductionField = field.key === 'editing'

  // Parse checklist data
  let checklistItems = []
  let progress = null
  let storedAsChecklist = false

  if (isProductionField && value) {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed) && parsed.length > 0) {
        storedAsChecklist = true
        checklistItems = parsed
        const done = parsed.filter(i => i.done).length
        progress = { done, total: parsed.length }
      }
    } catch {
      // Not JSON, treat as plain text
    }
  }

  const [mode, setMode] = useState(storedAsChecklist ? 'checklist' : 'text')

  // Sync mode when value prop changes (e.g., switching between entries)
  useEffect(() => {
    setMode(storedAsChecklist ? 'checklist' : 'text')
  }, [storedAsChecklist])

  const handleModeToggle = (e) => {
    e.stopPropagation()
    const newMode = mode === 'text' ? 'checklist' : 'text'
    setMode(newMode)
    // Convert data when switching
    if (newMode === 'checklist') {
      // Text → Checklist: split by newlines into multiple items
      if (value && value.trim()) {
        const lines = value.split('\n').filter(l => l.trim())
        if (lines.length > 0) {
          const items = lines.map(text => ({ text: text.trim(), done: false }))
          onChange(field.key, JSON.stringify(items))
          return
        }
      }
      onChange(field.key, '')
    } else {
      // Checklist → Text: join item texts
      if (checklistItems.length > 0) {
        onChange(field.key, checklistItems.map(i => i.text).join('\n'))
      }
    }
  }

  const handleChecklistChange = (items) => {
    onChange(field.key, items.length > 0 ? JSON.stringify(items) : '')
  }

  // Show progress badge in collapsed header
  const showProgress = mode === 'checklist' && checklistItems.length > 0 && progress

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
          {showProgress && (
            <span className="flex items-center gap-1 text-[10px] text-text-muted bg-white/60 dark:bg-surface-hover/60 px-1.5 py-0.5 rounded-full">
              <Check className="w-2.5 h-2.5" />
              {progress.done}/{progress.total}
            </span>
          )}
          {value && mode === 'text' && !showProgress && (
            <span className="text-[10px] text-text-muted bg-white/60 dark:bg-surface-hover/60 px-1.5 py-0.5 rounded truncate max-w-[120px]">
              {value.length > 20 ? value.slice(0, 20) + '...' : value}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isProductionField && (
            <span
              onClick={handleModeToggle}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium
                         transition-all duration-150 cursor-pointer
                ${mode === 'checklist'
                  ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
                  : 'bg-surface-muted text-text-muted hover:text-text hover:bg-surface-hover'
                }`}
            >
              {mode === 'checklist' ? (
                <><List className="w-3 h-3" /> List</>
              ) : (
                <><Type className="w-3 h-3" /> Text</>
              )}
            </span>
          )}
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-text-muted" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
          )}
        </div>
      </button>
      {expanded && (
        <div className="px-3 py-3 bg-surface">
          {mode === 'checklist' ? (
            <ChecklistField
              items={checklistItems}
              onChange={handleChecklistChange}
              fieldColor={field.color}
            />
          ) : (
            <textarea
              value={value || ''}
              onChange={(e) => onChange(field.key, e.target.value)}
              placeholder={`Write your ${field.label.toLowerCase()} here...`}
              rows={4}
              className="w-full text-sm text-text bg-transparent border-none outline-none resize-none
                         placeholder:text-text-muted leading-relaxed"
            />
          )}
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
  const hasContent = scene.script || scene.camera || scene.cameraAngle || scene.shotType || scene.location || checklist.length > 0

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
          checklist: (templateData.checklist || []).map(c => ({ text: c.text, done: false }))
        }
      : {
          scene: String(scenes.length + 1),
          script: '',
          cameraAngle: '',
          shotType: '',
          location: '',
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

function PlatformBadge({ platform, size = 'sm' }) {
  const isLg = size === 'lg'
  const sizeClasses = isLg ? 'w-8 h-8' : 'w-5 h-5'

  const config = {
    youtube: {
      bg: '#FF0000',
      icon: (
        <svg viewBox="0 0 24 24" fill="white" className={isLg ? 'w-4 h-4' : 'w-3 h-3'}>
          <path d="M8 5v14l11-7z" />
        </svg>
      )
    },
    tiktok: {
      bg: '#16161a',
      icon: (
        <svg viewBox="0 0 24 24" fill="white" className={isLg ? 'w-4 h-4' : 'w-3 h-3'}>
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      )
    },
    instagram: {
      bg: 'linear-gradient(135deg, #f58529, #dd2a7b, #8134af)',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className={isLg ? 'w-4 h-4' : 'w-3 h-3'}>
          <rect x="2" y="2" width="20" height="20" rx="5" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="17.5" cy="6.5" r="1.5" fill="white" />
        </svg>
      )
    },
    pinterest: {
      bg: '#e60023',
      icon: <span className={`${isLg ? 'text-sm' : 'text-[10px]'} font-bold text-white`}>P</span>
    },
    image: {
      bg: '#8b5cf6',
      icon: <span className={isLg ? 'text-sm' : 'text-[10px]'}>🖼️</span>
    },
    unknown: {
      bg: '#6b7280',
      icon: (
        <svg viewBox="0 0 24 24" fill="white" className={isLg ? 'w-4 h-4' : 'w-3 h-3'}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" stroke="white" strokeWidth="2" fill="none" />
          <circle cx="12" cy="8" r="1" fill="white" />
        </svg>
      )
    }
  }

  const c = config[platform] || config.unknown

  return (
    <span
      className={`${sizeClasses} rounded-lg flex items-center justify-center shrink-0 shadow-sm ring-1 ring-white/10`}
      style={{ background: c.bg }}
      title={getPlatformName(platform)}
    >
      {c.icon}
    </span>
  )
}

function VideoCard({ entry, onUpdate, onDelete, index, onDragStart, onDragOver, onDragEnd, onDrop, isDragging, isDropTarget }) {
  const [collapsed, setCollapsed] = useState(true)
  const video = parseVideoUrl(entry.url)
  const hasNotes = entry.scenes || entry.notes || entry.concept || entry.hook || entry.editing

  // Helper to get collapsed preview text
  const getCollapsedPreview = () => {
    if (entry.notes) return entry.notes
    if (entry.concept) return entry.concept
    if (entry.hook) return entry.hook
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
    // Editing checklist
    if (entry.editing) {
      try {
        const parsed = JSON.parse(entry.editing)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const done = parsed.filter(i => i.done).length
          return `✂️ ${done}/${parsed.length}`
        }
      } catch {
        return entry.editing.slice(0, 30)
      }
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
            <PlatformBadge platform={video.platform} size="sm" />
            <span className="text-xs text-text-muted truncate min-w-0">{getPlatformName(video.platform)}</span>
            {hasNotes && (
              <span className="hidden xs:inline text-[10px] text-text-muted truncate min-w-0 border-l border-border-light pl-2 ml-1">
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
          <div className="px-3 pt-3 pb-2 flex items-center justify-between border-b border-border-light">
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
              <PlatformBadge platform={video.platform} size="lg" />
              <span className="text-xs font-semibold text-text truncate min-w-0">{getPlatformName(video.platform)}</span>
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

          {/* Video Embed */}
          <div className="px-3 pb-3" onClick={(e) => e.stopPropagation()}>
            <VideoEmbed url={entry.url} />
          </div>

          {/* Notes Section - ordered: Concept → Hook → Scene Production → Editing → Notes */}
          <div className="p-3 space-y-1.5" onClick={(e) => e.stopPropagation()}>
            {/* Concept & Hook */}
            {NOTE_FIELDS.slice(0, 2).map(field => (
              <NoteField
                key={field.key}
                field={field}
                value={entry[field.key]}
                onChange={updateField}
              />
            ))}
            {/* Scene Production */}
            <SceneField
              value={entry.scenes}
              onChange={updateField}
            />
            {/* Editing & Notes */}
            {NOTE_FIELDS.slice(2).map(field => (
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
                <h3 className="text-sm font-semibold text-text">New Video</h3>
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
              <span className="text-sm font-medium">Add Video</span>
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
                Add videos from YouTube, TikTok, or Instagram.
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
