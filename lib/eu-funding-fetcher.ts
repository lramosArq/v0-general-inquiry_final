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
  async fetchAllGrants(keyword?: string): Promise<EUGrant[]> {
    console.log("[v0] EU - Fetching grants from data.europa.eu API...")

    try {
      // Try data.europa.eu Search API for funding/tenders datasets
      const grants = await this.fetchFromDataEuropaAPI(keyword)
      
      if (grants.length === 0) {
        // Fallback to TED (Tenders Electronic Daily)
        console.log("[v0] EU - Trying TED API...")
        const tedGrants = await this.fetchFromTEDAPI(keyword)
        console.log(`[v0] EU - Total grants from TED: ${tedGrants.length}`)
        return tedGrants
      }
      
      console.log(`[v0] EU - Total grants from API: ${grants.length}`)
      return grants
    } catch (error) {
      console.error("[v0] EU - Error fetching from API:", error)
      return []
    }
  }

  private async fetchFromDataEuropaAPI(keyword?: string): Promise<EUGrant[]> {
    const searchQuery = keyword && keyword !== "all" && keyword !== "*" 
      ? keyword 
      : "funding tenders"
    
    try {
      // data.europa.eu Search API
      const response = await fetch(
        `https://data.europa.eu/api/hub/search/search?q=${encodeURIComponent(searchQuery)}&filter=dataset&limit=30&page=0`,
        {
          headers: {
            "Accept": "application/json",
          },
        }
      )

      if (!response.ok) {
        console.log(`[v0] EU - data.europa.eu API returned ${response.status}`)
        return []
      }

      const contentType = response.headers.get("content-type")
      if (!contentType?.includes("application/json")) {
        console.log("[v0] EU - data.europa.eu returned non-JSON")
        return []
      }

      const data = await response.json()
      
      if (!data.result?.results || !Array.isArray(data.result.results)) {
        console.log("[v0] EU - No results in data.europa.eu response")
        return []
      }

      return data.result.results
        .filter((item: any) => {
          // Filter for funding/tender related datasets
          // Handle both string and object {en: "..."} formats
          const rawTitle = item.title?.en || (typeof item.title === "string" ? item.title : "")
          const rawDesc = item.description?.en || (typeof item.description === "string" ? item.description : "")
          const title = String(rawTitle).toLowerCase()
          const desc = String(rawDesc).toLowerCase()
          return title.includes("fund") || title.includes("tender") || 
                 title.includes("grant") || title.includes("call") ||
                 desc.includes("funding") || desc.includes("tender")
        })
        .slice(0, 25)
        .map((item: any) => this.mapDataEuropaResult(item))
        .filter((item): item is EUGrant => item !== null)
    } catch (error) {
      console.error("[v0] EU - data.europa.eu API error:", error)
      return []
    }
  }

  private async fetchFromTEDAPI(keyword?: string): Promise<EUGrant[]> {
    // TED (Tenders Electronic Daily) - Official EU procurement
    const searchQuery = keyword && keyword !== "all" && keyword !== "*" 
      ? keyword 
      : ""
    
    try {
      // TED Search API endpoint
      const response = await fetch(
        `https://ted.europa.eu/api/v3.0/notices/search?q=${encodeURIComponent(searchQuery || "*")}&pageNum=1&pageSize=30&scope=3&sortField=PD&sortOrder=desc`,
        {
          headers: {
            "Accept": "application/json",
          },
        }
      )

      if (!response.ok) {
        console.log(`[v0] EU - TED API returned ${response.status}`)
        // Try alternative TED endpoint
        return await this.fetchFromTEDAlternative(searchQuery)
      }

      const contentType = response.headers.get("content-type")
      if (!contentType?.includes("application/json")) {
        return await this.fetchFromTEDAlternative(searchQuery)
      }

      const data = await response.json()
      
      if (!data.notices || !Array.isArray(data.notices)) {
        return await this.fetchFromTEDAlternative(searchQuery)
      }

      return data.notices
        .map((item: any) => this.mapTEDResult(item))
        .filter((item): item is EUGrant => item !== null)
    } catch (error) {
      console.error("[v0] EU - TED API error:", error)
      return await this.fetchFromTEDAlternative(keyword)
    }
  }

  private async fetchFromTEDAlternative(keyword?: string): Promise<EUGrant[]> {
    try {
      // Alternative: TED RSS/Atom feed converted to JSON
      const response = await fetch(
        `https://ted.europa.eu/api/v2.0/notices/search?q=*&pageNum=1&pageSize=25&scope=3`,
        {
          headers: {
            "Accept": "application/json",
          },
        }
      )

      if (!response.ok) {
        console.log("[v0] EU - TED Alternative API also failed")
        return []
      }

      const contentType = response.headers.get("content-type")
      if (!contentType?.includes("application/json")) {
        console.log("[v0] EU - TED Alternative returned non-JSON")
        return []
      }

      const data = await response.json()
      
      if (data.results && Array.isArray(data.results)) {
        return data.results
          .map((item: any) => this.mapTEDResult(item))
          .filter((item): item is EUGrant => item !== null)
      }
      
      return []
    } catch (error) {
      console.error("[v0] EU - TED Alternative error:", error)
      return []
    }
  }

  private mapDataEuropaResult(item: any): EUGrant | null {
    if (!item) return null

    const id = item.id || item.identifier
    if (!id) return null
    
    const title = item.title?.en || item.title || ""
    if (!title) return null
    
    const url = item.landingPage || item.accessUrl || 
                `https://data.europa.eu/data/datasets/${id}`

    return {
      id: id,
      title: title,
      organization: item.publisher?.name || "European Commission",
      publishDate: item.issued || item.modified || "",
      deadline: "",
      amount: "",
      category: item.theme?.[0] || "EU Data",
      description: item.description?.en || item.description || title,
      expedient: id,
      sourceUrl: url,
      source: "eu",
      url: url,
    }
  }

  private mapTEDResult(item: any): EUGrant | null {
    if (!item) return null

    const id = item.noticeNumber || item.tedNoticeId || item.id
    if (!id) return null
    
    const title = item.title || item.shortDescription || ""
    if (!title) return null
    
    const url = `https://ted.europa.eu/en/notice/-/detail/${id}`

    return {
      id: id,
      title: title,
      organization: item.buyerName || item.authorityName || "EU Institution",
      publishDate: item.publicationDate || item.dispatchDate || "",
      deadline: item.deadline || item.timeLimit || "",
      amount: item.estimatedValue ? `${item.estimatedValue} EUR` : "",
      category: item.cpvDescription || item.procedureType || "EU Tender",
      description: item.description || item.shortDescription || title,
      expedient: id,
      sourceUrl: url,
      source: "eu",
      url: url,
    }
  }
}
