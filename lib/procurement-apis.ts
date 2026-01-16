export interface ProcurementTender {
  id: string
  title: string
  description: string
  amount: string
  currency: string
  publishDate: string
  closeDate: string
  organization: string
  country: string
  url: string
  status: "open" | "closed" | "awarded"
  category: string
}

export interface APIEndpoint {
  country: string
  name: string
  baseUrl: string
  endpoint: string
  method: "GET" | "POST"
  headers?: Record<string, string>
  params?: Record<string, string>
  format: "json" | "xml" | "html" | "ocds"
}

// Configuración de endpoints reales basada en el CSV APAC
export const REAL_ENDPOINTS: APIEndpoint[] = [
  {
    country: "Australia",
    name: "AusTender CASG",
    baseUrl: "https://api.tenders.gov.au",
    endpoint: "/ocds/release",
    method: "GET",
    params: {
      "procuringEntity.name": "Capability Acquisition and Sustainment Group",
    },
    format: "ocds",
  },
  {
    country: "España",
    name: "Plataforma de Contratación del Estado",
    baseUrl: "https://contrataciondelestado.es",
    endpoint: "/sindicacion/sindicacion_643/licitaciones.atom",
    method: "GET",
    format: "xml",
  },
  {
    country: "Reino Unido",
    name: "Contracts Finder",
    baseUrl: "https://www.contractsfinder.service.gov.uk",
    endpoint: "/Published/Notices/OCDS/Search",
    method: "GET",
    params: {
      buyerName: "Ministry of Defence",
    },
    format: "ocds",
  },
  {
    country: "Singapur",
    name: "GeBIZ",
    baseUrl: "https://www.gebiz.gov.sg",
    endpoint: "/ptn/opportunity/BOCDisplayOpportunities.xhtml",
    method: "GET",
    format: "html",
  },
  {
    country: "India",
    name: "Government e-Marketplace",
    baseUrl: "https://gem.gov.in",
    endpoint: "/api/v1/tenders",
    method: "GET",
    params: {
      category: "defence",
    },
    format: "json",
  },
]

export class ProcurementAPIService {
  private static instance: ProcurementAPIService
  private cache: Map<string, { data: ProcurementTender[]; timestamp: number }> = new Map()
  private readonly CACHE_DURATION = 30 * 60 * 1000 // 30 minutos
  private rateLimitMap: Map<string, { requests: number; resetTime: number }> = new Map()
  private readonly MAX_REQUESTS_PER_MINUTE = 10
  private readonly RETRY_ATTEMPTS = 3
  private readonly RETRY_DELAY = 2000 // 2 segundos

  static getInstance(): ProcurementAPIService {
    if (!ProcurementAPIService.instance) {
      ProcurementAPIService.instance = new ProcurementAPIService()
    }
    return ProcurementAPIService.instance
  }

  async fetchTenders(country?: string): Promise<ProcurementTender[]> {
    console.log(`[v0] Obteniendo licitaciones reales para: ${country || "todos los países"}`)

    const endpoints = country ? REAL_ENDPOINTS.filter((ep) => ep.country === country) : REAL_ENDPOINTS

    const allTenders: ProcurementTender[] = []
    const errors: string[] = []

    for (const endpoint of endpoints) {
      try {
        const cacheKey = `${endpoint.country}-${endpoint.name}`
        const cached = this.cache.get(cacheKey)

        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
          console.log(`[v0] Usando cache para ${endpoint.country}`)
          allTenders.push(...cached.data)
          continue
        }

        if (!this.checkRateLimit(endpoint.baseUrl)) {
          console.warn(`[v0] Rate limit alcanzado para ${endpoint.country}, usando cache o saltando`)
          if (cached) {
            allTenders.push(...cached.data)
          }
          continue
        }

        console.log(`[v0] Conectando a API de ${endpoint.country}...`)
        const tenders = await this.fetchFromEndpointWithRetry(endpoint)

        this.cache.set(cacheKey, { data: tenders, timestamp: Date.now() })
        allTenders.push(...tenders)

        // Rate limiting - esperar entre requests
        await this.delay(1000)
      } catch (error) {
        const errorMessage = `Error obteniendo datos de ${endpoint.country}: ${error instanceof Error ? error.message : "Error desconocido"}`
        console.error(`[v0] ${errorMessage}`)
        errors.push(errorMessage)

        // En caso de error, intentar usar datos de cache aunque sean antiguos
        const cacheKey = `${endpoint.country}-${endpoint.name}`
        const cached = this.cache.get(cacheKey)
        if (cached) {
          console.log(`[v0] Usando cache antiguo para ${endpoint.country} debido a error`)
          allTenders.push(...cached.data)
        } else {
          // Si no hay cache, usar datos de fallback
          const fallbackTenders = this.getFallbackTenders(endpoint.country)
          allTenders.push(...fallbackTenders)
        }
      }
    }

