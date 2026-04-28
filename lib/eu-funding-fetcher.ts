/**
 * EU Funding Fetcher - TED API v3 Integration
 * Official Tenders Electronic Daily (TED) Search API
 * https://api.ted.europa.eu/v3/notices/search
 * 
 * Uses correct TED API v3 request body format:
 * - query: Expert search query
 * - fields: Fields to return
 * - page: Page number (1-based)
 * - limit: Max results per page
 * - scope: ACTIVE or ALL
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

    // Try TED API first (primary source)
    const tedGrants = await this.fetchFromTED(keyword)
    if (tedGrants.length > 0) {
      allGrants.push(...tedGrants)
    }

    // Also try SEDIA API as backup
    const searchTerms = ["defence", "space", "drone"]
    for (const term of searchTerms) {
      try {
        const termGrants = await this.fetchFromSEDIA(term)
        allGrants.push(...termGrants)
        console.log(`[v0] EU SEDIA - "${term}": ${termGrants.length} relevant`)
      } catch (error) {
        // Silent fail for SEDIA
      }
    }

    // Remove duplicates by ID
    const uniqueGrants = allGrants.filter((g, i, self) => 
      i === self.findIndex(x => x.id === g.id)
    )

    // Filter by ARQUIMEA tech map if we got generic results
    const relevantGrants = uniqueGrants.filter(g => 
      this.matchesArquimeaTechMap(g.title, g.description)
    )

    console.log(`[v0] EU - Total REAL grants found: ${relevantGrants.length}`)
    return relevantGrants
  }

  /**
   * Fetch from TED API v3 with CORRECT request body format
   * Based on official TED API documentation:
   * - query: Expert search query string
   * - fields: Array of field names to return
   * - page: Result page number (1-based)
   * - limit: Max results per page (not pageSize!)
   * - scope: "ACTIVE" or "ALL"
   */
  private async fetchFromTED(keyword?: string): Promise<EUGrant[]> {
    const grants: EUGrant[] = []

    try {
      // TED API v3 endpoint
      const apiUrl = "https://api.ted.europa.eu/v3/notices/search"

      // Build expert query for defence/space/technology
      const searchTerms = keyword && keyword !== "all" 
        ? [keyword]
        : ["defence", "space", "security", "technology"]
      
      // TED expert query format
      const expertQuery = searchTerms.map(term => 
        `(title CONTAINS "${term}" OR description CONTAINS "${term}")`
      ).join(" OR ")

      // CORRECT request body format for TED API v3
      // NOTE: Uses "limit" NOT "pageSize" - pageSize is invalid!
      // Field names must be from TED's supported values list
      const requestBody = {
        query: expertQuery,
        fields: [
          "publication-number",
          "notice-title",
          "announcement-title",
          "organisation-name-buyer",
          "publication-date",
          "deadline",
          "notice-type",
          "classification-cpv",
          "description-lot",
          "title-lot"
        ],
        page: 1,
        limit: 50,  // NOT pageSize - that's the wrong field name!
        scope: "ACTIVE",
        paginationMode: "PAGE_NUMBER",
        onlyLatestVersions: true,
      }

      console.log("[v0] EU TED - Fetching with correct API format...")

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "")
        console.log(`[v0] EU TED - HTTP ${response.status} and body: ${errorBody.slice(0, 200)}`)
        return grants
      }

      const text = await response.text()
      if (!text || text.trim().length === 0) {
        console.log("[v0] EU TED - Empty response")
        return grants
      }

      let data
      try {
        data = JSON.parse(text)
      } catch {
        console.log("[v0] EU TED - Invalid JSON response")
        return grants
      }

      // Parse TED response
      const notices = data.notices || data.results || []
      console.log(`[v0] EU TED - Received ${notices.length} notices`)

      for (const notice of notices) {
        const grant = this.parseTEDNotice(notice)
        if (grant) {
          grants.push(grant)
        }
      }

    } catch (error) {
      console.log(`[v0] EU TED - Error:`, error instanceof Error ? error.message : error)
    }

    return grants
  }

  /**
   * Parse a TED API notice into our EUGrant format
   */
  private parseTEDNotice(notice: Record<string, unknown>): EUGrant | null {
    try {
      const id = (notice["publication-number"] || notice.id || "") as string
      const title = (notice["notice-title"] || notice["announcement-title"] || notice["title-lot"] || notice.title || "") as string
      
      if (!id || !title) {
        return null
      }

      const organization = (notice["organisation-name-buyer"] || "European Commission") as string
      const publishDate = this.formatDate((notice["publication-date"] || "") as string)
      const deadline = this.formatDate((notice["deadline"] || "") as string)
      const noticeType = (notice["notice-type"] || "") as string
      const description = (notice["description-lot"] || title) as string

      // Build TED portal URL
      const tedUrl = `https://ted.europa.eu/en/notice/-/detail/${id}`

      return {
        id: `TED-${id}`,
        title,
        organization,
        publishDate,
        deadline,
        amount: "",
        category: this.categorizeGrant(title, description),
        description: description.substring(0, 500)
        expedient: id,
        sourceUrl: tedUrl,
        source: "eu",
        url: tedUrl,
        program: "TED Tenders",
        status: "Open",
      }
    } catch {
      return null
    }
  }

  /**
   * Fetch from SEDIA API as backup source
   */
  private async fetchFromSEDIA(keyword: string): Promise<EUGrant[]> {
    const grants: EUGrant[] = []

    try {
      const apiUrl = "https://api.tech.ec.europa.eu/search-api/prod/rest/search"
      
      const queryParams = new URLSearchParams({
        apiKey: "SEDIA",
        text: keyword,
        pageSize: "30",  // SEDIA uses pageSize (different from TED API!)
        pageNumber: "1",
      })

      const requestBody = {
        bool: {
          must: [
            { term: { type: "1" } }, // Topics/Calls
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

      if (data && data.results && Array.isArray(data.results)) {
        for (const item of data.results) {
          const grant = this.parseSEDIAResult(item, keyword)
          if (grant) {
            grants.push(grant)
          }
        }
      }

    } catch {
      // Silent fail for SEDIA
    }

    return grants
  }

  /**
   * Parse a SEDIA API result into our EUGrant format
   */
  private parseSEDIAResult(item: Record<string, unknown>, source: string): EUGrant | null {
    try {
      const id = (item.identifier || item.ccm2Id || item.id || "") as string
      const title = (item.title || "") as string
      
      if (!id || !title) {
        return null
      }

      const description = (item.description || item.callTitle || item.keywords || title) as string
      const deadlineRaw = item.deadlineDate || item.deadline || item.closingDate
      const deadline = deadlineRaw ? this.formatDate(deadlineRaw as string) : ""
      const publishRaw = item.publicationDate || item.startDate || item.openingDate
      const publishDate = publishRaw ? this.formatDate(publishRaw as string) : ""

      const budget = item.budget || item.budgetOverviewUrl || ""
      const amount = typeof budget === "string" && budget.includes("EUR") 
        ? budget 
        : (budget ? `EUR ${budget}` : "")

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
      
      // Handle timestamp format
      if (typeof dateStr === "number" || /^\d{13}$/.test(dateStr)) {
        return new Date(Number(dateStr)).toISOString().split("T")[0]
      }
      
      // Handle ISO format
      if (dateStr.includes("T")) {
        return dateStr.split("T")[0]
      }
      
      // Try parsing as date
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
