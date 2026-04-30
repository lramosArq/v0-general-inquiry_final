/**
 * EU Funding Fetcher - Uses Official SEDIA API
 * 
 * Connects to the EU Funding & Tenders Portal API to fetch ALL
 * Open for submission and Forthcoming opportunities.
 * 
 * Based on: https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/support/apis
 * API: https://api.tech.ec.europa.eu/search-api/prod/rest/search
 * 
 * Status codes:
 * - 31094501 = Open for submission
 * - 31094502 = Forthcoming
 * 
 * Type codes:
 * - 0 = Call for Proposals
 * - 1 = Call for Tenders  
 * - 2 = Other actions
 * - 8 = Topics
 */

export interface EUGrant {
  id: string
  title: string
  organization: string
  publishDate: string
  deadline: string
  openingDate?: string
  amount?: string
  budget?: string
  category: string
  description: string
  expedient: string
  callIdentifier?: string
  topicIdentifier?: string
  sourceUrl: string
  source: "eu"
  url: string
  program?: string
  status?: string
  type?: string
}

interface SEDIAResult {
  metadata?: {
    identifier?: string[]
    title?: string[]
    callTitle?: string[]
    programmePeriod?: string[]
    frameworkProgramme?: string[]
    type?: string[]
    status?: string[]
    deadlineDate?: string[]
    startDate?: string[]
    budgetOverviewLine?: string[]
    keywords?: string[]
    destinationDetails?: string[]
    ccm2Id?: string[]
    topicMGAs?: string[]
    callIdentifier?: string[]
  }
}

interface SEDIAResponse {
  results?: SEDIAResult[]
  totalResults?: number
  pageSize?: number
  pageNumber?: number
}

// ARQUIMEA technology keywords for filtering
const ARQUIMEA_KEYWORDS = [
  "space", "satellite", "launcher", "orbit", "esa",
  "defence", "defense", "military", "security", "edf",
  "drone", "uav", "uas", "unmanned", "rpas",
  "quantum", "photonic", "sensor", "electronics",
  "aerospace", "aviation", "aircraft",
  "radar", "navigation", "galileo", "copernicus",
  "communication", "telecom", "5g", "6g",
  "cyber", "ai", "artificial intelligence", "robotics",
  "materials", "composites", "nanotechnology",
  "propulsion", "thermal", "power systems"
]

export class EUFundingFetcher {
  private readonly API_URL = "https://api.tech.ec.europa.eu/search-api/prod/rest/search"
  private readonly API_KEY = "SEDIA"
  
  /**
   * Fetch ALL Open and Forthcoming grants from EU Portal
   * Filters for ARQUIMEA-relevant technology areas
   */
  async fetchAllGrants(): Promise<EUGrant[]> {
    console.log("[v0] EU API - Fetching Open and Forthcoming opportunities...")
    
    const startTime = Date.now()
    const allGrants: EUGrant[] = []
    
    // Fetch both status in one call for efficiency
    // Status codes: 31094501 (Open), 31094502 (Forthcoming)
    const grants = await this.fetchWithFilters(["31094501", "31094502"])
    allGrants.push(...grants)
    
    // Count by status
    const openCount = allGrants.filter(g => g.status === "Open").length
    const forthcomingCount = allGrants.filter(g => g.status === "Forthcoming").length
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`[v0] EU API - Total: ${allGrants.length} grants (${openCount} Open, ${forthcomingCount} Forthcoming) in ${elapsed}s`)
    
