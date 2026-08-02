import { format, parse } from 'date-fns'
import { parseVideoUrl, getPlatformName } from './videoParser'

/**
 * Flatten all entries from storage data into a sortable array.
 */
function flattenEntries(data) {
  const rows = []
  const dateKeys = Object.keys(data).sort()

  for (const dateKey of dateKeys) {
    const entries = data[dateKey] || []
    for (const entry of entries) {
      const video = parseVideoUrl(entry.url || '')
      rows.push({
        date: dateKey,
        dateFormatted: format(parse(dateKey, 'yyyy-MM-dd', new Date()), 'MMM d, yyyy'),
        dayOfWeek: format(parse(dateKey, 'yyyy-MM-dd', new Date()), 'EEEE'),
        platform: getPlatformName(video.platform),
        url: entry.url || '',
        notes: entry.notes || '',
        concept: entry.concept || '',
        hook: entry.hook || '',
        scripting: entry.scripting || '',
        shooting: entry.shooting || '',
        editing: entry.editing || '',
      })
    }
  }
  return rows
}

/**
 * Filter rows to only include those within a given year/month.
 */
function filterRowsByMonth(rows, year, month) {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`
  return rows.filter(r => r.date.startsWith(prefix))
}

// ─── CSV Export ─────────────────────────────────────────────

const CSV_HEADERS = [
  'Date', 'Day', 'Platform', 'Video URL',
  'Notes', 'Concept', 'Hook', 'Scripting', 'Shooting', 'Editing',
]

function escapeCSV(value) {
  if (value == null) return ''
  const str = String(value)
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function generateCSV(rows) {
  // BOM for Excel Unicode support
  const bom = '\uFEFF'
  const header = CSV_HEADERS.join(',')
  const body = rows.map(row =>
    [
      escapeCSV(row.dateFormatted),
      escapeCSV(row.dayOfWeek),
      escapeCSV(row.platform),
      escapeCSV(row.url),
      escapeCSV(row.notes),
      escapeCSV(row.concept),
      escapeCSV(row.hook),
      escapeCSV(row.scripting),
      escapeCSV(row.shooting),
      escapeCSV(row.editing),
    ].join(',')
  ).join('\n')

  return bom + header + '\n' + body
}

function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export data to CSV and trigger download.
 * @param {object} data - raw data object from useLocalStorage
 * @param {'all'|'month'} scope - export scope
 * @param {number} [year] - year for month scope
 * @param {number} [month] - month (0-indexed) for month scope
 */
export function exportToCSV(data, scope = 'all', year, month) {
  let rows = flattenEntries(data)

  if (scope === 'month' && year != null && month != null) {
    rows = filterRowsByMonth(rows, year, month)
  }

  if (rows.length === 0) {
    alert('No data to export.')
    return
  }

  const csv = generateCSV(rows)
  const dateStr = format(new Date(), 'yyyy-MM-dd')
  const scopeLabel = scope === 'month'
    ? `${format(new Date(year, month), 'MMM-yyyy')}`
    : 'all-data'
  const filename = `contentcanvas-${scopeLabel}-${dateStr}.csv`

  downloadBlob(csv, filename, 'text/csv;charset=utf-8')
}

// ─── PDF Export ─────────────────────────────────────────────

/**
 * Export data to PDF and trigger download, using jspdf + autotable.
 * @param {object} data - raw data object from useLocalStorage
 * @param {'all'|'month'} scope - export scope
 * @param {number} [year] - year for month scope
 * @param {number} [month] - month (0-indexed) for month scope
 */
export async function exportToPDF(data, scope = 'all', year, month) {
  // Dynamic import to avoid bundling issue
  const { default: jsPDF } = await import('jspdf')
  await import('jspdf-autotable')

  let rows = flattenEntries(data)

  if (scope === 'month' && year != null && month != null) {
    rows = filterRowsByMonth(rows, year, month)
  }

  if (rows.length === 0) {
    alert('No data to export.')
    return
  }

  const dateStr = format(new Date(), 'yyyy-MM-dd')
  const scopeLabel = scope === 'month'
    ? `${format(new Date(year, month), 'MMMM yyyy')}`
    : 'All Data'
  const filename = `contentcanvas-${scope === 'month' ? format(new Date(year, month), 'MMM-yyyy') : 'all-data'}-${dateStr}.pdf`

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  // Colors matching app theme
  const primary = [147, 51, 234]   // #9333ea
  const lightBg = [249, 250, 251]  // light row bg
  const white = [255, 255, 255]
  const textDark = [9, 9, 11]      // #09090b
  const textMedium = [107, 114, 128] // #6b7280

  // ── Header Section ──
  // Purple header bar
  doc.setFillColor(...primary)
  doc.rect(0, 0, 297, 28, 'F')

  // Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...white)
  doc.text('ContentCanvas — Content Report', 14, 18)

  // Date info on right
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy HH:mm')}`, 283, 18, { align: 'right' })

  // ── Scope Info ──
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...textDark)
  doc.text(`Scope: ${scopeLabel}`, 14, 38)

  const totalEntries = rows.length
  const totalDays = new Set(rows.map(r => r.date)).size
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...textMedium)
  doc.text(`${totalEntries} entries across ${totalDays} days`, 14, 44)

  // ── Summary Stats Box ──
  const platforms = {}
  for (const row of rows) {
    platforms[row.platform] = (platforms[row.platform] || 0) + 1
  }

  let statsX = 14
  const statsY = 50
  doc.setFillColor(...lightBg)
  doc.roundedRect(statsX, statsY, 269, 12, 2, 2, 'F')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...textMedium)

  let statParts = Object.entries(platforms)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `${name}: ${count}`)

  // Add date count
  statParts.unshift(`Days: ${totalDays}`)
  statParts.push(`Total: ${totalEntries}`)

  doc.text(statParts.join('  |  '), 20, 58)

  // ── Table ──
  const tableHeaders = [
    'Date',
    'Day',
    'Platform',
    'Notes',
    'Concept',
    'Hook',
    'Scripting',
    'Shooting',
    'Editing',
  ]

  const tableRows = rows.map(row => [
    row.dateFormatted,
    row.dayOfWeek.slice(0, 3),
    row.platform,
    row.notes || '-',
    row.concept || '-',
    row.hook || '-',
    row.scripting || '-',
    row.shooting || '-',
    row.editing || '-',
  ])

  doc.autoTable({
    head: [tableHeaders],
    body: tableRows,
    startY: 68,
    margin: { top: 68, bottom: 20, left: 10, right: 10 },
    styles: {
      font: 'helvetica',
      fontSize: 7,
      cellPadding: 1.5,
      lineColor: [220, 220, 230],
      lineWidth: 0.3,
      textColor: textDark,
    },
    headStyles: {
      fillColor: primary,
      textColor: white,
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
    },
    alternatingRowStyles: {
      fillColor: [246, 246, 250],
    },
    columnStyles: {
      0: { cellWidth: 22, halign: 'center' },
      1: { cellWidth: 10, halign: 'center' },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 'auto' },
      4: { cellWidth: 'auto' },
      5: { cellWidth: 'auto' },
      6: { cellWidth: 'auto' },
      7: { cellWidth: 'auto' },
      8: { cellWidth: 'auto' },
    },
    didDrawPage: (data) => {
      // Footer on each page
      const pageCount = doc.internal.getNumberOfPages()
      const currentPage = data.pageNumber
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(...textMedium)
      doc.text(
        `ContentCanvas — Page ${currentPage} of ${pageCount}`,
        297 / 2,
        200,
        { align: 'center' }
      )
    },
  })

  // Save
  doc.save(filename)
}
