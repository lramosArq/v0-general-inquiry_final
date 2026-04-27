/**
 * Spain Grants/Subsidies Fetcher
 * Verified grants from CDTI, AEI, PRTR and other Spanish R&D programs
 * Filtered for ARQUIMEA tech map: aerospace, defense, space, sensors, etc.
 */

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

// ARQUIMEA tech map keywords for Spain
const ARQUIMEA_ES_KEYWORDS = [
  "defensa", "militar", "espacio", "espacial", "satelite", "dron", "drone", "uas", "uav",
  "sensor", "radar", "naval", "aeronautico", "aeroespacial", "quantum", "cuantico",
  "propulsion", "robotica", "autonomo", "comunicaciones", "ciberseguridad",
  "i+d", "tecnologia", "investigacion", "cdti", "inta"
]

export class SpainGrantsFetcher {
  private matchesArquimeaTechMap(title: string, description: string): boolean {
    const text = `${title} ${description}`.toLowerCase()
    return ARQUIMEA_ES_KEYWORDS.some(keyword => text.includes(keyword))
  }

  async fetchAllGrants(keyword?: string): Promise<SpainGrant[]> {
    console.log("[v0] Spain - Attempting to fetch real grants from Spanish APIs...")

    const allGrants: SpainGrant[] = []

    // Try BDNS API (Base de Datos Nacional de Subvenciones)
    try {
      const bdnsGrants = await this.fetchFromBDNS(keyword)
      allGrants.push(...bdnsGrants)
    } catch (error) {
      console.error("[v0] Spain BDNS - Error:", error)
    }

    // Try PLACSP (Portal de Contratacion del Sector Publico)
    try {
      const placspGrants = await this.fetchFromPLACSP(keyword)
      allGrants.push(...placspGrants)
    } catch (error) {
      console.error("[v0] Spain PLACSP - Error:", error)
    }

    // Remove duplicates
    const uniqueGrants = allGrants.filter((g, i, self) => 
      i === self.findIndex(x => x.id === g.id)
    )

    console.log(`[v0] Spain - Total REAL grants found: ${uniqueGrants.length}`)
    return uniqueGrants
  }

  private async fetchFromBDNS(keyword?: string): Promise<SpainGrant[]> {
    const grants: SpainGrant[] = []
    
    try {
      // BDNS tiene una API REST pero requiere autenticacion
      // Intentamos el endpoint publico
      const response = await fetch(
        `https://www.pap.hacienda.gob.es/bdnstrans/api/convocatorias?pageSize=50`,
        { headers: { "Accept": "application/json" } }
      )

      if (!response.ok) {
        console.log(`[v0] Spain BDNS - HTTP ${response.status}`)
        return grants
      }

      const data = await response.json()
      if (data && Array.isArray(data.content)) {
        for (const item of data.content) {
          if (item.id && item.titulo && this.matchesArquimeaTechMap(item.titulo, item.descripcion || "")) {
            grants.push({
              id: `BDNS-${item.id}`,
              title: item.titulo,
              organization: item.organoDonante || "Administracion Publica",
              publishDate: item.fechaPublicacion || "",
              deadline: item.fechaFinPresentacion || "",
              amount: item.importeMaximo ? `EUR ${item.importeMaximo}` : "",
              category: item.tipoConvocatoria || "Subvencion",
              description: item.descripcion || item.titulo,
              expedient: item.codigo || item.id,
              sourceUrl: `https://www.pap.hacienda.gob.es/bdnstrans/GE/es/convocatoria/${item.id}`,
              source: "spain",
              portal: "BDNS",
            })
          }
        }
      }
      console.log(`[v0] Spain BDNS - Found ${grants.length} relevant grants`)
    } catch (error) {
      console.error("[v0] Spain BDNS - Fetch error:", error)
    }

    return grants
  }

  private async fetchFromPLACSP(keyword?: string): Promise<SpainGrant[]> {
    const grants: SpainGrant[] = []
    
    try {
      // PLACSP Atom feed
      const response = await fetch(
        "https://contrataciondelsectorpublico.gob.es/sindicacion/sindicacion_643/licitacionesPerfilContratante.atom",
        { headers: { "Accept": "application/atom+xml, application/xml, text/xml" } }
      )

      if (!response.ok) {
        console.log(`[v0] Spain PLACSP - HTTP ${response.status}`)
        return grants
      }

      const xmlText = await response.text()
      
      // Parse XML entries
      const entryRegex = /<entry[^>]*>(.*?)<\/entry>/gs
      const titleRegex = /<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/s
      const linkRegex = /<link[^>]*href="([^"]*)"[^>]*>/s
      const summaryRegex = /<summary[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/summary>/s
      const updatedRegex = /<updated>(.*?)<\/updated>/s
      const idRegex = /<id[^>]*>(.*?)<\/id>/s

      let match
      while ((match = entryRegex.exec(xmlText)) !== null) {
        const entry = match[1]
        const titleMatch = titleRegex.exec(entry)
        const linkMatch = linkRegex.exec(entry)
        const summaryMatch = summaryRegex.exec(entry)
        const updatedMatch = updatedRegex.exec(entry)
        const idMatch = idRegex.exec(entry)

        if (titleMatch && linkMatch) {
          const title = titleMatch[1].trim()
          const summary = summaryMatch ? summaryMatch[1].trim() : ""

          if (this.matchesArquimeaTechMap(title, summary)) {
            let link = linkMatch[1]
            if (!link.startsWith("http")) {
              link = `https://contrataciondelsectorpublico.gob.es${link.startsWith("/") ? "" : "/"}${link}`
            }

            const expedient = idMatch ? idMatch[1].split("/").pop() || "" : ""

            grants.push({
              id: expedient || `PLACSP-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
              title: title,
              organization: "PLACSP",
              publishDate: updatedMatch ? new Date(updatedMatch[1]).toISOString().split("T")[0] : "",
              deadline: "",
              amount: "",
              category: "Licitacion Publica",
              description: summary.substring(0, 500),
              expedient: expedient,
              sourceUrl: link,
              source: "spain",
              portal: "PLACSP",
            })
          }
        }
      }
      console.log(`[v0] Spain PLACSP - Found ${grants.length} relevant tenders`)
    } catch (error) {
      console.error("[v0] Spain PLACSP - Parse error:", error)
    }

    return grants
  }
}
