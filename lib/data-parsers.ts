export interface ParsedTender {
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
  reference?: string
}

export class OCDSParser {
  static parse(data: any, country: string): ParsedTender[] {
    const tenders: ParsedTender[] = []

    try {
      // Formato OCDS estándar
      if (data.releases && Array.isArray(data.releases)) {
        data.releases.forEach((release: any) => {
          if (release.tender && this.isDefenseRelated(release)) {
            const tender = this.parseOCDSRelease(release, country)
            if (tender) tenders.push(tender)
          }
        })
      }

      // Formato OCDS record
      if (data.records && Array.isArray(data.records)) {
        data.records.forEach((record: any) => {
          if (record.releases) {
            record.releases.forEach((release: any) => {
              if (release.tender && this.isDefenseRelated(release)) {
                const tender = this.parseOCDSRelease(release, country)
                if (tender) tenders.push(tender)
              }
            })
          }
        })
      }
    } catch (error) {
      console.error("[v0] Error parsing OCDS data:", error)
    }

    return tenders
  }

  private static parseOCDSRelease(release: any, country: string): ParsedTender | null {
    try {
      const tender = release.tender
      const buyer = release.buyer || release.parties?.find((p: any) => p.roles?.includes("buyer"))

      return {
        id: release.ocid || release.id || `${country.toLowerCase()}-${Date.now()}`,
        title: tender.title || "Sin título",
        description: tender.description || "",
        amount: tender.value?.amount?.toString() || tender.minValue?.amount?.toString() || "0",
        currency: tender.value?.currency || this.getDefaultCurrency(country),
        publishDate: release.date || tender.datePublished || new Date().toISOString(),
        closeDate: tender.tenderPeriod?.endDate || this.calculateCloseDate(),
        organization: buyer?.name || this.getDefaultOrganization(country),
        country: country,
        url: this.buildTenderUrl(release, country),
        status: this.mapTenderStatus(tender.status),
        category: "Defensa",
        reference: tender.id || release.ocid,
      }
    } catch (error) {
      console.error("[v0] Error parsing OCDS release:", error)
      return null
    }
  }

  private static isDefenseRelated(release: any): boolean {
    const defenseKeywords = [
      "defense",
      "defence",
      "military",
      "army",
      "navy",
      "air force",
      "weapon",
      "ammunition",
      "combat",
      "security",
      "surveillance",
      "radar",
      "missile",
      "aircraft",
      "vehicle",
      "armor",
      "tactical",
    ]

    const searchText = [
      release.tender?.title,
      release.tender?.description,
      release.buyer?.name,
      ...(release.tender?.items?.map((item: any) => item.description) || []),
    ]
      .join(" ")
      .toLowerCase()

    return defenseKeywords.some((keyword) => searchText.includes(keyword))
  }

  private static getDefaultCurrency(country: string): string {
    const currencies: Record<string, string> = {
      Australia: "AUD",
      "Reino Unido": "GBP",
      España: "EUR",
      Singapur: "SGD",
      India: "INR",
      Japón: "JPY",
      "Corea del Sur": "KRW",
    }
    return currencies[country] || "USD"
  }

  private static getDefaultOrganization(country: string): string {
    const orgs: Record<string, string> = {
      Australia: "Department of Defence",
      "Reino Unido": "Ministry of Defence",
      España: "Ministerio de Defensa",
      Singapur: "Ministry of Defence Singapore",
      India: "Ministry of Defence",
      Japón: "Ministry of Defense",
      "Corea del Sur": "Ministry of National Defense",
    }
    return orgs[country] || "Ministry of Defence"
  }

  private static buildTenderUrl(release: any, country: string): string {
    const baseUrls: Record<string, string> = {
      Australia: "https://www.tenders.gov.au/Atm/Show/",
      "Reino Unido": "https://www.contractsfinder.service.gov.uk/notice/",
      España: "https://contrataciondelestado.es/wps/poc?uri=deeplink:detalle_licitacion&idEvl=",
    }

    const baseUrl = baseUrls[country]
    const id = release.ocid || release.id

    return baseUrl ? `${baseUrl}${id}` : "#"
  }

  private static mapTenderStatus(status: string): "open" | "closed" | "awarded" {
    if (!status) return "open"

    const statusLower = status.toLowerCase()
    if (statusLower.includes("active") || statusLower.includes("open")) return "open"
    if (statusLower.includes("award") || statusLower.includes("complete")) return "awarded"
    return "closed"
  }

