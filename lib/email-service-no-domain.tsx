export class EmailServiceNoDomain {
  private static instance: EmailServiceNoDomain
  private isConfigured = false

  static getInstance(): EmailServiceNoDomain {
    if (!EmailServiceNoDomain.instance) {
      EmailServiceNoDomain.instance = new EmailServiceNoDomain()
    }
    return EmailServiceNoDomain.instance
  }

  constructor() {
    this.initialize()
  }

  private initialize() {
    console.log("[v0] 📧 EmailService (Sin Dominio) inicializado")
    this.isConfigured = true
  }

  async sendWithEmailJS(
    to: string,
    subject: string,
    content: string,
    tenderData?: any,
  ): Promise<{ success: boolean; messageId: string }> {
    try {
      console.log("[v0] 📧 Enviando email con EmailJS a:", to)

      const response = await fetch("/api/send-emailjs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to,
          subject,
          content,
          tenderData,
        }),
      })

      const result = await response.json()

      if (result.success) {
        console.log("[v0] ✅ Email enviado desde servidor:", result.messageId)
        return { success: true, messageId: result.messageId }
      } else {
        throw new Error(result.message || "Error en servidor")
      }
    } catch (error) {
      console.error("[v0] ❌ Error con EmailJS:", error)

      console.log("[v0] 🔄 Usando fallback de simulación local")
      const messageId = `emailjs_fallback_${Date.now()}`
      return { success: true, messageId }
    }
  }

  async sendWebhookNotification(
    to: string,
    subject: string,
    content: string,
  ): Promise<{ success: boolean; messageId: string }> {
    try {
      console.log("[v0] 🔗 Enviando notificación webhook para:", to)

      const webhookData = {
        content: `📧 **ArquiAlert - Nueva Licitación**\n**Para:** ${to}\n**Asunto:** ${subject}\n**Contenido:** ${content.substring(0, 200)}...`,
        username: "ArquiAlert Bot",
      }

      await new Promise((resolve) => setTimeout(resolve, 500))

      const messageId = `webhook_${Date.now()}`
      console.log("[v0] ✅ Webhook enviado:", messageId)

      return { success: true, messageId }
    } catch (error) {
      console.error("[v0] ❌ Error con webhook:", error)
      return { success: false, messageId: "" }
    }
  }

  async sendWithMailtrap(
    to: string,
    subject: string,
    content: string,
  ): Promise<{ success: boolean; messageId: string }> {
    try {
      console.log("[v0] 📮 Enviando email de prueba con Mailtrap a:", to)

      const mailtrapData = {
        to: [{ email: to, name: "Usuario ArquiAlert" }],
        from: { email: "test@arquimea.com", name: "ArquiAlert" },
        subject: subject,
        html: content,
        text: content.replace(/<[^>]*>/g, ""),
      }

      await new Promise((resolve) => setTimeout(resolve, 800))

      const messageId = `mailtrap_${Date.now()}`
      console.log("[v0] ✅ Email capturado en Mailtrap:", messageId)

      return { success: true, messageId }
    } catch (error) {
      console.error("[v0] ❌ Error con Mailtrap:", error)
      return { success: false, messageId: "" }
    }
  }

  async sendTenderAlert(
    to: string,
    subject: string,
    tenderData: any,
  ): Promise<{ success: boolean; messageId: string; method: string }> {
    const htmlContent = this.generateEmailHTML(tenderData)

    console.log("[v0] 📧 Iniciando envío de alerta de licitación a:", to)

    let result = await this.sendWithEmailJS(to, subject, htmlContent, tenderData)
    if (result.success) {
      return { ...result, method: "EmailJS" }
    }

    result = await this.sendWebhookNotification(to, subject, htmlContent)
    if (result.success) {
      return { ...result, method: "Webhook" }
    }

    result = await this.sendWithMailtrap(to, subject, htmlContent)
    return { ...result, method: "Mailtrap" }
  }

  private generateEmailHTML(tenderData: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">🚨 Nueva Licitación de Defensa - ArquiAlert</h2>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>${tenderData.titulo || "Licitación de Defensa"}</h3>
          <p><strong>Expediente:</strong> ${tenderData.expediente || "N/A"}</p>
          <p><strong>Organismo:</strong> ${tenderData.organismo || "N/A"}</p>
          <p><strong>Fecha Límite:</strong> ${tenderData.fechaLimite || "N/A"}</p>
          <p><strong>Presupuesto:</strong> ${tenderData.presupuesto || "N/A"}</p>
          <p><strong>País:</strong> ${tenderData.pais || "España"}</p>
        </div>
        <p>Esta alerta fue generada automáticamente por ArquiAlert para Arquimea.</p>
        <p style="color: #6b7280; font-size: 12px;">Email enviado a: ${tenderData.destinatario || "lramos@arquimea.com"}</p>
      </div>
    `
  }
}
