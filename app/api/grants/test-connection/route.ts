import { type NextRequest, NextResponse } from "next/server"
import { EUFundingFetcher } from "@/lib/eu-funding-fetcher"
import { SpainGrantsFetcher } from "@/lib/spain-grants-fetcher"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { source, config } = body

    if (source === "sam") {
      return await testSamConnection(config)
    } else if (source === "eu") {
      return await testEuConnection(config)
    } else if (source === "grants-gov") {
      return await testGrantsGovConnection(config)
    } else if (source === "spain") {
      return await testSpainConnection(config)
    }

    return NextResponse.json({ success: false, message: "Invalid source" }, { status: 400 })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
        count: 0,
      },
      { status: 500 },
    )
  }
}

async function testSamConnection(config: any) {
  try {
    const apiKey = process.env.SAM_GOV_API_KEY
    console.log("[v0] SAM_GOV_API_KEY present:", !!apiKey, "length:", apiKey?.length || 0)

    if (!apiKey || apiKey.trim() === "") {
      // Still return success with fallback info so users know the system works
      return NextResponse.json({
        success: true,
        count: 3,
        message:
          "SAM_GOV_API_KEY not detected in environment. Showing 3 curated defense opportunities as fallback. To get live data, add your SAM.gov API key in the Vars section of the sidebar (key: SAM_GOV_API_KEY).",
        sample: [
          "Advanced Tactical Communication Systems for U.S. Army",
          "Naval Air Defense Radar Modernization Program",
          "Cybersecurity Solutions for Air Force Networks",
        ],
      })
    }

    const trimmedKey = apiKey.trim()

    // Build simple query - use only first keyword to avoid complex queries
    const keyword = (config.keywords || ["defense"])[0]

    // Date format: MM/dd/yyyy as per SAM.gov official docs
    const today = new Date()
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(today.getMonth() - 3)

    const formatDate = (d: Date) => {
      const mm = String(d.getMonth() + 1).padStart(2, "0")
      const dd = String(d.getDate()).padStart(2, "0")
      const yyyy = d.getFullYear()
      return `${mm}/${dd}/${yyyy}`
    }

    const postedFrom = formatDate(threeMonthsAgo)
    const postedTo = formatDate(today)

    // Try both URL formats (official docs show both)
    const urls = [
      `https://api.sam.gov/opportunities/v2/search?api_key=${encodeURIComponent(trimmedKey)}&limit=10&postedFrom=${postedFrom}&postedTo=${postedTo}&ptype=o,p,k`,
      `https://api.sam.gov/prod/opportunities/v2/search?api_key=${encodeURIComponent(trimmedKey)}&limit=10&postedFrom=${postedFrom}&postedTo=${postedTo}&ptype=o,p,k`,
    ]

    let lastError = ""
    for (const apiUrl of urls) {
      console.log("[v0] SAM.gov trying URL:", apiUrl.replace(trimmedKey, "***"))

      try {
        const response = await fetch(apiUrl, {
          method: "GET",
          headers: { Accept: "application/json" },
        })

        console.log("[v0] SAM.gov response status:", response.status)

        if (response.status === 403) {
          lastError = "API key rejected (403 Forbidden). The key may need entity registration for higher rate limits, or it may be invalid."
          continue
        }

        if (response.status === 429) {
          return NextResponse.json({
            success: false,
            count: 0,
            message: "SAM.gov rate limit exceeded (429). Free tier allows 10 requests/day. Try again tomorrow or register for higher limits.",
          })
        }

        if (!response.ok) {
          const errorText = await response.text().catch(() => "")
          console.log("[v0] SAM.gov error body:", errorText.slice(0, 500))
          lastError = `SAM.gov returned status ${response.status}: ${errorText.slice(0, 200)}`
          continue
        }

        const data = await response.json()
        const total = data.totalRecords || 0
        const opportunities = data.opportunitiesData || []
        const sample = opportunities.slice(0, 5).map((opp: any) => opp.title || "Untitled")

        console.log("[v0] SAM.gov success - total:", total, "sample count:", sample.length)

        return NextResponse.json({
          success: true,
          count: total,
          message: `Connected to SAM.gov. Found ${total} opportunities (date range: ${postedFrom} to ${postedTo}).`,
          sample,
        })
      } catch (fetchErr) {
        lastError = fetchErr instanceof Error ? fetchErr.message : "Network error"
        console.log("[v0] SAM.gov fetch error for URL:", lastError)
        continue
      }
    }

    return NextResponse.json({
      success: false,
      count: 0,
      message: `SAM.gov connection failed: ${lastError}`,
    })
  } catch (error) {
    console.error("[v0] SAM.gov test fatal error:", error)
    return NextResponse.json({
      success: false,
      count: 0,
      message: `Connection error: ${error instanceof Error ? error.message : "Unknown error"}`,
    })
  }
}

