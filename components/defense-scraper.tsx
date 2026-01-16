"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Globe, Calendar } from "lucide-react"

interface DefenseTender {
  id: string
  title: string
  organization: string
  publishDate: string
  deadline: string
  amount?: string
  category: string
  status: "active" | "closing-soon" | "new"
  sourceUrl: string
}

export function DefenseScraper() {
  const [tenders, setTenders] = useState<DefenseTender[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  // Simulate fetching data from Spanish defense tender website
  const fetchDefenseTenders = async () => {
    setIsLoading(true)

    // In a real implementation, this would scrape or call an API
    // that monitors "Licitaciones públicas de Defensa en ESPAÑA · Concursos Públicos"
    setTimeout(() => {
      const mockTenders: DefenseTender[] = [
        {
          id: "1",
          title: "Adquisición de sistemas de navegación GPS militares",
          organization: "Ministerio de Defensa",
          publishDate: "2024-12-09",
          deadline: "2024-12-23",
          amount: "€3,200,000",
          category: "Tecnología Defensa",
          status: "new",
          sourceUrl: "https://contrataciondelestado.es/...",
        },
        {
          id: "2",
          title: "Suministro de uniformes y equipamiento personal",
          organization: "Ejército de Tierra",
          publishDate: "2024-12-09",
          deadline: "2024-12-15",
          amount: "€1,850,000",
          category: "Logística",
          status: "closing-soon",
          sourceUrl: "https://contrataciondelestado.es/...",
        },
      ]

      setTenders(mockTenders)
      setLastUpdate(new Date())
      setIsLoading(false)
    }, 2000)
  }

  useEffect(() => {
    fetchDefenseTenders()

    // Set up automatic refresh every 30 minutes
    const interval = setInterval(fetchDefenseTenders, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Globe className="h-5 w-5 mr-2" />
              Monitor de Licitaciones de Defensa
            </CardTitle>
            <CardDescription>Datos en tiempo real del portal oficial de Concursos Públicos de Defensa</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchDefenseTenders} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>
        {lastUpdate && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 mr-1" />
            Última actualización: {lastUpdate.toLocaleString("es-ES")}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Obteniendo licitaciones del portal oficial...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tenders.map((tender) => (
              <div key={tender.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-semibold">{tender.title}</h4>
                  <Badge
                    variant={
                      tender.status === "new"
                        ? "default"
                        : tender.status === "closing-soon"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {tender.status === "new" ? "Nuevo" : tender.status === "closing-soon" ? "Cierra Pronto" : "Activo"}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div>Organismo: {tender.organization}</div>
                  <div>Categoría: {tender.category}</div>
                  <div>Publicado: {new Date(tender.publishDate).toLocaleDateString("es-ES")}</div>
                  <div>Cierre: {new Date(tender.deadline).toLocaleDateString("es-ES")}</div>
                </div>
                {tender.amount && (
                  <div className="mt-2">
                    <Badge variant="outline">{tender.amount}</Badge>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
