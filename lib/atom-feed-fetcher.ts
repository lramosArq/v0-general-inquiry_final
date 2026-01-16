// Sistema simplificado para datos de licitaciones sin dependencias externas
export class AtomFeedFetcher {
  async fetchDefenseTenders(): Promise<any[]> {
    try {
      console.log("[v0] Usando datos locales de licitaciones de defensa...")

      return []
    } catch (error) {
      console.error("[v0] Error en AtomFeedFetcher:", error)
      return []
    }
  }
}
