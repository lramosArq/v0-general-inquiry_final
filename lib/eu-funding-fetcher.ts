/**
 * EU Funding Fetcher - Multi-source Integration
 * 
 * Sources:
 * 1. TED API v3 (api.ted.europa.eu) - Public procurement notices
 * 2. SEDIA API (api.tech.ec.europa.eu) - Funding & Tenders opportunities
 * 
 * Filtered for ARQUIMEA tech map: defence, space, sensors, quantum, etc.
 */

// ARQUIMEA tech map keywords for EU filtering
const ARQUIMEA_EU_KEYWORDS = [
  "UAS", "UAV", "drone", "unmanned", "RPAS",
  "space", "satellite", "Copernicus", "Galileo", "ESA", "orbit",
  "defence", "defense", "EDF", "military", "dual-use",
  "sensor", "radar", "lidar", "surveillance", "optical",
  "quantum", "photonic", "gyroscope", "inertial",
  "maritime", "naval", "autonomous",
  "aerospace", "propulsion", "aircraft",
  "robotic", "actuator",
  "Horizon", "Digital Europe", "EDIRPA",
]

export interface EUGrant {
  id: string
  title: string
  organization: string
  publishDate: string
  deadline: string
  amount?: string
  category: string
  description: string
  expedient: string
  sourceUrl: string
  source: "eu"
  url: string
  program?: string
  status?: string
}

export class EUFundingFetcher {
  private matchesArquimeaTechMap(title: string, description: string): boolean {
    const text = `${title} ${description}`.toLowerCase()
    return ARQUIMEA_EU_KEYWORDS.some(keyword => text.toLowerCase().includes(keyword.toLowerCase()))
  }

  async fetchAllGrants(keyword?: string): Promise<EUGrant[]> {
    console.log("[v0] EU - Attempting to fetch real grants from EU APIs...")

    const allGrants: EUGrant[] = []

    // 1. Try TED API v3 (procurement notices)
    try {
      const tedGrants = await this.fetchFromTEDv3(keyword)
      allGrants.push(...tedGrants)
    } catch (error) {
      console.log("[v0] EU TED - Error or not available")
    }

    // 2. Try SEDIA API (funding opportunities)
    const searchTerms = keyword && keyword !== "all" 
      ? [keyword] 
      : ["defence", "space", "drone", "sensor", "quantum"]
    
    for (const term of searchTerms) {
      try {
        const sedialGrants = await this.fetchFromSEDIA(term)
        allGrants.push(...sedialGrants)
        console.log(`[v0] EU SEDIA - "${term}": ${sedialGrants.length} relevant`)
      } catch (error) {
        // Silent fail for individual terms
      }
    }

    // Remove duplicates by ID
    const uniqueGrants = allGrants.filter((g, i, self) => 
      i === self.findIndex(x => x.id === g.id)
    )

    // Filter by ARQUIMEA tech map
    const relevantGrants = uniqueGrants.filter(g => 
      this.matchesArquimeaTechMap(g.title, g.description)
    )

    console.log(`[v0] EU - Total REAL grants found: ${relevantGrants.length}`)
    return relevantGrants
  }

  /**
   * Fetch from TED API v3 - EU Procurement Notices
   * Documentation: https://docs.ted.europa.eu/api/latest/search.html
   * Endpoint: POST https://api.ted.europa.eu/v3/notices/search
   * 
   * Request body fields (per official docs):
   * - query: Expert search query string
   * - fields: Array of fields to return
   * - page: Page number (starts at 1)
   * - limit: Number of results per page
   * - scope: ACTIVE, ARCHIVED, or ALL
   */
  private async fetchFromTEDv3(keyword?: string): Promise<EUGrant[]> {
    const grants: EUGrant[] = []
    const searchTerm = keyword && keyword !== "all" ? keyword : "defence"

    try {
      // TED Expert Query format - search in title and description
      const expertQuery = `TD=[CN,PIN,CAN] AND FT~"${searchTerm}"`
      
      const requestBody = {
        query: expertQuery,
        fields: [
          "publication-number",
          "title",
          "buyer-name",
          "publication-date",
          "deadline-receipt-request",
          "cpv-description",
          "short-description",
          "estimated-value"
        ],
        page: 1,
        limit: 30,
        scope: "ACTIVE"
      }

      const response = await fetch("https://api.ted.europa.eu/v3/notices/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorBody = await response.text()
        console.log(`[v0] EU TED v3 - HTTP ${response.status}: ${errorBody.substring(0, 200)}`)
        return grants
      }

      const text = await response.text()
      if (!text || text.trim().length === 0) {
        return grants
      }

      let data
      try {
        data = JSON.parse(text)
      } catch {
        console.log("[v0] EU TED v3 - Invalid JSON response")
        return grants
      }

      // Parse TED response - structure varies
      const notices = data.notices || data.results || data.content || []
      if (Array.isArray(notices)) {
        for (const item of notices) {
          const grant = this.parseTEDNotice(item)
          if (grant && this.matchesArquimeaTechMap(grant.title, grant.description)) {
            grants.push(grant)
          }
        }
      }

      console.log(`[v0] EU TED v3 - Found ${grants.length} relevant notices`)
    } catch (error) {
      console.log("[v0] EU TED v3 - API error:", error instanceof Error ? error.message : "Unknown")
    }

    return grants
  }

