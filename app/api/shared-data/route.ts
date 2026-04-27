// API para datos compartidos entre usuarios
// Simula una base de datos usando memoria del servidor + localStorage como fallback

import { NextRequest, NextResponse } from "next/server"

// Training feedback structure - tracks user preferences for AI learning
interface TrainingFeedback {
  opportunityId: string
  userId: string
  userName: string
  businessUnit: string
  feedback: "interested" | "not_interested"
  timestamp: string
  opportunityData?: {
    title?: string
    agency?: string
    category?: string
    source?: string
    keywords?: string[]
  }
}

// In-memory storage (persiste mientras el servidor esté corriendo)
// En producción, esto debería ser una base de datos real
let sharedData: {
  opportunityClaims: any[]
  userAlerts: Record<string, any[]>
  userSettings: Record<string, any>
  feedbackData: Record<string, any> // Legacy simple format
  trainingFeedback: TrainingFeedback[] // New detailed training data
  trainingStats: {
    totalFeedbacks: number
    interestedCount: number
    notInterestedCount: number
    byUser: Record<string, { interested: number; notInterested: number }>
    byCategory: Record<string, { interested: number; notInterested: number }>
    bySource: Record<string, { interested: number; notInterested: number }>
    byAgency: Record<string, { interested: number; notInterested: number }>
    topKeywords: Record<string, number>
    lastTrainingUpdate: string
  }
  lastUpdated: string
} = {
  opportunityClaims: [],
  userAlerts: {},
  userSettings: {},
  feedbackData: {},
  trainingFeedback: [],
  trainingStats: {
    totalFeedbacks: 0,
    interestedCount: 0,
    notInterestedCount: 0,
    byUser: {},
    byCategory: {},
    bySource: {},
    byAgency: {},
    topKeywords: {},
    lastTrainingUpdate: new Date().toISOString(),
  },
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

    if (dataType === "training") {
      return NextResponse.json({
        success: true,
        data: {
          feedbacks: sharedData.trainingFeedback,
          stats: sharedData.trainingStats,
        },
        lastUpdated: sharedData.lastUpdated,
      })
    }

    if (dataType === "trainingStats") {
      return NextResponse.json({
        success: true,
        data: sharedData.trainingStats,
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

    // Handle feedback data (legacy)
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

    // Handle training feedback with full tracking
    if (type === "training") {
      const trainingData = data as TrainingFeedback
      
      // Remove existing feedback for same user+opportunity
      sharedData.trainingFeedback = sharedData.trainingFeedback.filter(
        (f) => !(f.opportunityId === trainingData.opportunityId && f.userId === trainingData.userId)
      )
      
      // Add new feedback
      sharedData.trainingFeedback.push({
        ...trainingData,
        timestamp: new Date().toISOString(),
      })
      
      // Update statistics
      const stats = sharedData.trainingStats
      stats.totalFeedbacks = sharedData.trainingFeedback.length
      stats.interestedCount = sharedData.trainingFeedback.filter(f => f.feedback === "interested").length
      stats.notInterestedCount = sharedData.trainingFeedback.filter(f => f.feedback === "not_interested").length
      
      // Stats by user
      stats.byUser = {}
      sharedData.trainingFeedback.forEach((f) => {
        if (!stats.byUser[f.userName]) {
          stats.byUser[f.userName] = { interested: 0, notInterested: 0 }
        }
        if (f.feedback === "interested") {
          stats.byUser[f.userName].interested++
        } else {
          stats.byUser[f.userName].notInterested++
        }
      })
      
      // Stats by category
      stats.byCategory = {}
      sharedData.trainingFeedback.forEach((f) => {
        const cat = f.opportunityData?.category || "Unknown"
        if (!stats.byCategory[cat]) {
          stats.byCategory[cat] = { interested: 0, notInterested: 0 }
        }
        if (f.feedback === "interested") {
          stats.byCategory[cat].interested++
        } else {
          stats.byCategory[cat].notInterested++
        }
      })
      
      // Stats by source
      stats.bySource = {}
      sharedData.trainingFeedback.forEach((f) => {
        const src = f.opportunityData?.source || "Unknown"
        if (!stats.bySource[src]) {
          stats.bySource[src] = { interested: 0, notInterested: 0 }
        }
        if (f.feedback === "interested") {
          stats.bySource[src].interested++
        } else {
          stats.bySource[src].notInterested++
        }
      })
      
      // Stats by agency
      stats.byAgency = {}
      sharedData.trainingFeedback.forEach((f) => {
        const agency = f.opportunityData?.agency || "Unknown"
        if (!stats.byAgency[agency]) {
          stats.byAgency[agency] = { interested: 0, notInterested: 0 }
        }
        if (f.feedback === "interested") {
          stats.byAgency[agency].interested++
        } else {
          stats.byAgency[agency].notInterested++
        }
      })
      
      // Extract and count keywords from interested opportunities
      stats.topKeywords = {}
      sharedData.trainingFeedback
        .filter((f) => f.feedback === "interested")
        .forEach((f) => {
          const title = f.opportunityData?.title?.toLowerCase() || ""
          const words = title.split(/\s+/).filter((w) => w.length > 4)
          words.forEach((word) => {
            stats.topKeywords[word] = (stats.topKeywords[word] || 0) + 1
          })
        })
      
      stats.lastTrainingUpdate = new Date().toISOString()
      
      return NextResponse.json({
        success: true,
        data: {
          feedback: trainingData,
          stats: stats,
        },
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
