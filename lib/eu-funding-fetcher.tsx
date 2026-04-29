/**
 * EU Funding Fetcher - Uses RSS Feeds with Status Filtering
 * 
 * Uses the EC Europa RSS feeds which are fast and reliable.
 * Fetches ONLY Open and Forthcoming opportunities to minimize load time.
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
  expedient: string
  callIdentifier?: string
  topicIdentifier?: string
  sourceUrl: string
  source: "eu"
  url: string
  program?: string
  status?: string
  type?: string
}

export class EUFundingFetcher {
  // Main RSS feed - the correct working URL provided by user
  private readonly RSS_URL = "https://ec.europa.eu/info/funding-tenders/opportunities/data/referenceData/callupdates-rss.xml"
  
  /**
   * Fetch grants - filters for Open and Forthcoming during parsing
   */
  async fetchAllGrants(): Promise<EUGrant[]> {
    console.log("[v0] EU - Fetching from main RSS feed...")
    
    const startTime = Date.now()
    const grants = await this.fetchFromRSS(this.RSS_URL)
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`[v0] EU - Loaded ${grants.length} active grants in ${elapsed}s`)
    
    return grants
  }

  /**
   * Fetch from main RSS feed and filter for Open/Forthcoming
   * STRICT filtering: Only include items with valid future deadlines
   */
  private async fetchFromRSS(url: string): Promise<EUGrant[]> {
    const grants: EUGrant[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split("T")[0]
    
    try {
      // Add timeout with AbortController (45 seconds max)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 45000)
      
      const response = await fetch(url, {
        headers: { "Accept": "application/rss+xml, application/xml, text/xml" },
        signal: controller.signal,
        next: { revalidate: 1800 } // Cache for 30 minutes
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        console.log(`[v0] EU RSS - HTTP ${response.status}`)
        return []
      }
      
      const xml = await response.text()
      const items = this.parseRSSItems(xml)
      console.log(`[v0] EU RSS - Total items in feed: ${items.length}`)
      
      let openCount = 0
      let forthcomingCount = 0
      let closedCount = 0
      let noDeadlineCount = 0
      
      for (let i = 0; i < items.length; i++) {
        const desc = items[i].description || ""
        const descLower = desc.toLowerCase()
        
        // Extract structured data
        const data = this.extractStructuredData(desc)
        
        // STRICT: Skip if explicitly marked as closed/evaluation/awarded
        if (descLower.includes("closed") || 
            descLower.includes("evaluation") ||
            descLower.includes("evaluated") ||
            descLower.includes("awarded") ||
            descLower.includes("grant agreement")) {
          closedCount++
          continue
        }
        
        // STRICT: Check deadline - if no valid future deadline, check status field
        let hasValidFutureDeadline = false
        let isForthcoming = false
        
        if (data.deadline) {
          // Compare as strings YYYY-MM-DD for reliability
          if (data.deadline >= todayStr) {
            hasValidFutureDeadline = true
          } else {
            // Deadline passed - skip
            closedCount++
            continue
          }
        }
        
        // Check if forthcoming (opening date in future)
        if (descLower.includes("forthcoming") || descLower.includes("upcoming")) {
          isForthcoming = true
        } else if (data.openingDate && data.openingDate > todayStr) {
          isForthcoming = true
        }
        
        // STRICT: If no deadline found, only include if explicitly Open/Forthcoming
        if (!data.deadline) {
          // Check for explicit status indicators
          const hasOpenIndicator = descLower.includes("open for submission") || 
                                   descLower.includes("status: open") ||
                                   descLower.includes("submission open")
          const hasForthcomingIndicator = descLower.includes("forthcoming") ||
                                          descLower.includes("upcoming") ||
                                          descLower.includes("opening soon")
          
          if (!hasOpenIndicator && !hasForthcomingIndicator) {
            noDeadlineCount++
            continue // Skip items with no deadline and no clear status
          }
          
          if (hasForthcomingIndicator) {
            isForthcoming = true
          }
        }
        
        // Determine final status
        let status: string
        if (isForthcoming) {
          status = "Forthcoming"
          forthcomingCount++
        } else {
          status = "Open"
          openCount++
        }
        
        const grant = this.parseItem(items[i], status, i)
        if (grant) {
          grants.push(grant)
        }
      }
      
      console.log(`[v0] EU RSS - Open: ${openCount}, Forthcoming: ${forthcomingCount}, Closed: ${closedCount}, NoDeadline/Skipped: ${noDeadlineCount}`)
      
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log("[v0] EU RSS - Request timed out after 45s, returning partial results")
      } else {
        console.log(`[v0] EU RSS - Error:`, error instanceof Error ? error.message : error)
      }
    }
    
    return grants
  }

  /**
   * Fast RSS item extraction using regex
   */
  private parseRSSItems(xml: string): Array<{title: string, link: string, description: string, pubDate: string, guid: string}> {
    const items: Array<{title: string, link: string, description: string, pubDate: string, guid: string}> = []
    
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi
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
   * Extract tag content
   */
  private extractTag(xml: string, tag: string): string {
    const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i")
    const match = xml.match(regex)
    return match ? (match[1] || match[2] || "").trim() : ""
  }

  /**
   * Parse RSS item to EUGrant
   */
  private parseItem(item: {title: string, link: string, description: string, pubDate: string, guid: string}, status: string, index: number): EUGrant | null {
    try {
      if (!item.title) return null
      
      // Extract structured data from HTML description
      const data = this.extractStructuredData(item.description)
      
      // Get identifier
      const identifier = data.identifier || this.extractIdentifier(item.link, item.title, item.guid) || `EU-${index + 1}`
      
      // Build grant
      const program = this.extractProgram(identifier)
      const description = this.buildDescription(item.title, data)
      
      return {
        id: `EU-${identifier}-${index}`,
        title: item.title,
        organization: "European Commission",
        publishDate: item.pubDate ? this.formatDate(item.pubDate) : new Date().toISOString().split("T")[0],
        deadline: data.deadline || "",
        openingDate: data.openingDate || "",
        amount: data.budget || "",
        budget: data.budget || "",
        category: this.categorize(item.title, data.pillar || ""),
        description,
        expedient: identifier,
        callIdentifier: identifier,
        sourceUrl: item.link || `https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/${identifier.toLowerCase()}`,
        source: "eu",
        url: item.link || `https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/${identifier.toLowerCase()}`,
        program,
        status,
        type: "Grant"
      }
    } catch {
      return null
    }
  }

  /**
   * Extract structured data from HTML description
   */
  private extractStructuredData(html: string): {identifier: string, pillar: string, openingDate: string, deadline: string, budget: string} {
    const result = { identifier: "", pillar: "", openingDate: "", deadline: "", budget: "" }
    if (!html) return result
    
    // Identifier
    const idMatch = html.match(/<b>Identifier<\/b>:\s*([^<\n]+)/i)
    if (idMatch) result.identifier = idMatch[1].trim()
    
    // Pillar
    const pillarMatch = html.match(/<b>Pillar<\/b>:\s*([^<\n]+)/i)
    if (pillarMatch) result.pillar = pillarMatch[1].trim()
    
    // Opening Date
    const openMatch = html.match(/<b>Opening Date<\/b>:\s*([^<\n]+)/i)
    if (openMatch) result.openingDate = this.formatDate(openMatch[1].trim())
    
    // Deadline
    const deadlineMatch = html.match(/<b>Deadline<\/b>:\s*([^<\n]+)/i)
    if (deadlineMatch) result.deadline = this.formatDate(deadlineMatch[1].trim())
    
    // Budget
    const budgetMatch = html.match(/<b>Budget<\/b>:\s*([^<\n]+)/i) || html.match(/budget[:\s]+(?:EUR|€)?\s*([\d.,]+\s*(?:million|M)?)/i)
    if (budgetMatch) {
      const b = budgetMatch[1].trim()
      result.budget = b.includes("EUR") || b.includes("€") ? b : `EUR ${b}`
    }
    
    return result
  }

  /**
   * Extract identifier from link/title/guid
   */
  private extractIdentifier(link: string, title: string, guid: string): string {
    // Try link
    const linkMatch = link.match(/topic-details\/([A-Za-z0-9-_]+)/i) || link.match(/callCode=([^;&]+)/i)
    if (linkMatch) return linkMatch[1].toUpperCase()
    
    // Try title for EU patterns
    const patterns = [
      /(HORIZON[-_]?[A-Z0-9]+[-_][A-Z0-9-]+)/i,
      /(EDF[-_]?20[0-9]{2}[-_][A-Z0-9-]+)/i,
      /(DIGITAL[-_][A-Z0-9-]+)/i,
      /(CEF[-_][A-Z0-9-]+)/i,
      /(LIFE[-_]20[0-9]{2}[-_][A-Z0-9-]+)/i,
      /(ERASMUS[-_][A-Z0-9-]+)/i,
    ]
    
    for (const p of patterns) {
      const m = title.match(p) || guid.match(p)
      if (m) return m[1].toUpperCase().replace(/_/g, "-")
    }
    
    // Use guid if clean
    if (guid) {
      const clean = guid.replace(/^.*\//, "").replace(/[^a-zA-Z0-9-]/g, "")
      if (clean.length > 5) return clean.toUpperCase()
    }
    
    return ""
  }

  /**
   * Build human-readable description
   */
  private buildDescription(title: string, data: {pillar: string, budget: string}): string {
    const parts: string[] = []
    
    // Clean title
    let main = title.replace(/^Call\s+/i, "").replace(/[-_]/g, " ").trim()
    if (/^[A-Z0-9\s-]+$/.test(main)) {
      main = `EU funding opportunity: ${main}`
    }
    parts.push(main)
    
    // Details
    const details: string[] = []
    if (data.pillar) details.push(`Area: ${data.pillar}`)
    if (data.budget) details.push(`Budget: ${data.budget}`)
    
    if (details.length > 0) {
      parts.push(details.join(" | "))
    }
    
    return parts.join(". ").substring(0, 350)
  }

  /**
   * Extract programme from identifier
   */
  private extractProgram(id: string): string {
    const u = id.toUpperCase()
    if (u.includes("HORIZON")) return "Horizon Europe"
    if (u.includes("EDF")) return "European Defence Fund"
    if (u.includes("DIGITAL")) return "Digital Europe"
    if (u.includes("CEF")) return "Connecting Europe Facility"
    if (u.includes("LIFE")) return "LIFE Programme"
    if (u.includes("ERASMUS")) return "Erasmus+"
    if (u.includes("CREA")) return "Creative Europe"
    if (u.includes("EU4H")) return "EU4Health"
    if (u.includes("EUSPA")) return "EU Space Programme"
    return "EU Funding & Tenders"
  }

  /**
   * Categorize grant
   */
  private categorize(title: string, pillar: string): string {
    const t = `${title} ${pillar}`.toLowerCase()
    if (t.includes("defence") || t.includes("defense") || t.includes("edf")) return "Defence & Security"
    if (t.includes("space") || t.includes("satellite")) return "Space"
    if (t.includes("drone") || t.includes("uav")) return "Aerospace & Drones"
    if (t.includes("quantum")) return "Quantum & Photonics"
    if (t.includes("digital") || t.includes("cyber") || t.includes("ai")) return "Digital & AI"
    if (t.includes("health")) return "Health"
    if (t.includes("energy") || t.includes("climate")) return "Energy & Environment"
    if (t.includes("transport")) return "Transport & Mobility"
    return "Research & Innovation"
  }

  /**
   * Format date
   */
  private formatDate(str: string): string {
    if (!str) return ""
    try {
      if (str.includes("T") || str.match(/^\d{4}-\d{2}-\d{2}/)) return str.split("T")[0]
      const d = new Date(str)
      if (!isNaN(d.getTime())) return d.toISOString().split("T")[0]
      return str
    } catch {
      return str
    }
  }
}
