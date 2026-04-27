/**
 * EU Funding Fetcher
 * Uses EU Funding & Tenders Portal search and verified fallback data
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
  "Horizon", "Digital Europe",
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
}

export class EUFundingFetcher {
  private matchesArquimeaTechMap(title: string, description: string): boolean {
    const text = `${title} ${description}`.toLowerCase()
    return ARQUIMEA_EU_KEYWORDS.some(keyword => text.toLowerCase().includes(keyword.toLowerCase()))
  }

  async fetchAllGrants(keyword?: string): Promise<EUGrant[]> {
    console.log("[v0] EU - Attempting to fetch real grants from EU APIs...")

    const allGrants: EUGrant[] = []

    // Try EU Funding & Tenders Portal SEDIA API
    try {
      const sediaGrants = await this.fetchFromSEDIA(keyword)
      allGrants.push(...sediaGrants)
    } catch (error) {
      console.error("[v0] EU - SEDIA API error:", error)
    }

    // Try TED (Tenders Electronic Daily) API
    try {
      const tedGrants = await this.fetchFromTED(keyword)
      allGrants.push(...tedGrants)
    } catch (error) {
      console.error("[v0] EU - TED API error:", error)
    }

    // Remove duplicates
    const uniqueGrants = allGrants.filter((g, i, self) => 
      i === self.findIndex(x => x.id === g.id)
    )

    console.log(`[v0] EU - Total REAL grants found: ${uniqueGrants.length}`)
    return uniqueGrants
  }

  private async fetchFromSEDIA(keyword?: string): Promise<EUGrant[]> {
    const searchTerms = keyword && keyword !== "all" ? [keyword] : ["defence", "space", "drone"]
    const grants: EUGrant[] = []

    for (const term of searchTerms) {
      try {
        // EU Funding Portal SEDIA search API
        const response = await fetch(
          `https://api.tech.ec.europa.eu/search-api/prod/rest/search?apiKey=SEDIA&text=${encodeURIComponent(term)}&pageSize=20&pageNumber=1`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify({
              bool: {
                must: [{ terms: { type: ["1"] } }] // Topics/Calls
              }
            })
          }
        )

        if (!response.ok) {
          console.log(`[v0] EU SEDIA - HTTP ${response.status} for "${term}"`)
          continue
        }

        const data = await response.json()
        if (data.results && Array.isArray(data.results)) {
          for (const item of data.results) {
            if (item.identifier && item.title && this.matchesArquimeaTechMap(item.title, item.description || "")) {
              grants.push({
                id: item.identifier,
                title: item.title,
                organization: item.programmeName || "European Commission",
                publishDate: item.publicationDate || "",
                deadline: item.deadlineDate || "",
                amount: item.budget || "",
                category: item.typeName || "EU Funding",
                description: item.description || item.title,
                expedient: item.identifier,
                sourceUrl: `https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/${item.identifier.toLowerCase()}`,
                source: "eu",
                url: `https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/${item.identifier.toLowerCase()}`,
              })
            }
          }
        }
        console.log(`[v0] EU SEDIA - "${term}": ${grants.length} relevant`)
      } catch (error) {
        console.error(`[v0] EU SEDIA - Error for "${term}":`, error)
      }
    }

    return grants
  }

  private async fetchFromTED(keyword?: string): Promise<EUGrant[]> {
    const searchTerm = keyword && keyword !== "all" ? keyword : "defence"
    const grants: EUGrant[] = []

    try {
      // TED API v3
      const response = await fetch(
        `https://ted.europa.eu/api/v3.0/notices/search?q=${encodeURIComponent(searchTerm)}&pageNum=1&pageSize=20&scope=3&sortField=PD&sortOrder=desc`,
        { headers: { "Accept": "application/json" } }
      )

      if (!response.ok) {
        console.log(`[v0] EU TED - HTTP ${response.status}`)
        return grants
      }

      // Check if response has content before parsing
      const text = await response.text()
      if (!text || text.trim().length === 0) {
        console.log("[v0] EU TED - Empty response body")
        return grants
      }

      let data
      try {
        data = JSON.parse(text)
      } catch (parseError) {
        console.log("[v0] EU TED - Invalid JSON response")
        return grants
      }

      if (data && data.notices && Array.isArray(data.notices)) {
        for (const item of data.notices) {
          if (item.noticeNumber && item.title && this.matchesArquimeaTechMap(item.title, item.shortDescription || "")) {
            grants.push({
              id: item.noticeNumber,
              title: item.title,
              organization: item.buyerName || "EU Institution",
              publishDate: item.publicationDate || "",
              deadline: item.deadline || "",
              amount: item.estimatedValue ? `EUR ${item.estimatedValue}` : "",
              category: item.cpvDescription || "EU Tender",
              description: item.shortDescription || item.title,
              expedient: item.noticeNumber,
              sourceUrl: `https://ted.europa.eu/en/notice/-/detail/${item.noticeNumber}`,
              source: "eu",
              url: `https://ted.europa.eu/en/notice/-/detail/${item.noticeNumber}`,
            })
          }
        }
      }
      console.log(`[v0] EU TED - Found ${grants.length} relevant notices`)
    } catch (error) {
      console.log("[v0] EU TED - API not available or error occurred")
    }

    return grants
  }
}
