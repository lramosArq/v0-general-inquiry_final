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
   * Extracts structured data from HTML description (Identifier, Pillar, Deadline, Budget)
   */
  private parseRSSItem(item: {title: string, link: string, description: string, pubDate: string, guid: string}, index: number): EUGrant | null {
    try {
      if (!item.title) return null

      // Extract structured fields from HTML description
      const structuredData = this.extractStructuredFields(item.description)
      
      // Get call identifier from structured data or patterns
      let callIdentifier = structuredData.identifier || ""
      const topicIdentifier = ""
      
      // If no identifier from structured data, try patterns
      if (!callIdentifier) {
        const searchText = `${item.title} ${item.link} ${item.guid}`.toUpperCase()
        const programPatterns = [
          /(HORIZON[-_]?[A-Z0-9]+[-_][A-Z0-9]+[-_]?[A-Z0-9-_]*)/i,
          /(EDF[-_]?20[0-9]{2}[-_][A-Z0-9]+[-_]?[A-Z0-9-_]*)/i,
          /(DIGITAL[-_][A-Z0-9]+[-_]?[A-Z0-9-_]*)/i,
          /(CEF[-_][A-Z0-9]+[-_]?[A-Z0-9-_]*)/i,
          /(LIFE[-_]20[0-9]{2}[-_][A-Z0-9]+[-_]?[A-Z0-9-_]*)/i,
          /(ERASMUS[-_][A-Z0-9]+[-_]?[A-Z0-9-_]*)/i,
          /(CREA[-_][A-Z0-9]+[-_]?[A-Z0-9-_]*)/i,
          /(EUSPA[-_][A-Z0-9]+[-_]?[A-Z0-9-_]*)/i,
        ]
        
        for (const pattern of programPatterns) {
          const match = searchText.match(pattern)
          if (match) {
            callIdentifier = match[1].replace(/_/g, "-")
            break
          }
        }
      }
      
      // Try link patterns as fallback
      if (!callIdentifier && item.link) {
        const callMatch = item.link.match(/callCode=([^;&]+)/i) ||
                         item.link.match(/callIdentifier=([^&]+)/i) ||
                         item.link.match(/topic-details\/([A-Za-z0-9-_]+)/i)
        if (callMatch) {
          callIdentifier = decodeURIComponent(callMatch[1]).toUpperCase()
        }
      }

      // Generate unique expedient (OPPORTUNITY NUMBER)
      const expedient = callIdentifier || `EU-${(index + 1).toString().padStart(5, "0")}`
      const uniqueId = `${expedient}-${index}`

      // Parse dates - prefer structured data
      const publishDate = item.pubDate ? this.formatDate(item.pubDate) : new Date().toISOString().split("T")[0]
      const deadline = structuredData.deadline || this.extractDeadlineFromText(item.description)
      const openingDate = structuredData.openingDate || ""

      // Generate human-readable description (2 lines summary)
      const description = this.generateHumanDescription(
        item.title,
        structuredData.pillar || "",
        structuredData.latestInfo || "",
        structuredData.budget || ""
      )

      // Extract programme from identifier or pillar
      const program = this.extractProgramFromText(callIdentifier || structuredData.pillar || item.title)

      // Build URL
      const url = item.link || `https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/${expedient.toLowerCase()}`

      // Categorize based on pillar or content
      const category = this.categorizeGrant(item.title, structuredData.pillar || description)

      // Determine status from latest info
      let status = "Open"
      const latestLower = (structuredData.latestInfo || "").toLowerCase()
      if (latestLower.includes("closed") || latestLower.includes("evaluation")) {
        status = "Closed"
      } else if (latestLower.includes("forthcoming") || latestLower.includes("upcoming")) {
        status = "Forthcoming"
      }

      return {
        id: `EU-${uniqueId}`,
        title: item.title,
        organization: "European Commission",
        publishDate,
        deadline,
        openingDate,
        amount: structuredData.budget || "",
        budget: structuredData.budget || "",
        category,
        description,
        expedient,
        callIdentifier: callIdentifier || undefined,
        topicIdentifier: topicIdentifier || undefined,
        sourceUrl: url,
        source: "eu",
        url,
        program,
        status,
        type: "Grant/Tender",
      }
    } catch {
      return null
    }
  }

  /**
   * Extract structured fields from HTML description
   * Parses: Identifier, Pillar, Opening Date, Deadline, Budget, Latest information
   */
  private extractStructuredFields(html: string): {
    identifier: string
    pillar: string
    openingDate: string
    deadline: string
    budget: string
    latestInfo: string
  } {
    const result = {
      identifier: "",
      pillar: "",
      openingDate: "",
      deadline: "",
      budget: "",
      latestInfo: "",
    }

    if (!html) return result

    // Extract Identifier: <b>Identifier</b>: HORIZON-CL5-2024-D5-01<br/>
    const idMatch = html.match(/<b>Identifier<\/b>:\s*([^<\n]+)/i)
    if (idMatch) result.identifier = idMatch[1].trim()

    // Extract Pillar: <b>Pillar</b>: Climate, Energy and Mobility<br/>
    const pillarMatch = html.match(/<b>Pillar<\/b>:\s*([^<\n]+)/i)
    if (pillarMatch) result.pillar = pillarMatch[1].trim()

    // Extract Opening Date: <b>Opening Date</b>: Mon, 15 Jan 2024<br/>
    const openMatch = html.match(/<b>Opening Date<\/b>:\s*([^<\n]+)/i)
    if (openMatch && openMatch[1].trim()) {
      result.openingDate = this.formatDate(openMatch[1].trim())
    }

    // Extract Deadline: <b>Deadline</b>: Thu, 18 Apr 2024 17:00:00<br/>
    const deadlineMatch = html.match(/<b>Deadline<\/b>:\s*([^<\n]+)/i)
    if (deadlineMatch && deadlineMatch[1].trim()) {
      result.deadline = this.formatDate(deadlineMatch[1].trim())
    }

    // Extract Budget if present
    const budgetMatch = html.match(/<b>Budget<\/b>:\s*([^<\n]+)/i) ||
                       html.match(/budget[:\s]+(?:EUR|€)?\s*([\d.,]+\s*(?:million|M|billion|B)?)/i)
    if (budgetMatch) {
      const budget = budgetMatch[1].trim()
      result.budget = budget.includes("EUR") || budget.includes("€") ? budget : `EUR ${budget}`
    }

    // Extract Latest information content (skip HTML tags)
    const latestMatch = html.match(/<b>Latest information<\/b>:\s*(?:<br\/?>)?\s*([\s\S]*?)(?:<br|$)/i)
    if (latestMatch) {
      result.latestInfo = latestMatch[1]
        .replace(/<[^>]*>/g, " ")
        .replace(/&[^;]+;/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .substring(0, 200)
    }

    return result
  }

  /**
   * Generate a human-readable 2-line description
   * Focus on: What the opportunity is about, pillar/area, and budget if available
   */
  private generateHumanDescription(title: string, pillar: string, latestInfo: string, budget: string): string {
    const parts: string[] = []

    // First line: Clean title or purpose
    let mainDesc = title
      .replace(/^Call\s+/i, "")
      .trim()
    
    // If title is just a code, make it more readable
    if (/^[A-Z0-9-]+$/.test(mainDesc.replace(/\s/g, ""))) {
      mainDesc = `EU funding opportunity: ${mainDesc}`
    }
    
    parts.push(mainDesc)

    // Second line: Pillar/Area + Budget
    const details: string[] = []
    
    if (pillar && pillar.length > 3) {
      details.push(`Area: ${pillar}`)
    }
    
    if (budget && budget.length > 0) {
      details.push(`Budget: ${budget}`)
    }
    
    if (latestInfo && latestInfo.length > 10 && !latestInfo.toLowerCase().includes("published")) {
      // Add meaningful latest info (e.g., "EVALUATION results")
      const cleanInfo = latestInfo.substring(0, 80)
      if (!cleanInfo.toLowerCase().includes("deadline")) {
        details.push(`Status: ${cleanInfo}`)
      }
    }

    if (details.length > 0) {
      parts.push(details.join(" | "))
    }

    return parts.join(". ").substring(0, 350)
  }

  /**
   * Extract deadline from text using multiple patterns
   */
  private extractDeadlineFromText(text: string): string {
    if (!text) return ""
    
    const patterns = [
      /Deadline[:\s]+([A-Za-z]{3},?\s*\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
      /Deadline[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /(\d{4}[\/\-]\d{2}[\/\-]\d{2})/,
    ]
    
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) {
        return this.formatDate(match[1])
      }
    }
    
    return ""
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
    if (t.includes("CLIMATE")) return "Climate, Energy and Mobility"
    if (t.includes("CULTURE")) return "Culture, Creativity and Inclusive Society"
    if (t.includes("CIVIL")) return "Civil Security for Society"
    if (t.includes("FOOD")) return "Food, Bioeconomy, Natural Resources"
    
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
      // Remove time part if present
      const cleanDate = dateStr.replace(/\s+\d{1,2}:\d{2}(:\d{2})?\s*(\(.*\))?$/i, "").trim()
      
      // Handle various date formats
      const date = new Date(cleanDate)
      if (!isNaN(date.getTime())) {
        return date.toISOString().split("T")[0]
      }
      
      // Try DD/MM/YYYY or DD-MM-YYYY
      const parts = cleanDate.split(/[\/\-]/)
      if (parts.length === 3) {
        const day = parseInt(parts[0])
        const month = parseInt(parts[1])
        const year = parseInt(parts[2])
        
        if (day > 0 && day <= 31 && month > 0 && month <= 12) {
          const fullYear = year < 100 ? 2000 + year : year
          return `${fullYear}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`
        }
      }
      
      return cleanDate
    } catch {
      return dateStr
    }
  }
}
