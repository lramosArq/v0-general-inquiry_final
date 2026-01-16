import { type NextRequest, NextResponse } from "next/server"

interface ManualTender {
  id: string
  title: string
  description: string
  amount: number
  currency: string
  deadline: string
  country: string
  agency: string
  status: string
  url: string
  publishedDate: string
  sector: string
  type: string
  source: "manual" | "automatic"
  createdBy: string
  createdAt: string
  lastModified: string
}

const manualTendersStorage: ManualTender[] = []

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Admin API: Getting manual tenders")
    console.log(`[v0] Admin API: Found ${manualTendersStorage.length} manual tenders`)

    return NextResponse.json({
      success: true,
      data: manualTendersStorage,
      message: `Retrieved ${manualTendersStorage.length} manual tenders`,
    })
  } catch (error) {
    console.error("[v0] Error getting manual tenders:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error retrieving manual tenders",
        data: [],
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  console.log("[v0] Admin API: POST request started")

  try {
    const body = await request.json()
    console.log("[v0] Admin API: Body parsed:", body.title)

    if (!body.title || !body.description || !body.amount || !body.deadline) {
      console.log("[v0] Admin API: Missing required fields")
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const newTender: ManualTender = {
      id: `MANUAL-${Date.now()}`,
      title: body.title,
      description: body.description,
      amount: Number(body.amount),
      currency: body.currency || "EUR",
      deadline: body.deadline,
      country: body.country || "",
      agency: body.agency || "",
      status: "active",
      url: body.url || "",
      publishedDate: new Date().toISOString().split("T")[0],
      sector: body.sector || "defensa",
      type: body.type || "",
      source: "manual",
      createdBy: "admin",
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    }

    manualTendersStorage.push(newTender)
    console.log("[v0] Admin API: Tender created successfully:", newTender.id)

    return NextResponse.json({
      success: true,
      data: newTender,
      message: "Manual tender created successfully",
    })
  } catch (error) {
    console.error("[v0] Admin API: Error in POST:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export function getStoredManualTenders(): ManualTender[] {
  return manualTendersStorage
}
