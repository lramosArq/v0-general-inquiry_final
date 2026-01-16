export interface GrantsGovGrant {
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
  url: string
}

export class GrantsGovFetcher {
  async fetchAllGrants(keyword?: string): Promise<GrantsGovGrant[]> {
    console.log("[v0] USA - Fetching grants from Grants.gov API...")

    try {
      let apiGrants: GrantsGovGrant[] = []
      try {
        apiGrants = await this.fetchFromGrantsGovAPI(keyword)
      } catch (apiError) {
        console.log("[v0] USA - API fetch failed")
        return []
      }

      // Filter by keyword if provided
      let filteredGrants = apiGrants
      if (keyword && keyword !== "all" && keyword !== "*" && keyword !== "grant") {
        const searchTerm = keyword.toLowerCase()
        filteredGrants = apiGrants.filter(
          (g) =>
            g.title.toLowerCase().includes(searchTerm) ||
            g.organization.toLowerCase().includes(searchTerm) ||
            g.category.toLowerCase().includes(searchTerm) ||
            g.description.toLowerCase().includes(searchTerm),
        )
      }

      console.log(`[v0] USA - Total grants: ${filteredGrants.length}`)
      return filteredGrants
    } catch (error) {
      console.error("[v0] USA - Error fetching grants:", error)
      return []
    }
  }

  private async fetchFromGrantsGovAPI(keyword?: string): Promise<GrantsGovGrant[]> {
    const searchKeyword = keyword && keyword !== "all" && keyword !== "*" ? keyword : "grant"

    const response = await fetch("https://api.grants.gov/v1/api/search2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        keyword: searchKeyword,
      }),
    })

    if (!response.ok) {
      throw new Error(`Grants.gov API error: ${response.status}`)
    }

    const result = await response.json()
    const opportunities = result?.data?.oppHits || []

    return opportunities
      .filter((opp: any) => opp.oppStatus === "posted" || opp.oppStatus === "forecasted")
      .map((opp: any) => {
        const url = `https://www.grants.gov/search-results-detail/${opp.id}`
        return {
          id: opp.id?.toString() || opp.number,
          title: opp.title,
          organization: opp.agencyName || opp.agencyCode,
          publishDate: opp.openDate || new Date().toISOString().split("T")[0],
          deadline: opp.closeDate || "",
          category: "General Grant",
          description: opp.synopsis || "Federal grant opportunity",
          expedient: opp.number || opp.id?.toString(),
          sourceUrl: url,
          url: url,
        }
      })
  }
}
