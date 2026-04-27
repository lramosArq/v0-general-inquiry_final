// ARQUIMEA tech map keywords for Spanish tenders (defense, space, technology)
const ARQUIMEA_ES_KEYWORDS = [
  // Defense & Military
  "defensa", "militar", "armamento", "ejercito", "armada", "dgam", "inta", "ceseden",
  // Space & Satellite  
  "espacio", "espacial", "satelite", "cdti", "esa", "inta", "copernicus", "galileo",
  // UAS/Drones
  "dron", "drone", "uas", "uav", "rpas", "aeronave no tripulada",
  // Sensors & Electronics
  "sensor", "radar", "electronico", "optica", "infrarrojo", "lidar",
  // Naval
  "naval", "buque", "submarino", "fragata", "navantia",
  // Aerospace  
  "aeronautico", "aeroespacial", "aviacion", "propulsion",
  // Communications
  "comunicaciones", "satcom", "antena", "telecomunicacion",
  // Quantum & Photonics
  "cuantico", "quantum", "fotonico", "laser",
  // R&D
  "i+d", "innovacion", "tecnologia", "investigacion",
  // Robotics
  "robotica", "autonomo", "actuador",
  // Cybersecurity
  "ciberseguridad", "ciberdefensa",
]

export interface SpainTender {
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
  source?: "spain"
}

export class SpainApiFetcher {
  private baseUrl = "https://contrataciondelsectorpublico.gob.es/sindicacion"

  // Check if tender matches ARQUIMEA tech map
  private matchesArquimeaTechMap(title: string, summary: string, author: string): boolean {
    const text = `${title} ${summary} ${author}`.toLowerCase()
    return ARQUIMEA_ES_KEYWORDS.some(keyword => text.includes(keyword.toLowerCase()))
  }

  async fetchDefenseTenders(): Promise<SpainTender[]> {
    console.log("[v0] Spain PLACSP - Fetching defense/space tenders (ARQUIMEA tech map)...")

    try {
      // PLACSP Atom feeds - main sources for Spanish public contracts
      const feedUrls = [
        `${this.baseUrl}/sindicacion_643/licitacionesPerfilContratante_Defensa.atom`,
        `${this.baseUrl}/sindicacion_1044/licitacionesPerfilContratante.atom`,
        `${this.baseUrl}/sindicacion_1045/PlataformasAgregadasSinMenores.atom`,
      ]

      const allTenders: SpainTender[] = []

      for (const feedUrl of feedUrls) {
        try {
          const response = await fetch(feedUrl, {
            method: "GET",
            headers: {
              Accept: "application/atom+xml, application/xml, text/xml",
              "User-Agent": "ArquiAlert/1.0",
            },
          })

          if (!response.ok) {
            console.log(`[v0] Spain PLACSP - HTTP ${response.status} for feed: ${feedUrl}`)
            continue
          }

          const xmlText = await response.text()
          const parsedTenders = this.parseSpanishXML(xmlText)
          allTenders.push(...parsedTenders)

          console.log(`[v0] Spain PLACSP - Feed returned ${parsedTenders.length} relevant tenders`)
        } catch (feedError) {
          console.error(`[v0] Spain PLACSP - Error processing feed:`, feedError)
          continue
        }
      }

      // Remove duplicates
      const uniqueTenders = allTenders.filter((t, i, self) => 
        i === self.findIndex(x => x.id === t.id || x.title === t.title)
      )

      console.log(`[v0] Spain PLACSP - Total ARQUIMEA-relevant tenders: ${uniqueTenders.length}`)
      return uniqueTenders
    } catch (error) {
      console.error("[v0] Spain PLACSP - Error:", error)
      return [] // Return empty - no simulated data
    }
  }

  private parseSpanishXML(xmlText: string): SpainTender[] {
    const tenders: SpainTender[] = []

    try {
      const entryRegex = /<entry[^>]*>(.*?)<\/entry>/gs
      const titleRegex = /<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/s
      const linkRegex = /<link[^>]*href="([^"]*)"[^>]*>/s
      const summaryRegex = /<summary[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/summary>/s
      const updatedRegex = /<updated>(.*?)<\/updated>/s
      const authorRegex = /<author[^>]*>.*?<name[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/name>.*?<\/author>/s
      const idRegex = /<id[^>]*>(.*?)<\/id>/s

      let match
      while ((match = entryRegex.exec(xmlText)) !== null) {
        const entry = match[1]
        const titleMatch = titleRegex.exec(entry)
        const linkMatch = linkRegex.exec(entry)
        const summaryMatch = summaryRegex.exec(entry)
        const updatedMatch = updatedRegex.exec(entry)
        const authorMatch = authorRegex.exec(entry)
        const idMatch = idRegex.exec(entry)

        if (titleMatch && linkMatch) {
          const title = titleMatch[1].trim()
          const summary = summaryMatch ? summaryMatch[1].trim() : ""
          const author = authorMatch ? authorMatch[1].trim() : "PLACSP"

          // Filter for ARQUIMEA-relevant tenders only
          if (this.matchesArquimeaTechMap(title, summary, author)) {
            let link = linkMatch[1]
            if (link && !link.startsWith("http")) {
              link = `https://contrataciondelsectorpublico.gob.es${link.startsWith("/") ? "" : "/"}${link}`
            }

            // Extract expedient from ID or generate
            const expedient = idMatch ? idMatch[1].split("/").pop() || "" : ""

            const tender: SpainTender = {
              id: expedient || `PLACSP-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
              title: title,
              organization: author,
              publishDate: updatedMatch
                ? new Date(updatedMatch[1]).toISOString().split("T")[0]
                : new Date().toISOString().split("T")[0],
              deadline: "",
              amount: "",
              category: this.categorizeArquimeaTender(title, summary),
              description: summary.substring(0, 500),
              expedient: expedient,
              sourceUrl: link,
              source: "spain",
            }

            tenders.push(tender)
          }
        }
      }
    } catch (parseError) {
      console.error("[v0] Spain PLACSP - XML parse error:", parseError)
    }

    return tenders
  }

  private categorizeArquimeaTender(title: string, summary: string): string {
    const text = `${title} ${summary}`.toLowerCase()
    if (text.includes("espacio") || text.includes("satelite") || text.includes("esa")) return "Espacio"
    if (text.includes("dron") || text.includes("uas") || text.includes("uav")) return "UAS/Drones"
    if (text.includes("naval") || text.includes("buque") || text.includes("submarino")) return "Naval"
    if (text.includes("radar") || text.includes("sensor") || text.includes("electronico")) return "Sensores"
    if (text.includes("comunicacion") || text.includes("satcom")) return "Comunicaciones"
    if (text.includes("ciberseguridad") || text.includes("ciberdefensa")) return "Ciberseguridad"
    if (text.includes("aeronautico") || text.includes("aviacion")) return "Aeronautica"
    if (text.includes("i+d") || text.includes("innovacion")) return "I+D"
    return "Defensa"
  }
}
