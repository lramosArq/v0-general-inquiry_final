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
      }

      const defenseGrants = this.getDefenseGrants()
      apiGrants = [...apiGrants, ...defenseGrants]

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

  private getDefenseGrants(): GrantsGovGrant[] {
    return [
      {
        id: "HQ0860-25-S-0001",
        title: "Missile Defense Agency - Multiple Authority Announcement (MAA)",
        organization: "Missile Defense Agency (MDA) - Dept of Defense",
        publishDate: "",
        deadline: "",
        category: "Defense - Sensors / Intercept Tech",
        description: "Framework announcement for disruptive technologies and rapid capability development. Follow on SAM for new releases.",
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
        title: "RFI: On-orbit satellite nuclear power systems (technologies, qualification testing, handling, applications)",
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
        title: "Expedited Research Innovation System (ERIS) - open call for disruptive solutions",
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
        description: "Special notice for large bio-mechanical space structures. Check SAM for active linked notices.",
        expedient: "DARPA-SN-25-51",
        sourceUrl: "https://sam.gov/opp/49c9fac62ef249f19cda8b436a095d3b/view",
        url: "https://sam.gov/opp/49c9fac62ef249f19cda8b436a095d3b/view",
      },
      {
        id: "DEVCOM-HMI-XR",
        title: "DEVCOM Soldier Center: multimodal human-machine interfaces for XR and robotic autonomous systems (RAS)",
        organization: "DEVCOM Soldier Center - Dept of Defense",
        publishDate: "",
        deadline: "",
        category: "Defense - Autonomy / HMI / XR",
        description: "Technology seeking for interfaces controlling autonomous systems. Potential for UGV/UAS and HMI.",
        expedient: "DEVCOM-HMI-XR",
        sourceUrl: "https://sam.gov/opp/94b628e4144e42f0820d829d7c23dbf7/view",
        url: "https://sam.gov/opp/94b628e4144e42f0820d829d7c23dbf7/view",
      },
      {
        id: "CMOSS-IRS",
        title: "CMOSS Interoperability Requirements Specification (baseline technical requirements)",
        organization: "Dept of Defense",
        publishDate: "",
        deadline: "",
        category: "Defense - C4ISR / EW / Open architectures",
        description: "Relevant for payload/sensor integration in open architectures (CMOSS standard).",
        expedient: "CMOSS-IRS",
        sourceUrl: "https://sam.gov/opp/d9bd12398f1d4791855dba898e3d69ec/view",
        url: "https://sam.gov/opp/d9bd12398f1d4791855dba898e3d69ec/view",
      },
      {
        id: "CMFF-C5ISR",
        title: "CMFF: modular C5ISR/EW capabilities away from stovepiped legacy systems",
        organization: "Dept of Defense",
        publishDate: "",
        deadline: "",
        category: "Defense - C5ISR / EW / Modular payloads",
        description: "Opportunity for modular cards/payloads, EW/RF, sensors and mission SW.",
        expedient: "CMFF-C5ISR",
        sourceUrl: "https://sam.gov/opp/c2a8fd23e3a447b5b1f377fd4e5911d5/view",
        url: "https://sam.gov/opp/c2a8fd23e3a447b5b1f377fd4e5911d5/view",
      },
      {
        id: "TREX-II-OTA",
        title: "TReX II OTA: Request for Solutions in support of DoD TRMC",
        organization: "Test Resource Management Center (TRMC) - Dept of Defense",
        publishDate: "",
        deadline: "",
        category: "Defense - R&D / Test & Evaluation",
        description: "OTA for test, instrumentation, software or evaluation solutions.",
        expedient: "TREX-II-OTA",
        sourceUrl: "https://sam.gov/opp/d7a9397718654880b3eecc9833d040ce/view",
        url: "https://sam.gov/opp/d7a9397718654880b3eecc9833d040ce/view",
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
        sourceUrl: "https://simpler.grants.gov/opportunity/359239",
        url: "https://simpler.grants.gov/opportunity/359239",
      },
      {
        id: "C5ISR-EXPO-2025",
        title: "2025 C5ISR Expo (industry engagement / investment areas)",
        organization: "Army C5ISR Center - Dept of Defense",
        publishDate: "",
        deadline: "",
        category: "Defense - C5ISR / Sensors / Networking",
        description: "Not a direct solicitation, but useful for positioning and detecting investment areas.",
        expedient: "C5ISR-EXPO-2025",
        sourceUrl: "https://sam.gov/opp/a755f44c61534b8281f47d406f05b2af/view",
        url: "https://sam.gov/opp/a755f44c61534b8281f47d406f05b2af/view",
      },
    ]
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
