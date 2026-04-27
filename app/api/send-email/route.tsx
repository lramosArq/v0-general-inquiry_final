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
    
    // In test mode, can only send to the account owner's email
    if (isTestMode && to !== allowedTestEmail) {
      console.log("[v0] Test mode restriction: can only send to", allowedTestEmail)
      return NextResponse.json({
        success: false,
        error: `En modo de prueba (sin dominio verificado), solo se puede enviar a ${allowedTestEmail}. Para enviar a otros destinatarios, configure un dominio verificado en Resend.`,
        testModeRestriction: true,
        allowedEmail: allowedTestEmail,
      }, { status: 403 })
    }

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
    })
  } catch (error) {
    console.error("[v0] Error en API de envio de email:", error)
    const errorMessage = error instanceof Error ? error.message : "Error desconocido"
    
    // Check for Resend domain verification error
    if (errorMessage.includes("only send testing emails") || errorMessage.includes("verify a domain")) {
      return NextResponse.json({
        success: false,
        error: "En modo de prueba, solo se puede enviar a lramos@arquimea.com. Configure un dominio verificado en Resend para enviar a otros destinatarios.",
        testModeRestriction: true,
      }, { status: 403 })
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 })
  }
}
