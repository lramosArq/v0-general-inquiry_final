import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const { name, email, businessUnit, role } = await request.json()

    // Send notification to admin about new registration
    await resend.emails.send({
      from: "Arquimea Grants <onboarding@resend.dev>",
      to: ["jcmarin@arquimea.com"], // Admin notification
      subject: `Nueva solicitud de registro: ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e3a5f;">Nueva Solicitud de Registro</h2>
          <p>Se ha registrado un nuevo usuario en Arquimea Grants Search:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Nombre:</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Email:</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Unidad de Negocio:</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${businessUnit}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Cargo:</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${role || "No especificado"}</td>
            </tr>
          </table>
          <p style="color: #666; font-size: 12px;">Este es un mensaje automático de Arquimea Grants Search.</p>
        </div>
      `,
    })

    return Response.json({ success: true })
  } catch (error) {
    console.error("[v0] Error sending registration notification:", error)
    return Response.json({ success: false, error: "Failed to send notification" }, { status: 500 })
  }
}
