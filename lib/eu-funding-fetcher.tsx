/**
 * EU Funding Fetcher - Uses Official RSS Feed
 * 
 * RSS URL: https://ec.europa.eu/info/funding-tenders/opportunities/data/referenceData/callupdates-rss.xml
 * 
 * This fetches grant opportunities directly from the EU Funding & Tenders Portal RSS feed.
 * Optimized to only return OPEN and FORTHCOMING opportunities.
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
  private readonly RSS_URL = "https://ec.europa.eu/info/funding-tenders/opportunities/data/referenceData/callupdates-rss.xml"
  
  /**
   * Fetch grants from EU RSS Feed
   * Only returns OPEN and FORTHCOMING opportunities
   */
  async fetchAllGrants(): Promise<EUGrant[]> {
    console.log("[v0] EU - Fetching from RSS feed...")
    
    try {
      const response = await fetch(this.RSS_URL, {
        headers: {
          "Accept": "application/xml, text/xml, application/rss+xml",
          "User-Agent": "Mozilla/5.0 (compatible; GrantsApp/1.0)",
        },
        next: { revalidate: 3600 } // Cache for 1 hour
      })
      
      if (!response.ok) {
        console.log(`[v0] EU RSS - HTTP ${response.status}`)
        return []
      }
      
      const xmlText = await response.text()
      console.log(`[v0] EU RSS - Received ${xmlText.length} bytes`)
      
      // Parse items from RSS
      const items = this.extractItems(xmlText)
      console.log(`[v0] EU RSS - Found ${items.length} total items`)
      
      // Parse and filter in one pass - only OPEN and FORTHCOMING
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const grants: EUGrant[] = []
      let skipped = 0
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        
        // Quick check: skip if explicitly closed
        if (item.description) {
          const descLower = item.description.toLowerCase()
          if (descLower.includes(">closed<") || descLower.includes("status: closed")) {
            skipped++
            continue
          }
        }
        
        // Parse the item
        const grant = this.parseItem(item, i, today)
        if (grant && grant.status !== "Closed") {
          grants.push(grant)
        } else {
          skipped++
        }
      }
      
      console.log(`[v0] EU RSS - Active grants: ${grants.length}, Skipped closed: ${skipped}`)
      return grants
      
    } catch (error) {
      console.log("[v0] EU RSS - Error:", error instanceof Error ? error.message : error)
      return []
    }
  }

  /**
   * Extract items from RSS XML
   */
  private extractItems(xml: string): Array<{title: string, link: string, description: string, pubDate: string, guid: string}> {
    const items: Array<{title: string, link: string, description: string, pubDate: string, guid: string}> = []
    
    // Use regex to extract items (faster than XML parser for simple structure)
    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    let match
    
    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1]
      
      const title = this.extractTag(itemXml, "title")
      const link = this.extractTag(itemXml, "link")
      const description = this.extractTag(itemXml, "description")
      const pubDate = this.extractTag(itemXml, "pubDate")
      const guid = this.extractTag(itemXml, "guid")
      
      if (title) {
        items.push({ title, link, description, pubDate, guid })
      }
    }
    
    return items
  }

  /**
   * Extract tag content from XML
   */
  private extractTag(xml: string, tag: string): string {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i")
    const match = xml.match(regex)
    if (match) {
      return match[1]
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
        .trim()
    }
    return ""
  }

  /**
   * Parse RSS item into EUGrant
   */
  private parseItem(item: {title: string, link: string, description: string, pubDate: string, guid: string}, index: number, today: Date): EUGrant | null {
    try {
      // Extract structured data from description HTML
      const data = this.extractStructuredData(item.description)
      
      // Get identifier
      const identifier = data.identifier || this.extractIdentifierFromLink(item.link) || `EU-${String(index + 1).padStart(5, "0")}`
      
      // Parse dates
      const publishDate = item.pubDate ? this.formatDate(item.pubDate) : new Date().toISOString().split("T")[0]
      const deadline = data.deadline || ""
      const openingDate = data.openingDate || ""
      
      // Determine status based on dates and explicit status
      let status = "Open"
      
      // Check explicit status in latest info
      const latestLower = (data.latestInfo || "").toLowerCase()
      if (latestLower.includes("closed") || latestLower.includes("evaluation")) {
        status = "Closed"
      } else if (latestLower.includes("forthcoming") || latestLower.includes("upcoming")) {
        status = "Forthcoming"
      }
      
      // Check deadline date
      if (status !== "Closed" && deadline) {
        const deadlineDate = new Date(deadline)
        if (!isNaN(deadlineDate.getTime()) && deadlineDate < today) {
          status = "Closed"
        }
      }
      
      // Check opening date for forthcoming
      if (status === "Open" && openingDate) {
        const openDate = new Date(openingDate)
        if (!isNaN(openDate.getTime()) && openDate > today) {
          status = "Forthcoming"
        }
      }
      
      // Skip closed opportunities
      if (status === "Closed") {
        return null
      }
      
      // Generate description
      const description = this.generateDescription(item.title, data.pillar, data.budget)
      
      // Extract programme
      const program = this.extractProgram(identifier, item.title)
      
      // Build URL
      const url = item.link || `https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/${identifier.toLowerCase()}`
      
      // Category
      const category = this.categorizeGrant(item.title, data.pillar)
      
      return {
        id: `EU-${identifier}-${index}`,
        title: item.title,
        organization: "European Commission",
        publishDate,
        deadline,
        openingDate,
        amount: data.budget,
        budget: data.budget,
        category,
        description,
        expedient: identifier,
        callIdentifier: identifier,
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
   * Extract structured data from HTML description
   */
  private extractStructuredData(html: string): {
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

    // Extract Identifier
    const idMatch = html.match(/<b>Identifier<\/b>:\s*([^<\n]+)/i)
    if (idMatch) result.identifier = idMatch[1].trim()

    // Extract Pillar
    const pillarMatch = html.match(/<b>Pillar<\/b>:\s*([^<\n]+)/i)
    if (pillarMatch) result.pillar = pillarMatch[1].trim()

    // Extract Opening Date
    const openMatch = html.match(/<b>Opening Date<\/b>:\s*([^<\n]+)/i)
    if (openMatch && openMatch[1].trim()) {
      result.openingDate = this.formatDate(openMatch[1].trim())
    }

    // Extract Deadline
    const deadlineMatch = html.match(/<b>Deadline<\/b>:\s*([^<\n]+)/i)
    if (deadlineMatch && deadlineMatch[1].trim()) {
      result.deadline = this.formatDate(deadlineMatch[1].trim())
    }

    // Extract Budget
    const budgetMatch = html.match(/<b>Budget<\/b>:\s*([^<\n]+)/i) ||
                       html.match(/budget[:\s]+(?:EUR|€)?\s*([\d.,]+\s*(?:million|M|billion|B)?)/i)
    if (budgetMatch) {
      const budget = budgetMatch[1].trim()
      result.budget = budget.includes("EUR") || budget.includes("€") ? budget : `EUR ${budget}`
    }

    // Extract Latest information
    const latestMatch = html.match(/<b>Latest information<\/b>:\s*<br\/?>\s*([\s\S]*?)(?:<br|$)/i)
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
   * Extract identifier from link URL
   */
  private extractIdentifierFromLink(link: string): string {
    if (!link) return ""
    
    // Try topic-details/IDENTIFIER
    const topicMatch = link.match(/topic-details\/([A-Za-z0-9-_]+)/i)
    if (topicMatch) return topicMatch[1].toUpperCase()
    
    // Try callCode=IDENTIFIER
    const callMatch = link.match(/callCode=([^&;]+)/i)
    if (callMatch) return decodeURIComponent(callMatch[1]).toUpperCase()
    
    return ""
  }

  /**
   * Generate human-readable description
   */
  private generateDescription(title: string, pillar: string, budget: string): string {
    const parts: string[] = []
    
    // Clean title
    let mainDesc = title.replace(/^Call\s+/i, "").trim()
    if (/^[A-Z0-9-]+$/.test(mainDesc.replace(/\s/g, ""))) {
      mainDesc = `EU funding opportunity: ${mainDesc}`
    }
    parts.push(mainDesc)
    
    // Add details
    const details: string[] = []
    if (pillar && pillar.length > 3) {
      details.push(`Area: ${pillar}`)
    }
    if (budget && budget.length > 0) {
      details.push(`Budget: ${budget}`)
    }
    
    if (details.length > 0) {
      parts.push(details.join(" | "))
    }
    
    return parts.join(". ").substring(0, 350)
  }

  /**
   * Extract programme name
   */
  private extractProgram(identifier: string, title: string): string {
    const text = `${identifier} ${title}`.toUpperCase()
    
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
    
    return "EU Funding & Tenders"
  }

  /**
   * Categorize grant
   */
  private categorizeGrant(title: string, pillar: string): string {
    const text = `${title} ${pillar}`.toLowerCase()
    
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
      
      return ""
    } catch {
      return ""
    }
  }
}
