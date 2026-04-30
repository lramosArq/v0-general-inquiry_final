/**
 * EU Funding Fetcher - Uses Official SEDIA API
 * 
 * Connects to the EU Funding & Tenders Portal API to fetch ALL
 * Open for submission and Forthcoming opportunities.
 * 
 * API: https://api.tech.ec.europa.eu/search-api/prod/rest/search
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
  }
}

interface SEDIAResponse {
  results?: SEDIAResult[]
  totalResults?: number
  pageSize?: number
  pageNumber?: number
}

export class EUFundingFetcher {
  private readonly API_URL = "https://api.tech.ec.europa.eu/search-api/prod/rest/search"
  private readonly API_KEY = "SEDIA"
  
  /**
   * Fetch ALL Open and Forthcoming grants from EU Portal
   */
  async fetchAllGrants(): Promise<EUGrant[]> {
    console.log("[v0] EU API - Fetching Open and Forthcoming opportunities...")
    
    const startTime = Date.now()
    const allGrants: EUGrant[] = []
    
    // Fetch Open for submission (status code: 31094501)
    const openGrants = await this.fetchByStatusCode("31094501", "Open")
    allGrants.push(...openGrants)
    
    // Fetch Forthcoming (status code: 31094502)
    const forthcomingGrants = await this.fetchByStatusCode("31094502", "Forthcoming")
    allGrants.push(...forthcomingGrants)
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`[v0] EU API - Total: ${allGrants.length} grants (${openGrants.length} Open, ${forthcomingGrants.length} Forthcoming) in ${elapsed}s`)
    
    return allGrants
  }

  /**
   * Fetch grants by status code using SEDIA API
   */
  private async fetchByStatusCode(statusCode: string, statusLabel: string): Promise<EUGrant[]> {
    const grants: EUGrant[] = []
    let page = 1
    const pageSize = 100
    let hasMore = true
    
    while (hasMore) {
      try {
        // Build URL with all required query parameters
        const params = new URLSearchParams({
          apiKey: this.API_KEY,
          text: "*",
          pageSize: pageSize.toString(),
          pageNumber: page.toString(),
        })
        
        const url = `${this.API_URL}?${params.toString()}`
        
        // Build request body with query filter
        const body = {
          languages: ["en"],
          sort: { field: "deadlineDate", order: "ASC" },
          query: {
            bool: {
              must: [
                { terms: { type: ["1", "2", "8"] } }, // 1=Calls, 2=Topics, 8=Lots
                { terms: { status: [statusCode] } }
              ]
            }
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
          console.log(`[v0] EU API - Error ${response.status} for ${statusLabel} page ${page}: ${errorText.substring(0, 200)}`)
          break
        }
        
        const data: SEDIAResponse = await response.json()
        
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
        const currentCount = page * pageSize
        hasMore = currentCount < totalResults && data.results.length === pageSize
        
        if (page === 1) {
          console.log(`[v0] EU API - ${statusLabel}: ${totalResults} total results`)
        }
        
        page++
        
        // Safety limit
        if (page > 50) {
          console.log(`[v0] EU API - Reached page limit for ${statusLabel}`)
          hasMore = false
        }
        
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          console.log(`[v0] EU API - Timeout for ${statusLabel} page ${page}`)
        } else {
          console.log(`[v0] EU API - Error fetching ${statusLabel} page ${page}:`, error instanceof Error ? error.message : error)
        }
        break
      }
    }
    
    console.log(`[v0] EU API - Fetched ${grants.length} ${statusLabel} grants`)
    return grants
  }

  /**
   * Parse SEDIA API result to EUGrant
   */
  private parseResult(result: SEDIAResult, status: string): EUGrant | null {
    try {
      const meta = result.metadata
      if (!meta) return null
      
      const identifier = meta.identifier?.[0] || meta.ccm2Id?.[0] || ""
      const title = meta.title?.[0] || meta.callTitle?.[0] || ""
      
      if (!identifier && !title) return null
      
      const deadline = meta.deadlineDate?.[0] || ""
      const openingDate = meta.startDate?.[0] || ""
      const budget = meta.budgetOverviewLine?.[0] || ""
      const programme = meta.frameworkProgramme?.[0] || ""
      const typeStr = meta.type?.[0] || ""
      const keywords = meta.keywords?.join(", ") || ""
      const destination = meta.destinationDetails?.[0] || ""
      
      // Build description
      const descParts: string[] = []
      if (title) descParts.push(title)
      if (destination) descParts.push(`Area: ${destination}`)
      if (keywords) descParts.push(`Keywords: ${keywords.substring(0, 100)}`)
      if (budget) descParts.push(`Budget: ${budget}`)
      
      const description = descParts.join(" | ").substring(0, 400)
      
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
        callIdentifier: identifier,
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
      // Handle timestamp
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
    if (p.includes("edf") || p.includes("defence")) return "European Defence Fund"
    if (p.includes("digital")) return "Digital Europe"
    if (p.includes("cef") || p.includes("connecting")) return "Connecting Europe Facility"
    if (p.includes("life")) return "LIFE Programme"
    if (p.includes("erasmus")) return "Erasmus+"
    if (p.includes("creative")) return "Creative Europe"
    if (p.includes("health") || p.includes("eu4h")) return "EU4Health"
    if (p.includes("space") || p.includes("euspa")) return "EU Space Programme"
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
    return "Grant"
  }

  /**
   * Categorize grant based on content
   */
  private categorize(title: string, destination: string, keywords: string): string {
    const text = `${title} ${destination} ${keywords}`.toLowerCase()
    
    if (text.includes("defence") || text.includes("defense") || text.includes("edf") || text.includes("military")) {
      return "Defence & Security"
    }
    if (text.includes("space") || text.includes("satellite") || text.includes("launcher") || text.includes("orbit")) {
      return "Space"
    }
    if (text.includes("drone") || text.includes("uav") || text.includes("unmanned") || text.includes("aerospace")) {
      return "Aerospace & Drones"
    }
    if (text.includes("quantum") || text.includes("photonic")) {
      return "Quantum & Photonics"
    }
    if (text.includes("digital") || text.includes("cyber") || text.includes("artificial intelligence") || text.includes(" ai ")) {
      return "Digital & AI"
    }
    if (text.includes("health") || text.includes("medical") || text.includes("pharma") || text.includes("clinical")) {
      return "Health"
    }
    if (text.includes("energy") || text.includes("climate") || text.includes("environment") || text.includes("green")) {
      return "Energy & Environment"
    }
    if (text.includes("transport") || text.includes("mobility") || text.includes("vehicle")) {
      return "Transport & Mobility"
    }
    if (text.includes("biotech") || text.includes("bio-") || text.includes("agri")) {
      return "Biotechnology & Agriculture"
    }
    
    return "Research & Innovation"
  }
}
