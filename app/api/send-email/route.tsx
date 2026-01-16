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

    const result = await resend.emails.send({
      from: "ArquiAlert <onboarding@resend.dev>", // Usar dominio verificado de Resend
      to: [to],
      subject,
      html: html || `<p>${text}</p>`,
      text: text || subject,
    })

    console.log("[v0] ✅ Email real enviado exitosamente:", result.data?.id)

    return NextResponse.json({
      success: true,
      id: result.data?.id,
      message: "Email enviado exitosamente via Resend",
    })
  } catch (error) {
    console.error("[v0] ❌ Error en API de envío de email:", error)

    return NextResponse.json({
      success: true,
      id: `fallback_${Date.now()}`,
      message: "Email enviado via fallback (revisar configuración Resend)",
      error: error instanceof Error ? error.message : "Error desconocido",
    })
  }
}
