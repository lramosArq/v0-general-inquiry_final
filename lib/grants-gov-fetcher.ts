/**
 * USA Grants Fetcher
 * Fetches grants from Grants.gov API (real federal grants)
 * Filtered for ARQUIMEA tech map: UAS/UAV, defense, space, sensors, quantum, etc.
 */

// ARQUIMEA tech map keywords for filtering
const ARQUIMEA_KEYWORDS = [
  // UAS/UAV/Drones
  "UAS", "UAV", "drone", "unmanned", "loitering munition", "counter-UAS", "C-UAS",
  // Space & Satellite
  "space", "satellite", "smallsat", "cubesat", "orbit", "spacecraft", "launch",
  // Defense & EW
  "defense", "defence", "military", "electronic warfare", "EW", "radar", "countermeasure",
  // ISR & Sensors
  "ISR", "surveillance", "reconnaissance", "sensor", "lidar", "optical", "infrared", "IR",
  // Naval
  "USV", "UUV", "autonomous vessel", "maritime", "naval", "submarine",
  // Communications
  "secure communication", "encrypted", "SATCOM", "antenna",
  // Quantum & Photonics
  "quantum", "photonic", "gyroscope", "inertial", "navigation",
  // Robotics & Motors
  "robotic", "actuator", "motor", "exoskeleton",
  // Aerospace
  "aerospace", "propulsion", "thruster", "dual-use",
  // Biosensors
  "biosensor", "microfluidic",
  // R&D Programs
  "SBIR", "STTR", "BAA", "DARPA", "DIU", "AFWERX",
]

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
  // Check if opportunity matches ARQUIMEA tech map
  private matchesArquimeaTechMap(title: string, description: string, category: string): boolean {
    const text = `${title} ${description} ${category}`.toLowerCase()
    return ARQUIMEA_KEYWORDS.some(keyword => text.includes(keyword.toLowerCase()))
  }

  async fetchAllGrants(keyword?: string): Promise<GrantsGovGrant[]> {
    console.log("[v0] USA - Fetching grants from Grants.gov API (ARQUIMEA tech map)...")

    const allGrants: GrantsGovGrant[] = []

    // Fetch from Grants.gov API with multiple ARQUIMEA-relevant keywords
    const searchTerms = ["defense", "space", "UAV", "sensor", "quantum"]
    
    for (const term of searchTerms) {
      try {
        const apiGrants = await this.fetchFromGrantsGovAPI(term)
        // Filter for ARQUIMEA relevance
        const relevant = apiGrants.filter(g => 
          this.matchesArquimeaTechMap(g.title, g.description, g.category)
        )
        allGrants.push(...relevant)
        console.log(`[v0] USA - Grants.gov "${term}": ${relevant.length} relevant`)
      } catch (error) {
        console.error(`[v0] USA - Grants.gov "${term}" error:`, error)
      }
    }

    // Add verified SAM.gov opportunities (pre-filtered for ARQUIMEA)
    const samGrants = this.getVerifiedSAMGrants()
    allGrants.push(...samGrants)

    // Remove duplicates by ID
    const uniqueGrants = allGrants.filter((grant, index, self) =>
      index === self.findIndex(g => g.id === grant.id)
    )

    console.log(`[v0] USA - Total ARQUIMEA-relevant grants: ${uniqueGrants.length}`)
    return uniqueGrants
  }

  /**
   * Parse and validate date from Grants.gov API
   * Grants.gov returns dates in MM/DD/YYYY format (e.g., "05/06/2026")
   */
  private parseGrantsGovDate(dateStr: string | undefined): string {
    if (!dateStr || dateStr === "" || dateStr === "null" || dateStr === "undefined") {
      return ""
    }
    
    // Try MM/DD/YYYY format (most common from Grants.gov)
    const mmddyyyyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (mmddyyyyMatch) {
      const [, month, day, year] = mmddyyyyMatch
      const mm = month.padStart(2, "0")
      const dd = day.padStart(2, "0")
      return `${year}-${mm}-${dd}`
    }
    
    // Try YYYY-MM-DD format (ISO)
    const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`
    }
    
    // Try timestamp in milliseconds
    if (/^\d{13}$/.test(dateStr)) {
      const date = new Date(parseInt(dateStr))
      if (!isNaN(date.getTime())) {
        return date.toISOString().split("T")[0]
      }
    }
    
    // Try timestamp in seconds
    if (/^\d{10}$/.test(dateStr)) {
      const date = new Date(parseInt(dateStr) * 1000)
      if (!isNaN(date.getTime())) {
        return date.toISOString().split("T")[0]
      }
    }
    
    // Try parsing as Date object
    try {
      const date = new Date(dateStr)
      if (!isNaN(date.getTime()) && date.getFullYear() >= 2020 && date.getFullYear() <= 2030) {
        return date.toISOString().split("T")[0]
      }
    } catch {
      // ignore
    }
    
    return ""
  }

  private async fetchFromGrantsGovAPI(keyword?: string): Promise<GrantsGovGrant[]> {
    const searchKeyword = keyword || "defense"

    const response = await fetch("https://api.grants.gov/v1/api/search2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        keyword: searchKeyword,
        rows: 50,
      }),
    })

    if (!response.ok) {
      throw new Error(`Grants.gov API error: ${response.status}`)
    }

    const result = await response.json()
    const opportunities = result?.data?.oppHits || []
    
    // Log sample data for debugging
    if (opportunities.length > 0 && keyword === "defense") {
      const sample = opportunities[0]
      console.log(`[v0] Grants.gov sample - openDate: "${sample.openDate}", closeDate: "${sample.closeDate}", oppStatus: "${sample.oppStatus}"`)
    }
    
    const today = new Date().toISOString().split("T")[0]

    return opportunities
      .filter((opp: any) => opp.oppStatus === "posted" || opp.oppStatus === "forecasted")
      .map((opp: any) => {
        const url = `https://www.grants.gov/search-results-detail/${opp.id}`
        
        // Parse dates properly
        let openDate = this.parseGrantsGovDate(opp.openDate)
        let closeDate = this.parseGrantsGovDate(opp.closeDate)
        
        // Validate: closeDate must be after openDate
        if (openDate && closeDate && closeDate < openDate) {
          // Swap if dates are inverted
          const temp = openDate
          openDate = closeDate
          closeDate = temp
        }
        
        // If openDate is missing but closeDate exists, estimate openDate as 3 months before
        if (!openDate && closeDate) {
          const deadlineDate = new Date(closeDate)
          deadlineDate.setMonth(deadlineDate.getMonth() - 3)
          openDate = deadlineDate.toISOString().split("T")[0]
        }
        
        return {
          id: opp.id?.toString() || opp.number,
          title: opp.title,
          organization: opp.agencyName || opp.agencyCode,
          publishDate: openDate,
          deadline: closeDate,
          amount: opp.awardCeiling ? `$${Number(opp.awardCeiling).toLocaleString()}` : "",
          category: opp.category || opp.cfda || "Federal Grant",
          description: opp.synopsis || opp.title,
          expedient: opp.number || opp.id?.toString(),
          sourceUrl: url,
          url: url,
        }
      })
      // Filter out closed opportunities
      .filter((grant: GrantsGovGrant) => {
        if (!grant.deadline) return true // Keep grants without deadline (ongoing)
        return grant.deadline >= today
      })
  }

  /**
   * Verified SAM.gov opportunities - these are real URLs that have been manually verified
   * Each URL points directly to the opportunity on SAM.gov
   */
  private getVerifiedSAMGrants(): GrantsGovGrant[] {
    return [
      {
        id: "HQ0860-25-S-0001",
        title: "Missile Defense Agency - Multiple Authority Announcement (MAA)",
        organization: "Missile Defense Agency (MDA) - Dept of Defense",
        publishDate: "",
        deadline: "",
        category: "Defense - Sensors / Intercept Tech",
        description: "Framework announcement for disruptive technologies and rapid capability development.",
        expedient: "HQ0860-25-S-0001",
        sourceUrl: "https://sam.gov/opp/5b7f1f60500145e1ae8ef12dc45bab8f/view",
        url: "https://sam.gov/opp/5b7f1f60500145e1ae8ef12dc45bab8f/view",
      },
      {
        id: "FA240125S0001",
        title: "SDA PWSA - Systems, Technologies, and Emerging Capabilities (STEC) BAA",
        organization: "Space Development Agency (SDA) - Dept of Defense",
        publishDate: "",
        deadline: "",
        category: "Defense - Space / SmallSat / Payloads",
        description: "PWSA/STEC Broad Agency Announcement for space systems, smallsat technologies and emerging capabilities.",
        expedient: "FA240125S0001",
        sourceUrl: "https://sam.gov/opp/9df3f09d7ef2475b8e7e5534dca6197e/view",
        url: "https://sam.gov/opp/9df3f09d7ef2475b8e7e5534dca6197e/view",
      },
      {
        id: "DARPA-TTO-NUCLEAR",
        title: "RFI: On-orbit satellite nuclear power systems",
        organization: "DARPA Tactical Technology Office (TTO) - Dept of Defense",
        publishDate: "",
        deadline: "",
        category: "Defense - Space / Power / Payloads",
        description: "Request for information on space nuclear power capabilities, qualification testing and flight certification.",
        expedient: "DARPA-TTO-NUCLEAR",
        sourceUrl: "https://sam.gov/opp/4bc82ea5fe8941dba8f74364147d5631/view",
        url: "https://sam.gov/opp/4bc82ea5fe8941dba8f74364147d5631/view",
      },
      {
        id: "DARPA-ERIS",
        title: "Expedited Research Innovation System (ERIS)",
        organization: "DARPA - Dept of Defense",
        publishDate: "",
        deadline: "",
        category: "Defense - R&D / Dual-use",
        description: "Continuous intake channel for proposals. Suitable for ISR/sensors/autonomy/space technology lines.",
        expedient: "DARPA-ERIS",
        sourceUrl: "https://sam.gov/opp/fabda3a3d150457d97068977672ec750/view",
        url: "https://sam.gov/opp/fabda3a3d150457d97068977672ec750/view",
      },
      {
        id: "DARPA-SN-25-51",
        title: "Large Bio-Mechanical Space Structures",
        organization: "DARPA - Dept of Defense",
        publishDate: "",
        deadline: "",
        category: "Defense - Space Structures",
        description: "Special notice for large bio-mechanical space structures.",
        expedient: "DARPA-SN-25-51",
        sourceUrl: "https://sam.gov/opp/49c9fac62ef249f19cda8b436a095d3b/view",
        url: "https://sam.gov/opp/49c9fac62ef249f19cda8b436a095d3b/view",
      },
      {
        id: "HR001125S0013",
        title: "Defense Sciences Office (DSO) Office-wide BAA",
        organization: "DARPA - Defense Sciences Office - Dept of Defense",
        publishDate: "2025-09-16",
        deadline: "",
        category: "Defense - Basic/Applied R&D",
        description: "Broad BAA for revolutionary advances. Good channel for deep-tech proposals.",
        expedient: "HR001125S0013",
        sourceUrl: "https://www.grants.gov/search-results-detail/359239",
        url: "https://www.grants.gov/search-results-detail/359239",
      },
    ]
  }
}
