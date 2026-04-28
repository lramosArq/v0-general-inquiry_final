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
    console.log("[v0] EU - Fetching ALL grants from EU sources (no pre-filtering)...")

    const allGrants: EUGrant[] = []

    // PRIMARY SOURCE: EU Funding Portal RSS feed - include ALL tenders
    // This feed contains all call updates - we include everything so users can filter in the UI
    const rssGrants = await this.fetchFromRSSFeed()
    if (rssGrants.length > 0) {
      allGrants.push(...rssGrants)
      console.log(`[v0] EU RSS Feed - Loaded ${rssGrants.length} tenders (ALL included)`)
    }

    // SECONDARY: TED API for additional procurement notices
    const tedGrants = await this.fetchFromTED(keyword)
    if (tedGrants.length > 0) {
      allGrants.push(...tedGrants)
      console.log(`[v0] EU TED - Loaded ${tedGrants.length} notices`)
    }

    // TERTIARY: SEDIA API for broader coverage
    const searchTerms = ["defence", "space", "digital", "horizon", "research", "innovation"]
    for (const term of searchTerms) {
      try {
        const termGrants = await this.fetchFromSEDIA(term)
        allGrants.push(...termGrants)
        if (termGrants.length > 0) {
          console.log(`[v0] EU SEDIA - "${term}": ${termGrants.length} loaded`)
        }
      } catch {
        // Silent fail for SEDIA
      }
    }

    // Remove duplicates by ID (keep first occurrence)
    // With improved ID generation, we should have far fewer collisions
    const uniqueGrants = allGrants.filter((g, i, self) => 
      i === self.findIndex(x => x.id === g.id)
    )

    const duplicatesRemoved = allGrants.length - uniqueGrants.length
    if (duplicatesRemoved > 0) {
      console.log(`[v0] EU - Removed ${duplicatesRemoved} duplicate entries`)
    }

    // NO PRE-FILTERING: Return ALL unique grants
    // The platform UI will handle filtering based on user preferences
    // This ensures the platform has the complete feed available
    console.log(`[v0] EU - Total grants loaded: ${uniqueGrants.length} (ALL available for user filtering)`)
    return uniqueGrants
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
      // TED expert query uses ~ for text search, NOT "CONTAINS"
      // Valid operators: NOT, IN, '!=', '=', '~', '!~', COMPARISON_OPERATOR
      const searchTerms = keyword && keyword !== "all" 
        ? [keyword]
        : ["defence", "space", "security", "technology", "drone", "satellite"]
      
      // TED expert query format - use FT~ for full-text search
      const expertQuery = `FT~"${searchTerms.join(" OR ")}"`

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
        description: description.substring(0, 500),
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
   * Fetch from EU Funding Portal RSS Feed
   * https://ec.europa.eu/info/funding-tenders/opportunities/data/referenceData/callupdates-rss.xml
   * This feed contains ALL call updates - we load everything for the platform
   * Users can then filter using the predefined UI filters
   */
  private async fetchFromRSSFeed(): Promise<EUGrant[]> {
    const grants: EUGrant[] = []

    try {
      // Primary RSS feed with all call updates
      const rssUrl = "https://ec.europa.eu/info/funding-tenders/opportunities/data/referenceData/callupdates-rss.xml"
      
      console.log("[v0] EU RSS - Fetching COMPLETE feed from EU Funding Portal...")
      
      const response = await fetch(rssUrl, {
        headers: {
          "Accept": "application/xml, text/xml, application/rss+xml, */*",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Cache-Control": "no-cache",
        },
      })

      if (!response.ok) {
        console.log(`[v0] EU RSS - HTTP ${response.status}`)
        return grants
      }

      const xmlText = await response.text()
      if (!xmlText || xmlText.trim().length === 0) {
        console.log("[v0] EU RSS - Empty response")
        return grants
      }

      // Parse ALL RSS items - no filtering at this stage
      const items = this.parseRSSItems(xmlText)
      console.log(`[v0] EU RSS - Found ${items.length} total items in feed`)

      // Convert ALL items to grants - filtering will happen in the UI
      // Pass index to ensure unique IDs even if other fields are similar
      for (let i = 0; i < items.length; i++) {
        const grant = this.parseRSSItem(items[i], i)
        if (grant) {
          grants.push(grant)
        }
      }

      console.log(`[v0] EU RSS - Successfully parsed ${grants.length} grants from feed`)

    } catch (error) {
      console.log(`[v0] EU RSS - Error:`, error instanceof Error ? error.message : error)
    }

    return grants
  }

  /**
   * Parse RSS XML to extract items
   */
  private parseRSSItems(xml: string): Array<{title: string, link: string, description: string, pubDate: string, guid: string}> {
    const items: Array<{title: string, link: string, description: string, pubDate: string, guid: string}> = []
    
    // Match all <item> blocks
    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    let match

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1]
      
      const getTagContent = (tag: string): string => {
        const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`)
        const tagMatch = itemXml.match(regex)
        return (tagMatch?.[1] || tagMatch?.[2] || "").trim()
      }

      items.push({
        title: getTagContent("title"),
        link: getTagContent("link"),
        description: getTagContent("description"),
        pubDate: getTagContent("pubDate"),
        guid: getTagContent("guid"),
      })
    }

    return items
  }

  /**
   * Parse a single RSS item into EUGrant format
   * Extracts all available information without filtering
   * IMPORTANT: Generate unique IDs to avoid losing items due to duplicates
   */
  private parseRSSItem(item: {title: string, link: string, description: string, pubDate: string, guid: string}, index: number): EUGrant | null {
    try {
      if (!item.title) {
        return null
      }

      // Extract call ID from multiple sources for better identification
      // Priority: guid > link path > link param > generated
      let callId = ""
      
      // Try guid first (most reliable)
      if (item.guid) {
        callId = item.guid.replace(/^.*\//, "").replace(/[^a-zA-Z0-9-_]/g, "")
      }
      
      // Try link if guid didn't work
      if (!callId && item.link) {
        const linkMatch = item.link.match(/\/([A-Z0-9-_]+)(?:\?|#|$)/i) || 
                         item.link.match(/callIdentifier=([^&]+)/) ||
                         item.link.match(/topic[\/=]([^\/&?]+)/i)
        if (linkMatch) {
          callId = linkMatch[1]
        }
      }
      
      // Generate unique ID combining multiple factors to avoid collisions
      // Use title hash + pubDate + index to ensure uniqueness
      const titleHash = item.title.slice(0, 30).replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
      const dateHash = (item.pubDate || "").replace(/[^0-9]/g, "").slice(0, 8)
      const uniqueId = callId || `${titleHash}-${dateHash}-${index}`

      // Parse dates from the item
      const publishDate = item.pubDate ? this.formatDate(item.pubDate) : new Date().toISOString().split("T")[0]
      
      // Try to extract deadline from description - multiple patterns
      const deadlinePatterns = [
        /deadline[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
        /closes?[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
        /(\d{4}[\/\-]\d{2}[\/\-]\d{2})/,
        /(\d{1,2}\s+\w+\s+\d{4})/i,
      ]
      let deadline = ""
      for (const pattern of deadlinePatterns) {
        const match = item.description?.match(pattern)
        if (match) {
          deadline = this.formatDate(match[1])
          break
        }
      }

      // Clean HTML from description
      const cleanDescription = (item.description || item.title)
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#\d+;/g, "")
        .replace(/\s+/g, " ")
        .trim()

      // Try to extract budget/amount from description
      const budgetMatch = cleanDescription.match(/(?:budget|amount|funding)[:\s]*(?:EUR|€)?\s*([\d.,]+\s*(?:million|M|billion|B)?)/i)
      const amount = budgetMatch ? `EUR ${budgetMatch[1]}` : ""

      // Extract programme from title or description
      const programPatterns = [
        /(Horizon\s*(?:Europe|2020)?)/i,
        /(EDF|European\s*Defence\s*Fund)/i,
        /(Digital\s*Europe)/i,
        /(LIFE)/i,
        /(Erasmus\+?)/i,
        /(CEF|Connecting\s*Europe)/i,
        /(EU4Health)/i,
        /(EUSPA)/i,
        /(EDIRPA)/i,
        /(Creative\s*Europe)/i,
      ]
      let program = "EU Funding & Tenders Portal"
      for (const pattern of programPatterns) {
        const match = (item.title + " " + cleanDescription).match(pattern)
        if (match) {
          program = match[1]
          break
        }
      }

      // Determine URL - use link if available, otherwise construct from ID
      const url = item.link || `https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/${callId.toLowerCase() || uniqueId}`

      return {
        id: `EU-RSS-${uniqueId}`,
        title: item.title,
        organization: "European Commission",
        publishDate,
        deadline,
        amount,
        category: this.categorizeGrant(item.title, cleanDescription),
        description: cleanDescription.substring(0, 500),
        expedient: callId || uniqueId,
        sourceUrl: url,
        source: "eu",
        url,
        program,
        status: deadline && new Date(deadline) > new Date() ? "Open" : "Open", // Assume open since it's in RSS feed
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
