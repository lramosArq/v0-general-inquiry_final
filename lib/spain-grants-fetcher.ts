/**
 * Spain Grants/Subsidies Fetcher
 * Fetches grants from Base de Datos Nacional de Subvenciones (BDNS) API
 * Filtered for ARQUIMEA tech map: aerospace, defense, space, sensors, etc.
 */

// ARQUIMEA tech map keywords for Spain filtering
const ARQUIMEA_ES_KEYWORDS = [
  // UAS/UAV/Drones
  "UAS", "UAV", "dron", "drone", "RPAS", "aeronave no tripulada",
  // Space & Satellite
  "espacio", "espacial", "satelite", "orbita", "cohete", "lanzador",
  // Defense
  "defensa", "militar", "armamento", "DGAM", "ejercito",
  // Sensors & ISR
  "sensor", "radar", "lidar", "vigilancia", "optico", "infrarrojo",
  // Quantum & Photonics
  "cuantico", "quantum", "fotonico", "giroscopo", "inercial",
  // Naval & Maritime
  "maritimo", "naval", "buque", "submarino",
  // Communications
  "comunicaciones", "antena", "SATCOM",
  // Robotics
  "robotica", "robot", "actuador", "exoesqueleto",
  // Aerospace
  "aeroespacial", "aeronautico", "propulsion", "aviacion",
  // Innovation programs
  "CDTI", "I+D+i", "innovacion", "tecnologia", "investigacion",
  // Biosensors
  "biosensor", "biomedicina",
]

export interface SpainGrant {
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
  source: "spain"
  portal: string
}

export class SpainGrantsFetcher {
  // BDNS API endpoint (Base de Datos Nacional de Subvenciones)
  private bdnsApiUrl = "https://www.pap.hacienda.gob.es/bdnstrans/api/convocatorias"

  // Check if opportunity matches ARQUIMEA tech map
  private matchesArquimeaTechMap(title: string, description: string, category: string): boolean {
    const text = `${title} ${description} ${category}`.toLowerCase()
    return ARQUIMEA_ES_KEYWORDS.some(keyword => text.toLowerCase().includes(keyword.toLowerCase()))
  }

  async fetchAllGrants(keyword?: string): Promise<SpainGrant[]> {
    console.log("[v0] Spain - Fetching grants from BDNS API (ARQUIMEA tech map)...")

    const allGrants: SpainGrant[] = []

    // Search with multiple ARQUIMEA-relevant terms
    const searchTerms = ["defensa", "espacio", "aeroespacial", "I+D", "tecnologia"]
    
    for (const term of searchTerms) {
      try {
        const grants = await this.fetchFromBDNS(term)
        const relevant = grants.filter(g => 
          this.matchesArquimeaTechMap(g.title, g.description, g.category)
        )
        allGrants.push(...relevant)
        console.log(`[v0] Spain - BDNS "${term}": ${relevant.length} relevant`)
      } catch (error) {
        console.error(`[v0] Spain - BDNS "${term}" error:`, error)
      }
    }

    // Remove duplicates by ID
    const uniqueGrants = allGrants.filter((grant, index, self) =>
      index === self.findIndex(g => g.id === grant.id)
    )

    console.log(`[v0] Spain - Total ARQUIMEA-relevant grants: ${uniqueGrants.length}`)
    return uniqueGrants
  }

  private async fetchFromBDNS(keyword?: string): Promise<SpainGrant[]> {
    try {
      // BDNS public search endpoint
      const params = new URLSearchParams({
        estadoConvocatoria: "Abierta",
        numElementos: "50",
        pagina: "1",
      })

      if (keyword && keyword !== "all" && keyword !== "*") {
        params.append("texto", keyword)
      }

      const response = await fetch(
        `https://www.pap.hacienda.gob.es/bdnstrans/GE/es/convocatorias/busqueda?${params}`,
        {
          headers: {
            "Accept": "application/json, text/html",
            "User-Agent": "Mozilla/5.0 (compatible; GrantsApp/1.0)",
          },
        }
      )

      if (!response.ok) {
        // Try alternative BDNS endpoint
        return await this.fetchFromBDNSAlternative(keyword)
      }

      const contentType = response.headers.get("content-type")
      
      if (contentType?.includes("application/json")) {
        const data = await response.json()
        
        if (data.convocatorias && Array.isArray(data.convocatorias)) {
          return data.convocatorias.map((conv: any) => this.mapBDNSResult(conv)).filter(Boolean)
        }
        
        if (Array.isArray(data)) {
          return data.map((conv: any) => this.mapBDNSResult(conv)).filter(Boolean)
        }
      }

      // If HTML response, try alternative
      return await this.fetchFromBDNSAlternative(keyword)
    } catch (error) {
      console.error("[v0] Spain - BDNS fetch error:", error)
      return await this.fetchFromBDNSAlternative(keyword)
    }
  }

  private async fetchFromBDNSAlternative(keyword?: string): Promise<SpainGrant[]> {
    // BDNS does not have a public JSON API - return empty array
    // Users should check the official portal directly
    console.log("[v0] Spain - BDNS does not provide a public JSON API")
    console.log("[v0] Spain - Please visit https://www.pap.hacienda.gob.es/bdnstrans/GE/es/convocatorias for grants")
    return []
  }

  private mapBDNSResult(conv: any): SpainGrant | null {
    if (!conv) return null

    const id = conv.idConvocatoria || conv.codigoBDNS || conv.id || `BDNS-${Date.now()}`
    const title = conv.tituloConvocatoria || conv.titulo || conv.descripcion || "Sin titulo"
    
    // Generate direct URL to BDNS convocatoria
    const bdnsUrl = `https://www.pap.hacienda.gob.es/bdnstrans/GE/es/convocatoria/${id}`

    return {
      id: String(id),
      title: title,
      organization: conv.organoConvocante || conv.administracion || "Administracion Publica",
      publishDate: conv.fechaPublicacion || conv.fechaInicio || "",
      deadline: conv.fechaFinPresentacion || conv.fechaFin || conv.plazo || "",
      amount: conv.presupuestoTotal || conv.importe || "",
      category: conv.tipoConvocatoria || conv.tipoAyuda || "Subvencion",
      description: conv.descripcion || conv.objeto || title,
      expedient: conv.codigoBDNS || String(id),
      sourceUrl: bdnsUrl,
      source: "spain",
      portal: "BDNS",
    }
  }
}