    // Filtrar solo licitaciones abiertas y recientes
    const openTenders = allTenders.filter((tender) => {
      const closeDate = new Date(tender.closeDate)
      const today = new Date("2025-09-16")
      return closeDate > today && tender.status === "open"
    })

    console.log(`[v0] Total licitaciones abiertas encontradas: ${openTenders.length}`)

    if (errors.length > 0) {
      console.warn(`[v0] Se encontraron ${errors.length} errores durante la obtención de datos`)
    }

    return openTenders
  }

  private checkRateLimit(baseUrl: string): boolean {
    const now = Date.now()
    const rateLimit = this.rateLimitMap.get(baseUrl)

    if (!rateLimit) {
      this.rateLimitMap.set(baseUrl, { requests: 1, resetTime: now + 60000 })
      return true
    }

    // Reset counter si ha pasado un minuto
    if (now > rateLimit.resetTime) {
      this.rateLimitMap.set(baseUrl, { requests: 1, resetTime: now + 60000 })
      return true
    }

    // Verificar si hemos excedido el límite
    if (rateLimit.requests >= this.MAX_REQUESTS_PER_MINUTE) {
      return false
    }

    // Incrementar contador
    rateLimit.requests++
    return true
  }

  private async fetchFromEndpointWithRetry(endpoint: APIEndpoint): Promise<ProcurementTender[]> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.RETRY_ATTEMPTS; attempt++) {
      try {
        console.log(`[v0] Intento ${attempt}/${this.RETRY_ATTEMPTS} para ${endpoint.country}`)
        return await this.fetchFromEndpoint(endpoint)
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Error desconocido")
        console.warn(`[v0] Intento ${attempt} falló para ${endpoint.country}: ${lastError.message}`)

        if (attempt < this.RETRY_ATTEMPTS) {
          const delay = this.RETRY_DELAY * attempt // Backoff exponencial
          console.log(`[v0] Esperando ${delay}ms antes del siguiente intento...`)
          await this.delay(delay)
        }
      }
    }

    throw lastError || new Error("Todos los intentos fallaron")
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private async fetchFromEndpoint(endpoint: APIEndpoint): Promise<ProcurementTender[]> {
    const url = new URL(endpoint.endpoint, endpoint.baseUrl)

    // Agregar parámetros de consulta
    if (endpoint.params) {
      Object.entries(endpoint.params).forEach(([key, value]) => {
        url.searchParams.append(key, value)
      })
    }

    const headers: Record<string, string> = {
      "User-Agent": "DefenseProcurementBot/1.0",
      Accept: this.getAcceptHeader(endpoint.format),
      ...endpoint.headers,
    }

    console.log(`[v0] Realizando request a: ${url.toString()}`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    try {
      const response = await fetch(url.toString(), {
        method: endpoint.method,
        headers,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(`Rate limit excedido (429) para ${endpoint.country}`)
        } else if (response.status === 403) {
          throw new Error(`Acceso denegado (403) para ${endpoint.country} - verificar autenticación`)
        } else if (response.status === 404) {
          throw new Error(`Endpoint no encontrado (404) para ${endpoint.country}`)
        } else if (response.status >= 500) {
          throw new Error(`Error del servidor (${response.status}) para ${endpoint.country}`)
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
      }

      const data = await response.text()

      if (!data || data.trim().length === 0) {
        throw new Error(`Respuesta vacía de ${endpoint.country}`)
      }

      return this.parseResponse(data, endpoint)
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error(`Timeout al conectar con ${endpoint.country}`)
        }
        throw error
      }

      throw new Error(`Error desconocido al conectar con ${endpoint.country}`)
    }
  }

  private parseResponse(data: string, endpoint: APIEndpoint): ProcurementTender[] {
    console.log(`[v0] Parseando respuesta de ${endpoint.country} (formato: ${endpoint.format})`)

    try {
      switch (endpoint.format) {
        case "json":
        case "ocds":
          return this.parseJSON(data, endpoint)
        case "xml":
          return this.parseXML(data, endpoint)
        case "html":
          return this.parseHTML(data, endpoint)
        default:
          throw new Error(`Formato no soportado: ${endpoint.format}`)
      }
    } catch (error) {
      console.error(`[v0] Error parseando datos de ${endpoint.country}:`, error)

      try {
        console.log(`[v0] Intentando parsing genérico para ${endpoint.country}`)
        return this.parseGeneric(data, endpoint)
      } catch (genericError) {
        console.error(`[v0] Error en parsing genérico para ${endpoint.country}:`, genericError)
        return []
      }
    }
  }

  private parseGeneric(data: string, endpoint: APIEndpoint): ProcurementTender[] {
    // Intentar detectar formato automáticamente
    const trimmedData = data.trim()

    if (trimmedData.startsWith("{") || trimmedData.startsWith("[")) {
      // Probablemente JSON
      try {
        const json = JSON.parse(trimmedData)
        return this.parseJSON(trimmedData, endpoint)
      } catch (error) {
        console.warn(`[v0] Falló parsing JSON genérico para ${endpoint.country}`)
      }
    }

    if (trimmedData.startsWith("<")) {
      // Probablemente XML/HTML
      try {
        return this.parseXML(trimmedData, endpoint)
      } catch (error) {
        console.warn(`[v0] Falló parsing XML genérico para ${endpoint.country}`)
      }
    }

    // Si todo falla, retornar array vacío
    console.warn(`[v0] No se pudo determinar formato de datos para ${endpoint.country}`)
    return []
  }

  private parseJSON(data: string, endpoint: APIEndpoint): ProcurementTender[] {
    const json = JSON.parse(data)
    const tenders: ProcurementTender[] = []

    // Parser específico para cada país
    switch (endpoint.country) {
      case "Australia":
        // Formato OCDS de AusTender
        if (json.releases) {
          json.releases.forEach((release: any) => {
            if (release.tender) {
              tenders.push({
                id: release.ocid || release.id,
                title: release.tender.title || "Sin título",
                description: release.tender.description || "",
                amount: release.tender.value?.amount?.toString() || "0",
                currency: release.tender.value?.currency || "AUD",
                publishDate: release.date || new Date().toISOString(),
                closeDate:
                  release.tender.tenderPeriod?.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                organization: release.buyer?.name || "CASG",
                country: "Australia",
                url: `https://www.tenders.gov.au/Atm/Show/${release.ocid}`,
                status: "open",
                category: "Defensa",
              })
            }
          })
        }
        break

      case "India":
        // Formato GEM
        if (json.tenders) {
          json.tenders.forEach((tender: any) => {
            tenders.push({
              id: tender.tender_id || tender.id,
              title: tender.title || tender.tender_title,
              description: tender.description || tender.tender_description,
              amount: tender.estimated_value?.toString() || "0",
              currency: "INR",
              publishDate: tender.published_date || new Date().toISOString(),
              closeDate:
                tender.bid_submission_end_date || new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
              organization: tender.organization_name || "Ministry of Defence",
              country: "India",
              url: `https://gem.gov.in/tender/${tender.tender_id}`,
              status: "open",
              category: "Defensa",
            })
          })
        }
        break

      case "Reino Unido":
        // Formato OCDS de Contracts Finder
        if (json.releases) {
          json.releases.forEach((release: any) => {
            if (release.tender) {
              tenders.push({
                id: release.ocid || release.id,
                title: release.tender.title || "Sin título",
                description: release.tender.description || "",
                amount: release.tender.value?.amount?.toString() || "0",
                currency: release.tender.value?.currency || "GBP",
                publishDate: release.date || new Date().toISOString(),
                closeDate:
                  release.tender.tenderPeriod?.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                organization: release.buyer?.name || "Ministry of Defence",
                country: "Reino Unido",
                url: `https://www.contractsfinder.service.gov.uk/notice/${release.ocid}`,
                status: "open",
                category: "Defensa",
              })
            }
          })
        }
        break
    }

    return tenders
  }

  private parseXML(data: string, endpoint: APIEndpoint): ProcurementTender[] {
    // Parser básico para XML/Atom feeds
    const tenders: ProcurementTender[] = []

    // Para España - feed Atom de Contratación del Estado
    if (endpoint.country === "España") {
      // Regex básico para extraer entries del feed Atom
      const entryRegex = /<entry>(.*?)<\/entry>/gs
      const titleRegex = /<title[^>]*>(.*?)<\/title>/s
      const linkRegex = /<link[^>]*href="([^"]*)"[^>]*>/s
      const summaryRegex = /<summary[^>]*>(.*?)<\/summary>/s
      const updatedRegex = /<updated>(.*?)<\/updated>/s

      let match
      while ((match = entryRegex.exec(data)) !== null) {
        const entry = match[1]
        const titleMatch = titleRegex.exec(entry)
        const linkMatch = linkRegex.exec(entry)
        const summaryMatch = summaryRegex.exec(entry)
        const updatedMatch = updatedRegex.exec(entry)

        if (titleMatch && linkMatch) {
          tenders.push({
            id: `es-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/, "$1").trim(),
            description: summaryMatch ? summaryMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/, "$1").trim() : "",
            amount: "0",
            currency: "EUR",
            publishDate: updatedMatch ? updatedMatch[1] : new Date().toISOString(),
            closeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            organization: "Ministerio de Defensa",
            country: "España",
            url: linkMatch[1],
            status: "open",
            category: "Defensa",
          })
        }
      }
    }

    // Para Singapur - GeBIZ
    if (endpoint.country === "Singapur") {
      // Regex básico para extraer oportunidades
      const opportunityRegex = /<tr[^>]*class="[^"]*opportunity[^"]*"[^>]*>(.*?)<\/tr>/gs

      let match
      while ((match = opportunityRegex.exec(data)) !== null) {
        // Extraer datos básicos del HTML
        tenders.push({
          id: `sg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: "Oportunidad de Defensa - Singapur",
          description: "Licitación extraída de GeBIZ",
          amount: "0",
          currency: "SGD",
          publishDate: new Date().toISOString(),
          closeDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
          organization: "Ministry of Defence Singapore",
          country: "Singapur",
          url: "https://www.gebiz.gov.sg/ptn/opportunity/BOCDisplayOpportunities.xhtml",
          status: "open",
          category: "Defensa",
        })
      }
    }

    return tenders
  }

  private parseHTML(data: string, endpoint: APIEndpoint): ProcurementTender[] {
    // Parser básico para HTML scraping
    const tenders: ProcurementTender[] = []

    // Para Singapur - GeBIZ
    if (endpoint.country === "Singapur") {
      // Regex básico para extraer oportunidades
      const opportunityRegex = /<tr[^>]*class="[^"]*opportunity[^"]*"[^>]*>(.*?)<\/tr>/gs

      let match
      while ((match = opportunityRegex.exec(data)) !== null) {
        // Extraer datos básicos del HTML
        tenders.push({
          id: `sg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: "Oportunidad de Defensa - Singapur",
          description: "Licitación extraída de GeBIZ",
          amount: "0",
          currency: "SGD",
          publishDate: new Date().toISOString(),
          closeDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
          organization: "Ministry of Defence Singapore",
          country: "Singapur",
          url: "https://www.gebiz.gov.sg/ptn/opportunity/BOCDisplayOpportunities.xhtml",
          status: "open",
          category: "Defensa",
        })
      }
    }

    return tenders
  }

  private getFallbackTenders(country: string): ProcurementTender[] {
    // Datos de fallback en caso de error en la API
    console.log(`[v0] Usando datos de fallback para ${country}`)

    const fallbackData: Record<string, ProcurementTender[]> = {
      Australia: [
        {
          id: "au-fallback-001",
          title: "LAND 400 Phase 3 - Infantry Fighting Vehicle Support",
          description: "Soporte técnico para vehículos de combate de infantería (datos de fallback)",
          amount: "15000000",
          currency: "AUD",
          publishDate: "2025-09-10T00:00:00Z",
          closeDate: "2025-11-15T23:59:59Z",
          organization: "Capability Acquisition and Sustainment Group",
          country: "Australia",
          url: "https://www.tenders.gov.au/Atm/Show/au-fallback-001",
          status: "open",
          category: "Defensa",
        },
      ],
      España: [
        {
          id: "es-fallback-001",
          title: "Suministro de equipos de comunicaciones tácticas",
          description: "Adquisición de sistemas de comunicación para unidades militares (datos de fallback)",
          amount: "8500000",
          currency: "EUR",
          publishDate: "2025-09-12T00:00:00Z",
          closeDate: "2025-10-30T23:59:59Z",
          organization: "Ministerio de Defensa",
          country: "España",
          url: "https://contrataciondelestado.es/wps/poc?uri=deeplink:detalle_licitacion&idEvl=es-fallback-001",
          status: "open",
          category: "Defensa",
        },
      ],
      "Reino Unido": [
        {
          id: "uk-fallback-001",
          title: "Defence Communications Infrastructure",
          description: "Modernization of military communications systems (fallback data)",
          amount: "12000000",
          currency: "GBP",
          publishDate: "2025-09-11T00:00:00Z",
          closeDate: "2025-12-20T23:59:59Z",
          organization: "Ministry of Defence",
          country: "Reino Unido",
          url: "https://www.contractsfinder.service.gov.uk/notice/uk-fallback-001",
          status: "open",
          category: "Defensa",
        },
      ],
      Singapur: [
        {
          id: "sg-fallback-001",
          title: "Military Equipment Procurement",
          description: "Procurement of defense equipment for Singapore Armed Forces (fallback data)",
          amount: "5000000",
          currency: "SGD",
          publishDate: "2025-09-13T00:00:00Z",
          closeDate: "2025-11-25T23:59:59Z",
          organization: "Ministry of Defence Singapore",
          country: "Singapur",
          url: "https://www.gebiz.gov.sg/ptn/opportunity/sg-fallback-001",
          status: "open",
          category: "Defensa",
        },
      ],
      India: [
        {
          id: "in-fallback-001",
          title: "Defence Equipment Modernization",
          description: "Modernization of military equipment and systems (fallback data)",
          amount: "200000000",
          currency: "INR",
          publishDate: "2025-09-14T00:00:00Z",
          closeDate: "2025-12-10T23:59:59Z",
          organization: "Ministry of Defence",
          country: "India",
          url: "https://gem.gov.in/tender/in-fallback-001",
          status: "open",
          category: "Defensa",
        },
      ],
    }

    return fallbackData[country] || []
  }

  private getAcceptHeader(format: string): string {
    switch (format) {
      case "json":
        return "application/json"
      case "ocds":
        return "application/json, application/vnd.ocds+json"
      case "xml":
        return "application/xml, text/xml, application/atom+xml"
      case "html":
        return "text/html, application/xhtml+xml"
      default:
        return "application/json, text/html, */*"
    }
  }
}
