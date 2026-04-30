/**
 * EU Funding & Tenders Portal Fetcher
 * 
 * Uses the official SEDIA API with correct FormData format
 * to get Open and Forthcoming opportunities.
 * 
 * Status codes:
 * - 31094501 = Forthcoming
 * - 31094502 = Open for submission
 * 
 * Target: < 20 seconds load time
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

// ARQUIMEA technology keywords for relevance filtering
const ARQUIMEA_KEYWORDS = [
  "space", "satellite", "launcher", "orbit", "spacecraft", "esa", "copernicus", "galileo",
  "earth observation", "navigation", "euspa", "aerospace", "aviation",
  "defence", "defense", "military", "edf", "european defence", "security", "dual-use",
  "drone", "uav", "uas", "rpas", "unmanned", "counter-drone",
  "sensor", "radar", "lidar", "electronic", "semiconductor", "photonic",
  "quantum", "ai", "artificial intelligence", "cyber", "digital", "robotics",
  "hydrogen", "battery", "energy storage", "propulsion",
  "material", "composite", "nanotechnology", "research", "innovation"
]

export class EUFundingFetcher {
  private readonly API_URL = "https://api.tech.ec.europa.eu/search-api/prod/rest/search"
  private readonly API_KEY = "SEDIA"
  
  // Status codes from EU Portal
  private readonly STATUS_FORTHCOMING = "31094501"
  private readonly STATUS_OPEN = "31094502"
  
  /**
   * Fetch Open and Forthcoming EU grants using SEDIA API
   */
  async fetchAllGrants(): Promise<EUGrant[]> {
    console.log("[v0] EU SEDIA API - Fetching Open and Forthcoming opportunities...")
    const startTime = Date.now()
    
    try {
      const allGrants: EUGrant[] = []
      
      // Fetch both status types in parallel for speed
      const [openGrants, forthcomingGrants] = await Promise.all([
        this.fetchByStatus(this.STATUS_OPEN, "Open"),
        this.fetchByStatus(this.STATUS_FORTHCOMING, "Forthcoming")
      ])
      
      allGrants.push(...openGrants)
      allGrants.push(...forthcomingGrants)
      
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      console.log(`[v0] EU SEDIA - Total: ${allGrants.length} grants (${openGrants.length} Open, ${forthcomingGrants.length} Forthcoming) in ${elapsed}s`)
      
      return allGrants
      
    } catch (error) {
      console.error("[v0] EU SEDIA - Error:", error instanceof Error ? error.message : error)
      return []
    }
  }
  
  /**
   * Fetch grants by status code using FormData (correct API format)
   */
  private async fetchByStatus(statusCode: string, statusLabel: string): Promise<EUGrant[]> {
    const grants: EUGrant[] = []
    let page = 1
    const pageSize = 100
    let hasMore = true
    
    // Build query filter - must use terms with array
    const query = {
      bool: {
        must: [
          { terms: { type: ["1", "2", "8"] } },  // 1=Calls, 2=Tenders, 8=Topics
          { terms: { status: [statusCode] } }
        ]
      }
    }
    
    const languages = ["en"]
    const sort = { field: "sortStatus", order: "ASC" }
    
    while (hasMore && page <= 50) {  // Max 50 pages = 5000 results per status
      try {
        // Build URL with query params
        const params = new URLSearchParams({
          apiKey: this.API_KEY,
          text: "*",
          pageSize: pageSize.toString(),
          pageNumber: page.toString()
        })
        
        const url = `${this.API_URL}?${params.toString()}`
        
        // Create FormData with blobs (this is the correct format!)
        const formData = new FormData()
        formData.append("query", new Blob([JSON.stringify(query)], { type: "application/json" }))
        formData.append("languages", new Blob([JSON.stringify(languages)], { type: "application/json" }))
        formData.append("sort", new Blob([JSON.stringify(sort)], { type: "application/json" }))
        
        // Timeout after 10 seconds per request
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000)
        
        const response = await fetch(url, {
          method: "POST",
          body: formData,
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.log(`[v0] EU SEDIA ${statusLabel} - HTTP ${response.status}: ${errorText.substring(0, 100)}`)
          break
        }
        
        const data = await response.json()
        
        if (page === 1) {
          console.log(`[v0] EU SEDIA ${statusLabel} - Total available: ${data.totalResults || 0}`)
        }
        
        if (!data.results || data.results.length === 0) {
          hasMore = false
          break
        }
        
        // Parse results
        for (const result of data.results) {
          const grant = this.parseResult(result, statusLabel)
          if (grant) {
            grants.push(grant)
          }
        }
        
        // Check pagination
        const totalResults = data.totalResults || 0
        hasMore = (page * pageSize) < totalResults && data.results.length === pageSize
        page++
        
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          console.log(`[v0] EU SEDIA ${statusLabel} - Timeout on page ${page}`)
        } else {
          console.log(`[v0] EU SEDIA ${statusLabel} - Error on page ${page}:`, error instanceof Error ? error.message : error)
        }
        break
      }
    }
    
    console.log(`[v0] EU SEDIA ${statusLabel} - Fetched ${grants.length} grants`)
    return grants
  }
  
  /**
   * Parse API result to EUGrant
   */
  private parseResult(result: any, statusLabel: string): EUGrant | null {
    try {
      const metadata = result.metadata || {}
      const content = result.content || ""
      
      // Get identifier
      const identifier = metadata.identifier?.[0] || metadata.topicIdentifier?.[0] || `EU-${Date.now()}-${Math.random().toString(36).substring(7)}`
      
      // Get title
      const title = metadata.title?.[0] || content.substring(0, 100) || identifier
      
      // Get dates
      const deadline = this.parseApiDate(metadata.deadlineDate?.[0] || metadata.deadline?.[0])
      const openingDate = this.parseApiDate(metadata.openingDate?.[0] || metadata.startDate?.[0])
      const publishDate = this.parseApiDate(metadata.publicationDate?.[0]) || new Date().toISOString().split("T")[0]
      
      // Get budget
      const budget = metadata.budgetOverview?.[0] || metadata.budget?.[0] || ""
      
      // Get description
      const description = (metadata.description?.[0] || metadata.descriptionByte?.[0] || content || "").substring(0, 500)
      
      // Get programme
      const programme = metadata.programmePeriod?.[0] || metadata.frameworkProgramme?.[0] || "EU Funding & Tenders"
      
      // Build URL
      const url = `https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/${identifier.toLowerCase()}`
      
      // Check relevance to ARQUIMEA
      const fullText = `${title} ${description}`.toLowerCase()
      const isRelevant = ARQUIMEA_KEYWORDS.some(kw => fullText.includes(kw.toLowerCase()))
      
      if (!isRelevant) {
        return null // Skip irrelevant grants
      }
      
      // Categorize
      const category = this.categorize(title, description)
      
      return {
        id: `EU-${identifier}`,
        title,
        organization: "European Commission",
        publishDate,
        deadline,
        openingDate,
        amount: budget,
        budget,
        category,
        description,
        expedient: identifier,
        callIdentifier: identifier,
        topicIdentifier: identifier,
        sourceUrl: url,
        source: "eu",
        url,
        program: this.mapProgramme(programme),
        status: statusLabel,
        type: "Grant"
      }
      
    } catch (error) {
      return null
    }
  }
  
  /**
   * Parse API date format
   */
  private parseApiDate(dateValue: any): string {
    if (!dateValue) return ""
    
    try {
      // Handle timestamp (milliseconds)
      if (typeof dateValue === "number") {
        return new Date(dateValue).toISOString().split("T")[0]
      }
      
      // Handle string
      const dateStr = String(dateValue)
      
      // Already ISO format
      if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        return dateStr.substring(0, 10)
      }
      
      // Try parsing
      const date = new Date(dateStr)
      if (!isNaN(date.getTime())) {
        return date.toISOString().split("T")[0]
      }
      
      return ""
    } catch {
      return ""
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
    if (p.includes("cef")) return "Connecting Europe Facility"
    if (p.includes("life")) return "LIFE Programme"
    if (p.includes("space") || p.includes("euspa")) return "EU Space Programme"
    if (p.includes("euratom")) return "Euratom"
    if (p.includes("eic")) return "European Innovation Council"
    return prog
  }
  
  /**
   * Categorize grant
   */
  private categorize(title: string, description: string): string {
    const text = `${title} ${description}`.toLowerCase()
    
    if (text.includes("defence") || text.includes("defense") || text.includes("edf") || text.includes("military")) {
      return "Defence & Security"
    }
    if (text.includes("space") || text.includes("satellite") || text.includes("copernicus") || text.includes("galileo")) {
      return "Space"
    }
    if (text.includes("drone") || text.includes("uav") || text.includes("unmanned")) {
      return "Aerospace & Drones"
    }
    if (text.includes("quantum") || text.includes("photonic")) {
      return "Quantum & Photonics"
    }
    if (text.includes("cyber") || text.includes("ai") || text.includes("digital")) {
      return "Digital & AI"
    }
    if (text.includes("sensor") || text.includes("radar") || text.includes("electronic")) {
      return "Electronics & Sensors"
    }
    if (text.includes("energy") || text.includes("hydrogen") || text.includes("climate")) {
      return "Energy & Environment"
    }
    if (text.includes("security") || text.includes("border")) {
      return "Security"
    }
    
    return "Research & Innovation"
  }
}
