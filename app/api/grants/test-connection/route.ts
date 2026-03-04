import { type NextRequest, NextResponse } from "next/server"
import { EUFundingFetcher } from "@/lib/eu-funding-fetcher"

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
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        count: 0,
        message: "SAM_GOV_API_KEY environment variable not configured.",
      })
    }

    const keywords = (config.keywords || []).slice(0, 5).join(" OR ")
    const noticeTypes: string[] = []
    if (config.noticeTypes?.solicitation) noticeTypes.push("o")
    if (config.noticeTypes?.sourcesSought) noticeTypes.push("s")
    if (config.noticeTypes?.specialNotice) noticeTypes.push("k")
    if (config.noticeTypes?.baa) noticeTypes.push("r")
    if (config.noticeTypes?.presolicitation) noticeTypes.push("p")

    const today = new Date()
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(today.getMonth() - 6)
    const postedFrom = sixMonthsAgo.toISOString().split("T")[0].replace(/-/g, "/")
    const postedTo = today.toISOString().split("T")[0].replace(/-/g, "/")

    const params = new URLSearchParams({
      api_key: apiKey,
      limit: "25",
      postedFrom,
      postedTo,
      ptype: noticeTypes.join(",") || "o,s,k,r,p",
    })

    if (config.activeOnly) {
      params.set("ncode", "o,s,k,r,p")
    }

    if (keywords) {
      params.set("keyword", keywords)
    }

    if (config.naicsCodes && config.naicsCodes.length > 0) {
      params.set("naics", config.naicsCodes.slice(0, 5).join(","))
    }

    const apiUrl = `https://api.sam.gov/opportunities/v2/search?${params.toString()}`
    console.log("[v0] SAM.gov test URL:", apiUrl.replace(apiKey, "***"))

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "ArquimeaGrantsSearch/1.0",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] SAM.gov test connection error:", response.status, errorText)
      return NextResponse.json({
        success: false,
        count: 0,
        message: `SAM.gov API returned status ${response.status}. Check your API key configuration.`,
      })
    }

    const data = await response.json()
    const total = data.totalRecords || 0
    const opportunities = data.opportunitiesData || []

    const sample = opportunities.slice(0, 5).map((opp: any) => opp.title || "Untitled")

    return NextResponse.json({
      success: true,
      count: total,
      message: `Connected successfully. Found ${total} opportunities matching your filters (keywords: ${config.keywords?.join(", ") || "none"}, NAICS: ${config.naicsCodes?.join(", ") || "none"}).`,
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

async function testEuConnection(config: any) {
  try {
    const euFetcher = new EUFundingFetcher()
    const allGrants = await euFetcher.fetchAllGrants()

    let filtered = allGrants

    // Filter by keywords
    if (config.keywords && config.keywords.length > 0) {
      const kws = config.keywords.map((k: string) => k.toLowerCase())
      filtered = filtered.filter((g: any) => {
        const text = `${g.title} ${g.description} ${g.category}`.toLowerCase()
        return kws.some((kw: string) => text.includes(kw))
      })
    }

    // Filter by programmes
    if (config.programmes) {
      filtered = filtered.filter((g: any) => {
        const programme = (g.programme || g.organization || "").toLowerCase()
        if (config.programmes.horizonEurope && programme.includes("horizon")) return true
        if (config.programmes.digitalEurope && programme.includes("digital")) return true
        if (config.programmes.euSpace && programme.includes("space")) return true
        // If no programme filter is enabled, show all
        if (!config.programmes.horizonEurope && !config.programmes.digitalEurope && !config.programmes.euSpace) return true
        return false
      })
    }

    // Filter by topic prefixes
    if (config.topicPrefixes && config.topicPrefixes.length > 0) {
      const prefixes = config.topicPrefixes.map((p: string) => p.toLowerCase())
      const prefixFiltered = filtered.filter((g: any) => {
        const id = (g.id || g.expedient || "").toLowerCase()
        return prefixes.some((p: string) => id.startsWith(p))
      })
      // Only apply prefix filter if it yields results (otherwise keep all)
      if (prefixFiltered.length > 0) {
        filtered = prefixFiltered
      }
    }

    const sample = filtered.slice(0, 5).map((g: any) => `${g.id || g.expedient}: ${g.title}`)

    return NextResponse.json({
      success: true,
      count: filtered.length,
      message: `Connected to EU Funding Portal. Found ${filtered.length} topics matching your filters out of ${allGrants.length} total (keywords: ${config.keywords?.join(", ") || "none"}, prefixes: ${config.topicPrefixes?.length || 0}).`,
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
