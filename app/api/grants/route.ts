import { type NextRequest, NextResponse } from "next/server"
import { GrantsGovFetcher } from "@/lib/grants-gov-fetcher"
import { EUFundingFetcher } from "@/lib/eu-funding-fetcher"
import { SAMGovFetcher } from "@/lib/sam-gov-fetcher"

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
        if (samApiKey && samApiKey !== "demo") {
          const samFetcher = new SAMGovFetcher(samApiKey)
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
          console.log("[v0] SAM.gov API key not configured, skipping SAM.gov")
        }
      } catch (error) {
        console.error("[v0] Error fetching SAM.gov:", error)
      }
    }

    if (!source || source === "all" || source === "eu") {
      try {
        const euFetcher = new EUFundingFetcher()
        const euGrants = await euFetcher.fetchAllGrants(keyword)
        const filteredEu = euGrants.filter((g) => !isBlockedGrant(g, blockedIds, blockedKeywords))
        const mappedEuGrants = filteredEu.map((g) => mapGrantToFrontend(g, "eu"))
        allGrants.push(...mappedEuGrants)
        console.log(`[v0] EU grants fetched: ${filteredEu.length}`)
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
      if (samApiKey && samApiKey !== "demo") {
        const samFetcher = new SAMGovFetcher(samApiKey)
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
        const filteredSam = samGrants.filter((g) => !isBlockedGrant(g))
        const mappedSam = filteredSam.map((g) => mapGrantToFrontend(g, "usa"))
        allGrants.push(...mappedSam)
      }
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
