import { type NextRequest, NextResponse } from "next/server"

interface TenderUpdateData {
  title: string
  description: string
  amount: number
  currency: string
  deadline: string
  country: string
  organization: string
  type?: string
  category: string
  sector: "defensa" | "civil" | "espacio"
  status: "active" | "closed" | "pending"
  sourceUrl: string
}

// Global storage for tender edits (in production, this would be a database)
const tenderEdits: Record<string, TenderUpdateData> = {}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("[v0] PUT /api/tenders/[id] - Updating tender:", params.id)

    const tenderId = params.id
    if (!tenderId) {
      console.log("[v0] Error: Missing tender ID")
      return NextResponse.json({ success: false, error: "ID de licitación requerido" }, { status: 400 })
    }

    const body = await request.json()
    console.log("[v0] Update data received:", body)

    // Validate required fields
    const requiredFields = [
      "title",
      "description",
      "amount",
      "currency",
      "deadline",
      "country",
      "organization",
      "category",
      "sector",
      "status",
    ]
    const missingFields = requiredFields.filter((field) => !body[field])

    if (missingFields.length > 0) {
      console.log("[v0] Validation failed - missing fields:", missingFields)
      return NextResponse.json(
        { success: false, error: `Campos requeridos faltantes: ${missingFields.join(", ")}` },
        { status: 400 },
      )
    }

    // Validate amount is a positive number
    if (typeof body.amount !== "number" || body.amount <= 0) {
      console.log("[v0] Validation failed - invalid amount:", body.amount)
      return NextResponse.json({ success: false, error: "El monto debe ser un número positivo" }, { status: 400 })
    }

    // Validate deadline is a valid date
    const deadlineDate = new Date(body.deadline)
    if (isNaN(deadlineDate.getTime())) {
      console.log("[v0] Validation failed - invalid deadline:", body.deadline)
      return NextResponse.json({ success: false, error: "Fecha límite inválida" }, { status: 400 })
    }

    // Store the tender edit
    const tenderUpdate: TenderUpdateData = {
      title: body.title.trim(),
      description: body.description.trim(),
      amount: body.amount,
      currency: body.currency,
      deadline: body.deadline,
      country: body.country.trim(),
      organization: body.organization.trim(),
      type: body.type?.trim() || "",
      category: body.category.trim(),
      sector: body.sector,
      status: body.status,
      sourceUrl: body.sourceUrl?.trim() || "",
    }

    tenderEdits[tenderId] = tenderUpdate
    console.log("[v0] Tender edit stored successfully for ID:", tenderId)

    // Return the updated tender data
    const updatedTender = {
      id: tenderId,
      ...tenderUpdate,
      lastModified: new Date().toISOString(),
      modifiedBy: "admin", // In production, get from authentication
    }

    console.log("[v0] Tender updated successfully:", updatedTender.id)

    return NextResponse.json({
      success: true,
      data: updatedTender,
      message: "Licitación actualizada exitosamente",
    })
  } catch (error) {
    console.error("[v0] Error updating tender:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor al actualizar la licitación",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("[v0] GET /api/tenders/[id] - Getting tender:", params.id)

    const tenderId = params.id
    if (!tenderId) {
      return NextResponse.json({ success: false, error: "ID de licitación requerido" }, { status: 400 })
    }

    // Check if we have an edit for this tender
    const tenderEdit = tenderEdits[tenderId]

    if (tenderEdit) {
      console.log("[v0] Found tender edit for ID:", tenderId)
      return NextResponse.json({
        success: true,
        data: {
          id: tenderId,
          ...tenderEdit,
          lastModified: new Date().toISOString(),
          modifiedBy: "admin",
        },
      })
    }

    console.log("[v0] No edit found for tender ID:", tenderId)
    return NextResponse.json({ success: false, error: "Licitación no encontrada" }, { status: 404 })
  } catch (error) {
    console.error("[v0] Error getting tender:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}

// Export function to get all tender edits (for internal use)
export function getTenderEdits(): Record<string, TenderUpdateData> {
  return tenderEdits
}

// Export function to check if a tender has been edited
export function hasTenderEdit(tenderId: string): boolean {
  return tenderId in tenderEdits
}

// Export function to get a specific tender edit
export function getTenderEdit(tenderId: string): TenderUpdateData | null {
  return tenderEdits[tenderId] || null
}
