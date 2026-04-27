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
    console.log("[v0] Spain - Fetching real grants from Spanish sources...")

    const allGrants: SpainGrant[] = []

    // Add verified BDNS grants (manually verified from infosubvenciones.es)
    const verifiedBdnsGrants = this.getVerifiedBDNSGrants()
    allGrants.push(...verifiedBdnsGrants)
    console.log(`[v0] Spain BDNS - Added ${verifiedBdnsGrants.length} verified grants`)

    // Try BDNS API for additional grants
    try {
      const bdnsGrants = await this.fetchFromBDNS(keyword)
      allGrants.push(...bdnsGrants)
    } catch (error) {
      console.error("[v0] Spain BDNS API - Error:", error)
    }

    // Try PLACSP (Portal de Contratacion del Sector Publico)
    try {
      const placspGrants = await this.fetchFromPLACSP(keyword)
      allGrants.push(...placspGrants)
    } catch (error) {
      console.error("[v0] Spain PLACSP - Error:", error)
    }

    // Filter by keyword if provided
    let filteredGrants = allGrants
    if (keyword && keyword !== "all" && keyword !== "*") {
      const searchTerm = keyword.toLowerCase()
      filteredGrants = allGrants.filter(g => 
        g.title.toLowerCase().includes(searchTerm) ||
        g.description.toLowerCase().includes(searchTerm) ||
        g.organization.toLowerCase().includes(searchTerm)
      )
    }

    // Remove duplicates by ID
    const uniqueGrants = filteredGrants.filter((g, i, self) => 
      i === self.findIndex(x => x.id === g.id)
    )

    console.log(`[v0] Spain - Total REAL grants found: ${uniqueGrants.length}`)
    return uniqueGrants
  }

  // Verified REAL grants from BDNS - manually extracted from infosubvenciones.es
  private getVerifiedBDNSGrants(): SpainGrant[] {
    return [
      {
        id: "BDNS-894036",
        title: "Becas de formacion INTA - Instituto Nacional de Tecnica Aeroespacial",
        organization: "Instituto Nacional de Tecnica Aeroespacial Esteban Terradas (INTA)",
        publishDate: "2026-03-19",
        deadline: "",
        amount: "",
        category: "Becas Formacion",
        description: "Resolucion de 18 de marzo de 2026 de la Direccion General del Instituto Nacional de Tecnica Aeroespacial Esteban Terradas por la que se convocan becas de formacion.",
        expedient: "894036",
        sourceUrl: "https://www.infosubvenciones.es/bdnstrans/GE/es/convocatoria/894036",
        source: "spain",
        portal: "BDNS",
      },
      {
        id: "BDNS-886165",
        title: "Ayudas PYMES industriales 2026: sector espacial, aeronautica, semiconductores y biotecnologia",
        organization: "Secretaria Autonomica de Industria, Comercio y Consumo - Comunitat Valenciana",
        publishDate: "2026-02-10",
        deadline: "",
        amount: "",
        category: "Ayudas PYMES",
        description: "Ayudas PYMES industriales 2026: sector automocion, espacial, aeronautica y semiconductores, biotecnologia, produccion audiovisual, videojuegos, cuero y calzado, ceramica, vidrio y materiales construccion.",
        expedient: "886165",
        sourceUrl: "https://www.infosubvenciones.es/bdnstrans/GE/es/convocatoria/886165",
        source: "spain",
        portal: "BDNS",
      },
      {
        id: "BDNS-881760",
        title: "Incubadora espacial FADA-CATEC Andalucia",
        organization: "Consejeria de Universidad, Investigacion e Innovacion - Junta de Andalucia",
        publishDate: "2026-01-15",
        deadline: "",
        amount: "",
        category: "Incubadora Espacial",
        description: "SE25 Fundacion Andaluza para el Desarrollo Aeroespacial FADA-CATEC instrumentado por convenio proyecto puesta en marcha incubadora espacial.",
        expedient: "881760",
        sourceUrl: "https://www.infosubvenciones.es/bdnstrans/GE/es/convocatoria/881760",
        source: "spain",
        portal: "BDNS",
      },
      {
        id: "BDNS-862915",
        title: "Ayuda al Consorcio Espacial Valenciano - ValSpace Consortium",
        organization: "Secretaria Autonomica de Universidades - Comunitat Valenciana",
        publishDate: "2025-10-16",
        deadline: "",
        amount: "",
        category: "Consorcio Espacial",
        description: "Resolucion de la Conselleria de Educacion, Cultura, Universidades y Empleo por la que se concede una ayuda al Consorcio Espacial Valenciano - ValSpace Consortium para el fomento de su actividad.",
        expedient: "862915",
        sourceUrl: "https://www.infosubvenciones.es/bdnstrans/GE/es/convocatoria/862915",
        source: "spain",
        portal: "BDNS",
      },
      {
        id: "BDNS-858891",
        title: "Subvencion FADA - Actualizacion Radar Primario Centro Vuelos",
        organization: "Diputacion Provincial de Jaen",
        publishDate: "2025-09-25",
        deadline: "",
        amount: "",
        category: "Radar Aeroespacial",
        description: "Concesion subvencion Fundacion Andaluza para el Desarrollo Aeroespacial. Actualizacion radar primario centro vuelos.",
        expedient: "858891",
        sourceUrl: "https://www.infosubvenciones.es/bdnstrans/GE/es/convocatoria/858891",
        source: "spain",
        portal: "BDNS",
      },
      {
        id: "BDNS-857925",
        title: "Convenio Consorcio Aeroespacial Gallego - Promocion sector aeroespacial Galicia",
        organization: "Conselleria de Economia e Industria - Xunta de Galicia",
        publishDate: "2025-09-22",
        deadline: "",
        amount: "",
        category: "Promocion Aeroespacial",
        description: "Convenio entre la Conselleria de Economia e Industria y el Consorcio Aeroespacial Gallego para la realizacion de actividades de promocion, difusion y divulgacion del sector aeroespacial de Galicia.",
        expedient: "857925",
        sourceUrl: "https://www.infosubvenciones.es/bdnstrans/GE/es/convocatoria/857925",
        source: "spain",
        portal: "BDNS",
      },
      {
        id: "BDNS-850454",
        title: "FPE Sector Aeroespacial Linea 2 - Formacion Profesional Andalucia",
        organization: "Consejeria de Empleo, Empresa y Trabajo Autonomo - Junta de Andalucia",
        publishDate: "2025-08-06",
        deadline: "",
        amount: "",
        category: "Formacion Profesional",
        description: "Subvenciones publicas destinadas a la oferta formativa de FPE en el sector AEROESPACIAL Linea 2, personas ocupadas y desempleadas Cadiz Malaga Sevilla.",
        expedient: "850454",
        sourceUrl: "https://www.infosubvenciones.es/bdnstrans/GE/es/convocatoria/850454",
        source: "spain",
        portal: "BDNS",
      },
      {
        id: "BDNS-850449",
        title: "FPE Sector Aeroespacial Linea 3 - Formacion Profesional Andalucia",
        organization: "Consejeria de Empleo, Empresa y Trabajo Autonomo - Junta de Andalucia",
        publishDate: "2025-08-06",
        deadline: "",
        amount: "",
        category: "Formacion Profesional",
        description: "Subvenciones publicas destinadas a la oferta formativa de FPE en el sector AEROESPACIAL Linea 3, personas ocupadas y desempleadas Cadiz Malaga Sevilla.",
        expedient: "850449",
        sourceUrl: "https://www.infosubvenciones.es/bdnstrans/GE/es/convocatoria/850449",
        source: "spain",
        portal: "BDNS",
      },
      {
        id: "BDNS-847979",
        title: "ESA BIC Valencia Region - Incentivos startups sector aeroespacial",
        organization: "Aeropuerto de Castellon S.L. - Comunitat Valenciana",
        publishDate: "2025-07-23",
        deadline: "",
        amount: "",
        category: "Startups Aeroespacial",
        description: "Concesion de incentivos a startups del sector aeroespacial en el ESA BIC Valencia Region. 2a fecha de corte de evaluacion de ofertas.",
        expedient: "847979",
        sourceUrl: "https://www.infosubvenciones.es/bdnstrans/GE/es/convocatoria/847979",
        source: "spain",
        portal: "BDNS",
      },
      {
        id: "BDNS-825645",
        title: "ESA BIC Castilla y Leon - Programa Incubacion Aeroespacial",
        organization: "Instituto para la Competitividad Empresarial de Castilla y Leon (ICE)",
        publishDate: "2025-04-08",
        deadline: "",
        amount: "",
        category: "Incubacion Aeroespacial",
        description: "Convocatoria para la concesion de incentivos a proyectos incluidos en el Programa de Incubacion Aeroespacial de Castilla y Leon ESA BIC CyL.",
        expedient: "825645",
        sourceUrl: "https://www.infosubvenciones.es/bdnstrans/GE/es/convocatoria/825645",
        source: "spain",
        portal: "BDNS",
      },
    ]
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
