// Excel Export Utility using CSV format (compatible with Excel)
// Matches the same information structure as email alerts

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
  awardCeiling?: number
  budget?: string
  amount?: string
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

// Generate the correct URL based on source (same logic as email)
function generateGrantUrl(grant: Grant): string {
  let grantUrl = grant.url || ""
  
  if (!grantUrl || grantUrl === "#") {
    // Build URL based on source
    if (grant.source === "grants.gov" || grant.source === "usa") {
      grantUrl = `https://www.grants.gov/search-results-detail/${grant.opportunityNumber || grant.id}`
    } else if (grant.source === "sam.gov") {
      grantUrl = `https://sam.gov/opp/${grant.id}/view`
    } else if (grant.source === "eu" || grant.source?.includes("EU")) {
      grantUrl = `https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/${grant.id}`
    } else if (grant.source === "spain") {
      grantUrl = `https://www.pap.hacienda.gob.es/bdnstrans/GE/es/convocatorias`
    }
  }
  
  return grantUrl
}

// Format budget/funding amount (same as email)
function formatBudget(grant: Grant): string {
  const budget = grant.awardCeiling || grant.fundingInstrument || grant.budget || grant.amount || "Not specified"
  if (typeof budget === "number") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(budget)
  }
  return String(budget)
}

// Get source badge (same as email)
function getSourceBadge(source: string): string {
  if (source === "usa" || source === "grants.gov") return "USA"
  if (source === "sam.gov") return "SAM.gov"
  if (source === "eu") return "EU"
  if (source === "spain") return "Spain"
  return source || "Other"
}