  private static calculateCloseDate(): string {
    // Por defecto, 30 días desde hoy
    const closeDate = new Date()
    closeDate.setDate(closeDate.getDate() + 30)
    return closeDate.toISOString()
  }
}

export class AtomFeedParser {
  static parse(xmlData: string, country: string): ParsedTender[] {
    const tenders: ParsedTender[] = []

    try {
      // Parser básico para feeds Atom/RSS
      const entryRegex = /<entry[^>]*>(.*?)<\/entry>/gs
      let match

      while ((match = entryRegex.exec(xmlData)) !== null) {
        const entry = match[1]
        const tender = this.parseAtomEntry(entry, country)
        if (tender && this.isDefenseRelated(tender.title + " " + tender.description)) {
          tenders.push(tender)
        }
      }
    } catch (error) {
      console.error("[v0] Error parsing Atom feed:", error)
    }

    return tenders
  }

  private static parseAtomEntry(entry: string, country: string): ParsedTender | null {
    try {
      const title = this.extractXMLValue(entry, "title")
      const link = this.extractXMLAttribute(entry, "link", "href")
      const summary = this.extractXMLValue(entry, "summary") || this.extractXMLValue(entry, "content")
      const updated = this.extractXMLValue(entry, "updated") || this.extractXMLValue(entry, "published")
      const id = this.extractXMLValue(entry, "id") || `${country.toLowerCase()}-${Date.now()}`

      if (!title || !link) return null

      return {
        id: id,
        title: this.cleanCDATA(title),
        description: this.cleanCDATA(summary || ""),
        amount: this.extractAmount(summary || title) || "0",
        currency: OCDSParser["getDefaultCurrency"](country),
        publishDate: updated || new Date().toISOString(),
        closeDate: this.calculateCloseDate(summary || ""),
        organization: OCDSParser["getDefaultOrganization"](country),
        country: country,
        url: link,
        status: "open" as const,
        category: "Defensa",
      }
    } catch (error) {
      console.error("[v0] Error parsing Atom entry:", error)
      return null
    }
  }

  private static extractXMLValue(xml: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}[^>]*>(.*?)<\/${tag}>`, "s")
    const match = regex.exec(xml)
    return match ? match[1].trim() : null
  }

  private static extractXMLAttribute(xml: string, tag: string, attr: string): string | null {
    const regex = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"[^>]*>`, "s")
    const match = regex.exec(xml)
    return match ? match[1] : null
  }

  private static cleanCDATA(text: string): string {
    return text.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1").trim()
  }

  private static extractAmount(text: string): string | null {
    // Buscar patrones de moneda en el texto
    const patterns = [
      /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*(?:€|EUR|euros?)/i,
      /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*(?:\$|USD|dollars?)/i,
      /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*(?:£|GBP|pounds?)/i,
    ]

    for (const pattern of patterns) {
      const match = pattern.exec(text)
      if (match) {
        return match[1].replace(/[.,]/g, "")
      }
    }

    return null
  }

  private static calculateCloseDate(text: string): string {
    // Buscar fechas en el texto
    const datePatterns = [/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/, /(\d{4})[/-](\d{1,2})[/-](\d{1,2})/]

    for (const pattern of datePatterns) {
      const match = pattern.exec(text)
      if (match) {
        try {
          const date = new Date(match[0])
          if (date > new Date()) {
            return date.toISOString()
          }
        } catch (error) {
          // Ignorar errores de parsing de fecha
        }
      }
    }

    // Por defecto, 30 días desde hoy
    const closeDate = new Date()
    closeDate.setDate(closeDate.getDate() + 30)
    return closeDate.toISOString()
  }

  private static isDefenseRelated(text: string): boolean {
    const defenseKeywords = [
      "defensa",
      "defense",
      "defence",
      "militar",
      "military",
      "armamento",
      "weapon",
      "seguridad",
      "security",
      "vigilancia",
      "surveillance",
      "radar",
      "misil",
      "missile",
    ]

    const textLower = text.toLowerCase()
    return defenseKeywords.some((keyword) => textLower.includes(keyword))
  }
}

export class JSONAPIParser {
  static parse(data: any, country: string, apiType: string): ParsedTender[] {
    const tenders: ParsedTender[] = []

    try {
      switch (apiType) {
        case "gem-india":
          return this.parseGEMIndia(data, country)
        case "gebiz-singapore":
          return this.parseGeBIZSingapore(data, country)
        default:
          return this.parseGenericJSON(data, country)
      }
    } catch (error) {
      console.error("[v0] Error parsing JSON API data:", error)
      return tenders
    }
  }

