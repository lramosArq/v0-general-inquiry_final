import { type NextRequest, NextResponse } from "next/server"
import { GrantsGovFetcher } from "@/lib/grants-gov-fetcher"
import { EUFundingFetcher } from "@/lib/eu-funding-fetcher"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function mapGrantToFrontend(grant: any, source: "usa" | "eu") {
  return {
    id: grant.id,
    opportunityNumber: grant.expedient || grant.id,
    title: grant.title,
    agency: grant.organization,
    status: grant.status || "Open",
    postedDate: grant.publishDate,
    closeDate: grant.deadline,
    description: grant.description,
    category: grant.category,
    fundingInstrument: grant.amount || grant.type,
    source: source,
    url: grant.url || grant.sourceUrl,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { keyword, source } = body

    console.log("[v0] Endpoint /api/grants - Fetching grants")
    console.log(`[v0] Keyword: "${keyword || "all"}", Source: "${source || "all"}"`)

    const allGrants: any[] = []

    if (!source || source === "all" || source === "usa") {
      try {
        const usaFetcher = new GrantsGovFetcher()
        const usaGrants = await usaFetcher.fetchAllGrants(keyword)
        const mappedUsaGrants = usaGrants.map((g) => mapGrantToFrontend(g, "usa"))
        allGrants.push(...mappedUsaGrants)
        console.log(`[v0] USA grants fetched: ${usaGrants.length}`)
      } catch (error) {
        console.error("[v0] Error fetching USA grants:", error)
      }
    }

    if (!source || source === "all" || source === "eu") {
      try {
        const euFetcher = new EUFundingFetcher()
        const euGrants = await euFetcher.fetchAllGrants(keyword)
        const mappedEuGrants = euGrants.map((g) => mapGrantToFrontend(g, "eu"))
        allGrants.push(...mappedEuGrants)
        console.log(`[v0] EU grants fetched: ${euGrants.length}`)
      } catch (error) {
        console.error("[v0] Error fetching EU grants:", error)
      }
    }

    // Sort by posted date (newest first)
    allGrants.sort((a, b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime())

    console.log(`[v0] Total grants returned: ${allGrants.length}`)

    return NextResponse.json({
      success: true,
      data: allGrants,
      total: allGrants.length,
      sources: {
        usa: allGrants.filter((g) => g.source === "usa").length,
        eu: allGrants.filter((g) => g.source === "eu").length,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Error in /api/grants:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        data: [],
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

    // Fetch USA grants
    try {
      const usaFetcher = new GrantsGovFetcher()
      const usaGrants = await usaFetcher.fetchAllGrants()
      const mappedUsaGrants = usaGrants.map((g) => mapGrantToFrontend(g, "usa"))
      allGrants.push(...mappedUsaGrants)
    } catch (error) {
      console.error("[v0] Error fetching USA grants:", error)
    }

    // Fetch EU grants
    try {
      const euFetcher = new EUFundingFetcher()
      const euGrants = await euFetcher.fetchAllGrants()
      const mappedEuGrants = euGrants.map((g) => mapGrantToFrontend(g, "eu"))
      allGrants.push(...mappedEuGrants)
    } catch (error) {
      console.error("[v0] Error fetching EU grants:", error)
    }

    // Sort by posted date
    allGrants.sort((a, b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime())

    return NextResponse.json({
      success: true,
      data: allGrants,
      total: allGrants.length,
      sources: {
        usa: allGrants.filter((g) => g.source === "usa").length,
        eu: allGrants.filter((g) => g.source === "eu").length,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Error in /api/grants:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        data: [],
        total: 0,
      },
      { status: 500 },
    )
  }
}
