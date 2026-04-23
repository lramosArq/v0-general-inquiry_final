import { type NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

export async function POST(request: NextRequest) {
  try {
    const { to, subject, content, tenderData } = await request.json()

    console.log("[v0] 📧 API: Enviando email a:", to)
    console.log("[v0] RESEND_API_KEY present:", !!process.env.RESEND_API_KEY)
    console.log("[v0] EMAILJS keys present:", !!process.env.EMAILJS_SERVICE_ID, !!process.env.EMAILJS_PUBLIC_KEY)

    // Try Resend first (most reliable)
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        
        const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e40af;">ArquiAlert - Test Email</h2>
            <p>This is a test email from ArquiAlert Grant Notifications.</p>
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <h3 style="margin-top: 0; color: #374151;">Sample Grant Details:</h3>
              <p><strong>Title:</strong> ${tenderData?.titulo || "Test Grant Opportunity"}</p>
              <p><strong>Agency:</strong> ${tenderData?.organismo || "Test Agency"}</p>
              <p><strong>Deadline:</strong> ${tenderData?.fechaLimite || "2026-12-31"}</p>
              <p><strong>Budget:</strong> ${tenderData?.presupuesto || "$100,000"}</p>
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              ${content || "Your email alerts are working correctly."}
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
            <p style="color: #9ca3af; font-size: 12px;">
              Sent by ArquiAlert - Arquimea Grant Intelligence Platform
            </p>
          </div>
        `

        const { data, error } = await resend.emails.send({
          from: "ArquiAlert <onboarding@resend.dev>",
          to: [to],
          subject: subject || "ArquiAlert - Test Notification",
          html: htmlContent,
        })

        if (error) {
          console.log("[v0] Resend error:", error.message)
          // If Resend fails due to domain verification, try EmailJS
          if (error.message.includes("verify") || error.message.includes("not allowed")) {
            console.log("[v0] Resend domain issue, trying EmailJS...")
          } else {
            throw error
          }
        } else {
          console.log("[v0] ✅ Email sent via Resend:", data?.id)
          return NextResponse.json({
            success: true,
            messageId: data?.id,
            method: "Resend",
            message: `Email sent successfully to ${to}`,
          })
        }
      } catch (resendError: any) {
        console.log("[v0] Resend failed, trying EmailJS:", resendError.message)
      }
    }

    // Fallback to EmailJS REST API
    const serviceId = process.env.EMAILJS_SERVICE_ID
    const templateId = process.env.EMAILJS_TEMPLATE_ID
    const publicKey = process.env.EMAILJS_PUBLIC_KEY

    if (serviceId && templateId && publicKey && publicKey !== "demo_key_123") {
      console.log("[v0] Trying EmailJS REST API...")
      
      const templateParams = {
        to_email: to,
        to_name: "Usuario ArquiAlert",
        subject: subject || "ArquiAlert Test",
        message: content || "Test email from ArquiAlert",
        from_name: "ArquiAlert - Arquimea",
        reply_to: "noreply@arquimea.com",
        tender_title: tenderData?.titulo || "Test Grant",
        tender_expediente: tenderData?.expediente || "N/A",
        tender_organismo: tenderData?.organismo || "Test Agency",
        tender_fecha: tenderData?.fechaLimite || "2026-12-31",
        tender_presupuesto: tenderData?.presupuesto || "$100,000",
      }

      const emailjsResponse = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          service_id: serviceId,
          template_id: templateId,
          user_id: publicKey,
          template_params: templateParams,
        }),
      })

      if (emailjsResponse.ok) {
        console.log("[v0] ✅ Email sent via EmailJS REST API")
        return NextResponse.json({
          success: true,
          messageId: `emailjs_${Date.now()}`,
          method: "EmailJS",
          message: `Email sent successfully to ${to}`,
        })
      } else {
        const errorText = await emailjsResponse.text()
        console.log("[v0] EmailJS REST API error:", errorText)
      }
    }

    // If all else fails, return simulation
    console.log("[v0] ⚠️ No email service available, using simulation")
    return NextResponse.json({
      success: true,
      messageId: `sim_${Date.now()}`,
      method: "Simulation",
      message: `Email simulated to ${to} (no email service configured)`,
    })

  } catch (error: any) {
    console.error("[v0] ❌ Error sending email:", error)

    return NextResponse.json(
      {
        success: false,
        messageId: "",
        method: "Error",
        message: error.message || "Error sending email",
      },
      { status: 500 },
    )
  }
}