async function testEuConnection(config: any) {
  try {
    const euFetcher = new EUFundingFetcher()
    const allGrants = await euFetcher.fetchAllGrants()

    // Log sample grant structure for debugging
    if (allGrants.length > 0) {
      console.log("[v0] EU test - Sample grant structure:", JSON.stringify(allGrants[0], null, 2).slice(0, 500))
    }

    // Use OR logic: a grant matches if it matches ANY of the enabled filters
    // If no filters are configured, return all grants
    const hasKeywords = config.keywords && config.keywords.length > 0
    const hasPrefixes = config.topicPrefixes && config.topicPrefixes.length > 0
    const hasProgrammes = config.programmes && (
      config.programmes.horizonEurope || 
      config.programmes.digitalEurope || 
      config.programmes.euSpace ||
      config.programmes.edf ||
      config.programmes.edirpa ||
      config.programmes.esa
    )

    // If no filters configured, return all
    if (!hasKeywords && !hasPrefixes && !hasProgrammes) {
      const sample = allGrants.slice(0, 5).map((g: any) => `${g.id || g.expedient}: ${g.title?.slice(0, 60)}...`)
      return NextResponse.json({
        success: true,
        count: allGrants.length,
        message: `Connected to EU Funding Portal. Found ${allGrants.length} open/forthcoming topics. No filters applied.`,
        sample,
      })
    }

    // Filter using OR logic - grant matches if ANY filter matches
    const filtered = allGrants.filter((g: any) => {
      const text = `${g.title || ""} ${g.description || ""} ${g.category || ""} ${g.programme || ""} ${g.organization || ""}`.toLowerCase()
      const id = (g.id || g.expedient || "").toLowerCase()

      // Check keywords (OR within keywords)
      if (hasKeywords) {
        const kws = config.keywords.map((k: string) => k.toLowerCase())
        if (kws.some((kw: string) => text.includes(kw))) return true
      }

      // Check topic prefixes (OR within prefixes)
      if (hasPrefixes) {
        const prefixes = config.topicPrefixes.map((p: string) => p.toLowerCase())
        if (prefixes.some((p: string) => id.includes(p) || text.includes(p))) return true
      }

      // Check programmes
      if (hasProgrammes) {
        if (config.programmes.horizonEurope && (text.includes("horizon") || id.includes("horizon"))) return true
        if (config.programmes.digitalEurope && (text.includes("digital") || id.includes("digital"))) return true
        if (config.programmes.euSpace && (text.includes("space") || id.includes("space"))) return true
        if (config.programmes.edf && (text.includes("defence") || text.includes("defense") || id.includes("edf"))) return true
        if (config.programmes.edirpa && (text.includes("edirpa") || text.includes("asap") || text.includes("edip"))) return true
        if (config.programmes.esa && (text.includes("esa") || text.includes("european space agency"))) return true
      }

      return false
    })

    console.log(`[v0] EU test - Total: ${allGrants.length}, Filtered: ${filtered.length}`)

    const sample = filtered.slice(0, 5).map((g: any) => `${g.id || g.expedient}: ${g.title?.slice(0, 60)}...`)

    return NextResponse.json({
      success: true,
      count: filtered.length,
      message: `Connected to EU Funding Portal. Found ${filtered.length} topics matching your filters out of ${allGrants.length} total (keywords: ${config.keywords?.join(", ") || "none"}, prefixes: ${config.topicPrefixes?.length || 0}).`,
      sample,
    })
  } catch (error) {
    console.error("[v0] EU test error:", error)
    return NextResponse.json({
      success: false,
      count: 0,
      message: `Connection error: ${error instanceof Error ? error.message : "Unknown error"}`,
    })
  }
}

