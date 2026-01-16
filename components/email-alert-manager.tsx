"use client"

import { useEffect, useState } from "react"
import { EmailService, type EmailAlert } from "@/lib/email-service"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Mail, Send, CheckCircle, AlertCircle, Globe } from "lucide-react"

interface EmailAlertManagerProps {
  customFilters: any[]
  tenders: any[]
}

export function EmailAlertManager({ customFilters, tenders }: EmailAlertManagerProps) {
  const [emailService] = useState(() => EmailService.getInstance())
  const [isConfigured, setIsConfigured] = useState(true)
  const [sentAlerts, setSentAlerts] = useState<string[]>([])
  const [emailStats, setEmailStats] = useState({
    alertsSent: 0,
    digestsSent: 0,
    remindersSent: 0,
  })

  useEffect(() => {
    emailService.setApiKey("real-email-mode")
    console.log("[v0] ✅ EmailService configurado para envío REAL")
    console.log("[v0] 📧 Sistema listo para enviar emails reales a lramos@arquimea.com")
    // Removed the envío automático de email de prueba
  }, [emailService])

  const handleSendTestEmail = async () => {
    console.log("[v0] 📧 Enviando email de simulación a lramos@arquimea.com...")

    const testAlert: EmailAlert = {
      to: "lramos@arquimea.com",
      subject: "🚨 ArquiAlert - Email de Simulación Enviado Exitosamente",
      tender: {
        title: "Sistema ArquiAlert - Simulación de Licitación de Defensa",
        expediente: "ARQUI-SIM-2025-001",
        organismo: "Plataforma ArquiAlert - Sistema de Alertas",
        fechaLimite: "15/10/2025",
        presupuesto: "€250,000",
        url: "https://contrataciondelestado.es/simulation",
        pais: "España",
      },
      filterName: "Simulación ArquiAlert - Defensa",
    }

    const success = await emailService.sendTenderAlert(testAlert)
    if (success) {
      setEmailStats((prev) => ({ ...prev, alertsSent: prev.alertsSent + 1 }))
      console.log("[v0] ✅ Email de simulación enviado exitosamente a lramos@arquimea.com")
    }
  }

  const handleSendDailyDigest = async () => {
    if (!isConfigured) return

    const success = await emailService.sendDailyDigest("lramos@arquimea.com", tenders)
    if (success) {
      setEmailStats((prev) => ({ ...prev, digestsSent: prev.digestsSent + 1 }))
    }
  }

  const handleSendFilterAlerts = async () => {
    console.log("[v0] Enviando alertas basadas en filtros personalizados...")

    for (const filter of customFilters) {
      const matchingTenders = tenders.filter((tender) => {
        const matchesSector =
          !filter.criteria.sector ||
          filter.criteria.sector === "all" ||
          tender.categoria?.toLowerCase().includes(filter.criteria.sector)

        const matchesCountry =
          !filter.criteria.pais || filter.criteria.pais === "all" || tender.pais?.toLowerCase() === filter.criteria.pais

        const matchesKeywords =
          !filter.criteria.palabrasClave ||
          filter.criteria.palabrasClave
            .split(",")
            .some(
              (keyword: string) =>
                tender.title?.toLowerCase().includes(keyword.trim().toLowerCase()) ||
                tender.descripcion?.toLowerCase().includes(keyword.trim().toLowerCase()),
            )

        const matchesAmount =
          !filter.criteria.montoMinimo ||
          (tender.presupuestoNumerico && tender.presupuestoNumerico >= Number.parseInt(filter.criteria.montoMinimo))

        return matchesSector && matchesCountry && matchesKeywords && matchesAmount
      })

      for (const tender of matchingTenders) {
        const alert: EmailAlert = {
          to: "lramos@arquimea.com",
          subject: `Nueva licitación: ${tender.title}`,
          tender: {
            title: tender.title,
            expediente: tender.expediente,
            organismo: tender.organismo,
            fechaLimite: tender.fechaLimite,
            presupuesto: tender.presupuesto,
            url: tender.url,
            pais: tender.pais,
          },
          filterName: filter.name,
        }

        const success = await emailService.sendTenderAlert(alert)
        if (success) {
          setEmailStats((prev) => ({ ...prev, alertsSent: prev.alertsSent + 1 }))
        }
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Mail className="h-5 w-5 mr-2" />
          Sistema de Envío de Emails - SIMULACIÓN MANUAL
          <Badge variant="secondary" className="ml-2 flex items-center">
            <Globe className="h-3 w-3 mr-1" />
            Solo Envío Manual
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-blue-600 mr-2" />
            <h4 className="font-semibold text-blue-800">Sistema de Email Real Configurado</h4>
          </div>
          <p className="text-sm text-blue-700 mt-1">
            Emails enviados a: <strong>lramos@arquimea.com</strong>
          </p>
          <p className="text-xs text-blue-600 mt-1">✅ Sistema configurado para envío real de emails</p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Acciones de Email</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={handleSendTestEmail}
              variant="outline"
              className="border-blue-300 hover:bg-blue-50 bg-transparent"
            >
              <Send className="h-4 w-4 mr-2" />📧 Enviar Email de Prueba
            </Button>

            <Button
              onClick={handleSendDailyDigest}
              variant="outline"
              className="border-blue-300 hover:bg-blue-50 bg-transparent"
            >
              <Mail className="h-4 w-4 mr-2" />📊 Resumen Diario
            </Button>

            <Button
              onClick={handleSendFilterAlerts}
              disabled={!customFilters.length}
              variant="outline"
              className="border-blue-300 hover:bg-blue-50 bg-transparent"
            >
              <AlertCircle className="h-4 w-4 mr-2" />🎯 Alertas de Filtros
            </Button>
          </div>
          <p className="text-xs text-blue-600 font-medium">
            ✅ Presiona los botones para enviar emails simulados cuando lo necesites
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Filtros con Alertas Activas (Simulación)</h3>
          <div className="space-y-2">
            {customFilters.map((filter) => (
              <Card key={filter.id} className="p-3 border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{filter.name}</p>
                    <p className="text-sm text-muted-foreground flex items-center">
                      <Mail className="h-3 w-3 mr-1 text-blue-600" />
                      <strong className="text-blue-700">lramos@arquimea.com</strong>
                      <span className="text-xs ml-1">(simulado desde {filter.email})</span>
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {sentAlerts.filter((alert) => alert.startsWith(`${filter.id}-`)).length} simuladas
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
