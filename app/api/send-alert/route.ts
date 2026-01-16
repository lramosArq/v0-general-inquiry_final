import { Resend } from "resend"
import { NextResponse } from "next/server"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const { to, alertName, grants, frequency } = await request.json()

    if (!to || !grants || grants.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const grantsHTML = grants
      .map(
        (grant: any) => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px; vertical-align: top;">
          <strong style="color: #1e3a5f;">${grant.title}</strong>
          <br/>
          <span style="font-size: 12px; color: #666;">${grant.opportunityNumber}</span>
        </td>
        <td style="padding: 12px; vertical-align: top;">${grant.agency}</td>
        <td style="padding: 12px; vertical-align: top;">
          <span style="background: #22c55e; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">
            ${grant.status}
          </span>
        </td>
        <td style="padding: 12px; vertical-align: top;">${grant.closeDate || "N/A"}</td>
        <td style="padding: 12px; vertical-align: top;">
          <a href="${grant.url}" style="color: #2563eb; text-decoration: none;">View</a>
        </td>
      </tr>
    `,
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

          <table style="width: 100%; border-collapse: collapse; margin-top: 20px; background: white; border: 1px solid #e5e7eb;">
            <thead>
              <tr style="background: #1e3a5f; color: white;">
                <th style="padding: 12px; text-align: left;">Title</th>
                <th style="padding: 12px; text-align: left;">Agency</th>
                <th style="padding: 12px; text-align: left;">Status</th>
                <th style="padding: 12px; text-align: left;">Deadline</th>
                <th style="padding: 12px; text-align: left;">Link</th>
              </tr>
            </thead>
            <tbody>
              ${grantsHTML}
            </tbody>
          </table>

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

    const { data, error } = await resend.emails.send({
      from: "Arquimea Grants <onboarding@resend.dev>",
      to: [to],
      subject: `[Arquimea Alert] ${alertName} - ${grants.length} grant${grants.length !== 1 ? "s" : ""} found`,
      html,
    })

    if (error) {
      console.error("[v0] Error sending email:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[v0] Email sent successfully:", data)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[v0] Error in send-alert route:", error)
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  }
}
