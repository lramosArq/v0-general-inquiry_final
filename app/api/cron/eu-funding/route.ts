/**
 * EU Funding & Tenders Portal - SEDIA API Cron Job
 * 
 * This endpoint is called by Vercel Cron to automatically check for new
 * EU funding opportunities relevant to ARQUIMEA's tech map.
 * 
 * Schedule: Every Monday at 9:00 AM (configured in vercel.json)
 * 
 * Flow:
 * 1. Fetch from SEDIA API (EU Funding Portal)
 * 2. Filter by ARQUIMEA tech map (EDF, Horizon Europe, Space, Defence)
 * 3. Check for new opportunities (not seen before)
 * 4. Send email alerts via Resend for new matches
 */

import { NextResponse } from "next/server"
import { EUFundingFetcher, type EUGrant } from "@/lib/eu-funding-fetcher"

// Simple in-memory cache of seen grant IDs (in production, use Upstash Redis)
const seenGrantIds = new Set<string>()

// ARQUIMEA priority programs
const PRIORITY_PROGRAMS = ["EDF", "EDIRPA", "Horizon", "Space", "Defence"]

export async function GET(request: Request) {
  // Verify this is a legitimate cron request (optional security)
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  
  // If CRON_SECRET is set, verify it
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.log("[v0] EU Cron - Unauthorized request")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  console.log("[v0] EU Cron - Starting EU Funding & Tenders check...")
  
  try {
    // 1. Fetch from SEDIA API
    const fetcher = new EUFundingFetcher()
    const grants = await fetcher.fetchAllGrants()
    
    console.log(`[v0] EU Cron - Found ${grants.length} total grants`)
    
    // 2. Filter for new grants (not seen before)
    const newGrants = grants.filter(g => !seenGrantIds.has(g.id))
    
    // Mark all as seen
    grants.forEach(g => seenGrantIds.add(g.id))
    
    console.log(`[v0] EU Cron - ${newGrants.length} new grants`)
    
    // 3. Filter for priority programs
    const priorityGrants = newGrants.filter(g => 
      PRIORITY_PROGRAMS.some(p => 
        g.title.toUpperCase().includes(p) ||
        g.organization.toUpperCase().includes(p) ||
        (g.program && g.program.toUpperCase().includes(p))
      )
    )
    
    console.log(`[v0] EU Cron - ${priorityGrants.length} priority grants`)
    
    // 4. Send alerts if there are new priority grants
    if (priorityGrants.length > 0) {
      await sendAlerts(priorityGrants)
    }
    
    return NextResponse.json({
      success: true,
      message: `EU Funding check complete`,
      stats: {
        total: grants.length,
        new: newGrants.length,
        priority: priorityGrants.length,
        timestamp: new Date().toISOString(),
      },
      newGrants: newGrants.map(g => ({
        id: g.id,
        title: g.title,
        program: g.program,
        deadline: g.deadline,
        status: g.status,
      })),
    })
    
  } catch (error) {
    console.error("[v0] EU Cron - Error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 })
  }
}

/**
 * Send email alerts for new grants via Resend
 */
async function sendAlerts(grants: EUGrant[]): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY
  const alertEmail = process.env.ALERT_EMAIL || process.env.RESEND_FROM_EMAIL
  
  if (!resendApiKey || !alertEmail) {
    console.log("[v0] EU Cron - Resend not configured, skipping email alerts")
    return
  }
  
  try {
    // Build email content
    const grantsList = grants.map(g => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">
          <strong>${g.title}</strong><br>
          <span style="color: #666; font-size: 14px;">
            ${g.program || g.organization} | Deadline: ${g.deadline || "TBD"}
          </span><br>
          <a href="${g.url}" style="color: #0066cc;">Ver detalles</a>
        </td>
      </tr>
    `).join("")
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Nuevas Oportunidades EU - ARQUIMEA</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">Nuevas Oportunidades EU</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">EU Funding & Tenders Portal - SEDIA</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border: 1px solid #dee2e6; border-top: none;">
          <p style="margin: 0 0 15px 0;">
            Se han encontrado <strong>${grants.length}</strong> nuevas oportunidades relevantes para ARQUIMEA:
          </p>
          
          <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px;">
            ${grantsList}
          </table>
          
          <p style="margin: 20px 0 0 0; font-size: 14px; color: #666;">
            Este es un mensaje automatico del sistema de vigilancia de oportunidades EU.
          </p>
        </div>
        
        <div style="text-align: center; padding: 15px; color: #999; font-size: 12px;">
          ARQUIMEA Grant Tracker | EU Funding & Tenders Portal
        </div>
      </body>
      </html>
    `
    
    // Send via Resend
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "noreply@resend.dev",
        to: alertEmail,
        subject: `[EU Funding] ${grants.length} nuevas oportunidades detectadas`,
        html: emailHtml,
      }),
    })
    
    if (response.ok) {
      console.log(`[v0] EU Cron - Alert email sent to ${alertEmail}`)
    } else {
      console.log("[v0] EU Cron - Failed to send alert email")
    }
    
  } catch (error) {
    console.error("[v0] EU Cron - Error sending alerts:", error)
  }
}

// Also support POST for manual triggers
export async function POST(request: Request) {
  return GET(request)
}
