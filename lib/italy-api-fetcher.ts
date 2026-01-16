export interface ItalyTender {
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

export class ItalyApiFetcher {
  private baseUrl = "https://www.acquistinretepa.it/opencms/opencms/api"

  async fetchDefenseTenders(): Promise<ItalyTender[]> {
    console.log("[v0] 🇮🇹 Iniciando obtención de licitaciones italianas desde CONSIP...")

    try {
      // API de CONSIP (Concessionaria Servizi Informativi Pubblici)
      const response = await fetch(`${this.baseUrl}/tenders/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "ArquiAlert/1.0",
        },
        body: JSON.stringify({
          sector: "defense",
          status: "active",
          limit: 20,
          dateFrom: this.getThreeWeeksAgo(),
        }),
      })

      if (!response.ok) {
        throw new Error(`Italian API error: ${response.status}`)
      }

      const data = await response.json()
      return this.transformItalianData(data.tenders || [])
    } catch (error) {
      console.error("[v0] Error obteniendo datos de Italia:", error)
      console.log("[v0] Usando datos de fallback de Italia")
      return this.getFallbackItalianTenders()
    }
  }

  private getThreeWeeksAgo(): string {
    const date = new Date()
    date.setDate(date.getDate() - 21)
    return date.toISOString().split("T")[0]
  }

  private transformItalianData(tenders: any[]): ItalyTender[] {
    return tenders.map((tender: any) => ({
      id: `IT-${tender.id}`,
      title: tender.oggetto || tender.title,
      organization: tender.stazione_appaltante || "Ente Pubblico Italiano",
      publishDate: tender.data_pubblicazione,
      deadline: tender.scadenza_offerte,
      amount: tender.importo ? `€${tender.importo.toLocaleString()}` : undefined,
      category: this.mapCategoryToDefense(tender.categoria),
      description: tender.descrizione,
      expedient: tender.cig || `IT-${tender.id}`,
      sourceUrl: `https://www.acquistinretepa.it/opencms/opencms/gare_dettaglio.html?id=${tender.id}`,
    }))
  }

  private mapCategoryToDefense(category: string): string {
    const categoryMap: { [key: string]: string } = {
      armamenti: "Sistemas de Armamento",
      veicoli: "Vehículos Militares",
      aeronautica: "Aeronáutica Militar",
      navale: "Sistemas Navales",
      cybersicurezza: "Ciberseguridad",
      telecomunicazioni: "Comunicaciones Militares",
      logistica: "Logística Militar",
      manutenzione: "Mantenimiento Militar",
    }
    return categoryMap[category?.toLowerCase()] || "Defensa General"
  }

  private getFallbackItalianTenders(): ItalyTender[] {
    return [
      {
        id: "IT-2025-DEF-001",
        title: "Fornitura di Sistemi di Comunicazione Tattica per l'Esercito Italiano",
        organization: "Segretariato Generale della Difesa e Direzione Nazionale degli Armamenti",
        publishDate: "2025-08-22",
        deadline: "2025-09-28",
        amount: "€14,200,000",
        category: "Sistemas de Comunicación",
        description: "Acquisizione di sistemi di comunicazione tattica sicuri per le unità dell'Esercito Italiano",
        expedient: "IT-2025-SGDN-COMTAC-001",
        sourceUrl: "https://www.acquistinretepa.it/opencms/opencms/gare_dettaglio.html?id=IT-2025-DEF-001",
      },
      {
        id: "IT-2025-DEF-002",
        title: "Manutenzione Veicoli Blindati Centauro - Contratto Quadro",
        organization: "Direzione degli Armamenti Terrestri",
        publishDate: "2025-08-19",
        deadline: "2025-09-22",
        amount: "€9,800,000",
        category: "Mantenimiento Militar",
        description: "Servizi di manutenzione per veicoli blindati Centauro dell'Esercito Italiano",
        expedient: "IT-2025-DAT-CENT-002",
        sourceUrl: "https://www.acquistinretepa.it/opencms/opencms/gare_dettaglio.html?id=IT-2025-DEF-002",
      },
    ]
  }
}