  /**
   * Parse a TED API notice into EUGrant format
   */
  private parseTEDNotice(item: Record<string, unknown>): EUGrant | null {
    try {
      const id = (item["publication-number"] || item.publicationNumber || item.id || "") as string
      const title = (item.title || item.titleText || "") as string
      
      if (!id || !title) return null

      const description = (item["short-description"] || item.shortDescription || title) as string
      const deadline = (item["deadline-receipt-request"] || item.deadline || "") as string
      const publishDate = (item["publication-date"] || item.publicationDate || "") as string
      const buyerName = (item["buyer-name"] || item.buyerName || "EU Institution") as string
      const cpv = (item["cpv-description"] || item.cpvDescription || "EU Tender") as string
      const value = item["estimated-value"] || item.estimatedValue

      return {
        id,
        title,
        organization: buyerName,
        publishDate: this.formatDate(publishDate),
        deadline: this.formatDate(deadline),
        amount: value ? `EUR ${value}` : "",
        category: cpv,
        description: description.substring(0, 500),
        expedient: id,
        sourceUrl: `https://ted.europa.eu/en/notice/-/detail/${id}`,
        source: "eu",
        url: `https://ted.europa.eu/en/notice/-/detail/${id}`,
        program: "TED Procurement",
        status: "Open"
      }
    } catch {
      return null
    }
  }

  /**
   * Fetch from SEDIA API - EU Funding & Tenders Portal
   * Endpoint: https://api.tech.ec.europa.eu/search-api/prod/rest/search
   */
  private async fetchFromSEDIA(keyword: string): Promise<EUGrant[]> {
    const grants: EUGrant[] = []

    try {
      const apiUrl = "https://api.tech.ec.europa.eu/search-api/prod/rest/search"
      
      // SEDIA API query parameters
      const queryParams = new URLSearchParams({
        apiKey: "SEDIA",
        text: keyword,
        pageSize: "30",
        pageNumber: "1",
      })

      // Filter for open/forthcoming funding opportunities
      const requestBody = {
        bool: {
          must: [
            { term: { type: "1" } }, // Type 1 = Topics/Calls
            { term: { programmePeriod: "2021 - 2027" } },
          ],
          should: [
            { term: { status: "31094501" } }, // Open
            { term: { status: "31094502" } }, // Forthcoming
          ]
        },
        sort: [{ field: "deadlineDate", order: "asc" }]
      }

      const response = await fetch(`${apiUrl}?${queryParams.toString()}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        return grants
      }

      const text = await response.text()
      if (!text || text.trim().length === 0) {
        return grants
      }

      let data
      try {
        data = JSON.parse(text)
      } catch {
        return grants
      }

      // Parse SEDIA response
      if (data && data.results && Array.isArray(data.results)) {
        for (const item of data.results) {
          const grant = this.parseSEDIAResult(item, keyword)
          if (grant) {
            grants.push(grant)
          }
        }
      }

    } catch (error) {
      // Silent fail
    }

    return grants
  }

  /**
   * Parse a SEDIA API result into EUGrant format
   */
  private parseSEDIAResult(item: Record<string, unknown>, source: string): EUGrant | null {
    try {
      const id = (item.identifier || item.ccm2Id || item.id || "") as string
      const title = (item.title || "") as string
      
      if (!id || !title) return null

      const description = (item.description || item.callTitle || title) as string
      const deadlineRaw = item.deadlineDate || item.deadline || item.closingDate
      const deadline = deadlineRaw ? this.formatDate(deadlineRaw as string) : ""
      const publishRaw = item.publicationDate || item.startDate || item.openingDate
      const publishDate = publishRaw ? this.formatDate(publishRaw as string) : ""
      const budget = item.budget || ""
      const amount = typeof budget === "string" && budget ? budget : (budget ? `EUR ${budget}` : "")
      
      const statusCode = item.status as string
      let status = "Unknown"
      if (statusCode === "31094501") status = "Open"
      else if (statusCode === "31094502") status = "Forthcoming"
      else if (statusCode === "31094503") status = "Closed"

      const program = (item.programmeName || item.ccm2Id || source) as string
      const topicId = id.toLowerCase().replace(/\s+/g, "-")
      const portalUrl = `https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/${topicId}`

      return {
        id,
        title,
        organization: program || "European Commission",
        publishDate,
        deadline,
        amount: amount as string,
        category: this.categorizeGrant(title, description),
        description: typeof description === "string" ? description.substring(0, 500) : title,
        expedient: id,
        sourceUrl: portalUrl,
        source: "eu",
        url: portalUrl,
        program,
        status,
      }
    } catch {
      return null
    }
  }

  /**
   * Format date from various formats to YYYY-MM-DD
   */
  private formatDate(dateStr: string): string {
    try {
      if (!dateStr) return ""
      
      if (typeof dateStr === "number" || /^\d{13}$/.test(dateStr)) {
        return new Date(Number(dateStr)).toISOString().split("T")[0]
      }
      
      if (dateStr.includes("T")) {
        return dateStr.split("T")[0]
      }
      
      const date = new Date(dateStr)
      if (!isNaN(date.getTime())) {
        return date.toISOString().split("T")[0]
      }
      
      return dateStr
    } catch {
      return dateStr
    }
  }

  /**
   * Categorize grant based on content
   */
  private categorizeGrant(title: string, description: string): string {
    const text = `${title} ${description}`.toLowerCase()
    
    if (text.includes("edf") || text.includes("defence") || text.includes("defense")) {
      return "European Defence Fund"
    }
    if (text.includes("space") || text.includes("satellite") || text.includes("galileo")) {
      return "EU Space Programme"
    }
    if (text.includes("horizon") || text.includes("research")) {
      return "Horizon Europe"
    }
    if (text.includes("digital") || text.includes("cyber")) {
      return "Digital Europe"
    }
    if (text.includes("drone") || text.includes("uas") || text.includes("uav")) {
      return "UAS/Drones"
    }
    if (text.includes("quantum") || text.includes("photonic")) {
      return "Quantum Technologies"
    }
    if (text.includes("sensor") || text.includes("radar")) {
      return "Sensors & Detection"
    }
    
    return "EU Funding"
  }
}
