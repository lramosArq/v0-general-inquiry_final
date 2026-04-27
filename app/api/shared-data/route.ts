// API para datos compartidos entre usuarios
// Simula una base de datos usando memoria del servidor + localStorage como fallback

import { NextRequest, NextResponse } from "next/server"

// In-memory storage (persiste mientras el servidor esté corriendo)
// En producción, esto debería ser una base de datos real
let sharedData: {
  opportunityClaims: any[]
  userAlerts: Record<string, any[]>
  userSettings: Record<string, any>
  feedbackData: Record<string, any>
  lastUpdated: string
} = {
  opportunityClaims: [],
  userAlerts: {},
  userSettings: {},
  feedbackData: {},
  lastUpdated: new Date().toISOString(),
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const dataType = searchParams.get("type")
  const userId = searchParams.get("userId")

  try {
    if (dataType === "claims") {
      return NextResponse.json({
        success: true,
        data: sharedData.opportunityClaims,
        lastUpdated: sharedData.lastUpdated,
      })
    }

    if (dataType === "alerts" && userId) {
      return NextResponse.json({
        success: true,
        data: sharedData.userAlerts[userId] || [],
        lastUpdated: sharedData.lastUpdated,
      })
    }

    if (dataType === "allAlerts") {
      return NextResponse.json({
        success: true,
        data: sharedData.userAlerts,
        lastUpdated: sharedData.lastUpdated,
      })
    }

    if (dataType === "settings" && userId) {
      return NextResponse.json({
        success: true,
        data: sharedData.userSettings[userId] || {},
        lastUpdated: sharedData.lastUpdated,
      })
    }

    if (dataType === "feedback") {
      return NextResponse.json({
        success: true,
        data: sharedData.feedbackData,
        lastUpdated: sharedData.lastUpdated,
      })
    }

    // Return all data
    return NextResponse.json({
      success: true,
      data: sharedData,
      lastUpdated: sharedData.lastUpdated,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch data" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, userId, data, action } = body

    sharedData.lastUpdated = new Date().toISOString()

    // Handle opportunity claims
    if (type === "claims") {
      if (action === "claim") {
        // Add new claim
        const existingIndex = sharedData.opportunityClaims.findIndex(
          (c) => c.opportunityId === data.opportunityId
        )
        if (existingIndex === -1) {
          sharedData.opportunityClaims.push(data)
        }
      } else if (action === "release") {
        // Remove claim
        sharedData.opportunityClaims = sharedData.opportunityClaims.filter(
          (c) => c.opportunityId !== data.opportunityId
        )
      } else if (action === "sync") {
        // Full sync
        sharedData.opportunityClaims = data
      }

      return NextResponse.json({
        success: true,
        data: sharedData.opportunityClaims,
        lastUpdated: sharedData.lastUpdated,
      })
    }

    // Handle user alerts
    if (type === "alerts" && userId) {
      if (action === "add") {
        if (!sharedData.userAlerts[userId]) {
          sharedData.userAlerts[userId] = []
        }
        sharedData.userAlerts[userId].push(data)
      } else if (action === "remove") {
        sharedData.userAlerts[userId] = (sharedData.userAlerts[userId] || []).filter(
          (a: any) => a.id !== data.alertId
        )
      } else if (action === "sync") {
        sharedData.userAlerts[userId] = data
      }

      return NextResponse.json({
        success: true,
        data: sharedData.userAlerts[userId],
        lastUpdated: sharedData.lastUpdated,
      })
    }

    // Handle user settings (email preferences, etc.)
    if (type === "settings" && userId) {
      sharedData.userSettings[userId] = {
        ...sharedData.userSettings[userId],
        ...data,
      }

      return NextResponse.json({
        success: true,
        data: sharedData.userSettings[userId],
        lastUpdated: sharedData.lastUpdated,
      })
    }

    // Handle feedback data
    if (type === "feedback") {
      if (action === "update") {
        sharedData.feedbackData = {
          ...sharedData.feedbackData,
          ...data,
        }
      }

      return NextResponse.json({
        success: true,
        data: sharedData.feedbackData,
        lastUpdated: sharedData.lastUpdated,
      })
    }

    return NextResponse.json(
      { success: false, error: "Invalid request type" },
      { status: 400 }
    )
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to update data" },
      { status: 500 }
    )
  }
}
