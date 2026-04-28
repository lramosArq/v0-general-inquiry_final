/**
 * EU Funding Fetcher - Enhanced with detailed opportunity information
 * 
 * Sources:
 * 1. EU Funding Portal RSS Feed (primary - all call updates)
 * 2. SEDIA API (detailed topic information)
 * 3. TED API v3 (procurement notices)
 * 
 * Features:
 * - Full opportunity details including Opportunity Number (not topic number)
 * - Complete descriptions from SEDIA API
 * - All relevant dates (opening, deadline, etc.)
 * - Budget/amount extraction
 * - Programme identification
 */

// ARQUIMEA tech map keywords for categorization
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
  type?: string // Grant, Tender, etc.
  keywords?: string[]
  actionType?: string
}

export class EUFundingFetcher {
  async fetchAllGrants(keyword?: string): Promise<EUGrant[]> {
    console.log("[v0] EU - Fetching ALL grants with FULL details from EU sources...")

    const allGrants: EUGrant[] = []

    // PRIMARY SOURCE: SEDIA API for detailed topic/call information
    // This gives us complete descriptions, dates, budgets, etc.
    const sediaGrants = await this.fetchFromSEDIADetailed()
    if (sediaGrants.length > 0) {
      allGrants.push(...sediaGrants)
      console.log(`[v0] EU SEDIA - Loaded ${sediaGrants.length} detailed opportunities`)
    }

    // SECONDARY: RSS Feed for any additional updates
    const rssGrants = await this.fetchFromRSSFeed()
    if (rssGrants.length > 0) {
      // Only add RSS grants that aren't already in SEDIA results
      const existingIds = new Set(allGrants.map(g => g.callIdentifier || g.expedient))
      const newRssGrants = rssGrants.filter(g => !existingIds.has(g.callIdentifier || g.expedient))
      allGrants.push(...newRssGrants)
      console.log(`[v0] EU RSS - Added ${newRssGrants.length} additional opportunities`)
    }

    // TERTIARY: TED API for procurement notices
    const tedGrants = await this.fetchFromTED(keyword)
    if (tedGrants.length > 0) {
      allGrants.push(...tedGrants)
      console.log(`[v0] EU TED - Loaded ${tedGrants.length} procurement notices`)
    }

    // Remove duplicates by multiple criteria
    const uniqueGrants = this.deduplicateGrants(allGrants)

    console.log(`[v0] EU - Total unique opportunities loaded: ${uniqueGrants.length}`)
    return uniqueGrants
  }

