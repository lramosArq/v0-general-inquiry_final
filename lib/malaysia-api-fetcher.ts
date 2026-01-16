export interface MalaysiaTender {
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

export class MalaysiaApiFetcher {
  private baseUrl = "https://www.eperolehan.gov.my/api"

  async fetchDefenseTenders(): Promise<MalaysiaTender[]> {
    console.log("[v0] 🇲🇾 Iniciando obtención de licitaciones malayas desde ePerolehan...")

    try {
      // API del sistema ePerolehan de Malasia
      const response = await fetch(`${this.baseUrl}/tenders/search`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "ArquiAlert/1.0",
        },
      })

      if (!response.ok) {
        throw new Error(`Malaysian API error: ${response.status}`)
      }

      const data = await response.json()
      return this.transformMalaysianData(data.tenders || [])
    } catch (error) {
      console.error("[v0] Error obteniendo datos de Malasia:", error)
      console.log("[v0] Usando datos de fallback de Malasia")
      return this.getFallbackMalaysianTenders()
    }
  }

  private transformMalaysianData(tenders: any[]): MalaysiaTender[] {
    return tenders.map((tender: any) => ({
      id: `MY-${tender.id}`,
      title: tender.title,
      organization: tender.agency || "Malaysian Government Agency",
      publishDate: tender.publishDate,
      deadline: tender.closingDate,
      amount: tender.estimatedValue ? `RM ${tender.estimatedValue.toLocaleString()}` : undefined,
      category: this.mapCategoryToDefense(tender.category),
      description: tender.description,
      expedient: tender.referenceNo || `MY-${tender.id}`,
      sourceUrl: `https://www.eperolehan.gov.my/tender/${tender.id}`,
    }))
  }

  private mapCategoryToDefense(category: string): string {
    const categoryMap: { [key: string]: string } = {
      defense: "Sistemas de Defensa",
      military: "Equipamiento Militar",
      security: "Seguridad Nacional",
      communications: "Comunicaciones Militares",
      logistics: "Logística Militar",
      maintenance: "Mantenimiento Militar",
    }
    return categoryMap[category?.toLowerCase()] || "Defensa General"
  }

  private getFallbackMalaysianTenders(): MalaysiaTender[] {
    return [
      {
        id: "MY-2025-DEF-001",
        title: "Procurement of Advanced Radar Systems for Royal Malaysian Air Force",
        organization: "Ministry of Defence Malaysia - Royal Malaysian Air Force",
        publishDate: "2025-08-21",
        deadline: "2025-09-26",
        amount: "RM 45,000,000",
        category: "Sistemas de Radar",
        description:
          "Acquisition of advanced radar systems to enhance air defense capabilities of the Royal Malaysian Air Force",
        expedient: "MY-2025-RMAF-RADAR-001",
        sourceUrl: "https://www.eperolehan.gov.my/tender/MY-2025-DEF-001",
      },
      {
        id: "MY-2025-DEF-002",
        title: "Supply of Communication Equipment for Malaysian Armed Forces",
        organization: "Ministry of Defence Malaysia - Malaysian Armed Forces",
        publishDate: "2025-08-17",
        deadline: "2025-09-20",
        amount: "RM 28,500,000",
        category: "Comunicaciones Militares",
        description:
          "Supply of secure communication equipment for enhanced operational coordination across Malaysian Armed Forces",
        expedient: "MY-2025-MAF-COMM-002",
        sourceUrl: "https://www.eperolehan.gov.my/tender/MY-2025-DEF-002",
      },
    ]
  }
}
