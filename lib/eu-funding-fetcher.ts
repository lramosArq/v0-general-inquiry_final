/**
 * EU Funding Fetcher - Multiple Sources
 * 
 * Sources:
 * 1. EC RSS Feed - Primary source with real-time call updates
 * 2. Funding & Tenders Portal API - Direct search
 * 3. TED API v3 - Procurement notices
 * 
 * Search logic is ADDITIVE (OR) - each keyword expands results
 * ARQUIMEA filter is applied at the end to keep relevant grants
 */

// ARQUIMEA tech map keywords - used to filter relevant results
// Search is ADDITIVE - any match counts, not all required
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
  "security", "critical infrastructure",
  "AI", "artificial intelligence",
  "communication", "electronics",
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
  // Check if grant matches ANY keyword (OR logic, not AND)
  private matchesArquimeaTechMap(title: string, description: string): boolean {
    const text = `${title} ${description}`.toLowerCase()
    // OR logic - match ANY keyword
    return ARQUIMEA_EU_KEYWORDS.some(keyword => 
      text.includes(keyword.toLowerCase())
    )
  }

  async fetchAllGrants(keyword?: string): Promise<EUGrant[]> {
    console.log("[v0] EU - Fetching from multiple sources (additive search)...")

    const allGrants: EUGrant[] = []

    // Source 1: EC RSS Feed (primary - has real opportunities)
    try {
      const rssGrants = await this.fetchFromRSSFeed()
      console.log(`[v0] EU RSS Feed - Found ${rssGrants.length} grants`)
      allGrants.push(...rssGrants)
    } catch (error) {
      console.log("[v0] EU RSS Feed - Error:", error instanceof Error ? error.message : error)
    }

    // Source 2: Funding & Tenders Portal direct API
    try {
      const portalGrants = await this.fetchFromFundingPortal(keyword)
      console.log(`[v0] EU Portal - Found ${portalGrants.length} grants`)
      allGrants.push(...portalGrants)
    } catch (error) {
      console.log("[v0] EU Portal - Error:", error instanceof Error ? error.message : error)
    }

    // Source 3: TED API for procurement
    try {
      const tedGrants = await this.fetchFromTED(keyword)
      console.log(`[v0] EU TED - Found ${tedGrants.length} grants`)
      allGrants.push(...tedGrants)
    } catch (error) {
      console.log("[v0] EU TED - Error:", error instanceof Error ? error.message : error)
    }

    // Remove duplicates by ID
    const uniqueGrants = allGrants.filter((g, i, self) => 
      i === self.findIndex(x => x.id === g.id)
    )

    // Apply ARQUIMEA filter (OR logic - any keyword match)
    const relevantGrants = keyword === "all" 
      ? uniqueGrants 
      : uniqueGrants.filter(g => this.matchesArquimeaTechMap(g.title, g.description))

    console.log(`[v0] EU - Total: ${uniqueGrants.length}, After ARQUIMEA filter: ${relevantGrants.length}`)
    return relevantGrants
  }

  /**
   * Fetch from EC Funding & Tenders RSS Feed
   * URL: https://ec.europa.eu/info/funding-tenders/opportunities/data/referenceData/callupdates-rss.xml
   */
  private async fetchFromRSSFeed(): Promise<EUGrant[]> {
    const grants: EUGrant[] = []
    
    try {
      const rssUrl = "https://ec.europa.eu/info/funding-tenders/opportunities/data/referenceData/callupdates-rss.xml"
      
      const response = await fetch(rssUrl, {
        headers: {
          "Accept": "application/xml, text/xml, application/rss+xml",
          "User-Agent": "Mozilla/5.0 (compatible; Grant Aggregator)",
        },
      })

      if (!response.ok) {
        console.log(`[v0] EU RSS - HTTP ${response.status}`)
        return grants
      }

      const xmlText = await response.text()
      
      // Parse RSS XML - extract items
      const items = this.parseRSSItems(xmlText)
      console.log(`[v0] EU RSS - Parsed ${items.length} items from feed`)
      
      for (const item of items) {
        const grant = this.parseRSSItem(item)
        if (grant) {
          grants.push(grant)
        }
      }
    } catch (error) {
      console.log("[v0] EU RSS - Parse error:", error instanceof Error ? error.message : error)
    }

    return grants
  }

  /**
   * Parse RSS XML to extract items
   */
  private parseRSSItems(xmlText: string): Array<Record<string, string>> {
    const items: Array<Record<string, string>> = []
    
    // Simple XML parsing for RSS items
    const itemMatches = xmlText.match(/<item>([\s\S]*?)<\/item>/gi) || []
    
    for (const itemXml of itemMatches) {
      const item: Record<string, string> = {}
      
      // Extract common RSS fields
      const titleMatch = itemXml.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([\s\S]*?)<\/title>/i)
      item.title = titleMatch ? (titleMatch[1] || titleMatch[2] || "").trim() : ""
      
      const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/i)
      item.link = linkMatch ? linkMatch[1].trim() : ""
      
      const descMatch = itemXml.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([\s\S]*?)<\/description>/i)
      item.description = descMatch ? (descMatch[1] || descMatch[2] || "").trim() : ""
      
      const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)
      item.pubDate = pubDateMatch ? pubDateMatch[1].trim() : ""
      
      const guidMatch = itemXml.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i)
      item.guid = guidMatch ? guidMatch[1].trim() : ""
      
      // Extract topic/call ID from link or guid
      const topicMatch = item.link.match(/topic-details\/([^\/\?]+)/) || 
                         item.guid.match(/([A-Z]+-\d{4}-\d+-\d+)/) ||
                         item.link.match(/call\/([^\/\?]+)/)
      item.topicId = topicMatch ? topicMatch[1] : ""
      
      if (item.title) {
        items.push(item)
      }
    }
    
    return items
  }

  /**
   * Parse RSS item into EUGrant format
   */
  private parseRSSItem(item: Record<string, string>): EUGrant | null {
    try {
      const title = item.title || ""
      if (!title) return null
      
      const id = item.topicId || item.guid || `RSS-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const description = item.description || title
      const link = item.link || `https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/${id}`
      const pubDate = item.pubDate ? this.formatDate(item.pubDate) : ""
      
      // Extract deadline from description if present
      const deadlineMatch = description.match(/deadline[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/i) ||
                           description.match(/closes?[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i)
      const deadline = deadlineMatch ? this.formatDate(deadlineMatch[1]) : ""
      
      // Detect program from title/description
      let program = "EU Funding"
      const textLower = `${title} ${description}`.toLowerCase()
      if (textLower.includes("horizon")) program = "Horizon Europe"
      else if (textLower.includes("edf") || textLower.includes("defence fund")) program = "European Defence Fund"
      else if (textLower.includes("digital europe")) program = "Digital Europe"
      else if (textLower.includes("cef") || textLower.includes("connecting europe")) program = "Connecting Europe Facility"
      else if (textLower.includes("life")) program = "LIFE Programme"
      else if (textLower.includes("creative europe")) program = "Creative Europe"
      else if (textLower.includes("erasmus")) program = "Erasmus+"
      
      return {
        id: `EU-${id}`,
        title,
        organization: "European Commission",
        publishDate: pubDate,
        deadline,
        amount: "",
        category: this.categorizeGrant(title, description),
        description: this.stripHtml(description).substring(0, 500),
        expedient: id,
        sourceUrl: link,
        source: "eu",
        url: link,
        program,
        status: "Open",
      }
    } catch {
      return null
    }
  }

  /**
   * Fetch from Funding & Tenders Portal API
   */
  private async fetchFromFundingPortal(keyword?: string): Promise<EUGrant[]> {
    const grants: EUGrant[] = []

    try {
      // Use the search API endpoint
      const baseUrl = "https://api.tech.ec.europa.eu/search-api/prod/rest/search"
      
      // Search for multiple terms (additive)
      const searchTerms = keyword && keyword !== "all"
        ? [keyword]
        : ["defence", "space", "security", "aerospace", "drone", "satellite", "quantum"]
      
      for (const term of searchTerms) {
        const params = new URLSearchParams({
          apiKey: "SEDIA",
          text: term,
          pageSize: "50",
          pageNumber: "1",
        })

        const body = {
          bool: {
            must: [
              { term: { type: "1" } }, // Topics/Calls
            ],
            should: [
              { term: { status: "31094501" } }, // Open
              { term: { status: "31094502" } }, // Forthcoming
            ],
            minimumShouldMatch: 1,
          },
          sort: [{ field: "deadlineDate", order: "asc" }]
        }

        const response = await fetch(`${baseUrl}?${params.toString()}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify(body),
        })

        if (!response.ok) continue

        const data = await response.json()
        
        if (data?.results && Array.isArray(data.results)) {
          for (const item of data.results) {
            const grant = this.parsePortalResult(item)
            if (grant && !grants.some(g => g.id === grant.id)) {
              grants.push(grant)
            }
          }
        }
      }
    } catch (error) {
      console.log("[v0] EU Portal API error:", error instanceof Error ? error.message : error)
    }

    return grants
  }

  /**
   * Parse Portal API result
   */
  private parsePortalResult(item: Record<string, unknown>): EUGrant | null {
    try {
      const id = (item.identifier || item.ccm2Id || item.id || "") as string
      const title = (item.title || "") as string
      
      if (!id || !title) return null

      const description = (item.description || item.callTitle || title) as string
      const deadline = item.deadlineDate ? this.formatDate(item.deadlineDate as string) : ""
      const publishDate = item.publicationDate ? this.formatDate(item.publicationDate as string) : ""
      
      const budget = item.budget
      const amount = typeof budget === "string" && budget ? budget : ""
      
      const statusCode = item.status as string
      let status = "Open"
      if (statusCode === "31094502") status = "Forthcoming"
      else if (statusCode === "31094503") status = "Closed"
      
      const program = (item.programmeName || item.ccm2Id || "EU Funding") as string
      const topicId = id.toLowerCase().replace(/\s+/g, "-")
      const portalUrl = `https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/${topicId}`

      return {
        id: `EU-${id}`,
        title,
        organization: program,
        publishDate,
        deadline,
        amount,
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
   * Fetch from TED API v3
   */
  private async fetchFromTED(keyword?: string): Promise<EUGrant[]> {
    const grants: EUGrant[] = []

    try {
      const apiUrl = "https://api.ted.europa.eu/v3/notices/search"
      
      // Simple query - just search for open notices
      // Don't over-filter, let ARQUIMEA filter handle relevance
      const requestBody = {
        query: "TD=[CN,CAN]", // Contract notices and Contract award notices
        fields: [
          "publication-number",
          "notice-title",
          "announcement-title",
          "organisation-name-buyer",
          "publication-date",
          "deadline",
          "notice-type",
          "description-lot",
          "title-lot"
        ],
        page: 1,
        limit: 100,
        scope: "ACTIVE",
        paginationMode: "PAGE_NUMBER",
        onlyLatestVersions: true,
      }

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => "")
        console.log(`[v0] EU TED - HTTP ${response.status}: ${errorText.slice(0, 200)}`)
        return grants
      }

      const data = await response.json()
      const notices = data.notices || data.results || []
      
      for (const notice of notices) {
        const grant = this.parseTEDNotice(notice)
        if (grant) {
          grants.push(grant)
        }
      }
    } catch (error) {
      console.log("[v0] EU TED - Error:", error instanceof Error ? error.message : error)
    }

    return grants
  }

  /**
   * Parse TED notice
   */
  private parseTEDNotice(notice: Record<string, unknown>): EUGrant | null {
    try {
      const id = (notice["publication-number"] || notice.id || "") as string
      const title = (notice["notice-title"] || notice["announcement-title"] || notice["title-lot"] || "") as string
      
      if (!id || !title) return null

      const organization = (notice["organisation-name-buyer"] || "European Commission") as string
      const publishDate = this.formatDate((notice["publication-date"] || "") as string)
      const deadline = this.formatDate((notice["deadline"] || "") as string)
      const description = (notice["description-lot"] || title) as string
      const tedUrl = `https://ted.europa.eu/en/notice/-/detail/${id}`

      return {
        id: `TED-${id}`,
        title,
        organization,
        publishDate,
        deadline,
        amount: "",
        category: this.categorizeGrant(title, description),
        description: description.substring(0, 500),
        expedient: id,
        sourceUrl: tedUrl,
        source: "eu",
        url: tedUrl,
        program: "TED Procurement",
        status: "Open",
      }
    } catch {
      return null
    }
  }

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

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim()
  }

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
    if (text.includes("security") || text.includes("critical")) {
      return "Security"
    }
    
    return "EU Funding"
  }
}