  private static parseGEMIndia(data: any, country: string): ParsedTender[] {
    const tenders: ParsedTender[] = []

    if (data.tenders && Array.isArray(data.tenders)) {
      data.tenders.forEach((tender: any) => {
        if (this.isDefenseRelated(tender.title + " " + tender.description)) {
          tenders.push({
            id: tender.tender_id || tender.id || `in-${Date.now()}`,
            title: tender.title || tender.tender_title || "Sin título",
            description: tender.description || tender.tender_description || "",
            amount: tender.estimated_value?.toString() || "0",
            currency: "INR",
            publishDate: tender.published_date || new Date().toISOString(),
            closeDate: tender.bid_submission_end_date || this.calculateCloseDate(),
            organization: tender.organization_name || "Ministry of Defence",
            country: country,
            url: `https://gem.gov.in/tender/${tender.tender_id}`,
            status: "open",
            category: "Defensa",
          })
        }
      })
    }

    return tenders
  }

  private static parseGeBIZSingapore(data: any, country: string): ParsedTender[] {
    const tenders: ParsedTender[] = []

    if (data.opportunities && Array.isArray(data.opportunities)) {
      data.opportunities.forEach((opp: any) => {
        if (this.isDefenseRelated(opp.title + " " + opp.description)) {
          tenders.push({
            id: opp.opportunity_id || `sg-${Date.now()}`,
            title: opp.title || "Sin título",
            description: opp.description || "",
            amount: opp.estimated_value?.toString() || "0",
            currency: "SGD",
            publishDate: opp.published_date || new Date().toISOString(),
            closeDate: opp.closing_date || this.calculateCloseDate(),
            organization: opp.agency_name || "Ministry of Defence Singapore",
            country: country,
            url: `https://www.gebiz.gov.sg/ptn/opportunity/${opp.opportunity_id}`,
            status: "open",
            category: "Defensa",
          })
        }
      })
    }

    return tenders
  }

  private static parseGenericJSON(data: any, country: string): ParsedTender[] {
    const tenders: ParsedTender[] = []

    // Intentar diferentes estructuras comunes
    const possibleArrays = [
      data.tenders,
      data.opportunities,
      data.contracts,
      data.notices,
      data.data,
      data.results,
      data,
    ]

    for (const array of possibleArrays) {
      if (Array.isArray(array)) {
        array.forEach((item: any) => {
          const tender = this.parseGenericItem(item, country)
          if (tender) tenders.push(tender)
        })
        break
      }
    }

    return tenders
  }

  private static parseGenericItem(item: any, country: string): ParsedTender | null {
    try {
      const title = item.title || item.name || item.subject || "Sin título"
      const description = item.description || item.summary || item.details || ""

      if (!this.isDefenseRelated(title + " " + description)) {
        return null
      }

      return {
        id: item.id || item.tender_id || `${country.toLowerCase()}-${Date.now()}`,
        title: title,
        description: description,
        amount: (item.value || item.amount || item.estimated_value || 0).toString(),
        currency: item.currency || OCDSParser["getDefaultCurrency"](country),
        publishDate: item.published_date || item.date || new Date().toISOString(),
        closeDate: item.closing_date || item.deadline || this.calculateCloseDate(),
        organization: item.organization || item.buyer || OCDSParser["getDefaultOrganization"](country),
        country: country,
        url: item.url || item.link || "#",
        status: "open",
        category: "Defensa",
      }
    } catch (error) {
      console.error("[v0] Error parsing generic item:", error)
      return null
    }
  }

  private static isDefenseRelated(text: string): boolean {
    const defenseKeywords = [
      "defense",
      "defence",
      "military",
      "army",
      "navy",
      "air force",
      "weapon",
      "ammunition",
      "combat",
      "security",
      "surveillance",
      "radar",
      "missile",
      "aircraft",
      "vehicle",
      "armor",
      "tactical",
      "defensa",
      "militar",
      "armamento",
      "seguridad",
      "vigilancia",
    ]

    const textLower = text.toLowerCase()
    return defenseKeywords.some((keyword) => textLower.includes(keyword))
  }

  private static calculateCloseDate(): string {
    const closeDate = new Date()
    closeDate.setDate(closeDate.getDate() + 30)
    return closeDate.toISOString()
  }
}
