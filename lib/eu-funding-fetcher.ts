/**
 * EU Funding Fetcher - SEDIA API Integration
 * Official EU Funding & Tenders Portal API
 * https://api.tech.ec.europa.eu/search-api/prod/rest/search
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

// EU Programs relevant for ARQUIMEA
const EU_PROGRAMS = [
  "EDF", // European Defence Fund
  "HE", // Horizon Europe
  "DIGIT", // Digital Europe Programme
  "EUSPA", // EU Space Programme
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
    console.log("[v0] EU SEDIA - Fetching from official EU Funding & Tenders Portal API...")

    const allGrants: EUGrant[] = []

    // Fetch from SEDIA API for each relevant program
    for (const program of EU_PROGRAMS) {
      try {
        const programGrants = await this.fetchFromSEDIAByProgram(program)
        allGrants.push(...programGrants)
        console.log(`[v0] EU SEDIA - ${program}: found ${programGrants.length} opportunities`)
      } catch (error) {
        console.log(`[v0] EU SEDIA - ${program}: error fetching`)
      }
    }

    // Also search by ARQUIMEA keywords
    const searchTerms = ["defence", "space", "drone", "sensor", "quantum"]
    for (const term of searchTerms) {
      try {
        const termGrants = await this.fetchFromSEDIAByKeyword(term)
        allGrants.push(...termGrants)
      } catch (error) {
        console.log(`[v0] EU SEDIA - keyword "${term}": error fetching`)
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

    console.log(`[v0] EU SEDIA - Total unique ARQUIMEA-relevant grants: ${relevantGrants.length}`)
    return relevantGrants
  }

  /**
   * Fetch from SEDIA API by EU Program (EDF, Horizon Europe, etc.)
   */
  private async fetchFromSEDIAByProgram(program: string): Promise<EUGrant[]> {
    const grants: EUGrant[] = []

    try {
      // SEDIA API endpoint
      const apiUrl = "https://api.tech.ec.europa.eu/search-api/prod/rest/search"
      
      // Build query for programme period 2021-2027
      const queryParams = new URLSearchParams({
        apiKey: "SEDIA",
        text: "*",
        pageSize: "50",
        pageNumber: "1",
      })

      const requestBody = {
        bool: {
          must: [
            { term: { type: "1" } }, // Type 1 = Topics/Calls
            { term: { programmePeriod: "2021 - 2027" } },
            { term: { status: ["31094501", "31094502"] } }, // Open and Forthcoming
          ],
          should: [
            { match: { ccm2Id: program } },
            { match: { title: program } },
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
        console.log(`[v0] EU SEDIA Program ${program} - HTTP ${response.status}`)
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
        console.log(`[v0] EU SEDIA - Invalid JSON for program ${program}`)
        return grants
      }

      // Parse SEDIA response
      if (data && data.results && Array.isArray(data.results)) {
        for (const item of data.results) {
          const grant = this.parseSEDIAResult(item, program)
          if (grant) {
            grants.push(grant)
          }
        }
      }

    } catch (error) {
      console.log(`[v0] EU SEDIA Program ${program} - Error:`, error)
    }

    return grants
  }

  /**
   * Fetch from SEDIA API by keyword search
   */
  private async fetchFromSEDIAByKeyword(keyword: string): Promise<EUGrant[]> {
    const grants: EUGrant[] = []

    try {
      const apiUrl = "https://api.tech.ec.europa.eu/search-api/prod/rest/search"
      
      const queryParams = new URLSearchParams({
        apiKey: "SEDIA",
        text: keyword,
        pageSize: "30",
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

    } catch (error) {
      // Silent fail for keyword searches
    }

    return grants
  }

  /**
   * Parse a SEDIA API result into our EUGrant format
   */
  private parseSEDIAResult(item: Record<string, unknown>, source: string): EUGrant | null {
    try {
      // Extract fields from SEDIA response
      const id = (item.identifier || item.ccm2Id || item.id || "") as string
      const title = (item.title || "") as string
      
      if (!id || !title) {
        return null
      }

      // Get description from various possible fields
      const description = (
        item.description || 
        item.callTitle || 
        item.keywords || 
        title
      ) as string

      // Get deadline
      const deadlineRaw = item.deadlineDate || item.deadline || item.closingDate
      const deadline = deadlineRaw ? this.formatDate(deadlineRaw as string) : ""

      // Get publication date
      const publishRaw = item.publicationDate || item.startDate || item.openingDate
      const publishDate = publishRaw ? this.formatDate(publishRaw as string) : ""

      // Get budget/amount
      const budget = item.budget || item.budgetOverviewUrl || ""
      const amount = typeof budget === "string" && budget.includes("EUR") 
        ? budget 
        : (budget ? `EUR ${budget}` : "")

      // Get status
      const statusCode = item.status as string
      let status = "Unknown"
      if (statusCode === "31094501") status = "Open"
      else if (statusCode === "31094502") status = "Forthcoming"
      else if (statusCode === "31094503") status = "Closed"

      // Get program name
      const program = (item.programmeName || item.ccm2Id || source) as string

      // Build the portal URL
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