    return allGrants
  }

  /**
   * Fetch grants with status filter using correct SEDIA API format
   */
  private async fetchWithFilters(statusCodes: string[]): Promise<EUGrant[]> {
    const grants: EUGrant[] = []
    let page = 1
    const pageSize = 100
    let hasMore = true
    let totalFetched = 0
    
    while (hasMore) {
      try {
        // All parameters go in query string for SEDIA API
        const params = new URLSearchParams({
          apiKey: this.API_KEY,
          text: "*",
          pageSize: pageSize.toString(),
          pageNumber: page.toString(),
        })
        
        const url = `${this.API_URL}?${params.toString()}`
        
        // The query body uses the correct format
        const body = {
          bool: {
            must: [
              // Type: Topics (8) - this is where the actual grant opportunities are
              { term: { type: "8" } },
              // Status: Open OR Forthcoming
              { terms: { status: statusCodes } }
            ]
          }
        }
        
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000)
        
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        })
        
        clearTimeout(timeoutId)
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => "Unknown error")
          console.log(`[v0] EU API - Error ${response.status} page ${page}: ${errorText.substring(0, 300)}`)
          break
        }
        
        const data: SEDIAResponse = await response.json()
        
        if (page === 1) {
          console.log(`[v0] EU API - Total available: ${data.totalResults || 0} topics`)
        }
        
        if (!data.results || data.results.length === 0) {
          hasMore = false
          break
        }
        
        // Parse and filter results
        for (const result of data.results) {
          const grant = this.parseResult(result)
          if (grant && this.isRelevantToArquimea(grant)) {
            grants.push(grant)
          }
        }
        
        totalFetched += data.results.length
        
        // Check pagination
        const totalResults = data.totalResults || 0
        hasMore = totalFetched < totalResults && data.results.length === pageSize
        page++
        
        // Safety limit - max 100 pages (10000 results)
        if (page > 100) {
          console.log("[v0] EU API - Reached page limit")
          hasMore = false
        }
        
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          console.log(`[v0] EU API - Timeout page ${page}`)
        } else {
          console.log(`[v0] EU API - Error page ${page}:`, error instanceof Error ? error.message : error)
        }
        break
      }
    }
    
    console.log(`[v0] EU API - Fetched ${totalFetched} total, ${grants.length} ARQUIMEA-relevant`)
    return grants
  }

  /**
   * Check if grant is relevant to ARQUIMEA technology areas
   */
  private isRelevantToArquimea(grant: EUGrant): boolean {
    const searchText = `${grant.title} ${grant.description} ${grant.category} ${grant.program || ""}`.toLowerCase()
    
    return ARQUIMEA_KEYWORDS.some(keyword => searchText.includes(keyword.toLowerCase()))
  }

  /**
   * Parse SEDIA API result to EUGrant
   */
  private parseResult(result: SEDIAResult): EUGrant | null {
    try {
      const meta = result.metadata
      if (!meta) return null
      
      const identifier = meta.identifier?.[0] || meta.ccm2Id?.[0] || ""
      const title = meta.title?.[0] || meta.callTitle?.[0] || ""
      
      if (!identifier && !title) return null
      
      // Get status from metadata
      const statusCode = meta.status?.[0] || ""
      let status = "Open"
      if (statusCode === "31094502" || statusCode.toLowerCase().includes("forthcoming")) {
        status = "Forthcoming"
      } else if (statusCode === "31094501" || statusCode.toLowerCase().includes("open")) {
        status = "Open"
      }
      
      const deadline = meta.deadlineDate?.[0] || ""
      const openingDate = meta.startDate?.[0] || ""
      const budget = meta.budgetOverviewLine?.[0] || ""
      const programme = meta.frameworkProgramme?.[0] || ""
      const typeStr = meta.type?.[0] || ""
      const keywords = meta.keywords?.join(", ") || ""
      const destination = meta.destinationDetails?.[0] || ""
      const callId = meta.callIdentifier?.[0] || ""
      
      // Build description
      const descParts: string[] = []
      if (destination) descParts.push(destination)
      if (keywords) descParts.push(`Keywords: ${keywords.substring(0, 150)}`)
      if (budget) descParts.push(`Budget: ${budget}`)
      if (callId) descParts.push(`Call: ${callId}`)
      
      const description = descParts.join(" | ").substring(0, 500) || title
      
      // Determine category
      const category = this.categorize(title, destination, keywords)
      
      // Build URL
      const baseUrl = "https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details"
      const url = `${baseUrl}/${identifier.toLowerCase()}`
      
      return {
        id: `EU-${identifier}`,
        title: title || identifier,
        organization: "European Commission",
        publishDate: openingDate ? this.formatDate(openingDate) : new Date().toISOString().split("T")[0],
        deadline: deadline ? this.formatDate(deadline) : "",
        openingDate: openingDate ? this.formatDate(openingDate) : "",
        amount: budget,
        budget: budget,
        category,
        description,
        expedient: identifier,
        callIdentifier: callId || identifier,
        topicIdentifier: identifier,
        sourceUrl: url,
        source: "eu",
        url,
        program: this.mapProgramme(programme),
        status,
        type: this.mapType(typeStr)
      }
    } catch {
      return null
    }
  }

  /**
   * Format date to YYYY-MM-DD
   */
  private formatDate(dateStr: string): string {
    if (!dateStr) return ""
    try {
      // Handle ISO format
      if (dateStr.includes("T")) {
        return dateStr.split("T")[0]
      }
      // Handle timestamp (milliseconds)
      if (/^\d+$/.test(dateStr)) {
        return new Date(parseInt(dateStr)).toISOString().split("T")[0]
      }
      // Parse standard date
      const d = new Date(dateStr)
      if (!isNaN(d.getTime())) {
        return d.toISOString().split("T")[0]
      }
      return dateStr
    } catch {
      return dateStr
    }
  }

  /**
   * Map programme name
   */
  private mapProgramme(prog: string): string {
    if (!prog) return "EU Funding & Tenders"
    const p = prog.toLowerCase()
    if (p.includes("horizon")) return "Horizon Europe"
    if (p.includes("edf") || p.includes("defence fund")) return "European Defence Fund"
    if (p.includes("digital")) return "Digital Europe"
    if (p.includes("cef") || p.includes("connecting europe")) return "Connecting Europe Facility"
    if (p.includes("life")) return "LIFE Programme"
    if (p.includes("erasmus")) return "Erasmus+"
    if (p.includes("creative")) return "Creative Europe"
    if (p.includes("health") || p.includes("eu4h")) return "EU4Health"
    if (p.includes("space") || p.includes("euspa")) return "EU Space Programme"
    if (p.includes("euratom")) return "Euratom"
    if (p.includes("innovation")) return "European Innovation Council"
    return prog
  }

  /**
   * Map type
   */
  private mapType(typeStr: string): string {
    if (!typeStr) return "Grant"
    const t = typeStr.toLowerCase()
    if (t.includes("tender") || t.includes("procurement")) return "Tender"
    if (t.includes("grant")) return "Grant"
    if (t.includes("prize")) return "Prize"
    if (t === "8" || t === "topic") return "Topic"
    return "Grant"
  }

  /**
   * Categorize grant based on content - aligned with ARQUIMEA tech areas
   */
  private categorize(title: string, destination: string, keywords: string): string {
    const text = `${title} ${destination} ${keywords}`.toLowerCase()
    
    // ARQUIMEA primary areas
    if (text.includes("defence") || text.includes("defense") || text.includes("edf") || 
        text.includes("military") || text.includes("ammunition") || text.includes("weapon")) {
      return "Defence & Security"
    }
    if (text.includes("space") || text.includes("satellite") || text.includes("launcher") || 
        text.includes("orbit") || text.includes("esa") || text.includes("copernicus") || 
        text.includes("galileo") || text.includes("euspa")) {
      return "Space"
    }
    if (text.includes("drone") || text.includes("uav") || text.includes("uas") || 
        text.includes("unmanned") || text.includes("rpas") || text.includes("aerial vehicle")) {
      return "Aerospace & Drones"
    }
    if (text.includes("quantum") || text.includes("photonic") || text.includes("optic")) {
      return "Quantum & Photonics"
    }
    if (text.includes("cyber") || text.includes("artificial intelligence") || 
        text.includes(" ai ") || text.includes("machine learning") || text.includes("digital")) {
      return "Digital & AI"
    }
    if (text.includes("sensor") || text.includes("radar") || text.includes("electronics") ||
        text.includes("navigation") || text.includes("communication")) {
      return "Electronics & Sensors"
    }
    if (text.includes("health") || text.includes("medical") || text.includes("pharma") || 
        text.includes("clinical") || text.includes("diagnostic")) {
      return "Health"
    }
    if (text.includes("energy") || text.includes("climate") || text.includes("environment") || 
        text.includes("green") || text.includes("hydrogen") || text.includes("battery")) {
      return "Energy & Environment"
    }
    if (text.includes("transport") || text.includes("mobility") || text.includes("vehicle") ||
        text.includes("aviation") || text.includes("maritime")) {
      return "Transport & Mobility"
    }
    if (text.includes("material") || text.includes("composite") || text.includes("nano")) {
      return "Advanced Materials"
    }
    if (text.includes("security") || text.includes("border") || text.includes("crisis")) {
      return "Security"
    }
    
    return "Research & Innovation"
  }
}