  /**
   * Fetch detailed topic/call information from SEDIA API
   * This provides complete descriptions, all dates, budgets, etc.
   */
  private async fetchFromSEDIADetailed(): Promise<EUGrant[]> {
    const grants: EUGrant[] = []

    try {
      const apiUrl = "https://api.tech.ec.europa.eu/search-api/prod/rest/search"
      
      // Search for all open and forthcoming calls
      const statuses = ["31094501", "31094502"] // Open, Forthcoming
      
      for (const status of statuses) {
        try {
          const queryParams = new URLSearchParams({
            apiKey: "SEDIA",
            text: "*", // All results
            pageSize: "100",
            pageNumber: "1",
          })

          const requestBody = {
            bool: {
              must: [
                { term: { type: "1" } }, // Topics/Calls
                { term: { status: status } },
              ]
            },
            sort: [{ field: "deadlineDate", order: "asc" }]
          }

          console.log(`[v0] EU SEDIA - Fetching status ${status === "31094501" ? "Open" : "Forthcoming"}...`)

          const response = await fetch(`${apiUrl}?${queryParams.toString()}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
            },
            body: JSON.stringify(requestBody),
          })

          if (!response.ok) {
            console.log(`[v0] EU SEDIA - HTTP ${response.status}`)
            continue
          }

          const data = await response.json()
          
          if (data && data.results && Array.isArray(data.results)) {
            console.log(`[v0] EU SEDIA - Found ${data.results.length} results for status ${status}`)
            
            for (const item of data.results) {
              const grant = this.parseSEDIADetailedResult(item)
              if (grant) {
                grants.push(grant)
              }
            }
          }

          // Fetch additional pages if available
          const totalResults = data.totalResults || 0
          const totalPages = Math.ceil(totalResults / 100)
          
          for (let page = 2; page <= Math.min(totalPages, 10); page++) {
            const pageParams = new URLSearchParams({
              apiKey: "SEDIA",
              text: "*",
              pageSize: "100",
              pageNumber: page.toString(),
            })

            const pageResponse = await fetch(`${apiUrl}?${pageParams.toString()}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
              },
              body: JSON.stringify(requestBody),
            })

            if (pageResponse.ok) {
              const pageData = await pageResponse.json()
              if (pageData && pageData.results) {
                for (const item of pageData.results) {
                  const grant = this.parseSEDIADetailedResult(item)
                  if (grant) {
                    grants.push(grant)
                  }
                }
              }
            }
          }

        } catch (error) {
          console.log(`[v0] EU SEDIA - Error for status ${status}:`, error instanceof Error ? error.message : error)
        }
      }

    } catch (error) {
      console.log(`[v0] EU SEDIA - Global error:`, error instanceof Error ? error.message : error)
    }

    return grants
  }

  /**
   * Parse SEDIA result with FULL detail extraction
   * Extracts all available fields for comprehensive opportunity information
   */
  private parseSEDIADetailedResult(item: Record<string, unknown>): EUGrant | null {
    try {
      // Extract identifiers - prioritize callIdentifier over topic
      const identifier = (item.identifier || item.ccm2Id || item.id || "") as string
      const callIdentifier = (item.callIdentifier || item.callId || "") as string
      const topicIdentifier = identifier
      
      // Use callIdentifier as the primary expedient (Opportunity Number)
      const expedient = callIdentifier || identifier
      
      const title = (item.title || "") as string
      
      if (!expedient || !title) {
        return null
      }

      // Extract full description - combine all available text fields
      const descriptionParts: string[] = []
      
      if (item.description) descriptionParts.push(String(item.description))
      if (item.callTitle) descriptionParts.push(String(item.callTitle))
      if (item.conditions) descriptionParts.push(`Conditions: ${String(item.conditions)}`)
      if (item.objective) descriptionParts.push(`Objective: ${String(item.objective)}`)
      if (item.scope) descriptionParts.push(`Scope: ${String(item.scope)}`)
      if (item.expectedImpact) descriptionParts.push(`Expected Impact: ${String(item.expectedImpact)}`)
      if (item.eligibilityConditions) descriptionParts.push(`Eligibility: ${String(item.eligibilityConditions)}`)
      
      const fullDescription = descriptionParts.join(" | ")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim()

      // Extract ALL dates
      const deadlineRaw = item.deadlineDate || item.deadline || item.closingDate
      const deadline = this.formatDate(deadlineRaw as string)
      
      const openingRaw = item.openingDate || item.startDate || item.publicationDate
      const openingDate = this.formatDate(openingRaw as string)
      
      const publishRaw = item.publicationDate || item.lastUpdateDate
      const publishDate = this.formatDate(publishRaw as string) || openingDate

      // Extract budget/amount - try multiple fields
      let amount = ""
      let budget = ""
      
      if (item.budgetTopicActionInMioEur) {
        amount = `EUR ${item.budgetTopicActionInMioEur} million`
        budget = amount
      } else if (item.indicativeBudget) {
        amount = `EUR ${item.indicativeBudget}`
        budget = amount
      } else if (item.budget) {
        const budgetStr = String(item.budget)
        amount = budgetStr.includes("EUR") ? budgetStr : `EUR ${budgetStr}`
        budget = amount
      } else if (item.budgetOverviewUrl) {
        // Parse budget from URL if available
        const budgetUrl = String(item.budgetOverviewUrl)
        const budgetMatch = budgetUrl.match(/(\d+(?:[.,]\d+)?)\s*(?:million|M|mio)/i)
        if (budgetMatch) {
          amount = `EUR ${budgetMatch[1]} million`
          budget = amount
        }
      }

      // Extract status
      const statusCode = item.status as string
      let status = "Unknown"
      if (statusCode === "31094501") status = "Open"
      else if (statusCode === "31094502") status = "Forthcoming"
      else if (statusCode === "31094503") status = "Closed"

      // Extract programme information
      const program = (
        item.frameworkProgramme ||
        item.programmeName ||
        item.programmeAcronym ||
        item.ccm2Id ||
        this.extractProgramFromIdentifier(expedient)
      ) as string || "EU Programme"

      const programmePeriod = (item.programmePeriod || "2021-2027") as string

      // Extract action type
      const actionType = (item.actionType || item.typeOfAction || item.fundingScheme || "") as string

      // Extract keywords
      const keywords: string[] = []
      if (item.keywords) {
        if (Array.isArray(item.keywords)) {
          keywords.push(...item.keywords.map(k => String(k)))
        } else {
          keywords.push(...String(item.keywords).split(/[,;]/).map(k => k.trim()))
        }
      }
      if (item.tags && Array.isArray(item.tags)) {
        keywords.push(...item.tags.map(t => String(t)))
      }

      // Build URL
      const topicId = topicIdentifier.toLowerCase().replace(/\s+/g, "-")
      const portalUrl = `https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/${topicId}`

      return {
        id: `EU-SEDIA-${expedient}`,
        title,
        organization: program,
        publishDate,
        deadline,
        openingDate,
        amount,
        budget,
        category: this.categorizeGrant(title, fullDescription),
        description: fullDescription.substring(0, 1000), // Longer description
        expedient, // Opportunity Number / Call Identifier
        callIdentifier,
        topicIdentifier,
        sourceUrl: portalUrl,
        source: "eu",
        url: portalUrl,
        program,
        programmePeriod,
        status,
        type: actionType ? `Grant - ${actionType}` : "Grant",
        keywords,
        actionType,
      }
    } catch {
      return null
    }
  }

  /**
   * Extract programme name from identifier pattern
   */
  private extractProgramFromIdentifier(identifier: string): string {
    const id = identifier.toUpperCase()
    
    if (id.startsWith("HORIZON")) return "Horizon Europe"
    if (id.startsWith("EDF")) return "European Defence Fund"
    if (id.startsWith("DIGITAL")) return "Digital Europe"
    if (id.startsWith("CEF")) return "Connecting Europe Facility"
    if (id.startsWith("LIFE")) return "LIFE Programme"
    if (id.startsWith("ERASMUS")) return "Erasmus+"
    if (id.startsWith("CREA")) return "Creative Europe"
    if (id.startsWith("EU4H") || id.startsWith("HEALTH")) return "EU4Health"
    if (id.startsWith("EUSPA")) return "EU Space Programme"
    if (id.startsWith("EDIRPA")) return "EDIRPA"
    if (id.startsWith("AGRIP")) return "Agricultural Promotion"
    if (id.startsWith("AMIF")) return "Asylum & Migration Fund"
    if (id.startsWith("JUST")) return "Justice Programme"
    if (id.startsWith("CERV")) return "Citizens, Equality, Rights & Values"
    
    return "EU Programme"
  }

  /**
   * Fetch from EU Funding Portal RSS Feed
   */
  private async fetchFromRSSFeed(): Promise<EUGrant[]> {
    const grants: EUGrant[] = []

    try {
      const rssUrl = "https://ec.europa.eu/info/funding-tenders/opportunities/data/referenceData/callupdates-rss.xml"
      
      console.log("[v0] EU RSS - Fetching from EU Funding Portal RSS feed...")
      
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

      const items = this.parseRSSItems(xmlText)
      console.log(`[v0] EU RSS - Found ${items.length} total items in feed`)

      for (let i = 0; i < items.length; i++) {
        const grant = this.parseRSSItem(items[i], i)
        if (grant) {
          grants.push(grant)
        }
      }

      console.log(`[v0] EU RSS - Successfully parsed ${grants.length} grants`)

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
   * Parse RSS item with enhanced extraction
   */
  private parseRSSItem(item: {title: string, link: string, description: string, pubDate: string, guid: string}, index: number): EUGrant | null {
    try {
      if (!item.title) return null

      // Extract call identifier from multiple sources
      let callIdentifier = ""
      let topicIdentifier = ""
      
      // Try to extract from link
      if (item.link) {
        // Pattern: /topic-details/IDENTIFIER
        const topicMatch = item.link.match(/topic-details\/([A-Za-z0-9-_]+)/i)
        if (topicMatch) {
          topicIdentifier = topicMatch[1].toUpperCase()
        }
        
        // Pattern: callIdentifier=XXX
        const callMatch = item.link.match(/callIdentifier=([^&]+)/i)
        if (callMatch) {
          callIdentifier = decodeURIComponent(callMatch[1])
        }
      }
      
      // Try guid
      if (!callIdentifier && item.guid) {
        const guidMatch = item.guid.match(/([A-Z0-9-]+(?:-\d{2,4})?)/i)
        if (guidMatch) {
          callIdentifier = guidMatch[1].toUpperCase()
        }
      }
      
      // Try title for identifier pattern
      if (!callIdentifier) {
        const titleMatch = item.title.match(/(HORIZON|EDF|DIGITAL|CEF|LIFE|ERASMUS|CREA|EUSPA|EDIRPA)[A-Z0-9-]+/i)
        if (titleMatch) {
          callIdentifier = titleMatch[0].toUpperCase()
        }
      }

      const expedient = callIdentifier || topicIdentifier || `RSS-${index}`
      const uniqueId = `${expedient}-${index}`

      // Parse dates
      const publishDate = item.pubDate ? this.formatDate(item.pubDate) : new Date().toISOString().split("T")[0]
      
      // Extract deadline from description
      let deadline = ""
      const deadlinePatterns = [
        /deadline[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
        /closes?[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
        /until[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
        /(\d{4}[\/\-]\d{2}[\/\-]\d{2})/,
        /(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i,
      ]
      for (const pattern of deadlinePatterns) {
        const match = item.description?.match(pattern)
        if (match) {
          deadline = this.formatDate(match[1])
          break
        }
      }

      // Clean description
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

      // Extract budget
      let amount = ""
      const budgetPatterns = [
        /(?:budget|amount|funding)[:\s]*(?:EUR|€)?\s*([\d.,]+\s*(?:million|M|billion|B)?)/i,
        /(?:EUR|€)\s*([\d.,]+\s*(?:million|M|billion|B)?)/i,
      ]
      for (const pattern of budgetPatterns) {
        const match = cleanDescription.match(pattern)
        if (match) {
          amount = `EUR ${match[1]}`
          break
        }
      }

      // Extract programme
      const program = this.extractProgramFromIdentifier(callIdentifier || topicIdentifier || item.title)

      const url = item.link || `https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/${(topicIdentifier || expedient).toLowerCase()}`

      return {
        id: `EU-RSS-${uniqueId}`,
        title: item.title,
        organization: "European Commission",
        publishDate,
        deadline,
        amount,
        category: this.categorizeGrant(item.title, cleanDescription),
        description: cleanDescription.substring(0, 800),
        expedient,
        callIdentifier,
        topicIdentifier,
        sourceUrl: url,
        source: "eu",
        url,
        program,
        status: "Open",
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

      const searchTerms = keyword && keyword !== "all" 
        ? [keyword]
        : ["defence", "space", "security", "technology", "drone", "satellite"]
      
      const expertQuery = `FT~"${searchTerms.join(" OR ")}"`

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
        limit: 50,
        scope: "ACTIVE",
        paginationMode: "PAGE_NUMBER",
        onlyLatestVersions: true,
      }

      console.log("[v0] EU TED - Fetching procurement notices...")

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
        console.log(`[v0] EU TED - HTTP ${response.status}: ${errorBody.slice(0, 200)}`)
        return grants
      }

      const data = await response.json()
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
   * Parse TED notice
   */
  private parseTEDNotice(notice: Record<string, unknown>): EUGrant | null {
    try {
      const id = (notice["publication-number"] || notice.id || "") as string
      const title = (notice["notice-title"] || notice["announcement-title"] || notice["title-lot"] || notice.title || "") as string
      
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
        description: typeof description === "string" ? description.substring(0, 800) : title,
        expedient: id,
        sourceUrl: tedUrl,
        source: "eu",
        url: tedUrl,
        program: "TED Procurement",
        status: "Open",
        type: "Tender",
      }
    } catch {
      return null
    }
  }

  /**
   * Deduplicate grants using multiple criteria
   */
  private deduplicateGrants(grants: EUGrant[]): EUGrant[] {
    const seen = new Map<string, EUGrant>()
    
    for (const grant of grants) {
      // Use multiple keys for deduplication
      const keys = [
        grant.callIdentifier,
        grant.topicIdentifier,
        grant.expedient,
        grant.id,
      ].filter(Boolean)
      
      let isDuplicate = false
      for (const key of keys) {
        if (key && seen.has(key)) {
          // Keep the one with more complete data
          const existing = seen.get(key)!
          if (grant.description.length > existing.description.length || 
              (grant.deadline && !existing.deadline) ||
              (grant.amount && !existing.amount)) {
            // Replace with more complete version
            seen.set(key, grant)
          }
          isDuplicate = true
          break
        }
      }
      
      if (!isDuplicate && keys[0]) {
        seen.set(keys[0], grant)
      }
    }
    
    return Array.from(seen.values())
  }

  /**
   * Format date
   */
  private formatDate(dateStr: unknown): string {
    try {
      if (!dateStr) return ""
      
      const str = String(dateStr)
      
      if (typeof dateStr === "number" || /^\d{13}$/.test(str)) {
        return new Date(Number(dateStr)).toISOString().split("T")[0]
      }
      
      if (str.includes("T")) {
        return str.split("T")[0]
      }
      
      const date = new Date(str)
      if (!isNaN(date.getTime())) {
        return date.toISOString().split("T")[0]
      }
      
      return str
    } catch {
      return ""
    }
  }

  /**
   * Categorize grant
   */
  private categorizeGrant(title: string, description: string): string {
    const text = `${title} ${description}`.toLowerCase()
    
    if (text.includes("edf") || text.includes("defence") || text.includes("defense") || text.includes("military")) {
      return "Defence"
    }
    if (text.includes("space") || text.includes("satellite") || text.includes("copernicus") || text.includes("galileo") || text.includes("euspa")) {
      return "Space"
    }
    if (text.includes("drone") || text.includes("uas") || text.includes("uav") || text.includes("unmanned") || text.includes("rpas")) {
      return "UAS/Drones"
    }
    if (text.includes("quantum") || text.includes("photonic")) {
      return "Quantum"
    }
    if (text.includes("sensor") || text.includes("radar") || text.includes("lidar")) {
      return "Sensors"
    }
    if (text.includes("maritime") || text.includes("naval")) {
      return "Maritime"
    }
    if (text.includes("cyber") || text.includes("security")) {
      return "Cybersecurity"
    }
    if (text.includes("digital") || text.includes("ai") || text.includes("artificial intelligence")) {
      return "Digital/AI"
    }
    if (text.includes("horizon") || text.includes("research") || text.includes("innovation")) {
      return "Research & Innovation"
    }
    if (text.includes("health") || text.includes("eu4h")) {
      return "Health"
    }
    if (text.includes("climate") || text.includes("environment") || text.includes("green")) {
      return "Environment"
    }
    
    return "General"
  }
}