export function exportGrantsToExcel(grants: Grant[], filename?: string): void {
  // CSV Headers - Same structure as email table
  const headers = [
    "Source",
    "Status",
    "Title",
    "Agency",
    "Opportunity ID",
    "Category",
    "Budget/Funding",
    "Posted Date",
    "Deadline",
    "Description",
    "Direct Link"
  ]

  // CSV Rows - matching email structure
  const rows = grants.map(grant => {
    const url = generateGrantUrl(grant)
    const category = grant.category || grant.portal || "General"
    
    return [
      escapeCSVField(getSourceBadge(grant.source)),
      escapeCSVField(grant.status || "Open"),
      escapeCSVField(grant.title),
      escapeCSVField(grant.agency || "Not specified"),
      escapeCSVField(grant.opportunityNumber || grant.id),
      escapeCSVField(category),
      escapeCSVField(formatBudget(grant)),
      escapeCSVField(grant.postedDate),
      escapeCSVField(grant.closeDate || "See portal"),
      escapeCSVField(grant.description ? grant.description.substring(0, 500) : ""),
      escapeCSVField(url)
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
  const blobUrl = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = blobUrl
  link.download = filename || `grants_export_${new Date().toISOString().split("T")[0]}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(blobUrl)
}

// Export to XLSX format with clickable hyperlinks
export function exportGrantsToExcelXLSX(grants: Grant[], filename?: string): void {
  // Create XML-based Excel format for clickable hyperlinks
  const escapeXML = (str: string) => {
    if (!str) return ""
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;")
  }
  
  const truncate = (str: string, maxLen: number) => {
    if (!str) return ""
    return str.length > maxLen ? str.substring(0, maxLen) + "..." : str
  }

  // Build HTML table that Excel can open with clickable links
  let html = `
<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<!--[if gte mso 9]>
<xml>
<x:ExcelWorkbook>
<x:ExcelWorksheets>
<x:ExcelWorksheet>
<x:Name>Grants</x:Name>
<x:WorksheetOptions>
<x:DisplayGridlines/>
</x:WorksheetOptions>
</x:ExcelWorksheet>
</x:ExcelWorksheets>
</x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  table { border-collapse: collapse; width: 100%; }
  th { background-color: #1e3a5f; color: white; padding: 8px; text-align: left; font-weight: bold; }
  td { padding: 6px; border: 1px solid #ddd; vertical-align: top; }
  tr:nth-child(even) { background-color: #f9f9f9; }
  a { color: #2563eb; text-decoration: underline; }
  .status-open { color: #22c55e; font-weight: bold; }
  .status-closed { color: #ef4444; font-weight: bold; }
  .budget { color: #059669; font-weight: bold; }
  .deadline { color: #dc2626; font-weight: bold; }
  .source { background-color: #1e3a5f; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px; }
</style>
</head>
<body>
<table>
<thead>
<tr>
  <th>Source</th>
  <th>Status</th>
  <th>Title (Click to Open)</th>
  <th>Agency</th>
  <th>Opportunity ID</th>
  <th>Category</th>
  <th>Budget/Funding</th>
  <th>Posted Date</th>
  <th>Deadline</th>
  <th>Description</th>
</tr>
</thead>
<tbody>
`

  grants.forEach(grant => {
    const url = generateGrantUrl(grant)
    const category = grant.category || grant.portal || "General"
    const statusClass = grant.status?.toLowerCase() === "open" ? "status-open" : 
                        grant.status?.toLowerCase() === "closed" ? "status-closed" : ""
    
    html += `<tr>
  <td><span class="source">${escapeXML(getSourceBadge(grant.source))}</span></td>
  <td class="${statusClass}">${escapeXML(grant.status || "Open")}</td>
  <td><a href="${escapeXML(url)}" target="_blank">${escapeXML(grant.title)}</a></td>
  <td>${escapeXML(grant.agency || "Not specified")}</td>
  <td>${escapeXML(grant.opportunityNumber || grant.id)}</td>
  <td>${escapeXML(category)}</td>
  <td class="budget">${escapeXML(formatBudget(grant))}</td>
  <td>${escapeXML(grant.postedDate)}</td>
  <td class="deadline">${escapeXML(grant.closeDate || "See portal")}</td>
  <td>${escapeXML(truncate(grant.description || "", 300))}</td>
</tr>
`
  })

  html += `
</tbody>
</table>
</body>
</html>`

  // Create and download as .xls file (Excel will open HTML tables)
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" })
  const blobUrl = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = blobUrl
  link.download = filename || `grants_export_${new Date().toISOString().split("T")[0]}.xls`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(blobUrl)
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
  console.log("[v0] exportAlertMatchesToExcel - Total grants received:", grants?.length || 0)
  console.log("[v0] exportAlertMatchesToExcel - Alert filters:", alert?.filters)
  
  // If no grants, export empty file with message
  if (!grants || grants.length === 0) {
    console.log("[v0] exportAlertMatchesToExcel - No grants available to filter")
    // Export an empty file with a message
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>No Grants Available</title></head>
<body>
<h2>No grants available</h2>
<p>Please ensure grants have been loaded before exporting.</p>
<p>Alert: ${alert?.name || "Unknown"}</p>
</body>
</html>`
    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" })
    const blobUrl = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = blobUrl
    link.download = `no_grants_${new Date().toISOString().split("T")[0]}.xls`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(blobUrl)
    return
  }

  // Filter grants that match the alert criteria
  const matchingGrants = grants.filter(grant => {
    // Basic keyword match
    if (alert.filters.keyword && alert.filters.keyword.trim()) {
      const keyword = alert.filters.keyword.toLowerCase()
      const matchesKeyword = 
        grant.title?.toLowerCase().includes(keyword) ||
        grant.description?.toLowerCase().includes(keyword) ||
        grant.agency?.toLowerCase().includes(keyword) ||
        grant.category?.toLowerCase().includes(keyword)
      if (!matchesKeyword) return false
    }
    
    // Source filter - check both array format and object format
    if (alert.filters.sources && alert.filters.sources.length > 0) {
      const sourceMatches = alert.filters.sources.some(s => {
        const sourceStr = s.toLowerCase()
        const grantSource = grant.source?.toLowerCase() || ""
        return grantSource === sourceStr || 
               grantSource.includes(sourceStr) || 
               sourceStr.includes(grantSource)
      })
      if (!sourceMatches) return false
    }
    
    return true
  })

  console.log("[v0] exportAlertMatchesToExcel - Matching grants:", matchingGrants.length)

  // If no matching grants, export all grants instead
  const grantsToExport = matchingGrants.length > 0 ? matchingGrants : grants

  // Use the XLSX export function with clickable links
  const exportFilename = filename || `alert_${alert.name.replace(/[^a-zA-Z0-9]/g, "_")}_matches_${new Date().toISOString().split("T")[0]}.xls`
  exportGrantsToExcelXLSX(grantsToExport, exportFilename)
}
