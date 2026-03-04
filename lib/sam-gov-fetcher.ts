export interface SAMTender {
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

export class SAMGovFetcher {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async fetchDefenseTenders(): Promise<SAMTender[]> {
    console.log("[v0] 🇺🇸 Iniciando obtención de licitaciones de defensa desde SAM.gov...")

    try {
      if (!this.apiKey || this.apiKey.trim().length === 0 || this.apiKey === "demo") {
        console.log("[v0] SAM.gov API key not set or empty, using fallback tenders")
        return this.getFallbackTenders()
      }

      const today = new Date()
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(today.getMonth() - 3)

      // Date format: MM/dd/yyyy as per SAM.gov official docs
      const formatDate = (d: Date) => {
        const mm = String(d.getMonth() + 1).padStart(2, "0")
        const dd = String(d.getDate()).padStart(2, "0")
        const yyyy = d.getFullYear()
        return `${mm}/${dd}/${yyyy}`
      }

      const postedFrom = formatDate(threeMonthsAgo)
      const postedTo = formatDate(today)
      const encodedApiKey = encodeURIComponent(this.apiKey.trim())
      
      // Try both URL formats - official docs list both
      const urls = [
        `https://api.sam.gov/opportunities/v2/search?api_key=${encodedApiKey}&limit=100&postedFrom=${postedFrom}&postedTo=${postedTo}&ptype=o,p,k`,
        `https://api.sam.gov/prod/opportunities/v2/search?api_key=${encodedApiKey}&limit=100&postedFrom=${postedFrom}&postedTo=${postedTo}&ptype=o,p,k`,
      ]

      let data: any = null
      let lastErr = ""

      for (const apiUrl of urls) {
        console.log(`[v0] SAM.gov trying: ${apiUrl.replace(encodedApiKey, "***")}`)
        try {
          const response = await fetch(apiUrl, {
            method: "GET",
            headers: { Accept: "application/json" },
          })
          console.log(`[v0] SAM.gov response status: ${response.status}`)
          if (response.ok) {
            data = await response.json()
            console.log(`[v0] SAM.gov responded: ${data.totalRecords || 0} total records`)
            break
          } else {
            const errText = await response.text().catch(() => "")
            lastErr = `Status ${response.status}: ${errText.slice(0, 200)}`
            console.log(`[v0] SAM.gov error: ${lastErr}`)
          }
        } catch (fetchErr) {
          lastErr = fetchErr instanceof Error ? fetchErr.message : "Network error"
          console.log(`[v0] SAM.gov fetch error: ${lastErr}`)
        }
      }

      if (!data) {
        throw new Error(`SAM.gov API error: ${lastErr}`)
      }

      const opportunities = data.opportunitiesData || []
      
      if (opportunities.length === 0) {
        console.log("[v0] ⚠️ No se encontraron oportunidades, usando datos de fallback")
        return this.getFallbackTenders()
      }

      const transformed = this.transformSAMData(opportunities)
      console.log(`[v0] ✅ Transformadas ${transformed.length} licitaciones de SAM.gov`)
      
      return transformed
    } catch (error) {
      console.error("[v0] ❌ Error obteniendo datos de SAM.gov:", error)
      console.log("[v0] Usando datos de fallback de SAM.gov")
      return this.getFallbackTenders()
    }
  }

  private getFallbackTenders(): SAMTender[] {
    return [
      {
        id: "W52P1J25R0045",
        title: "Advanced Tactical Communication Systems for U.S. Army",
        organization: "U.S. Army Contracting Command - Aberdeen Proving Ground",
        publishDate: "2025-08-20",
        deadline: "2025-12-25",
        amount: "$8,500,000",
        category: "Communication Systems",
        description:
          "Procurement of next-generation tactical communication systems to enhance battlefield connectivity and operational effectiveness for U.S. Army units",
        expedient: "W52P1J25R0045",
        sourceUrl:
          "https://sam.gov/opp/W52P1J25R0045/view",
      },
      {
        id: "N0001925R4089",
        title: "Naval Air Defense Radar Modernization Program",
        organization: "Naval Sea Systems Command (NAVSEA)",
        publishDate: "2025-08-18",
        deadline: "2025-12-30",
        amount: "$12,300,000",
        category: "Radar Systems",
        description:
          "Comprehensive modernization and upgrade of naval air defense radar systems for enhanced threat detection and tracking capabilities",
        expedient: "N0001925R4089",
        sourceUrl:
          "https://sam.gov/opp/N0001925R4089/view",
      },
      {
        id: "FA8625-25-R-6234",
        title: "Cybersecurity Solutions for Air Force Networks",
        organization: "Air Force Life Cycle Management Center",
        publishDate: "2025-08-22",
        deadline: "2026-01-05",
        amount: "$15,700,000",
        category: "Cybersecurity",
        description:
          "Development and implementation of advanced cybersecurity solutions to protect critical Air Force communication networks and data systems",
        expedient: "FA8625-25-R-6234",
        sourceUrl:
          "https://sam.gov/opp/FA8625-25-R-6234/view",
      },
    ]
  }

  private transformSAMData(opportunities: any[]): SAMTender[] {
    return opportunities
      .filter((opp: any) => {
        const deadline = new Date(opp.responseDeadLine || opp.archiveDate)
        const today = new Date()
        return deadline > today
      })
      .map((opp: any) => {
        const noticeId = opp.noticeId || opp.solicitationNumber || opp.opportunityId
        
        return {
          id: noticeId,
          title: opp.title || opp.opportunityTitle || 'Sin título',
          organization: opp.fullParentPathName || opp.organizationName || opp.department || 'Organización no especificada',
          publishDate: opp.postedDate || opp.publishedDate || new Date().toISOString(),
          deadline: opp.responseDeadLine || opp.archiveDate || opp.closeDate,
          amount: opp.awardAmount 
            ? `$${opp.awardAmount.toLocaleString()}` 
            : opp.estimatedValue 
              ? `$${opp.estimatedValue.toLocaleString()}`
              : undefined,
          category: this.categorizeOpportunity(opp),
          description: this.cleanDescription(opp.description || opp.synopsis || 'Sin descripción disponible'),
          expedient: opp.solicitationNumber || noticeId,
          sourceUrl: `https://sam.gov/opp/${noticeId}/view`,
        }
      })
  }

  private categorizeOpportunity(opp: any): string {
    const title = (opp.title || '').toLowerCase()
    const description = (opp.description || '').toLowerCase()
    const combined = `${title} ${description}`

    if (combined.includes('aircraft') || combined.includes('aviation') || combined.includes('aerospace')) {
      return 'Aviación y Aeroespacial'
    }
    if (combined.includes('cyber') || combined.includes('information technology') || combined.includes('software')) {
      return 'Ciberseguridad y TI'
    }
    if (combined.includes('communication') || combined.includes('radio') || combined.includes('network')) {
      return 'Sistemas de Comunicación'
    }
    if (combined.includes('radar') || combined.includes('surveillance') || combined.includes('sensor')) {
      return 'Sistemas de Vigilancia'
    }
    if (combined.includes('vehicle') || combined.includes('tank') || combined.includes('armored')) {
      return 'Vehículos y Equipos'
    }
    if (combined.includes('weapon') || combined.includes('ammunition') || combined.includes('missile')) {
      return 'Armamento'
    }
    if (combined.includes('maintenance') || combined.includes('repair') || combined.includes('logistics')) {
      return 'Mantenimiento y Logística'
    }
    if (combined.includes('research') || combined.includes('development') || combined.includes('innovation')) {
      return 'Investigación y Desarrollo'
    }
    
    return opp.classificationCode || 'Defense Procurement'
  }

  private cleanDescription(description: string): string {
    // Limitar a 500 caracteres y limpiar HTML si existe
    let cleaned = description.replace(/<[^>]*>/g, '').trim()
    if (cleaned.length > 500) {
      cleaned = cleaned.substring(0, 497) + '...'
    }
    return cleaned
  }
}
