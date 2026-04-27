import { Resend } from "resend"
import { NextResponse } from "next/server"

const resend = new Resend(process.env.RESEND_API_KEY)

// Validate email format: must be "email@example.com" or "Name <email@example.com>"
function isValidEmailFormat(email: string): boolean {
  const simpleEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const namedEmailRegex = /^.+\s*<[^\s@]+@[^\s@]+\.[^\s@]+>$/
  return simpleEmailRegex.test(email) || namedEmailRegex.test(email)
}

// Get the FROM email address - use custom domain if configured
function getFromEmail(): string {
  const customDomain = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM
  
  // Validate that it's actually an email format, not an API key
  if (customDomain && isValidEmailFormat(customDomain)) {
    return customDomain
  }
  
  return "Arquimea Grants <onboarding@resend.dev>"
}

export async function POST(request: Request) {
  try {
    const { to, alertName, grants, frequency } = await request.json()

    const fromEmail = getFromEmail()
    console.log("[v0] Send Alert API called")
    console.log("[v0] Recipient:", to)
    console.log("[v0] FROM email:", fromEmail)
    console.log("[v0] Alert name:", alertName)
    console.log("[v0] Grants count:", grants?.length)
    console.log("[v0] RESEND_API_KEY present:", !!process.env.RESEND_API_KEY)

    if (!to || !grants || grants.length === 0) {
      console.log("[v0] Missing required fields - to:", !!to, "grants:", grants?.length)
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!process.env.RESEND_API_KEY) {
      console.log("[v0] RESEND_API_KEY not configured")
      return NextResponse.json({ 
        error: "Email service not configured. Please add RESEND_API_KEY to environment variables.",
        details: "Resend API key is missing"
      }, { status: 500 })
    }

    const grantsHTML = grants
      .map(
        (grant: any, index: number) => {
          // Determine the grant URL - prioritize direct URL, then build from source
          let grantUrl = grant.url || "#"
          if (grantUrl === "#" || !grantUrl) {
            // Build URL based on source
            if (grant.source === "grants.gov" || grant.source === "usa") {
              grantUrl = `https://www.grants.gov/search-results-detail/${grant.opportunityNumber || grant.id}`
            } else if (grant.source === "sam.gov") {
              grantUrl = `https://sam.gov/opp/${grant.id}/view`
            } else if (grant.source === "eu" || grant.source?.includes("EU")) {
              grantUrl = `https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/${grant.id}`
            }
          }
          
          // Format budget/funding amount
          const budget = grant.awardCeiling || grant.fundingInstrument || grant.budget || grant.amount || "Not specified"
          const formattedBudget = typeof budget === "number" 
            ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(budget)
            : budget
          
          // Status color
          const statusColor = grant.status?.toLowerCase() === "open" ? "#22c55e" 
            : grant.status?.toLowerCase() === "closed" ? "#ef4444" 
            : "#f59e0b"
          
          // Category/Type
          const category = grant.category || grant.fundingType || grant.type || "General"
          
          // Source badge
          const sourceBadge = grant.source === "usa" || grant.source === "grants.gov" ? "USA" 
            : grant.source === "sam.gov" ? "SAM.gov"
            : grant.source === "eu" ? "EU" 
            : grant.source === "spain" ? "Spain"
            : grant.source || "Other"
            
          return `
      <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <span style="background: #1e3a5f; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">
            ${sourceBadge}
          </span>
          <span style="background: ${statusColor}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">
            ${grant.status || "Open"}
          </span>
        </div>
        
        <h3 style="margin: 0 0 8px 0; color: #1e3a5f; font-size: 16px;">
          <a href="${grantUrl}" style="color: #1e3a5f; text-decoration: none;" target="_blank">
            ${grant.title}
          </a>
        </h3>
        
        <table style="width: 100%; font-size: 13px; color: #666;">
          <tr>
            <td style="padding: 4px 0; width: 120px;"><strong>Agency:</strong></td>
            <td style="padding: 4px 0;">${grant.agency || "Not specified"}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0;"><strong>ID:</strong></td>
            <td style="padding: 4px 0;">${grant.opportunityNumber || grant.id || "N/A"}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0;"><strong>Category:</strong></td>
            <td style="padding: 4px 0;">${category}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0;"><strong>Budget:</strong></td>
            <td style="padding: 4px 0; color: #059669; font-weight: bold;">${formattedBudget}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0;"><strong>Deadline:</strong></td>
            <td style="padding: 4px 0; color: #dc2626; font-weight: bold;">${grant.closeDate || "See portal"}</td>
          </tr>
          ${grant.description ? `
          <tr>
            <td colspan="2" style="padding: 8px 0 4px 0;">
              <div style="background: #f8fafc; padding: 8px; border-radius: 4px; font-size: 12px; color: #555;">
                ${grant.description.substring(0, 200)}${grant.description.length > 200 ? "..." : ""}
              </div>
            </td>
          </tr>
          ` : ""}
        </table>
        
        <div style="margin-top: 12px; text-align: right;">
          <a href="${grantUrl}" 
             style="background: #2563eb; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; font-size: 13px; display: inline-block;"
             target="_blank">
            View Full Details
          </a>
        </div>
      </div>
    `
        }
      )
      .join("")

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Arquimea Grants Alert</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">ARQUIMEA GRANTS SEARCH</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Grant Alert Notification</p>
          </div>
          
          <div style="background: #f8fafc; padding: 20px; border: 1px solid #e5e7eb;">
            <h2 style="color: #1e3a5f; margin-top: 0;">
              Alert: ${alertName}
            </h2>
            <p style="color: #666;">
              ${
                frequency === "immediate"
                  ? "New grants matching your criteria have been found!"
                  : frequency === "daily"
                    ? "Your daily grants digest is ready."
                    : "Your weekly grants summary is ready."
              }
            </p>
            <p style="color: #666;">
              <strong>${grants.length}</strong> grant${grants.length !== 1 ? "s" : ""} found matching your filters.
            </p>
          </div>

          <div style="margin-top: 20px;">
            ${grantsHTML}
          </div>

          <div style="margin-top: 30px; padding: 20px; background: #f0f9ff; border-radius: 8px; text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL || "https://arquimea-grants.vercel.app"}" 
               style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Search More Grants
            </a>
          </div>

          <div style="margin-top: 30px; padding: 20px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #e5e7eb;">
            <p>This alert was sent by Arquimea Grants Search</p>
            <p>You can manage your alerts in your account settings.</p>
          </div>
        </body>
      </html>
    `

    // Check if we're in test mode (using resend.dev domain)
    const isTestMode = fromEmail.includes("resend.dev")
    const allowedTestEmail = "lramos@arquimea.com"
    
    // In test mode, can only send to the account owner's email
    if (isTestMode && to !== allowedTestEmail) {
      console.log("[v0] Test mode restriction: redirecting to allowed email")
      return NextResponse.json({ 
        success: false,
        error: `En modo de prueba (sin dominio verificado), solo se puede enviar a ${allowedTestEmail}. El email del destinatario (${to}) no esta permitido.`,
        testModeRestriction: true,
        allowedEmail: allowedTestEmail,
        suggestion: "Configure RESEND_FROM_EMAIL con un dominio verificado en Resend para enviar a cualquier destinatario."
      }, { status: 403 })
    }

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: `[Arquimea Alert] ${alertName} - ${grants.length} grant${grants.length !== 1 ? "s" : ""} found`,
      html,
    })

    if (error) {
      console.error("[v0] Error sending email:", error)
      const errorMessage = error.message || "Unknown error"
      let userFriendlyMessage = errorMessage
      
      if (errorMessage.includes("only send testing emails") || errorMessage.includes("verify a domain")) {
        userFriendlyMessage = `En modo de prueba, solo se puede enviar a ${allowedTestEmail}. Configure un dominio verificado en Resend para enviar a otros destinatarios.`
      }
      
      return NextResponse.json({ 
        success: false,
        error: userFriendlyMessage, 
        details: errorMessage,
        testModeRestriction: errorMessage.includes("testing emails"),
      }, { status: 500 })
    }

    console.log("[v0] Email sent successfully to:", to)
    console.log("[v0] Email data:", data)
    return NextResponse.json({ success: true, data, sentTo: to })
  } catch (error) {
    console.error("[v0] Error in send-alert route:", error)
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  }
}
