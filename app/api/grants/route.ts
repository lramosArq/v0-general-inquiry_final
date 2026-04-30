import { type NextRequest, NextResponse } from "next/server"
import { GrantsGovFetcher } from "@/lib/grants-gov-fetcher"
import { EUFundingFetcher } from "@/lib/eu-funding-fetcher"
import { SAMGovFetcher } from "@/lib/sam-gov-fetcher"
import { SpainGrantsFetcher } from "@/lib/spain-grants-fetcher"
import { SpainApiFetcher } from "@/lib/spain-api-fetcher"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Default grants to exclude (not relevant)
const DEFAULT_BLOCKED_IDS = ["VA-NCA-VCGP-2026"]
const DEFAULT_BLOCKED_KEYWORDS = ["veterans cemetery"]

function isBlockedGrant(
  grant: any,
  blockedIds: string[] = DEFAULT_BLOCKED_IDS,
  blockedKeywords: string[] = DEFAULT_BLOCKED_KEYWORDS,
): boolean {
  const id = (grant.id || "").toLowerCase()
  const title = (grant.title || "").toLowerCase()
  if (blockedIds.some((b) => id.includes(b.toLowerCase()))) return true
  if (blockedKeywords.some((b) => title.includes(b.toLowerCase()))) return true
  return false
}

function generateDirectUrl(grant: any, source: "usa" | "eu" | "spain"): string {
  const id = grant.id || grant.expedient || ""
  const title = grant.title || ""
  
  // If a specific URL exists and is not a generic portal URL, use it
  const existingUrl = grant.url || grant.sourceUrl || ""
  const genericPatterns = [
    "/convocatorias",
    "/buscador",
    "/Paginas/Index",
    "/index.aspx",
    "portal/screen/opportunities/topic-search",
  ]
  const isGenericUrl = genericPatterns.some(pattern => existingUrl.includes(pattern))
  
  if (existingUrl && !isGenericUrl) {
    return existingUrl
  }
  
  // Generate direct URL based on source
  switch (source) {
    case "usa":
      // For Grants.gov - use search-results-detail if we have numeric ID
      if (/^\d+$/.test(id)) {
        return `https://www.grants.gov/search-results-detail/${id}`
      }
      // For SAM.gov opportunities
      if (id.includes("SAM") || grant.portal === "SAM.gov") {
        return `https://sam.gov/search?keywords=${encodeURIComponent(id)}&sort=-relevance&index=opp`
      }
      return `https://www.grants.gov/search?keywords=${encodeURIComponent(title.substring(0, 50))}`
      
    case "eu":
      // EU Funding & Tenders Portal - use topic-details if we have a valid identifier
      const euId = (grant.expedient || id).toUpperCase()
      
      // If identifier looks like a standard EU call (HORIZON-xxx, EDF-xxx, etc.)
      if (/^(HORIZON|EDF|DIGITAL|CEF|LIFE|ERASMUS|CREA|EUSPA|EDIRPA|AGRIP|AMIF|CERV|EU4H|ISF|SMP|EMFAF|JUST)[-_]/.test(euId)) {
        return `https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/${euId.toLowerCase()}`
      }
      
      // Otherwise search by the identifier or title
      const searchTerm = euId.startsWith("EU-") ? title.substring(0, 60) : euId
      return `https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-search?keywords=${encodeURIComponent(searchTerm)}`
      
    case "spain":
      // Spain - generate search URL based on portal
      const portal = (grant.portal || "").toLowerCase()
      if (portal.includes("cdti")) {
        return `https://www.cdti.es/ayudas`
      }
      if (portal.includes("aei")) {
        return `https://www.aei.gob.es/convocatorias/buscador-convocatorias`
      }
      if (portal.includes("prtr")) {
        return `https://planderecuperacion.gob.es/como-acceder-a-los-fondos/convocatorias`
      }
      if (portal.includes("bdns")) {
        // BDNS has a search by expedient
        const expedient = grant.expedient || id
        return `https://www.pap.hacienda.gob.es/bdnstrans/GE/es/convocatorias?convocatoria=${encodeURIComponent(expedient)}`
      }
      // Default: BDNS general search with title
      return `https://www.pap.hacienda.gob.es/bdnstrans/GE/es/convocatorias?texto=${encodeURIComponent(title.substring(0, 50))}`
      
    default:
      return existingUrl || "#"
  }
}

