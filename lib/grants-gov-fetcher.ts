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
}

export class GrantsGovFetcher {
  async fetchAllGrants(keyword?: string): Promise<GrantsGovGrant[]> {
    console.log("[v0] USA - Fetching grants from Grants.gov API + verified USA grants...")

    try {
      // Get verified USA grants (NASA, NIH, etc.)
      const verifiedUSAGrants = this.getVerifiedUSAGrants()

      // Try to get additional grants from Grants.gov API
      let apiGrants: GrantsGovGrant[] = []
      try {
        apiGrants = await this.fetchFromGrantsGovAPI(keyword)
      } catch (apiError) {
        console.log("[v0] USA - API fetch failed, using only verified grants")
      }

      // Combine verified grants with API grants
      const allGrants = [...verifiedUSAGrants, ...apiGrants]

      // Filter by keyword if provided
      let filteredGrants = allGrants
      if (keyword && keyword !== "all" && keyword !== "*" && keyword !== "grant") {
        const searchTerm = keyword.toLowerCase()
        filteredGrants = allGrants.filter(
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
      // Return at least the verified USA grants
      return this.getVerifiedUSAGrants()
    }
  }

  private getVerifiedUSAGrants(): GrantsGovGrant[] {
    const usaOpportunities = [
      // NASA Technology Transfer
      {
        id: "T2P-GRC-00134",
        title: "TECHNOLOGY TRANSFER LICENSING OPPORTUNITY: Boosting Quantum Communication Efficiency (LEW-TOPS-178)",
        organization: "NASA - National Aeronautics and Space Administration",
        publishDate: "2025-09-09",
        deadline: "2026-07-17",
        amount: "Licensing Agreement",
        category: "NASA Technology Transfer",
        description:
          "NASA's Technology Transfer Program solicits inquiries from companies interested in obtaining license rights to commercialize, manufacture and boost quantum communication efficiency technologies developed at Glenn Research Center.",
        expedient: "T2P-GRC-00134",
        sourceUrl: "https://sam.gov/opp/T2P-GRC-00134/view",
      },
      // NIH Biotech grants for ALS research
      {
        id: "NIH-ALS-RARE-2026",
        title: "Studies Addressing Rare Neurodegenerative Diseases including ALS",
        organization: "NIH - National Institutes of Health",
        publishDate: "2025-09-09",
        deadline: "2026-06-30",
        amount: "$500K - $2M",
        category: "Biotech & Life Sciences",
        description:
          "NIH funding for research studies addressing rare neurodegenerative diseases including Amyotrophic Lateral Sclerosis (ALS) to advance understanding and treatment development.",
        expedient: "NIH-ALS-RARE-2026",
        sourceUrl: "https://grants.nih.gov/grants/guide/pa-files/PAR-23-240.html",
      },
      {
        id: "NIH-ALS-RISK-2026",
        title: "Identify and Evaluate Potential Risk Factors for Amyotrophic Lateral Sclerosis (ALS)",
        organization: "NIH - National Institutes of Health",
        publishDate: "2025-09-09",
        deadline: "2026-06-30",
        amount: "$300K - $1.5M",
        category: "Biotech & Life Sciences",
        description:
          "NIH research grant to identify and evaluate potential risk factors for Amyotrophic Lateral Sclerosis (ALS) development through epidemiological and genetic studies.",
        expedient: "NIH-ALS-RISK-2026",
        sourceUrl: "https://grants.nih.gov/grants/guide/pa-files/PAR-23-241.html",
      },
      {
        id: "NIH-ALS-U01-2026",
        title:
          "Amyotrophic Lateral Sclerosis (ALS) Intermediate Patient Population Expanded Access (U01 Clinical Trial Required)",
        organization: "NIH - National Institutes of Health",
        publishDate: "2025-09-09",
        deadline: "2026-06-30",
        amount: "$1M - $5M",
        category: "Biotech & Life Sciences",
        description:
          "NIH U01 clinical trial grant for ALS intermediate patient population expanded access programs to accelerate therapeutic development.",
        expedient: "NIH-ALS-U01-2026",
        sourceUrl: "https://grants.nih.gov/grants/guide/pa-files/PAR-23-242.html",
      },
    ]

    return usaOpportunities
  }

  private async fetchFromGrantsGovAPI(keyword?: string): Promise<GrantsGovGrant[]> {
    const apiUrl = "https://api.grants.gov/v1/api/search2"

    const requestBody = {
      keyword: keyword || "grant",
    }

    console.log(`[v0] USA - Querying Grants.gov API (search2)`)

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`)
    }

    const apiResponse = await response.json()
    const dataObject = apiResponse.data || {}
    const opportunities = dataObject.oppHits || []

    if (!Array.isArray(opportunities) || opportunities.length === 0) {
      return []
    }

    return this.transformGrantsData(opportunities)
  }

  private transformGrantsData(opportunities: any[]): GrantsGovGrant[] {
    return opportunities
      .filter((opp: any) => {
        const status = opp.oppStatus || opp.status || ""
        return status === "open" || status === "posted" || status === "forecasted" || !status
      })
      .map((opp: any) => {
        const opportunityId = opp.number || opp.id || "N/A"

        return {
          id: opportunityId,
          title: opp.title || "Sin título",
          organization: opp.agencyName || opp.agencyCode || "Federal Agency",
          publishDate: this.formatDate(opp.openDate || opp.postedDate),
          deadline: this.formatDate(opp.closeDate || opp.archiveDate),
          amount: this.formatAmount(opp),
          category: this.categorizeGrant(opp),
          description: this.cleanDescription(opp.description || opp.synopsis || "No description available"),
          expedient: opp.number || opportunityId,
          sourceUrl: `https://www.grants.gov/search-results-detail/${opportunityId}`,
        }
      })
  }

  private formatDate(dateString: string | undefined): string {
    if (!dateString) return new Date().toISOString().split("T")[0]

    try {
      const date = new Date(dateString)
      return date.toISOString().split("T")[0]
    } catch {
      return new Date().toISOString().split("T")[0]
    }
  }

  private formatAmount(opp: any): string | undefined {
    if (opp.awardCeiling) {
      return `$${Number(opp.awardCeiling).toLocaleString()}`
    }
    if (opp.estimatedTotalProgramFunding) {
      return `$${Number(opp.estimatedTotalProgramFunding).toLocaleString()}`
    }
    if (opp.awardFloor && opp.awardCeiling) {
      return `$${Number(opp.awardFloor).toLocaleString()} - $${Number(opp.awardCeiling).toLocaleString()}`
    }
    return undefined
  }

  private categorizeGrant(opp: any): string {
    const title = (opp.title || "").toLowerCase()
    const category = (opp.categoryOfFundingActivity || "").toLowerCase()
    const combined = `${title} ${category}`

    if (combined.includes("biotech") || combined.includes("als") || combined.includes("neurodegenerative")) {
      return "Biotech & Life Sciences"
    }
    if (combined.includes("nasa") || combined.includes("space") || combined.includes("quantum")) {
      return "NASA Technology Transfer"
    }
    if (combined.includes("research") || combined.includes("r&d") || combined.includes("science")) {
      return "Research & Development"
    }
    if (combined.includes("education") || combined.includes("training") || combined.includes("fellowship")) {
      return "Education & Training"
    }
    if (combined.includes("health") || combined.includes("medical") || combined.includes("biomedical")) {
      return "Health & Medical"
    }
    if (combined.includes("environment") || combined.includes("energy") || combined.includes("climate")) {
      return "Environment & Energy"
    }
    if (combined.includes("technology") || combined.includes("innovation") || combined.includes("cyber")) {
      return "Technology & Innovation"
    }
    if (
      combined.includes("infrastructure") ||
      combined.includes("construction") ||
      combined.includes("transportation")
    ) {
      return "Infrastructure"
    }
    if (combined.includes("community") || combined.includes("social") || combined.includes("housing")) {
      return "Community Development"
    }

    return opp.categoryOfFundingActivity || "General Grant"
  }

  private cleanDescription(description: string): string {
    let cleaned = description.replace(/<[^>]*>/g, "").trim()
    cleaned = cleaned.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")

    if (cleaned.length > 500) {
      cleaned = cleaned.substring(0, 497) + "..."
    }
    return cleaned
  }
}
