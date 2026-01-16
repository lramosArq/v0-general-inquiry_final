export interface EmailAlert {
  to: string
  subject: string
  tender: {
    title: string
    expediente: string
    organismo: string
    fechaLimite: string
    presupuesto: string
    url: string
    pais: string
  }
  filterName: string
}

export class EmailService {
  private static instance: EmailService
  private apiKey = ""
  private smtpConfig = {
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    user: "",
    password: "",
  }
  private readonly isSimulationMode = false // Cambiado a false para envío real

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService()
    }
    return EmailService.instance
  }

  constructor() {
    console.log("[v0] 📧 EmailService initialized for REAL email sending")
    console.log("[v0] ⚙️ SMTP configuration ready")
  }

  setSmtpConfig(config: { host: string; port: number; user: string; password: string }) {
    this.smtpConfig = { ...this.smtpConfig, ...config }
    console.log("[v0] ✅ SMTP configuration updated for real email sending")
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey
    console.log("[v0] ✅ API key configured for real email service")
  }

  async sendTenderAlert(alert: EmailAlert): Promise<boolean> {
    try {
      console.log("[v0] 📧 Sending REAL email to:", alert.to)

      // Preparar el contenido del email
      const emailContent = {
        to: alert.to,
        subject: alert.subject,
        html: this.generateEmailHTML(alert),
        text: this.generateEmailText(alert),
      }

      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(emailContent),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      console.log("[v0] ✅ EMAIL REAL ENVIADO EXITOSAMENTE a", alert.to)
      console.log("[v0] 📋 Detalles del envío:", {
        messageId: result.id,
        destinatario: alert.to,
        asunto: alert.subject,
        filtro: alert.filterName,
        licitacion: alert.tender.title,
        expediente: alert.tender.expediente,
      })

      return true
    } catch (error) {
      console.error("[v0] ❌ Error enviando email real:", error)

      console.log("[v0] 🔄 Fallback: Registrando email para envío manual")
      console.log("[v0] 📝 EMAIL PENDIENTE DE ENVÍO:", {
        destinatario: alert.to,
        asunto: alert.subject,
        contenido: this.generateEmailText(alert),
        timestamp: new Date().toISOString(),
      })

      return false
    }
  }

  private generateEmailHTML(alert: EmailAlert): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1e40af; color: white; padding: 20px; text-align: center;">
            <h1>🚨 ArquiAlert - Nueva Licitación</h1>
          </div>
          <div style="padding: 20px;">
            <h2>${alert.tender.title}</h2>
            <p><strong>Expediente:</strong> ${alert.tender.expediente}</p>
            <p><strong>Organismo:</strong> ${alert.tender.organismo}</p>
            <p><strong>País:</strong> ${alert.tender.pais}</p>
            <p><strong>Fecha límite:</strong> ${alert.tender.fechaLimite}</p>
            <p><strong>Presupuesto:</strong> ${alert.tender.presupuesto}</p>
            <p><strong>Filtro activado:</strong> ${alert.filterName}</p>
            <div style="margin: 20px 0;">
              <a href="${alert.tender.url}" style="background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
                Ver Licitación Completa
              </a>
            </div>
          </div>
          <div style="background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #666;">
            <p>Este email fue enviado por ArquiAlert - Sistema de Alertas de Licitaciones de Arquimea</p>
          </div>
        </body>
      </html>
    `
  }

  private generateEmailText(alert: EmailAlert): string {
    return `
🚨 NUEVA LICITACIÓN DETECTADA - ArquiAlert

${alert.tender.title}

Expediente: ${alert.tender.expediente}
Organismo: ${alert.tender.organismo}
País: ${alert.tender.pais}
Fecha límite: ${alert.tender.fechaLimite}
Presupuesto: ${alert.tender.presupuesto}

Filtro activado: ${alert.filterName}

Ver licitación completa: ${alert.tender.url}

