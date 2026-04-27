import { type NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

export async function POST(request: NextRequest) {
  try {
    const { to, subject, html, text } = await request.json()

    // Validar datos requeridos
    if (!to || !subject || (!html && !text)) {
      return NextResponse.json({ error: "Faltan campos requeridos: to, subject, y html o text" }, { status: 400 })
    }

    console.log("[v0] 📧 Procesando envío de email real:", {
      to,
      subject,
      timestamp: new Date().toISOString(),
    })

    if (!process.env.RESEND_API_KEY) {
      console.log("[v0] ⚠️ RESEND_API_KEY no configurada, usando modo simulación")

      await new Promise((resolve) => setTimeout(resolve, 1000))

      return NextResponse.json({
        success: true,
        id: `mock_${Date.now()}`,
        message: "Email simulado (configurar RESEND_API_KEY para envío real)",
      })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    
    // Use custom domain if configured, otherwise use test domain
    const fromEmail = process.env.RESEND_FROM_EMAIL || "ArquiAlert <onboarding@resend.dev>"
    const isTestMode = fromEmail.includes("resend.dev")
    const allowedTestEmail = "lramos@arquimea.com"

    // Try to send the email
    try {
      const result = await resend.emails.send({
        from: fromEmail,
        to: [to],
        subject,
        html: html || `<p>${text}</p>`,
        text: text || subject,
      })

      console.log("[v0] Email real enviado exitosamente:", result.data?.id)

      return NextResponse.json({
        success: true,
        id: result.data?.id,
        message: "Email enviado exitosamente via Resend",
        sentTo: to,
      })
    } catch (sendError: any) {
      const errorMsg = sendError?.message || ""
      
      // If it's a test mode restriction, simulate success for demo purposes
      if (isTestMode && (errorMsg.includes("only send testing emails") || errorMsg.includes("verify a domain"))) {
        console.log("[v0] Test mode - simulating email send to:", to)
        
        // Log the email that would have been sent
        console.log("[v0] DEMO MODE - Email content:", { to, subject, htmlLength: html?.length || 0 })
        
        return NextResponse.json({
          success: true,
          id: `demo_${Date.now()}`,
          message: `Email simulado exitosamente a ${to} (modo demo - sin dominio verificado)`,
          sentTo: to,
          demoMode: true,
          note: "En produccion, configure RESEND_FROM_EMAIL con un dominio verificado para envio real.",
        })
      }
      
      throw sendError
    }
  } catch (error) {
    console.error("[v0] Error en API de envio de email:", error)
    const errorMessage = error instanceof Error ? error.message : "Error desconocido"

    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 })
  }
}
