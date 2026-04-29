/**
 * EU Funding Fetcher - Uses Official SEDIA API
 * 
 * API Endpoint: https://api.tech.ec.europa.eu/search-api/prod/rest/search
 * 
 * This uses the official European Commission's Funding & Tenders Portal API
 * for fast, reliable access to grant opportunities.
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
  expedient: string // Opportunity/Call Identifier
  callIdentifier?: string
  topicIdentifier?: string
  sourceUrl: string
  source: "eu"
  url: string
  program?: string
  programmePeriod?: string
  status?: string
  type?: string
  keywords?: string[]
  actionType?: string
}

interface SEDIAResult {
  identifier?: string
  ccm2Id?: string
  title?: string
  callTitle?: string
  deadlineDate?: string
  deadlineDates?: string[]
  openingDate?: string
  publicationDate?: string
  status?: string
  budgetOverviewLine?: string
  budgetTopicActionLine?: string
  keywords?: string[]
  tags?: string[]
  frameworkProgramme?: string
  type?: string
  typeOfAction?: string
  programmePeriod?: string
  destination?: string
  destinationDetails?: string
  conditions?: string
  actions?: Array<{
    types?: string[]
    status?: string
    budgets?: Array<{
      budgetTopicActionLump?: number
      budgetYearMapList?: Array<{year?: number, value?: number}>
    }>
  }>
}

interface SEDIAResponse {
  results?: SEDIAResult[]
  totalResults?: number
  page?: number
  pageSize?: number
}

export class EUFundingFetcher {
  private readonly API_URL = "https://api.tech.ec.europa.eu/search-api/prod/rest/search"
  private readonly API_KEY = "SEDIA"
  
  /**
   * Fetch grants from EU SEDIA API
   * Only returns OPEN and FORTHCOMING opportunities
   */
  async fetchAllGrants(): Promise<EUGrant[]> {
    console.log("[v0] EU - Fetching from official SEDIA API...")
    
    const allGrants: EUGrant[] = []
    
    // Fetch Open grants
    const openGrants = await this.fetchByStatus("open")
    allGrants.push(...openGrants)
    console.log(`[v0] EU - Open grants: ${openGrants.length}`)
    
    // Fetch Forthcoming grants
    const forthcomingGrants = await this.fetchByStatus("forthcoming")
    allGrants.push(...forthcomingGrants)
    console.log(`[v0] EU - Forthcoming grants: ${forthcomingGrants.length}`)
    
    console.log(`[v0] EU - Total active grants: ${allGrants.length}`)
    return allGrants
  }

  /**
   * Fetch grants by status (open, forthcoming, closed)
   */
  private async fetchByStatus(status: "open" | "forthcoming" | "closed"): Promise<EUGrant[]> {
    const grants: EUGrant[] = []
    let page = 1
    const pageSize = 100
    let hasMore = true
    
    while (hasMore) {
      try {
        const query = this.buildQuery(status, page, pageSize)
        
        // apiKey MUST be in the query string, not in the body
        const url = `${this.API_URL}?apiKey=${this.API_KEY}`
        
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify(query),
        })
        
        if (!response.ok) {
          console.log(`[v0] EU API - HTTP ${response.status} for ${status} page ${page}`)
          break
        }
        
        const data: SEDIAResponse = await response.json()
        
        if (!data.results || data.results.length === 0) {
          hasMore = false
          break
        }
        
        // Parse results
        for (const result of data.results) {
          const grant = this.parseResult(result, status)
          if (grant) {
            grants.push(grant)
          }
        }
        
        // Check if there are more pages
        const totalResults = data.totalResults || 0
        const currentCount = page * pageSize
        hasMore = currentCount < totalResults && data.results.length === pageSize
        page++
        
        // Safety limit - max 20 pages (2000 results per status)
        if (page > 20) {
          console.log(`[v0] EU API - Reached page limit for ${status}`)
          hasMore = false
        }
        
      } catch (error) {
        console.log(`[v0] EU API - Error fetching ${status} page ${page}:`, error instanceof Error ? error.message : error)
        break
      }
    }
    
    return grants
  }

  /**
   * Build SEDIA API query
   * Note: apiKey goes in query string, not in body
   */
  private buildQuery(status: string, page: number, pageSize: number): object {
    return {
      text: "*",
      pageSize,
      pageNumber: page,
      sort: {
        field: "sortStatus",
        order: "DESC"
      },
      languages: ["en"],
      query: {
        bool: {
          must: [
            {
              terms: {
                type: ["1", "2", "8"] // 1=Call for proposals, 2=Call for tenders, 8=Topics
              }
            },
            {
              terms: {
                status: [this.mapStatus(status)]
              }
            }
          ]
        }
      }
    }
  }

  /**
   * Map status to API values
   */
  private mapStatus(status: string): string {
    switch (status) {
      case "open": return "31094501" // Open for submission
      case "forthcoming": return "31094502" // Forthcoming
      case "closed": return "31094503" // Closed
      default: return "31094501"
    }
  }

  /**
   * Parse SEDIA result into EUGrant
   */
  private parseResult(result: SEDIAResult, statusHint: string): EUGrant | null {
    try {
      const identifier = result.identifier || result.ccm2Id || ""
      if (!identifier) return null
      
      const title = result.title || result.callTitle || identifier
      
      // Extract deadline - use first deadline date if array
      let deadline = ""
      if (result.deadlineDate) {
        deadline = this.formatDate(result.deadlineDate)
      } else if (result.deadlineDates && result.deadlineDates.length > 0) {
        // Get the latest deadline
        const sortedDeadlines = result.deadlineDates.sort()
        deadline = this.formatDate(sortedDeadlines[sortedDeadlines.length - 1])
      }
      
      // Opening date
      const openingDate = result.openingDate ? this.formatDate(result.openingDate) : ""
      
      // Publication date
      const publishDate = result.publicationDate 
        ? this.formatDate(result.publicationDate) 
        : new Date().toISOString().split("T")[0]
      
      // Status
      const status = this.parseStatus(result.status, statusHint)
      
      // Budget
      const budget = this.extractBudget(result)
      
      // Programme
      const program = this.extractProgram(result.frameworkProgramme, identifier)
      
      // Generate description
      const description = this.generateDescription(title, result, budget)
      
      // Build URL
      const url = `https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/${identifier.toLowerCase()}`
      
      // Category
      const category = this.categorizeGrant(title, result.destination || result.destinationDetails || "")
      
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
        sourceUrl: url,
        source: "eu",
        url,
        program,
        programmePeriod: result.programmePeriod,
        status,
        type: result.type || result.typeOfAction || "Grant",
        keywords: result.keywords || result.tags,
        actionType: result.typeOfAction,
      }
    } catch {
      return null
    }
  }

  /**
   * Parse status from API response
   */
  private parseStatus(apiStatus: string | undefined, hint: string): string {
    if (!apiStatus) {
      return hint === "forthcoming" ? "Forthcoming" : "Open"
    }
    
    const statusLower = apiStatus.toLowerCase()
    if (statusLower.includes("open") || statusLower.includes("submission")) {
      return "Open"
    }
    if (statusLower.includes("forthcoming") || statusLower.includes("upcoming")) {
      return "Forthcoming"
    }
    if (statusLower.includes("closed") || statusLower.includes("evaluation")) {
      return "Closed"
    }
    
    return hint === "forthcoming" ? "Forthcoming" : "Open"
  }

  /**
   * Extract budget from result
   */
  private extractBudget(result: SEDIAResult): string {
    // Try direct budget fields
    if (result.budgetOverviewLine) {
      return result.budgetOverviewLine
    }
    if (result.budgetTopicActionLine) {
      return result.budgetTopicActionLine
    }
    
    // Try to extract from actions
    if (result.actions && result.actions.length > 0) {
      for (const action of result.actions) {
        if (action.budgets && action.budgets.length > 0) {
          const budget = action.budgets[0]
          if (budget.budgetTopicActionLump) {
            const value = budget.budgetTopicActionLump
            if (value >= 1000000) {
              return `EUR ${(value / 1000000).toFixed(1)} million`
            }
            return `EUR ${value.toLocaleString()}`
          }
        }
      }
    }
    
    return ""
  }

  /**
   * Extract programme name
   */
  private extractProgram(framework: string | undefined, identifier: string): string {
    const text = `${framework || ""} ${identifier}`.toUpperCase()
    
    if (text.includes("HORIZON")) return "Horizon Europe"
    if (text.includes("EDF")) return "European Defence Fund"
    if (text.includes("DIGITAL")) return "Digital Europe"
    if (text.includes("CEF")) return "Connecting Europe Facility"
    if (text.includes("LIFE")) return "LIFE Programme"
    if (text.includes("ERASMUS")) return "Erasmus+"
    if (text.includes("CREA")) return "Creative Europe"
    if (text.includes("EU4H") || text.includes("HEALTH")) return "EU4Health"
    if (text.includes("EUSPA")) return "EU Space Programme"
    if (text.includes("EDIRPA")) return "EDIRPA"
    if (text.includes("AGRIP")) return "Agricultural Promotion"
    if (text.includes("AMIF")) return "Asylum & Migration Fund"
    if (text.includes("JUST")) return "Justice Programme"
    if (text.includes("CERV")) return "Citizens, Equality, Rights & Values"
    if (text.includes("ISF")) return "Internal Security Fund"
    if (text.includes("EMFAF")) return "Maritime & Fisheries Fund"
    if (text.includes("SMP")) return "Single Market Programme"
    
    return framework || "EU Funding & Tenders"
  }

  /**
   * Generate human-readable description
   */
  private generateDescription(title: string, result: SEDIAResult, budget: string): string {
    const parts: string[] = []
    
    // Clean title
    let mainDesc = title.replace(/^Call\s+/i, "").trim()
    if (/^[A-Z0-9-]+$/.test(mainDesc.replace(/\s/g, ""))) {
      mainDesc = `EU funding opportunity: ${mainDesc}`
    }
    parts.push(mainDesc)
    
    // Add details
    const details: string[] = []
    
    if (result.destination || result.destinationDetails) {
      details.push(`Area: ${result.destination || result.destinationDetails}`)
    }
    
    if (budget) {
      details.push(`Budget: ${budget}`)
    }
    
    if (result.typeOfAction) {
      details.push(`Type: ${result.typeOfAction}`)
    }
    
    if (details.length > 0) {
      parts.push(details.join(" | "))
    }
    
    return parts.join(". ").substring(0, 400)
  }

  /**
   * Categorize grant
   */
  private categorizeGrant(title: string, destination: string): string {
    const text = `${title} ${destination}`.toLowerCase()
    
    if (text.includes("defence") || text.includes("defense") || text.includes("military") || text.includes("edf")) {
      return "Defence & Security"
    }
    if (text.includes("space") || text.includes("satellite") || text.includes("galileo") || text.includes("copernicus")) {
      return "Space"
    }
    if (text.includes("drone") || text.includes("uav") || text.includes("uas") || text.includes("unmanned")) {
      return "Aerospace & Drones"
    }
    if (text.includes("quantum") || text.includes("photonic")) {
      return "Quantum & Photonics"
    }
    if (text.includes("digital") || text.includes("cyber") || text.includes("ai") || text.includes("artificial intelligence")) {
      return "Digital & AI"
    }
    if (text.includes("health") || text.includes("medical") || text.includes("pharma")) {
      return "Health"
    }
    if (text.includes("energy") || text.includes("renewable") || text.includes("climate") || text.includes("green")) {
      return "Energy & Environment"
    }
    if (text.includes("transport") || text.includes("mobility") || text.includes("automotive")) {
      return "Transport & Mobility"
    }
    if (text.includes("research") || text.includes("innovation") || text.includes("horizon")) {
      return "Research & Innovation"
    }
    if (text.includes("education") || text.includes("training") || text.includes("erasmus")) {
      return "Education & Training"
    }
    if (text.includes("culture") || text.includes("creative") || text.includes("media")) {
      return "Culture & Creativity"
    }
    if (text.includes("food") || text.includes("agriculture") || text.includes("bioeconomy")) {
      return "Food & Agriculture"
    }
    if (text.includes("civil") || text.includes("security") || text.includes("society")) {
      return "Civil Security"
    }
    
    return "General"
  }

  /**
   * Format date to ISO format
   */
  private formatDate(dateStr: string): string {
    if (!dateStr) return ""
    
    try {
      // Handle ISO format
      if (dateStr.includes("T") || dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
        return dateStr.split("T")[0]
      }
      
      // Try parsing
      const date = new Date(dateStr)
      if (!isNaN(date.getTime())) {
        return date.toISOString().split("T")[0]
      }
      
      return dateStr
    } catch {
      return dateStr
    }
  }
}
