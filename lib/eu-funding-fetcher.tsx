/**
 * EU Funding & Tenders Portal Fetcher
 * 
 * Uses multiple fast endpoints to get Open and Forthcoming opportunities:
 * 1. Direct portal JSON data (fastest)
 * 2. Reference data CSV/JSON
 * 3. RSS feed with filtering
 * 
 * Target: < 20 seconds load time
 * Only returns Open and Forthcoming (never Closed)
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

// ARQUIMEA technology keywords for relevance filtering
const ARQUIMEA_KEYWORDS = [
  // Space & Aerospace
  "space", "satellite", "launcher", "orbit", "spacecraft", "esa", "copernicus", "galileo",
  "earth observation", "navigation", "euspa", "aerospace", "aviation",
  // Defence & Security
  "defence", "defense", "military", "edf", "european defence", "security", "dual-use",
  "ammunition", "weapon", "combat", "surveillance",
  // Drones & UAV
  "drone", "uav", "uas", "rpas", "unmanned", "counter-drone", "aerial vehicle",
  // Electronics & Sensors
  "sensor", "radar", "lidar", "electronic", "semiconductor", "photonic", "optic",
  "imaging", "detection", "navigation", "communication", "telecom",
  // Quantum & AI
  "quantum", "ai", "artificial intelligence", "machine learning", "cyber", "digital",
  "robotics", "autonomous",
  // Energy
  "hydrogen", "battery", "energy storage", "renewable", "propulsion",
  // Materials & Research
  "material", "composite", "nanotechnology", "research", "innovation", "technology"
]

export class EUFundingFetcher {
  // Fast RSS feed endpoint (already filtered for recent updates)
  private readonly RSS_URL = "https://ec.europa.eu/info/funding-tenders/opportunities/data/referenceData/callupdates-rss.xml"
  
  /**
   * Fetch Open and Forthcoming EU grants
   * Optimized for speed (< 20 seconds)
   */
  async fetchAllGrants(): Promise<EUGrant[]> {
    console.log("[v0] EU - Fetching grants (fast mode)...")
    const startTime = Date.now()
    
    try {
      // Use RSS feed - fastest reliable method
      const grants = await this.fetchFromRSS()
      
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      const openCount = grants.filter(g => g.status === "Open").length
      const forthcomingCount = grants.filter(g => g.status === "Forthcoming").length
      
      console.log(`[v0] EU - Loaded ${grants.length} grants (${openCount} Open, ${forthcomingCount} Forthcoming) in ${elapsed}s`)
      
      return grants
      
    } catch (error) {
      console.error("[v0] EU - Error:", error instanceof Error ? error.message : error)
      return []
    }
  }
  
  /**
   * Fetch from RSS feed with strict filtering
   */
  private async fetchFromRSS(): Promise<EUGrant[]> {
    const grants: EUGrant[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split("T")[0]
    
    // Timeout after 15 seconds
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)
    
    try {
      const response = await fetch(this.RSS_URL, {
        signal: controller.signal,
        headers: { "Accept": "application/rss+xml, application/xml, text/xml" }
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        console.log(`[v0] EU RSS - HTTP ${response.status}`)
        return []
      }
      
      const xml = await response.text()
      const items = this.parseRSSItems(xml)
      
      console.log(`[v0] EU RSS - Total items: ${items.length}`)
      
      let openCount = 0
      let forthcomingCount = 0
      let closedSkipped = 0
      let irrelevantSkipped = 0
      
      for (const item of items) {
        // Parse the description to extract structured data
        const data = this.extractStructuredData(item.description)
        const descLower = (item.description || "").toLowerCase()
        
        // STRICT: Skip if closed
        if (descLower.includes("closed") || 
            descLower.includes("evaluation") ||
            descLower.includes("evaluated") ||
            descLower.includes("awarded")) {
          closedSkipped++
          continue
        }
        
        // Check deadline - skip if passed
        if (data.deadline && data.deadline < todayStr) {
          closedSkipped++
          continue
        }
        
        // Determine status
        let status = "Open"
        if (descLower.includes("forthcoming") || descLower.includes("upcoming")) {
          status = "Forthcoming"
          forthcomingCount++
        } else if (data.openingDate && data.openingDate > todayStr) {
          status = "Forthcoming"
          forthcomingCount++
        } else {
          // Must have a valid future deadline to be Open
          if (!data.deadline || data.deadline < todayStr) {
            // Check for explicit open indicators
            if (!descLower.includes("open for submission") && !descLower.includes("status: open")) {
              closedSkipped++
              continue
            }
          }
          openCount++
        }
        
        // Check relevance to ARQUIMEA
        const title = item.title || ""
        const fullText = `${title} ${item.description || ""}`.toLowerCase()
        const isRelevant = ARQUIMEA_KEYWORDS.some(kw => fullText.includes(kw.toLowerCase()))
        
        if (!isRelevant) {
          irrelevantSkipped++
          continue
        }
        
        // Create grant object
        const grant = this.createGrant(item, data, status)
        if (grant) {
          grants.push(grant)
        }
      }
      
      console.log(`[v0] EU RSS - Open: ${openCount}, Forthcoming: ${forthcomingCount}, Closed skipped: ${closedSkipped}, Irrelevant skipped: ${irrelevantSkipped}`)
      
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === "AbortError") {
        console.log("[v0] EU RSS - Timeout after 15s")
      } else {
        throw error
      }
    }
    
    return grants
  }
  
  /**
   * Parse RSS items from XML
   */
  private parseRSSItems(xml: string): Array<{ title: string; link: string; description: string; pubDate: string }> {
    const items: Array<{ title: string; link: string; description: string; pubDate: string }> = []
    
    // Fast regex parsing
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi
    let match
    
    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1]
      
      const title = this.extractTag(itemXml, "title")
      const link = this.extractTag(itemXml, "link")
      const description = this.extractTag(itemXml, "description")
      const pubDate = this.extractTag(itemXml, "pubDate")
      
      if (title || description) {
        items.push({ title, link, description, pubDate })
      }
    }
    
    return items
  }
  
  /**
   * Extract XML tag content
   */
  private extractTag(xml: string, tag: string): string {
    const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i")
    const match = xml.match(regex)
    if (match) {
      return (match[1] || match[2] || "").trim()
    }
    return ""
  }
  
  /**
   * Extract structured data from HTML description
   */
  private extractStructuredData(html: string): {
    deadline: string
    openingDate: string
    budget: string
    status: string
    identifier: string
    programme: string
  } {
    const data = {
      deadline: "",
      openingDate: "",
      budget: "",
      status: "",
      identifier: "",
      programme: ""
    }
    
    if (!html) return data
    
    // Extract deadline
    const deadlineMatch = html.match(/<b>Deadline[^<]*<\/b>:\s*([^<\n]+)/i)
    if (deadlineMatch) {
      data.deadline = this.parseDate(deadlineMatch[1].trim())
    }
    
    // Extract opening date
    const openingMatch = html.match(/<b>Opening[^<]*<\/b>:\s*([^<\n]+)/i)
    if (openingMatch) {
      data.openingDate = this.parseDate(openingMatch[1].trim())
    }
    
    // Extract budget
    const budgetMatch = html.match(/<b>Budget[^<]*<\/b>:\s*([^<\n]+)/i)
    if (budgetMatch) {
      data.budget = budgetMatch[1].trim()
    }
    
    // Extract status
    const statusMatch = html.match(/<b>Status[^<]*<\/b>:\s*([^<\n]+)/i)
    if (statusMatch) {
      data.status = statusMatch[1].trim()
    }
    
    // Extract identifier
    const idMatch = html.match(/<b>Identifier[^<]*<\/b>:\s*([^<\n]+)/i)
    if (idMatch) {
      data.identifier = idMatch[1].trim()
    }
    
    // Extract programme
    const progMatch = html.match(/<b>Programme[^<]*<\/b>:\s*([^<\n]+)/i)
    if (progMatch) {
      data.programme = progMatch[1].trim()
    }
    
    return data
  }
  
  /**
   * Parse date string to YYYY-MM-DD
   */
  private parseDate(dateStr: string): string {
    if (!dateStr) return ""
    
    try {
      // Handle common EU date formats
      // "17 May 2028 17:00" or "2028-05-17" or "17/05/2028"
      
      // Already ISO format
      if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        return dateStr.split("T")[0].substring(0, 10)
      }
      
      // European format with time "17 May 2028 17:00"
      const euMatch = dateStr.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/)
      if (euMatch) {
        const months: Record<string, string> = {
          "january": "01", "february": "02", "march": "03", "april": "04",
          "may": "05", "june": "06", "july": "07", "august": "08",
          "september": "09", "october": "10", "november": "11", "december": "12",
          "jan": "01", "feb": "02", "mar": "03", "apr": "04",
          "jun": "06", "jul": "07", "aug": "08", "sep": "09", "oct": "10", "nov": "11", "dec": "12"
        }
        const day = euMatch[1].padStart(2, "0")
        const month = months[euMatch[2].toLowerCase()] || "01"
        const year = euMatch[3]
        return `${year}-${month}-${day}`
      }
      
      // Try standard date parsing
      const date = new Date(dateStr)
      if (!isNaN(date.getTime())) {
        return date.toISOString().split("T")[0]
      }
      
      return ""
    } catch {
      return ""
    }
  }
  
  /**
   * Create grant object from RSS item
   */
  private createGrant(
    item: { title: string; link: string; description: string; pubDate: string },
    data: { deadline: string; openingDate: string; budget: string; status: string; identifier: string; programme: string },
    status: string
  ): EUGrant | null {
    const title = item.title || ""
    const identifier = data.identifier || this.extractIdentifierFromTitle(title) || `EU-${Date.now()}`
    
    // Build URL
    const url = item.link || `https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/${identifier.toLowerCase()}`
    
    // Clean description (remove HTML)
    const description = (item.description || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 500)
    
    // Determine category
    const category = this.categorize(title, description)
    
    // Map programme
    const program = this.mapProgramme(data.programme)
    
    // Publish date
    const publishDate = item.pubDate ? this.parseDate(item.pubDate) : new Date().toISOString().split("T")[0]
    
    return {
      id: `EU-${identifier}`,
      title: title || identifier,
      organization: "European Commission",
      publishDate,
      deadline: data.deadline,
      openingDate: data.openingDate,
      amount: data.budget,
      budget: data.budget,
      category,
      description,
      expedient: identifier,
      callIdentifier: identifier,
      topicIdentifier: identifier,
      sourceUrl: url,
      source: "eu",
      url,
      program,
      status,
      type: "Grant"
    }
  }
  
  /**
   * Extract identifier from title
   */
  private extractIdentifierFromTitle(title: string): string {
    // Common patterns: "HORIZON-CL4-2024-SPACE-01" or "EDF-2024-DA-SENS"
    const match = title.match(/([A-Z]{2,}-[A-Z0-9-]+)/i)
    return match ? match[1] : ""
  }
  
  /**
   * Map programme name
   */
  private mapProgramme(prog: string): string {
    if (!prog) return "EU Funding & Tenders"
    const p = prog.toLowerCase()
    if (p.includes("horizon")) return "Horizon Europe"
    if (p.includes("edf") || p.includes("defence fund")) return "European Defence Fund"
    if (p.includes("digital")) return "Digital Europe"
    if (p.includes("cef")) return "Connecting Europe Facility"
    if (p.includes("life")) return "LIFE Programme"
    if (p.includes("space") || p.includes("euspa")) return "EU Space Programme"
    if (p.includes("euratom")) return "Euratom"
    if (p.includes("eic") || p.includes("innovation council")) return "European Innovation Council"
    return prog
  }
  
  /**
   * Categorize grant - aligned with ARQUIMEA tech areas
   */
  private categorize(title: string, description: string): string {
    const text = `${title} ${description}`.toLowerCase()
    
    if (text.includes("defence") || text.includes("defense") || text.includes("edf") || text.includes("military")) {
      return "Defence & Security"
    }
    if (text.includes("space") || text.includes("satellite") || text.includes("launcher") || text.includes("orbit") || text.includes("copernicus") || text.includes("galileo")) {
      return "Space"
    }
    if (text.includes("drone") || text.includes("uav") || text.includes("unmanned") || text.includes("rpas")) {
      return "Aerospace & Drones"
    }
    if (text.includes("quantum") || text.includes("photonic")) {
      return "Quantum & Photonics"
    }
    if (text.includes("cyber") || text.includes("ai") || text.includes("artificial intelligence") || text.includes("digital")) {
      return "Digital & AI"
    }
    if (text.includes("sensor") || text.includes("radar") || text.includes("electronic") || text.includes("navigation")) {
      return "Electronics & Sensors"
    }
    if (text.includes("energy") || text.includes("hydrogen") || text.includes("battery") || text.includes("climate")) {
      return "Energy & Environment"
    }
    if (text.includes("health") || text.includes("medical")) {
      return "Health"
    }
    if (text.includes("transport") || text.includes("mobility") || text.includes("aviation")) {
      return "Transport & Mobility"
    }
    if (text.includes("security") || text.includes("border")) {
      return "Security"
    }
    
    return "Research & Innovation"
  }
}
