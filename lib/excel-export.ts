// Excel Export Utility using CSV format (compatible with Excel)

interface Grant {
  id: string
  opportunityNumber: string
  title: string
  agency: string
  status: string
  postedDate: string
  closeDate: string
  description?: string
  category?: string
  fundingInstrument?: string
  source: string
  url?: string
  portal?: string
}

interface Alert {
  id: string
  name: string
  filters: {
    keyword?: string
    sources?: string[]
    statuses?: string[]
    categories?: string[]
    fundingInstruments?: string[]
    gptPrograms?: string[]
  }
  emailNotification: boolean
  frequency: string
  createdAt: string
  lastTriggered?: string
  matchCount?: number
}

function escapeCSVField(field: string | undefined | null): string {
  if (field === undefined || field === null) return ""
  const str = String(field)
  // If the field contains comma, newline, or double quote, wrap in quotes and escape internal quotes
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function exportGrantsToExcel(grants: Grant[], filename?: string): void {
  // CSV Headers
  const headers = [
    "ID",
    "Opportunity Number",
    "Title",
    "Agency",
    "Status",
    "Posted Date",
    "Close Date",
    "Description",
    "Category",
    "Funding Instrument",
    "Source",
    "Portal",
    "URL"
  ]

  // CSV Rows
  const rows = grants.map(grant => [
    escapeCSVField(grant.id),
    escapeCSVField(grant.opportunityNumber),
    escapeCSVField(grant.title),
    escapeCSVField(grant.agency),
    escapeCSVField(grant.status),
    escapeCSVField(grant.postedDate),
    escapeCSVField(grant.closeDate),
    escapeCSVField(grant.description),
    escapeCSVField(grant.category),
    escapeCSVField(grant.fundingInstrument),
    escapeCSVField(grant.source),
    escapeCSVField(grant.portal),
    escapeCSVField(grant.url)
  ])

  // Build CSV content with BOM for Excel UTF-8 compatibility
  const BOM = "\uFEFF"
  const csvContent = BOM + [
    headers.join(","),
    ...rows.map(row => row.join(","))
  ].join("\n")

  // Create and download file
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename || `grants_export_${new Date().toISOString().split("T")[0]}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function exportAlertsToExcel(alerts: Alert[], grants: Grant[], filename?: string): void {
  // CSV Headers
  const headers = [
    "Alert ID",
    "Alert Name",
    "Keywords",
    "Sources",
    "Statuses",
    "Categories",
    "GPT Programs",
    "Email Notification",
    "Frequency",
    "Created At",
    "Last Triggered",
    "Matching Opportunities Count"
  ]

  // CSV Rows
  const rows = alerts.map(alert => {
    // Count matching grants for this alert
    const matchingGrants = grants.filter(grant => {
      // Basic keyword match
      if (alert.filters.keyword) {
        const keyword = alert.filters.keyword.toLowerCase()
        const matchesKeyword = 
          grant.title?.toLowerCase().includes(keyword) ||
          grant.description?.toLowerCase().includes(keyword) ||
          grant.agency?.toLowerCase().includes(keyword)
        if (!matchesKeyword) return false
      }
      
      // Source filter
      if (alert.filters.sources && alert.filters.sources.length > 0) {
        if (!alert.filters.sources.includes(grant.source)) return false
      }
      
      return true
    })

    return [
      escapeCSVField(alert.id),
      escapeCSVField(alert.name),
      escapeCSVField(alert.filters.keyword),
      escapeCSVField(alert.filters.sources?.join("; ")),
      escapeCSVField(alert.filters.statuses?.join("; ")),
      escapeCSVField(alert.filters.categories?.join("; ")),
      escapeCSVField(alert.filters.gptPrograms?.join("; ")),
      alert.emailNotification ? "Yes" : "No",
      escapeCSVField(alert.frequency),
      escapeCSVField(alert.createdAt),
      escapeCSVField(alert.lastTriggered),
      String(matchingGrants.length)
    ]
  })

  // Build CSV content with BOM for Excel UTF-8 compatibility
  const BOM = "\uFEFF"
  const csvContent = BOM + [
    headers.join(","),
    ...rows.map(row => row.join(","))
  ].join("\n")

  // Create and download file
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename || `alerts_export_${new Date().toISOString().split("T")[0]}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function exportAlertMatchesToExcel(alert: Alert, grants: Grant[], filename?: string): void {
  // Filter grants that match the alert criteria
  const matchingGrants = grants.filter(grant => {
    // Basic keyword match
    if (alert.filters.keyword) {
      const keyword = alert.filters.keyword.toLowerCase()
      const matchesKeyword = 
        grant.title?.toLowerCase().includes(keyword) ||
        grant.description?.toLowerCase().includes(keyword) ||
        grant.agency?.toLowerCase().includes(keyword)
      if (!matchesKeyword) return false
    }
    
    // Source filter
    if (alert.filters.sources && alert.filters.sources.length > 0) {
      if (!alert.filters.sources.includes(grant.source)) return false
    }
    
    return true
  })

  // Use the grants export function with a custom filename
  const exportFilename = filename || `alert_${alert.name.replace(/[^a-zA-Z0-9]/g, "_")}_matches_${new Date().toISOString().split("T")[0]}.csv`
  exportGrantsToExcel(matchingGrants, exportFilename)
}
