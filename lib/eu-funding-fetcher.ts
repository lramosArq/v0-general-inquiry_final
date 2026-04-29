/**
 * EU Funding Fetcher - ONLY uses RSS Feed from EC Europa
 * 
 * Source: https://ec.europa.eu/info/funding-tenders/opportunities/data/referenceData/callupdates-rss.xml
 * 
 * This is the ONLY source - contains all call updates directly from the EU Funding Portal
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

export class EUFundingFetcher {
  /**
   * Fetch ALL grants from EU RSS Feed
   * This is the ONLY source - returns all items without filtering
   */
  async fetchAllGrants(): Promise<EUGrant[]> {
    console.log("[v0] EU - Fetching ALL opportunities from RSS feed...")

    const grants = await this.fetchFromRSSFeed()
    
    console.log(`[v0] EU - Total opportunities loaded from RSS: ${grants.length}`)
    return grants
  }

  /**
   * Fetch from EU Funding Portal RSS Feed
   * https://ec.europa.eu/info/funding-tenders/opportunities/data/referenceData/callupdates-rss.xml
   */
  private async fetchFromRSSFeed(): Promise<EUGrant[]> {
    const grants: EUGrant[] = []

    try {
      const rssUrl = "https://ec.europa.eu/info/funding-tenders/opportunities/data/referenceData/callupdates-rss.xml"
      
      console.log("[v0] EU RSS - Fetching from ec.europa.eu RSS feed...")
      
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

      // Parse ALL RSS items
      const items = this.parseRSSItems(xmlText)
      console.log(`[v0] EU RSS - Found ${items.length} items in feed`)

      // Convert ALL items to grants - no filtering
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
   * Parse RSS XML to extract ALL items
   */
  private parseRSSItems(xml: string): Array<{title: string, link: string, description: string, pubDate: string, guid: string}> {
    const items: Array<{title: string, link: string, description: string, pubDate: string, guid: string}> = []
    
    // Match all <item> blocks
    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    let match

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1]
      
      const getTagContent = (tag: string): string => {
        // Handle CDATA and regular content
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
   * Parse RSS item into EUGrant with full detail extraction
   * Extracts OPPORTUNITY NUMBER (callIdentifier) as the primary identifier
   */
  private parseRSSItem(item: {title: string, link: string, description: string, pubDate: string, guid: string}, index: number): EUGrant | null {
    try {
      if (!item.title) return null

      // Extract identifiers - prioritize OPPORTUNITY NUMBER patterns
      let callIdentifier = ""
      let topicIdentifier = ""
      
      // Combined text for searching
      const searchText = `${item.title} ${item.description} ${item.link} ${item.guid}`.toUpperCase()
      
      // PRIORITY 1: Extract EU programme call identifiers from ANY field
      // Standard EU patterns: HORIZON-xxx, EDF-xxx, DIGITAL-xxx, CEF-xxx, etc.
      const programPatterns = [
        // Main programme patterns
        /(HORIZON[-_]?[A-Z0-9]+[-_][A-Z0-9]+[-_]?[A-Z0-9-_]*)/i,
        /(EDF[-_]?20[0-9]{2}[-_][A-Z0-9]+[-_]?[A-Z0-9-_]*)/i,
        /(DIGITAL[-_][A-Z0-9]+[-_]?[A-Z0-9-_]*)/i,
        /(CEF[-_][A-Z0-9]+[-_]?[A-Z0-9-_]*)/i,
        /(LIFE[-_]20[0-9]{2}[-_][A-Z0-9]+[-_]?[A-Z0-9-_]*)/i,
        /(ERASMUS[-_][A-Z0-9]+[-_]?[A-Z0-9-_]*)/i,
        /(CREA[-_][A-Z0-9]+[-_]?[A-Z0-9-_]*)/i,
        /(EUSPA[-_][A-Z0-9]+[-_]?[A-Z0-9-_]*)/i,
        /(EDIRPA[-_][A-Z0-9]+[-_]?[A-Z0-9-_]*)/i,
        /(AGRIP[-_][A-Z0-9]+[-_]?[A-Z0-9-_]*)/i,
        /(AMIF[-_]20[0-9]{2}[-_][A-Z0-9]+[-_]?[A-Z0-9-_]*)/i,
        /(CERV[-_]20[0-9]{2}[-_][A-Z0-9]+[-_]?[A-Z0-9-_]*)/i,
        /(EU4H[-_][A-Z0-9]+[-_]?[A-Z0-9-_]*)/i,
        /(ISF[-_]20[0-9]{2}[-_][A-Z0-9]+[-_]?[A-Z0-9-_]*)/i,
        /(SMP[-_][A-Z0-9]+[-_]?[A-Z0-9-_]*)/i,
        /(EMFAF[-_][A-Z0-9]+[-_]?[A-Z0-9-_]*)/i,
        /(JUST[-_]20[0-9]{2}[-_][A-Z0-9]+[-_]?[A-Z0-9-_]*)/i,
      ]
      
      for (const pattern of programPatterns) {
        const match = searchText.match(pattern)
        if (match) {
          callIdentifier = match[1].replace(/_/g, "-")
          break
        }
      }
      
      // PRIORITY 2: Try link patterns
      if (!callIdentifier && item.link) {
        // Pattern: /topic-details/IDENTIFIER
        const topicMatch = item.link.match(/topic-details\/([A-Za-z0-9-_]+)/i)
        if (topicMatch) {
          topicIdentifier = topicMatch[1].toUpperCase()
          if (!callIdentifier) callIdentifier = topicIdentifier
        }
        
        // Pattern: callIdentifier=XXX
        const callMatch = item.link.match(/callIdentifier=([^&]+)/i)
        if (callMatch) {
          callIdentifier = decodeURIComponent(callMatch[1]).toUpperCase()
        }
        
        // Pattern: topicId=XXX
        const topicIdMatch = item.link.match(/topicId=([^&]+)/i)
        if (topicIdMatch && !topicIdentifier) {
          topicIdentifier = decodeURIComponent(topicIdMatch[1]).toUpperCase()
          if (!callIdentifier) callIdentifier = topicIdentifier
        }
      }
      
      // PRIORITY 3: Try guid for clean identifier
      if (!callIdentifier && item.guid) {
        const guidClean = item.guid.replace(/^.*\//, "").replace(/[^a-zA-Z0-9-_]/g, "")
        if (guidClean.length > 5 && /[A-Z].*\d/.test(guidClean.toUpperCase())) {
          callIdentifier = guidClean.toUpperCase()
        }
      }
      
      // PRIORITY 4: Generate from title if no identifier found
      if (!callIdentifier) {
        // Try to extract any alphanumeric code pattern from title
        const codeMatch = item.title.match(/\b([A-Z]{2,}[-_]?20[0-9]{2}[-_][A-Z0-9]+)/i) ||
                         item.title.match(/\b([A-Z]{3,}[-_][A-Z0-9]{2,}[-_]?[A-Z0-9]+)/i)
        if (codeMatch) {
          callIdentifier = codeMatch[1].toUpperCase().replace(/_/g, "-")
        }
      }

      // Generate unique expedient (OPPORTUNITY NUMBER) - use index to guarantee uniqueness if needed
      const expedient = callIdentifier || topicIdentifier || `EU-${(index + 1).toString().padStart(5, "0")}`
      
      // Generate unique ID
      const uniqueId = `${expedient}-${index}`

      // Parse dates
      const publishDate = item.pubDate ? this.formatDate(item.pubDate) : new Date().toISOString().split("T")[0]
      
      // Extract deadline from description with multiple patterns
      let deadline = ""
      const deadlinePatterns = [
        /deadline[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
        /closes?[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
        /until[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
        /due[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
        /(\d{4}[\/\-]\d{2}[\/\-]\d{2})/,
        /(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i,
      ]
      const textToSearch = (item.description || "") + " " + (item.title || "")
      for (const pattern of deadlinePatterns) {
        const match = textToSearch.match(pattern)
        if (match) {
          deadline = this.formatDate(match[1])
          break
        }
      }

      // Clean description - remove HTML and entities
      const cleanDescription = (item.description || item.title)
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&#\d+;/g, "")
        .replace(/\s+/g, " ")
        .trim()

      // Extract budget/amount with multiple patterns
      let amount = ""
      const budgetPatterns = [
        /(?:budget|amount|funding|total)[:\s]*(?:EUR|€)?\s*([\d.,]+\s*(?:million|M|billion|B|EUR)?)/i,
        /(?:EUR|€)\s*([\d.,]+\s*(?:million|M|billion|B)?)/i,
        /([\d.,]+)\s*(?:million|M)\s*(?:EUR|€|euros?)/i,
      ]
      for (const pattern of budgetPatterns) {
        const match = cleanDescription.match(pattern)
        if (match) {
          amount = match[1].includes("EUR") ? match[1] : `EUR ${match[1]}`
          break
        }
      }

      // Extract programme from identifier or title
      const program = this.extractProgramFromText(callIdentifier || topicIdentifier || item.title)

      // Build URL
      const url = item.link || `https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/${(topicIdentifier || expedient).toLowerCase()}`

      // Categorize based on content
      const category = this.categorizeGrant(item.title, cleanDescription)

      return {
        id: `EU-${uniqueId}`,
        title: item.title,
        organization: "European Commission",
        publishDate,
        deadline,
        amount,
        budget: amount,
        category,
        description: cleanDescription.substring(0, 1000),
        expedient,
        callIdentifier: callIdentifier || undefined,
        topicIdentifier: topicIdentifier || undefined,
        sourceUrl: url,
        source: "eu",
        url,
        program,
        status: "Open",
        type: "Grant/Tender",
      }
    } catch {
      return null
    }
  }

  /**
   * Extract programme name from text
   */
  private extractProgramFromText(text: string): string {
    const t = (text || "").toUpperCase()
    
    if (t.includes("HORIZON")) return "Horizon Europe"
    if (t.includes("EDF")) return "European Defence Fund"
    if (t.includes("DIGITAL")) return "Digital Europe"
    if (t.includes("CEF")) return "Connecting Europe Facility"
    if (t.includes("LIFE")) return "LIFE Programme"
    if (t.includes("ERASMUS")) return "Erasmus+"
    if (t.includes("CREA")) return "Creative Europe"
    if (t.includes("EU4H") || t.includes("HEALTH")) return "EU4Health"
    if (t.includes("EUSPA")) return "EU Space Programme"
    if (t.includes("EDIRPA")) return "EDIRPA"
    if (t.includes("AGRIP")) return "Agricultural Promotion"
    if (t.includes("AMIF")) return "Asylum & Migration Fund"
    if (t.includes("JUST")) return "Justice Programme"
    if (t.includes("CERV")) return "Citizens, Equality, Rights & Values"
    if (t.includes("ISF")) return "Internal Security Fund"
    if (t.includes("EMFAF")) return "Maritime & Fisheries Fund"
    if (t.includes("SMP")) return "Single Market Programme"
    
    return "EU Funding & Tenders"
  }

  /**
   * Categorize grant based on content
   */
  private categorizeGrant(title: string, description: string): string {
    const text = `${title} ${description}`.toLowerCase()
    
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
    
    return "General"
  }

  /**
   * Format date to ISO format
   */
  private formatDate(dateStr: string): string {
    if (!dateStr) return ""
    
    try {
      // Handle various date formats
      const date = new Date(dateStr)
      if (!isNaN(date.getTime())) {
        return date.toISOString().split("T")[0]
      }
      
      // Try DD/MM/YYYY or DD-MM-YYYY
      const parts = dateStr.split(/[\/\-]/)
      if (parts.length === 3) {
        const day = parseInt(parts[0])
        const month = parseInt(parts[1])
        const year = parseInt(parts[2])
        
        if (day > 0 && day <= 31 && month > 0 && month <= 12) {
          const fullYear = year < 100 ? 2000 + year : year
          return `${fullYear}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`
        }
      }
      
      return dateStr
    } catch {
      return dateStr
    }
  }
}
