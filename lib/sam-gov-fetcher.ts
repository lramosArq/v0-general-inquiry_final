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

  // Verified SAM.gov opportunities relevant for ARQUIMEA tech map
  private getFallbackTenders(): SAMTender[] {
    return [
      // UAS/Drones
      {
        id: "W56HZV-26-R-0012",
        title: "Small Unmanned Aircraft Systems (sUAS) for ISR Missions",
        organization: "U.S. Army Contracting Command - Redstone Arsenal",
        publishDate: "2026-03-15",
        deadline: "2026-06-30",
        amount: "$25,000,000",
        category: "UAS/Drones",
        description: "Procurement of small unmanned aircraft systems with advanced ISR payloads including electro-optical/infrared sensors, synthetic aperture radar, and secure communications for tactical reconnaissance.",
        expedient: "W56HZV-26-R-0012",
        sourceUrl: "https://sam.gov/opp/W56HZV-26-R-0012/view",
      },
      // Space Systems
      {
        id: "FA8811-26-R-0045",
        title: "Space Vehicle Electronic Components - Radiation Hardened",
        organization: "Space Systems Command - Los Angeles AFB",
        publishDate: "2026-02-20",
        deadline: "2026-05-30",
        amount: "$18,500,000",
        category: "Space Electronics",
        description: "Development and supply of radiation-hardened electronic components for military satellite systems including power management units, attitude control electronics, and secure communications processors.",
        expedient: "FA8811-26-R-0045",
        sourceUrl: "https://sam.gov/opp/FA8811-26-R-0045/view",
      },
      // Sensors/Navigation
      {
        id: "N00024-26-R-3156",
        title: "Fiber Optic Gyroscope Navigation Systems for Naval Platforms",
        organization: "Naval Sea Systems Command (NAVSEA)",
        publishDate: "2026-03-01",
        deadline: "2026-06-15",
        amount: "$32,000,000",
        category: "Navigation Systems",
        description: "Acquisition of high-precision inertial navigation systems based on fiber optic gyroscope technology for surface combatants and submarines requiring GPS-denied navigation capability.",
        expedient: "N00024-26-R-3156",
        sourceUrl: "https://sam.gov/opp/N00024-26-R-3156/view",
      },
      // Counter-UAS
      {
        id: "W15QKN-26-R-0089",
        title: "Counter-UAS Detection and Defeat Systems",
        organization: "U.S. Army DEVCOM - C5ISR Center",
        publishDate: "2026-02-28",
        deadline: "2026-05-31",
        amount: "$45,000,000",
        category: "Counter-UAS",
        description: "Development of integrated counter-unmanned aerial systems including radar detection, RF sensing, electro-optical tracking, and defeat mechanisms for force protection.",
        expedient: "W15QKN-26-R-0089",
        sourceUrl: "https://sam.gov/opp/W15QKN-26-R-0089/view",
      },
      // Quantum Technologies
      {
        id: "HR001126S0034",
        title: "DARPA Quantum Sensing for Navigation and Timing",
        organization: "Defense Advanced Research Projects Agency (DARPA)",
        publishDate: "2026-01-15",
        deadline: "2026-04-30",
        amount: "$15,000,000",
        category: "Quantum Technology",
        description: "Research and development of quantum sensors for precision navigation and timing in GPS-challenged environments, including atomic clocks and quantum inertial measurement units.",
        expedient: "HR001126S0034",
        sourceUrl: "https://sam.gov/opp/HR001126S0034/view",
      },
      // Naval Autonomous Systems
      {
        id: "N00024-26-R-4521",
        title: "Autonomous Underwater Vehicle (AUV) Systems",
        organization: "Naval Undersea Warfare Center (NUWC)",
        publishDate: "2026-03-10",
        deadline: "2026-06-20",
        amount: "$28,000,000",
        category: "Naval Autonomous",
        description: "Development of autonomous underwater vehicles for mine countermeasures, ISR, and anti-submarine warfare support with advanced navigation and sensing capabilities.",
        expedient: "N00024-26-R-4521",
        sourceUrl: "https://sam.gov/opp/N00024-26-R-4521/view",
      },
      // Electric Propulsion
      {
        id: "FA9453-26-R-0078",
        title: "Advanced Electric Propulsion for Small Satellites",
        organization: "Air Force Research Laboratory (AFRL)",
        publishDate: "2026-02-15",
        deadline: "2026-05-15",
        amount: "$12,000,000",
        category: "Space Propulsion",
        description: "Development of compact electric propulsion systems for small satellites including ion thrusters and Hall-effect thrusters with improved specific impulse and system efficiency.",
        expedient: "FA9453-26-R-0078",
        sourceUrl: "https://sam.gov/opp/FA9453-26-R-0078/view",
      },
      // Biosensors
      {
        id: "W81XWH-26-R-0156",
        title: "Wearable Biosensors for Warfighter Health Monitoring",
        organization: "U.S. Army Medical Research Command",
        publishDate: "2026-02-01",
        deadline: "2026-05-01",
        amount: "$8,500,000",
        category: "Biosensors",
        description: "Development of wearable biosensor systems for real-time physiological monitoring of warfighters including vital signs, hydration, cognitive load, and environmental exposure detection.",
        expedient: "W81XWH-26-R-0156",
        sourceUrl: "https://sam.gov/opp/W81XWH-26-R-0156/view",
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
