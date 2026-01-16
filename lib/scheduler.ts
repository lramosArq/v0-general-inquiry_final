import { RealDataFetcher } from "./fetcher" // Assuming RealDataFetcher is defined in another file

// Sistema de actualización automática
export class TenderScheduler {
  private fetcher = new RealDataFetcher()

  scheduleDaily() {
    const now = new Date()
    const scheduledTime = new Date()
    scheduledTime.setHours(8, 0, 0, 0)

    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1)
    }

    const timeUntilScheduled = scheduledTime.getTime() - now.getTime()

    setTimeout(() => {
      this.updateTenders()
      // Programar para el siguiente día
      setInterval(() => this.updateTenders(), 24 * 60 * 60 * 1000)
    }, timeUntilScheduled)
  }

  private async updateTenders() {
    console.log("[v0] Iniciando actualización automática de licitaciones...")

    try {
      const [spanishTenders, europeanTenders] = await Promise.all([
        this.fetcher.fetchSpanishTenders(),
        this.fetcher.fetchEuropeanTenders(),
      ])

      const filteredTenders = [...spanishTenders, ...europeanTenders].filter((tender) =>
        this.isRecentAndRelevant(tender),
      )

      // Actualizar base de datos local o estado de la aplicación
      this.updateLocalDatabase(filteredTenders)

      console.log(`[v0] Actualizadas ${filteredTenders.length} licitaciones`)
    } catch (error) {
      console.error("[v0] Error en actualización automática:", error)
    }
  }

  private isRecentAndRelevant(tender: any): boolean {
    const threeWeeksAgo = new Date()
    threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21)

    const publicationDate = new Date(tender.fechaPublicacion)
    const isRecent = publicationDate >= threeWeeksAgo
    const isRelevant = ["defensa", "espacial"].includes(tender.sector)

    return isRecent && isRelevant
  }

  private updateLocalDatabase(tenders: any[]) {
    // Esto podría ser localStorage, IndexedDB, o una base de datos real
    localStorage.setItem("realTenders", JSON.stringify(tenders))
  }
}
