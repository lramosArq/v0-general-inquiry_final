"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Globe, Calendar, Satellite, Shield } from "lucide-react"
import { SingaporeGeBIZFetcher } from "@/lib/singapore-gebiz-fetcher"

interface Tender {
  id: string
  title: string
  organization: string
  publishDate: string
  deadline: string
  amount?: string
  category: string
  sector: "defensa" | "espacial"
  status: "active" | "closing-soon" | "new"
  sourceUrl: string
  country?: string
  source: "defensa-portal" | "licitaciones-publicas" | "cdti" | "inta" | "singapore-gebiz"
}

export function MultiSourceScraper() {
  const [tenders, setTenders] = useState<Tender[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchTendersFromAllSources = async () => {
    setIsLoading(true)

    try {
      const singaporeFetcher = new SingaporeGeBIZFetcher()
      const singaporeTenders = await singaporeFetcher.fetchDefenseTenders()

      const singaporeStandardTenders: Tender[] = singaporeTenders.map((tender) => ({
        ...tender,
        source: "singapore-gebiz" as const,
      }))

      const mockTenders: Tender[] = [
        {
          id: "1",
          title: "Desarrollo de componentes para satélites de observación terrestre",
          organization: "CDTI",
          publishDate: "2024-12-09",
          deadline: "2024-12-22",
          amount: "€5,200,000",
          category: "Satélites y Sistemas Espaciales",
          sector: "espacial",
          status: "new",
          sourceUrl: "https://cdti.es/licitaciones/...",
          source: "cdti",
          country: "España",
        },
        {
          id: "2",
          title: "Suministro de sistemas de comunicaciones tácticas",
          organization: "Ministerio de Defensa",
          publishDate: "2024-12-09",
          deadline: "2024-12-18",
          amount: "€2,450,000",
          category: "Tecnología Defensa",
          sector: "defensa",
          status: "new",
          sourceUrl: "https://contrataciondelestado.es/...",
          source: "licitaciones-publicas",
          country: "España",
        },
        {
          id: "3",
          title: "Servicios de integración para sistema de navegación por satélite",
          organization: "INTA",
          publishDate: "2024-12-09",
          deadline: "2024-12-28",
          amount: "€3,750,000",
          category: "Navegación y Posicionamiento",
          sector: "espacial",
          status: "new",
          sourceUrl: "https://inta.es/licitaciones/...",
          source: "inta",
          country: "España",
        },
        {
          id: "4",
          title: "Mantenimiento de vehículos blindados BMR-600",
          organization: "Ejército de Tierra",
          publishDate: "2024-12-08",
          deadline: "2024-12-20",
          amount: "€890,000",
          category: "Vehículos Militares",
          sector: "defensa",
          status: "closing-soon",
          sourceUrl: "https://contrataciondelestado.es/...",
          source: "defensa-portal",
          country: "España",
        },
        {
          id: "5",
          title: "Investigación y desarrollo de propulsión para microsatélites",
          organization: "Ministerio de Ciencia e Innovación",
          publishDate: "2024-12-09",
          deadline: "2024-12-30",
          amount: "€1,950,000",
          category: "Lanzadores y Propulsión",
          sector: "espacial",
          status: "new",
          sourceUrl: "https://contrataciondelestado.es/...",
          source: "licitaciones-publicas",
          country: "España",
        },
      ]

      const allTenders = [...mockTenders, ...singaporeStandardTenders]
      setTenders(allTenders)
      setLastUpdate(new Date())
    } catch (error) {
      console.error("[v0] Error fetching tenders from all sources:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTendersFromAllSources()

    const interval = setInterval(fetchTendersFromAllSources, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const getSourceBadge = (source: string) => {
    switch (source) {
      case "defensa-portal":
        return (
          <Badge variant="outline" className="text-xs">
            Portal Defensa
          </Badge>
        )
      case "licitaciones-publicas":
        return (
          <Badge variant="outline" className="text-xs">
            Licitaciones Públicas
          </Badge>
        )
      case "cdti":
        return (
          <Badge variant="outline" className="text-xs">
            CDTI
          </Badge>
        )
      case "inta":
        return (
          <Badge variant="outline" className="text-xs">
            INTA
          </Badge>
        )
      case "singapore-gebiz":
        return (
          <Badge variant="outline" className="text-xs bg-red-50 text-red-700">
            🇸🇬 GeBIZ
          </Badge>
        )
      default:
        return null
    }
  }

  const defenseCount = tenders.filter((t) => t.sector === "defensa").length
  const spaceCount = tenders.filter((t) => t.sector === "espacial").length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Globe className="h-5 w-5 mr-2" />
              Monitor Multi-Fuente de Licitaciones
            </CardTitle>
            <CardDescription>
              Datos agregados de España (Defensa, CDTI, INTA) y Singapur (GeBIZ - DSTA/MINDEF)
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchTendersFromAllSources} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center">
              <Shield className="h-4 w-4 mr-1 text-green-600" />
              <span className="font-medium">{defenseCount}</span> Defensa
            </div>
            <div className="flex items-center">
              <Satellite className="h-4 w-4 mr-1 text-blue-600" />
              <span className="font-medium">{spaceCount}</span> Espacial
            </div>
          </div>
          {lastUpdate && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 mr-1" />
              Última actualización: {lastUpdate.toLocaleString("es-ES")}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Obteniendo licitaciones de múltiples fuentes...</p>
            <p className="text-xs text-muted-foreground mt-2">Incluyendo datos de GeBIZ (Singapur)...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tenders.map((tender) => (
              <div key={tender.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-semibold">{tender.title}</h4>
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={
                        tender.status === "new"
                          ? "default"
                          : tender.status === "closing-soon"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {tender.status === "new"
                        ? "Nuevo"
                        : tender.status === "closing-soon"
                          ? "Cierra Pronto"
                          : "Activo"}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        tender.sector === "espacial" ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700"
                      }
                    >
                      {tender.sector === "espacial" ? "Espacial" : "Defensa"}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground mb-2">
                  <div>Organismo: {tender.organization}</div>
                  <div>Categoría: {tender.category}</div>
                  <div>Publicado: {new Date(tender.publishDate).toLocaleDateString("es-ES")}</div>
                  <div>Cierre: {new Date(tender.deadline).toLocaleDateString("es-ES")}</div>
                  {tender.country && <div>País: {tender.country}</div>}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {tender.amount && <Badge variant="outline">{tender.amount}</Badge>}
                    {getSourceBadge(tender.source)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
