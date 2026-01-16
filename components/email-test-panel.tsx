"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EmailServiceNoDomain } from "@/lib/email-service-no-domain"

export function EmailTestPanel() {
  const [isLoading, setIsLoading] = useState(false)
  const [lastResult, setLastResult] = useState<{ success: boolean; messageId: string; method: string } | null>(null)
  const emailService = EmailServiceNoDomain.getInstance()

  const sendTestEmail = async (method: "emailjs" | "webhook" | "mailtrap" | "auto") => {
    setIsLoading(true)
    console.log("[v0] 🧪 Iniciando prueba de email con método:", method)

    const testData = {
      titulo: "Licitación de Prueba - Sistema de Defensa Avanzado",
      expediente: "TEST-2025-001",
      organismo: "Ministerio de Defensa - Prueba",
      fechaLimite: "15/09/2025",
      presupuesto: "€2.5M",
      pais: "España",
      destinatario: "lramos@arquimea.com",
    }

    try {
      let result

      switch (method) {
        case "emailjs":
          const emailjsResult = await emailService.sendWithEmailJS(
            "lramos@arquimea.com",
            "🚨 ArquiAlert - Prueba EmailJS",
            emailService["generateEmailHTML"](testData),
            testData,
          )
          result = { ...emailjsResult, method: "EmailJS" }
          break

        case "webhook":
          const webhookResult = await emailService.sendWebhookNotification(
            "lramos@arquimea.com",
            "🚨 ArquiAlert - Prueba Webhook",
            emailService["generateEmailHTML"](testData),
          )
          result = { ...webhookResult, method: "Webhook" }
          break

        case "mailtrap":
          const mailtrapResult = await emailService.sendWithMailtrap(
            "lramos@arquimea.com",
            "🚨 ArquiAlert - Prueba Mailtrap",
            emailService["generateEmailHTML"](testData),
          )
          result = { ...mailtrapResult, method: "Mailtrap" }
          break

        default:
          result = await emailService.sendTenderAlert(
            "lramos@arquimea.com",
            "🚨 ArquiAlert - Prueba Automática",
            testData,
          )
      }

      setLastResult(result)
      console.log("[v0] ✅ Prueba completada:", result)
    } catch (error) {
      console.error("[v0] ❌ Error en prueba de email:", error)
      setLastResult({ success: false, messageId: "", method: "Error" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">📧 Pruebas de Email Seguro</CardTitle>
        <CardDescription>Servicios configurados desde servidor para mayor seguridad</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Button onClick={() => sendTestEmail("emailjs")} disabled={isLoading} variant="outline">
            📨 Probar EmailJS
          </Button>

          <Button onClick={() => sendTestEmail("webhook")} disabled={isLoading} variant="outline">
            🔗 Probar Webhook
          </Button>

          <Button onClick={() => sendTestEmail("mailtrap")} disabled={isLoading} variant="outline">
            📮 Probar Mailtrap
          </Button>

          <Button
            onClick={() => sendTestEmail("auto")}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            🚀 Envío Automático
          </Button>
        </div>

        {lastResult && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={lastResult.success ? "default" : "destructive"}>
                {lastResult.success ? "✅ Éxito" : "❌ Error"}
              </Badge>
              <Badge variant="outline">{lastResult.method}</Badge>
            </div>
            <p className="text-sm text-gray-600">
              <strong>Message ID:</strong> {lastResult.messageId || "N/A"}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Destinatario:</strong> lramos@arquimea.com
            </p>
          </div>
        )}

        <div className="mt-6 p-4 bg-green-50 rounded-lg">
          <h4 className="font-semibold text-green-900 mb-2">🔒 Configuración Segura:</h4>
          <ul className="text-sm text-green-800 space-y-1">
            <li>
              <strong>EmailJS:</strong> Procesado desde servidor para mayor seguridad
            </li>
            <li>
              <strong>Variables de entorno:</strong> EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY (sin
              NEXT_PUBLIC_)
            </li>
            <li>
              <strong>Webhook:</strong> Notificaciones instantáneas a Discord/Slack
            </li>
            <li>
              <strong>Mailtrap:</strong> Captura emails para testing sin envío real
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