function mapGrantToFrontend(grant: any, source: "usa" | "eu" | "spain") {
  // For EU grants, use the extracted call/topic identifier as opportunity number
  // This ensures the "Opportunity Number" column shows meaningful identifiers like HORIZON-CL4-2025-xxx
  let opportunityNumber = grant.expedient || grant.id
  
  // For EU: prefer callIdentifier or topicIdentifier if available
  if (source === "eu") {
    opportunityNumber = grant.callIdentifier || grant.topicIdentifier || grant.expedient || grant.id
  }
  
  return {
    id: grant.id,
    opportunityNumber,
    title: grant.title,
    agency: grant.organization,
    status: grant.status || "Open",
    postedDate: grant.publishDate,
    closeDate: grant.deadline,
    description: grant.description,
    category: grant.category,
    fundingInstrument: grant.amount || grant.budget || grant.type,
    source: source,
    url: generateDirectUrl(grant, source),
    portal: grant.portal || (source === "eu" ? grant.program : undefined),
    program: grant.program,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { keyword, source, blocklist } = body

    // Merge dynamic blocklist with defaults
    const blockedIds = [...DEFAULT_BLOCKED_IDS, ...(blocklist?.ids || [])]
    const blockedKeywords = [...DEFAULT_BLOCKED_KEYWORDS, ...(blocklist?.keywords || [])]

    console.log("[v0] Endpoint /api/grants - Fetching grants")
    console.log(`[v0] Keyword: "${keyword || "all"}", Source: "${source || "all"}", Blocklist: ${blockedIds.length} IDs, ${blockedKeywords.length} keywords`)

    const allGrants: any[] = []

    if (!source || source === "all" || source === "usa") {
      // Grants.gov (public, no key)
      try {
        const usaFetcher = new GrantsGovFetcher()
        const usaGrants = await usaFetcher.fetchAllGrants(keyword)
        const filteredUsa = usaGrants.filter((g) => !isBlockedGrant(g, blockedIds, blockedKeywords))
        const mappedUsaGrants = filteredUsa.map((g) => mapGrantToFrontend(g, "usa"))
        allGrants.push(...mappedUsaGrants)
        console.log(`[v0] Grants.gov fetched: ${filteredUsa.length}`)
      } catch (error) {
        console.error("[v0] Error fetching Grants.gov:", error)
      }

      // SAM.gov (requires API key)
      try {
        const samApiKey = process.env.SAM_GOV_API_KEY
        console.log("[v0] SAM_GOV_API_KEY present:", !!samApiKey, "length:", samApiKey?.length || 0)
        if (samApiKey && samApiKey.trim().length > 0) {
          const samFetcher = new SAMGovFetcher(samApiKey.trim())
          const samTenders = await samFetcher.fetchDefenseTenders()
          const samGrants = samTenders.map((t) => ({
            id: t.id,
            title: t.title,
            organization: t.organization,
            status: "Open",
            publishDate: t.publishDate,
            deadline: t.deadline,
            description: t.description,
            category: t.category,
            amount: t.amount,
            url: t.sourceUrl,
            expedient: t.expedient,
          }))
          const filteredSam = samGrants.filter((g) => !isBlockedGrant(g, blockedIds, blockedKeywords))
          const mappedSam = filteredSam.map((g) => mapGrantToFrontend(g, "usa"))
          allGrants.push(...mappedSam)
          console.log(`[v0] SAM.gov fetched: ${filteredSam.length}`)
        } else {
          console.log("[v0] SAM.gov API key not configured - skipping (no simulated data)")
        }
      } catch (error) {
        console.error("[v0] Error fetching SAM.gov:", error)
      }
    }

    if (!source || source === "all" || source === "eu") {
      try {
        const euFetcher = new EUFundingFetcher()
        const euGrants = await euFetcher.fetchAllGrants()
        const filteredEu = euGrants.filter((g) => !isBlockedGrant(g, blockedIds, blockedKeywords))
        const mappedEuGrants = filteredEu.map((g) => mapGrantToFrontend(g, "eu"))
        allGrants.push(...mappedEuGrants)
        console.log(`[v0] EU grants fetched: ${filteredEu.length}`)
      } catch (error) {
        // Don't fail the whole request if EU times out or errors
        const errMsg = error instanceof Error ? error.message : String(error)
        console.error("[v0] Error fetching EU grants (continuing):", errMsg)
      }
    }

    // Spain grants (BDNS, CDTI, AEI, PRTR, etc.)
    if (!source || source === "all" || source === "spain") {
      // BDNS subsidies
      try {
        const spainFetcher = new SpainGrantsFetcher()
        const spainGrants = await spainFetcher.fetchAllGrants(keyword)
        const filteredSpain = spainGrants.filter((g) => !isBlockedGrant(g, blockedIds, blockedKeywords))
        const mappedSpainGrants = filteredSpain.map((g) => mapGrantToFrontend(g, "spain"))
        allGrants.push(...mappedSpainGrants)
        console.log(`[v0] Spain BDNS grants fetched: ${filteredSpain.length}`)
      } catch (error) {
        console.error("[v0] Error fetching Spain BDNS grants:", error)
      }

      // PLACSP tenders (defense, space, technology) - ARQUIMEA relevant
      try {
        const placspFetcher = new SpainApiFetcher()
        const placspTenders = await placspFetcher.fetchDefenseTenders()
        const placspGrants = placspTenders.map((t) => ({
          id: t.id,
          title: t.title,
          organization: t.organization,
          status: "Open",
          publishDate: t.publishDate,
          deadline: t.deadline,
          description: t.description,
          category: t.category,
          amount: t.amount,
          url: t.sourceUrl,
          expedient: t.expedient,
          portal: "PLACSP",
        }))
        const filteredPlacsp = placspGrants.filter((g) => !isBlockedGrant(g, blockedIds, blockedKeywords))
        const mappedPlacsp = filteredPlacsp.map((g) => mapGrantToFrontend(g, "spain"))
        allGrants.push(...mappedPlacsp)
        console.log(`[v0] Spain PLACSP tenders fetched: ${filteredPlacsp.length}`)
      } catch (error) {
        console.error("[v0] Error fetching Spain PLACSP tenders:", error)
      }
    }

    // Sort by posted date (newest first)
    allGrants.sort((a, b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime())

    console.log(`[v0] Total REAL grants returned: ${allGrants.length}`)

    // Build API status info
    const samKeyConfigured = !!process.env.SAM_GOV_API_KEY && process.env.SAM_GOV_API_KEY.trim().length > 0
    const apiStatus = {
      grantsGov: { name: "Grants.gov (USA)", status: "active", note: "API publica - datos reales" },
      samGov: { 
        name: "SAM.gov (USA)", 
        status: samKeyConfigured ? "active" : "unconfigured", 
        note: samKeyConfigured ? "API con clave - datos reales" : "Requiere SAM_GOV_API_KEY" 
      },
      euFunding: { name: "EU Funding Portal", status: "limited", note: "API SEDIA/TED - datos reales si disponibles" },
      spainBdns: { name: "BDNS (Spain)", status: "limited", note: "API REST - datos reales si disponibles" },
      spainPlacsp: { name: "PLACSP (Spain)", status: "active", note: "Feed Atom - datos reales" },
    }

    return NextResponse.json({
      success: true,
      grants: allGrants,
      data: allGrants, // backward compatibility
      total: allGrants.length,
      sources: {
        usa: allGrants.filter((g) => g.source === "usa").length,
        eu: allGrants.filter((g) => g.source === "eu").length,
        spain: allGrants.filter((g) => g.source === "spain").length,
      },
      apiStatus,
      message: allGrants.length === 0 
        ? "No se encontraron oportunidades reales. Algunas APIs tienen acceso limitado."
        : `${allGrants.length} oportunidades REALES encontradas (sin datos simulados)`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Error in /api/grants:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        grants: [],
        data: [], // backward compatibility
        total: 0,
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  try {
    console.log("[v0] Endpoint /api/grants GET - Fetching all grants")

    const allGrants: any[] = []

    // Fetch USA grants - Grants.gov
    try {
      const usaFetcher = new GrantsGovFetcher()
      const usaGrants = await usaFetcher.fetchAllGrants()
      const filteredUsa = usaGrants.filter((g) => !isBlockedGrant(g))
      const mappedUsaGrants = filteredUsa.map((g) => mapGrantToFrontend(g, "usa"))
      allGrants.push(...mappedUsaGrants)
    } catch (error) {
      console.error("[v0] Error fetching Grants.gov:", error)
    }

    // Fetch USA grants - SAM.gov
    try {
      const samApiKey = process.env.SAM_GOV_API_KEY
      const samFetcher = new SAMGovFetcher(samApiKey?.trim() || "")
      const samTenders = await samFetcher.fetchDefenseTenders()
      const samGrants = samTenders.map((t) => ({
        id: t.id, title: t.title, organization: t.organization,
        status: "Open", publishDate: t.publishDate, deadline: t.deadline,
        description: t.description, category: t.category, amount: t.amount,
        url: t.sourceUrl, expedient: t.expedient,
      }))
      const filteredSam = samGrants.filter((g) => !isBlockedGrant(g))
      const mappedSam = filteredSam.map((g) => mapGrantToFrontend(g, "usa"))
      allGrants.push(...mappedSam)
    } catch (error) {
      console.error("[v0] Error fetching SAM.gov:", error)
    }

    // Fetch EU grants
    try {
      const euFetcher = new EUFundingFetcher()
      const euGrants = await euFetcher.fetchAllGrants()
      const filteredEu = euGrants.filter((g) => !isBlockedGrant(g))
      const mappedEuGrants = filteredEu.map((g) => mapGrantToFrontend(g, "eu"))
      allGrants.push(...mappedEuGrants)
    } catch (error) {
      console.error("[v0] Error fetching EU grants:", error)
    }

    // Fetch Spain grants - BDNS
    try {
      const spainFetcher = new SpainGrantsFetcher()
      const spainGrants = await spainFetcher.fetchAllGrants()
      const filteredSpain = spainGrants.filter((g) => !isBlockedGrant(g))
      const mappedSpainGrants = filteredSpain.map((g) => mapGrantToFrontend(g, "spain"))
      allGrants.push(...mappedSpainGrants)
    } catch (error) {
      console.error("[v0] Error fetching Spain BDNS grants:", error)
    }

    // Fetch Spain tenders - PLACSP (defense, space)
    try {
      const placspFetcher = new SpainApiFetcher()
      const placspTenders = await placspFetcher.fetchDefenseTenders()
      const placspGrants = placspTenders.map((t) => ({
        id: t.id, title: t.title, organization: t.organization,
        status: "Open", publishDate: t.publishDate, deadline: t.deadline,
        description: t.description, category: t.category, amount: t.amount,
        url: t.sourceUrl, expedient: t.expedient, portal: "PLACSP",
      }))
      const filteredPlacsp = placspGrants.filter((g) => !isBlockedGrant(g))
      const mappedPlacsp = filteredPlacsp.map((g) => mapGrantToFrontend(g, "spain"))
      allGrants.push(...mappedPlacsp)
    } catch (error) {
      console.error("[v0] Error fetching Spain PLACSP tenders:", error)
    }

    // Sort by posted date
    allGrants.sort((a, b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime())

    return NextResponse.json({
      success: true,
      grants: allGrants,
      data: allGrants, // backward compatibility
      total: allGrants.length,
      sources: {
        usa: allGrants.filter((g) => g.source === "usa").length,
        eu: allGrants.filter((g) => g.source === "eu").length,
        spain: allGrants.filter((g) => g.source === "spain").length,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Error in /api/grants:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        grants: [],
        data: [], // backward compatibility
        total: 0,
      },
      { status: 500 },
    )
  }
}
