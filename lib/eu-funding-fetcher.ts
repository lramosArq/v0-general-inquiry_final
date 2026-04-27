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
  // EU Funding & Tenders Portal API
  private apiUrl = "https://api.tech.ec.europa.eu/search-api/prod/rest/search"

  async fetchAllGrants(keyword?: string): Promise<EUGrant[]> {
    console.log("[v0] EU - Fetching grants from EU Funding & Tenders Portal API...")

    try {
      const grants = await this.fetchFromEUAPI(keyword)
      console.log(`[v0] EU - Total grants from API: ${grants.length}`)
      return grants
    } catch (error) {
      console.error("[v0] EU - Error fetching from API:", error)
      return []
    }
  }

  private async fetchFromEUAPI(keyword?: string): Promise<EUGrant[]> {
    const searchKeyword = keyword && keyword !== "all" && keyword !== "*" ? keyword : ""
    
    // EU Funding & Tenders Portal Search API
    const queryParams = new URLSearchParams({
      apiKey: "SEDIA",
      text: searchKeyword || "*",
      pageSize: "50",
      pageNumber: "1",
    })

    const response = await fetch(
      `https://api.tech.ec.europa.eu/search-api/prod/rest/search?${queryParams}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bool: {
            must: [
              {
                terms: {
                  type: ["1"], // Topics/Calls
                },
              },
              {
                terms: {
                  status: ["31094501", "31094502"], // Open, Forthcoming
                },
              },
            ],
          },
        }),
      }
    )

    if (!response.ok) {
      // Try alternative endpoint - direct search
      return await this.fetchFromAlternativeAPI(searchKeyword)
    }

    const data = await response.json()
    
    if (!data.results || !Array.isArray(data.results)) {
      return await this.fetchFromAlternativeAPI(searchKeyword)
    }

    return data.results.map((item: any) => this.mapEUResult(item)).filter(Boolean)
  }

  private async fetchFromAlternativeAPI(keyword?: string): Promise<EUGrant[]> {
    // Alternative: Use the public search endpoint
    const searchTerm = keyword || "horizon"
    
    try {
      const response = await fetch(
        `https://ec.europa.eu/info/funding-tenders/opportunities/data/topicDetails.json`,
        {
          headers: {
            "Accept": "application/json",
          },
        }
      )

      if (!response.ok) {
        console.log("[v0] EU - Alternative API also failed, returning empty")
        return []
      }

      const data = await response.json()
      
      if (Array.isArray(data)) {
        return data
          .filter((item: any) => {
            if (!keyword || keyword === "all" || keyword === "*") return true
            const searchLower = keyword.toLowerCase()
            return (
              item.title?.toLowerCase().includes(searchLower) ||
              item.identifier?.toLowerCase().includes(searchLower)
            )
          })
          .slice(0, 50)
          .map((item: any) => this.mapEUResult(item))
          .filter(Boolean)
      }
      
      return []
    } catch (error) {
      console.error("[v0] EU - Alternative API error:", error)
      return []
    }
  }

  private mapEUResult(item: any): EUGrant | null {
    if (!item) return null

    const id = item.identifier || item.topicId || item.ccm2Id || `EU-${Date.now()}`
    const title = item.title || item.name || "Untitled"
    
    // Generate direct URL to the topic
    const url = `https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/${id.toLowerCase()}`

    return {
      id: id,
      title: title,
      organization: item.programmeName || item.frameworkProgramme || "European Commission",
      publishDate: item.publicationDate || item.startDate || "",
      deadline: item.deadlineDate || item.deadline || "",
      amount: item.budget || item.indicativeBudget || "",
      category: item.typeName || item.tags?.join(", ") || "EU Funding",
      description: item.description || item.shortDescription || title,
      expedient: id,
      sourceUrl: url,
      source: "eu",
      url: url,
    }
  }
}