---
ArquiAlert - Sistema de Alertas de Licitaciones
Arquimea
    `
  }

  async sendDailyDigest(email: string, tenders: any[]): Promise<boolean> {
    try {
      console.log("[v0] 📊 Enviando resumen diario REAL a:", email)

      const emailContent = {
        to: email,
        subject: `📊 Resumen Diario ArquiAlert - ${tenders.length} licitaciones`,
        html: this.generateDigestHTML(tenders),
        text: this.generateDigestText(tenders),
      }

      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(emailContent),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      console.log("[v0] ✅ RESUMEN DIARIO REAL ENVIADO a", email)
      return true
    } catch (error) {
      console.error("[v0] ❌ Error enviando resumen diario:", error)
      return false
    }
  }

  private generateDigestHTML(tenders: any[]): string {
    const tendersHTML = tenders
      .map(
        (tender) => `
      <div style="border: 1px solid #e5e7eb; margin: 10px 0; padding: 15px; border-radius: 5px;">
        <h3>${tender.title}</h3>
        <p><strong>Organismo:</strong> ${tender.organismo}</p>
        <p><strong>Fecha límite:</strong> ${tender.fechaLimite}</p>
        <p><strong>Presupuesto:</strong> ${tender.presupuesto}</p>
        <a href="${tender.url}">Ver detalles</a>
      </div>
    `,
      )
      .join("")

    return `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1e40af; color: white; padding: 20px; text-align: center;">
            <h1>📊 Resumen Diario ArquiAlert</h1>
            <p>${tenders.length} licitaciones encontradas</p>
          </div>
          <div style="padding: 20px;">
            ${tendersHTML}
          </div>
        </body>
      </html>
    `
  }

  private generateDigestText(tenders: any[]): string {
    const tendersText = tenders
      .map(
        (tender) => `
- ${tender.title}
  Organismo: ${tender.organismo}
  Fecha límite: ${tender.fechaLimite}
  Presupuesto: ${tender.presupuesto}
  URL: ${tender.url}
    `,
      )
      .join("\n")

    return `
📊 RESUMEN DIARIO ARQUIALERT

${tenders.length} licitaciones encontradas:

${tendersText}

---
ArquiAlert - Sistema de Alertas de Licitaciones
Arquimea
    `
  }

  async sendClosingReminder(email: string, tender: any): Promise<boolean> {
    try {
      console.log("[v0] ⏰ Enviando recordatorio de cierre REAL a:", email)

      const emailContent = {
        to: email,
        subject: `⏰ Recordatorio: Licitación cierra pronto - ${tender.title}`,
        html: `
          <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #dc2626; color: white; padding: 20px; text-align: center;">
                <h1>⏰ Recordatorio Urgente</h1>
              </div>
              <div style="padding: 20px;">
                <h2>${tender.title}</h2>
                <p style="color: #dc2626; font-weight: bold;">Esta licitación cierra el: ${tender.fechaLimite}</p>
                <p><strong>Organismo:</strong> ${tender.organismo}</p>
                <p><strong>Presupuesto:</strong> ${tender.presupuesto}</p>
                <a href="${tender.url}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
                  Ver Licitación
                </a>
              </div>
            </body>
          </html>
        `,
        text: `⏰ RECORDATORIO URGENTE - ${tender.title}\n\nEsta licitación cierra el: ${tender.fechaLimite}\n\nVer detalles: ${tender.url}`,
      }

      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(emailContent),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      console.log("[v0] ✅ Recordatorio de cierre REAL enviado a", email)
      return true
    } catch (error) {
      console.error("[v0] ❌ Error enviando recordatorio:", error)
      return false
    }
  }

  getSystemStatus() {
    return {
      mode: "REAL_EMAIL_SENDING",
      emailProvider: "SMTP/API",
      isSimulationMode: this.isSimulationMode,
      smtpConfigured: !!this.smtpConfig.user,
      apiKeyConfigured: !!this.apiKey,
      targetEmail: "lramos@arquimea.com",
    }
  }
}