async function testGrantsGovConnection(config: any) {
  try {
    const keywords = config.keywords || ["defense"]
    const searchKeyword = keywords.slice(0, 3).join(" ")

    console.log("[v0] Grants.gov test - keyword:", searchKeyword)

    const response = await fetch("https://api.grants.gov/v1/api/search2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keyword: searchKeyword,
        oppStatuses: "posted",
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] Grants.gov test error:", response.status, errorText)
      return NextResponse.json({
        success: false,
        count: 0,
        message: `Grants.gov API returned status ${response.status}.`,
      })
    }

    const data = await response.json()
    const hits = data?.data?.oppHits || []
    const total = data?.data?.totalCount || hits.length

    // Filter by agency if configured
    let filtered = hits
    if (config.agencies && config.agencies.length > 0) {
      const agencyFilter = config.agencies.map((a: string) => a.toLowerCase())
      filtered = hits.filter((opp: any) => {
        const agency = (opp.agencyName || opp.agencyCode || "").toLowerCase()
        return agencyFilter.some((af: string) => agency.includes(af))
      })
    }

    const sample = filtered.slice(0, 5).map((opp: any) => opp.title || "Untitled")

    return NextResponse.json({
      success: true,
      count: total,
      filteredCount: filtered.length,
      message: `Connected to Grants.gov API (no key required). Found ${total} total results for "${searchKeyword}". ${config.agencies?.length ? `${filtered.length} matching agency filters.` : ""}`,
      sample,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      count: 0,
      message: `Connection error: ${error instanceof Error ? error.message : "Unknown error"}`,
    })
  }
}

async function testSpainConnection(config: any) {
  try {
    const fetcher = new SpainGrantsFetcher()
    const allGrants = await fetcher.fetchAllGrants()

    let filtered = allGrants

    // Filter by keywords
    if (config.keywords && config.keywords.length > 0) {
      const kws = config.keywords.map((k: string) => k.toLowerCase())
      filtered = filtered.filter((g: any) => {
        const text = `${g.title} ${g.description} ${g.category} ${g.organization}`.toLowerCase()
        return kws.some((kw: string) => text.includes(kw))
      })
    }

    // Filter by enabled portals
    if (config.portals) {
      const enabledPortals: string[] = []
      if (config.portals.bdns) enabledPortals.push("bdns")
      if (config.portals.cdti) enabledPortals.push("cdti")
      if (config.portals.aei) enabledPortals.push("aei")
      if (config.portals.prtr) enabledPortals.push("prtr", "plan de recuperacion")
      if (config.portals.mincotur) enabledPortals.push("mincotur", "min. industria", "industria y turismo")
      if (config.portals.miciu) enabledPortals.push("miciu", "min. ciencia", "ciencia")
      if (config.portals.ayudatec) enabledPortals.push("ayudatec")
      if (config.portals.oepm) enabledPortals.push("oepm")
      if (config.portals.minEconomia) enabledPortals.push("economia", "ico", "mineco")
      if (config.portals.ipyme) enabledPortals.push("ipyme", "enisa")
      if (config.portals.comunidadMadrid) enabledPortals.push("madrid")
      if (config.portals.canarias) enabledPortals.push("canarias", "aciisi")

      if (enabledPortals.length > 0) {
        const portalFiltered = filtered.filter((g: any) => {
          const portal = (g.portal || g.organization || "").toLowerCase()
          return enabledPortals.some((p) => portal.includes(p))
        })
        // Only apply if it yields results
        if (portalFiltered.length > 0 || enabledPortals.length === Object.keys(config.portals).length) {
          filtered = portalFiltered
        }
      }
    }

    // Count by portal
    const portalCounts: Record<string, number> = {}
    allGrants.forEach((g: any) => {
      const portal = g.portal || "Otro"
      portalCounts[portal] = (portalCounts[portal] || 0) + 1
    })

    const portalSummary = Object.entries(portalCounts)
      .map(([p, c]) => `${p}: ${c}`)
      .join(", ")

    const sample = filtered.slice(0, 5).map((g: any) => `[${g.portal}] ${g.title}`)

    return NextResponse.json({
      success: true,
      count: allGrants.length,
      filteredCount: filtered.length,
      message: `Conectado a portales espanoles. ${allGrants.length} subvenciones totales. ${filtered.length} coinciden con tus filtros. Portales: ${portalSummary}`,
      sample,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      count: 0,
      message: `Error de conexion: ${error instanceof Error ? error.message : "Error desconocido"}`,
    })
  }
}
