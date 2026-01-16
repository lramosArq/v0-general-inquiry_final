// Sistema para obtener datos reales de licitaciones
export class RealDataFetcher {
  private readonly SPAIN_OPEN_DATA_API = "https://datos.gob.es/apidata/catalog/dataset"
  private readonly HACIENDA_API = "https://www.hacienda.gob.es/es-ES/GobiernoAbierto/Datos%20Abiertos/"

  async fetchSpanishTenders(): Promise<any[]> {
    try {
      const response = await fetch(`${this.SPAIN_OPEN_DATA_API}/licitaciones-publicas`)
      const data = await response.json()

      return this.transformToStandardFormat(data)
    } catch (error) {
      console.error("Error fetching real data:", error)
      return []
    }
  }

  async fetchEuropeanTenders(): Promise<any[]> {
    const TED_API = "https://ted.europa.eu/api/v2.0/notices"

    try {
      const response = await fetch(`${TED_API}?scope=3&type=contract`)
      return await response.json()
    } catch (error) {
      console.error("Error fetching European data:", error)
      return []
    }
  }

  private transformToStandardFormat(rawData: any): any[] {
    return rawData.map((item: any) => ({
      id: item.expediente || item.id,
      titulo: item.objeto || item.title,
      organismo: item.organo_contratacion || item.contracting_authority,
      fechaPublicacion: item.fecha_publicacion || item.publication_date,
      fechaLimite: item.fecha_limite || item.deadline,
      presupuesto: item.valor_estimado || item.estimated_value,
      sector: this.detectSector(item.objeto || item.title),
      pais: "España",
      enlace: item.enlace_original || item.original_link,
    }))
  }

  private detectSector(title: string): string {
    const defenseKeywords = ["defensa", "militar", "armamento", "seguridad"]
    const spaceKeywords = ["espacial", "satélite", "aeroespacial", "cohete"]

    const lowerTitle = title.toLowerCase()

    if (defenseKeywords.some((keyword) => lowerTitle.includes(keyword))) {
      return "defensa"
    }
    if (spaceKeywords.some((keyword) => lowerTitle.includes(keyword))) {
      return "espacial"
    }
    return "otros"
  }
}
