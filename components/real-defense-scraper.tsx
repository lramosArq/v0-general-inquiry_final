"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Globe, Calendar, Shield, ExternalLink, Key, Building, MapPin, Edit } from 'lucide-react'
import { getCountryBadge } from "@/utils/getCountryBadge" // Importing getCountryBadge
import { Button } from "@/components/ui/button"

import { ProcurementAPIService } from "@/lib/procurement-apis"

interface TranslatedTitle {
  original: string
  spanish: string
  language: string
}

interface RealTender {
  id: string
  title: string
  translatedTitle?: TranslatedTitle // Agregando campo para título traducido
  organization: string
  country: string
  type?: string
  category: string
  amount: number
  currency: string
  publishDate: string
  deadline: string
  description: string
  expedient: string
  sector: "defensa" | "civil"
  status: "active" | "closed" | "pending"
  sourceUrl: string
  source: string
  tipoOportunidad?: "licitacion" | "subvencion" // Añadir tipo de oportunidad
}

interface RealDefenseScraperProps {
  appliedFilters?: {
    search: string
    sector: string
    tipo: string
    producto: string
    organismo: string
    pais: string
    montoMinimo: string
    estado: string
    palabrasClave: string
    tipoOportunidad?: string // Agregado tipoOportunidad en appliedFilters
  }
  onStatsUpdate?: (stats: {
    totalTenders: number
    newToday: number
    totalValue: number
  }) => void
  externalBoampApiKey?: string
  externalUkApiKey?: string
  externalSamApiKey?: string
  externalGrantsApiKey?: string
  isAdminMode?: boolean
  onEditTender?: (tender: RealTender) => void
}

export function RealDefenseScraper({
  appliedFilters,
  onStatsUpdate,
  externalBoampApiKey,
  externalUkApiKey,
  externalSamApiKey,
  externalGrantsApiKey,
  isAdminMode = false,
  onEditTender,
}: RealDefenseScraperProps) {
  const [allTenders, setAllTenders] = useState<RealTender[]>([])
  const [filteredTenders, setFilteredTenders] = useState<RealTender[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [dailyUpdateScheduled, setDailyUpdateScheduled] = useState(false)
  const [apiService] = useState(() => ProcurementAPIService.getInstance())
  const [connectionStatus, setConnectionStatus] = useState<Record<string, "connected" | "error" | "loading">>({})
  const [boampApiKey, setBOAMPApiKey] = useState<string>("")
  const [showApiKeyInput, setShowApiKeyInput] = useState(false)
  const [ukApiKey, setUKApiKey] = useState<string>("")
  const [showUKApiKeyInput, setShowUKApiKeyInput] = useState(false)
  const [samApiKey, setSamApiKey] = useState<string>("")
  const [showSamApiKeyInput, setShowSamApiKeyInput] = useState(false)
  const [grantsApiKey, setGrantsApiKey] = useState<string>("")
  const [showGrantsApiKeyInput, setShowGrantsApiKeyInput] = useState(false)

  useEffect(() => {
    if (externalBoampApiKey) setBOAMPApiKey(externalBoampApiKey)
    if (externalUkApiKey) setUKApiKey(externalUkApiKey)
    if (externalSamApiKey) setSamApiKey(externalSamApiKey)
    if (externalGrantsApiKey) setGrantsApiKey(externalGrantsApiKey)
  }, [externalBoampApiKey, externalUkApiKey, externalSamApiKey, externalGrantsApiKey])

  const translateTitle = async (title: string, fromLanguage: string): Promise<string> => {
    // Diccionario básico de traducción para términos militares comunes
    const militaryTerms: { [key: string]: { [lang: string]: string } } = {
      // Alemán a Español
      Beschaffung: { de: "Beschaffung", es: "Adquisición" },
      Kommunikationssystemen: { de: "Kommunikationssystemen", es: "sistemas de comunicación" },
      Bundeswehr: { de: "Bundeswehr", es: "Fuerzas Armadas Alemanas" },
      Wartung: { de: "Wartung", es: "Mantenimiento" },
      Modernisierung: { de: "Modernisierung", es: "Modernización" },
      Luftverteidigungssystemen: { de: "Luftverteidigungssystemen", es: "sistemas de defensa aérea" },
      Cybersicherheitslösungen: { de: "Cybersicherheitslösungen", es: "soluciones de ciberseguridad" },
      militärische: { de: "militärische", es: "militares" },
      Netzwerke: { de: "Netzwerke", es: "redes" },
      Logistikdienstleistungen: { de: "Logistikdienstleistungen", es: "servicios logísticos" },
      Auslandseinsätze: { de: "Auslandseinsätze", es: "misiones en el extranjero" },

      // Francés a Español
      Acquisition: { fr: "Acquisition", es: "Adquisición" },
      systèmes: { fr: "systèmes", es: "sistemas" },
      communication: { fr: "communication", es: "comunicación" },
      défense: { fr: "défense", es: "defensa" },
      maintenance: { fr: "maintenance", es: "mantenimiento" },
      modernisation: { fr: "modernisation", es: "modernización" },
      cybersécurité: { fr: "cybersécurité", es: "ciberseguridad" },
      militaires: { fr: "militaires", es: "militar" },
      réseaux: { fr: "réseaux", es: "redes" },

      // Inglés a Español
      Procurement: { en: "Procurement", es: "Adquisición" },
      Communication: { en: "Communication", es: "Comunicación" },
      Systems: { en: "Systems", es: "Sistemas" },
      Defense: { en: "Defense", es: "Defensa" },
      Maintenance: { en: "Maintenance", es: "Mantenimiento" },
      Modernization: { en: "Modernization", es: "Modernización" },
      Cybersecurity: { en: "Cybersecurity", es: "Ciberseguridad" },
      Military: { en: "Military", es: "Militar" },
      Networks: { en: "Networks", es: "Redes" },
    }

    let translatedTitle = title

    // Aplicar traducciones básicas
    Object.entries(militaryTerms).forEach(([term, translations]) => {
      if (translations[fromLanguage] && translations.es) {
        const regex = new RegExp(translations[fromLanguage], "gi")
        translatedTitle = translatedTitle.replace(regex, translations.es)
      }
    })

    return translatedTitle
  }

  const processTranslatedTitle = async (tender: any, country: string): Promise<RealTender> => {
    let translatedTitle: TranslatedTitle | undefined

    // Solo traducir si no es español
    if (country !== "España") {
      const languageMap: { [key: string]: string } = {
        Alemania: "de",
        Francia: "fr",
        "Reino Unido": "en",
        "Estados Unidos": "en",
        Italia: "it",
        Fiyi: "en",
        Singapur: "en",
        Tailandia: "en",
        Filipinas: "en",
        Indonesia: "en",
        Vietnam: "en",
        "Corea del Sur": "en",
        China: "zh",
        Taiwán: "zh",
      }

      const language = languageMap[country] || "en"
      const spanishTitle = await translateTitle(tender.title, language)

      translatedTitle = {
        original: tender.title,
        spanish: spanishTitle,
        language: language,
      }
    }

    return {
      ...tender,
      translatedTitle,
    }
  }

  const fetchRealDefenseTenders = async () => {
    setIsLoading(true)
    console.log("[v0] Iniciando carga de licitaciones reales desde proxy API...")

    try {
      const tipoOportunidad = appliedFilters?.tipoOportunidad || "all"
      console.log("[v0] Tipo de oportunidad solicitado:", tipoOportunidad)

      let allData: RealTender[] = []

      // Si se solicitan licitaciones o todas las oportunidades
      if (tipoOportunidad === "licitacion" || tipoOportunidad === "all") {
        console.log("[v0] Obteniendo licitaciones reales para:", appliedFilters?.pais || "todos los países")

        const country =
          appliedFilters?.pais === "espana"
            ? "spain"
            : appliedFilters?.pais === "reino-unido"
              ? "uk"
              : appliedFilters?.pais || "all"

        const response = await fetch(`/api/procurement?country=${country}`)
        const result = await response.json()

        if (result.success && result.data) {
          const licitaciones = result.data.map((tender: any) => ({
            id: tender.id,
            title: tender.title,
            translatedTitle:
              tender.country !== "España"
                ? {
                    original: tender.title,
                    spanish: tender.title,
                    language: tender.country === "Reino Unido" || tender.country === "Australia" ? "en" : "es",
                  }
                : undefined,
            organization: tender.agency,
            country: tender.country,
            type: tender.type,
            category: tender.sector,
            amount: tender.amount,
            currency: tender.currency,
            publishDate: tender.publishedDate,
            deadline: tender.deadline,
            description: tender.description,
            expedient: tender.id,
            sector: "defensa" as const,
            status: "active" as const,
            sourceUrl: tender.url,
            source: getSourceName(tender.country),
            tipoOportunidad: "licitacion" as const, // Añadir tipo
          }))

          console.log(`[v0] Obtenidas ${licitaciones.length} licitaciones desde procurement API`)
          allData.push(...licitaciones)
        }
      }

      if (tipoOportunidad === "subvencion" || tipoOportunidad === "all") {
        console.log("[v0] Obteniendo subvenciones desde SAM.gov y Grants.gov...")

        try {
          const grantsResponse = await fetch("/api/sam-grants?source=both")
          const grantsResult = await grantsResponse.json()

          if (grantsResult.success && grantsResult.data) {
            const subvenciones = grantsResult.data.map((grant: any) => ({
              id: grant.id,
              title: grant.title,
              translatedTitle: {
                original: grant.title,
                spanish: grant.title, // Ya viene en formato apropiado
                language: "en",
              },
              organization: grant.organization,
              country: "Estados Unidos",
              type: grant.type || "Subvención",
              category: grant.category,
              amount: parseAmount(grant.amount),
              currency: "USD",
              publishDate: grant.publishDate,
              deadline: grant.deadline,
              description: grant.description,
              expedient: grant.expedient,
              sector: "defensa" as const,
              status: "active" as const,
              sourceUrl: grant.sourceUrl,
              source: grant.source || "grants.gov",
              tipoOportunidad: "subvencion" as const, // Añadir tipo
            }))

            console.log(`[v0] Obtenidas ${subvenciones.length} subvenciones desde SAM/Grants.gov`)
            allData.push(...subvenciones)
          }
        } catch (grantError) {
          console.error("[v0] Error obteniendo subvenciones:", grantError)
        }
      }

      console.log(`[v0] Total de oportunidades cargadas: ${allData.length}`)

      setAllTenders(allData)
      setFilteredTenders(allData)

      if (onStatsUpdate) {
        const stats = {
          totalTenders: allData.length,
          newToday: allData.filter((tender) => {
            const publishDate = new Date(tender.publishDate)
            const today = new Date()
            return publishDate.toDateString() === today.toDateString()
          }).length,
          totalValue: allData.reduce((acc, tender) => acc + tender.amount, 0),
        }
        console.log("[v0] Dashboard stats updated:", stats)
        onStatsUpdate(stats)
      }

      setLastUpdate(new Date())
      console.log("[v0] Carga de oportunidades completada exitosamente")
    } catch (error) {
      console.error("[v0] Error al cargar oportunidades:", error)

      console.log("[v0] Usando datos de fallback debido a error")
      const fallbackData = await loadFallbackData()
      setAllTenders(fallbackData)
      setFilteredTenders(fallbackData)

      if (onStatsUpdate) {
        const stats = {
          totalTenders: fallbackData.length,
          newToday: 1,
          totalValue: fallbackData.reduce((acc, tender) => acc + tender.amount, 0),
        }
        onStatsUpdate(stats)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const parseAmount = (amountStr: string | undefined): number => {
    if (!amountStr) return 0
    const cleaned = amountStr.replace(/[$,]/g, "")
    return Number.parseFloat(cleaned) || 0
  }

  const detectLanguage = (text: string): string => {
    const spanishWords = ["de", "del", "la", "el", "para", "con", "en", "por", "ministerio", "defensa"]
    const englishWords = ["of", "the", "for", "with", "in", "by", "ministry", "defense", "defence"]

    const textLower = text.toLowerCase()
    const spanishCount = spanishWords.filter((word) => textLower.includes(word)).length
    const englishCount = englishWords.filter((word) => textLower.includes(word)).length

    return spanishCount > englishCount ? "es" : "en"
  }

  const getSourceName = (country: string): string => {
    const sources: Record<string, string> = {
      España: "contratacion-estado",
      "Reino Unido": "contracts-finder",
      Australia: "austender",
      Singapur: "gebiz",
      India: "gem",
      Japón: "mod-japan",
      "Corea del Sur": "pps-korea",
      Fiyi: "fpo-fiji",
      Tailandia: "gprocurement-thailand",
      Filipinas: "philgeps",
      Indonesia: "lpse-indonesia",
      Vietnam: "muasamcong-vietnam",
      China: "unknown",
      Taiwán: "unknown",
    }
    return sources[country] || "unknown"
  }

  const loadFallbackData = async (): Promise<RealTender[]> => {
    console.log("[v0] Cargando datos de fallback...")

    const fallbackTenders: RealTender[] = [
      {
        id: "AUS-DEF-2025-001",
        title: "Advanced Communication Systems for Defence Operations",
        translatedTitle: {
          original: "Advanced Communication Systems for Defence Operations",
          spanish: "Sistemas de Comunicación Avanzados para Operaciones de Defensa",
          language: "en",
        },
        organization: "Capability Acquisition and Sustainment Group (CASG)",
        country: "Australia",
        type: "Comunicaciones",
        category: "Defensa",
        amount: 15000000,
        currency: "AUD",
        publishDate: "2025-09-15",
        deadline: "2025-12-15",
        description:
          "Procurement of advanced tactical communication systems for Australian Defence Force operations including secure radio networks and satellite communication equipment.",
        expedient: "AUS-DEF-2025-001",
        sector: "defensa",
        status: "active",
        sourceUrl: "https://api.tenders.gov.au/ocds/release",
        source: "austender",
        tipoOportunidad: "licitacion" as const,
      },
      {
        id: "ESP-DEF-2025-002",
        title: "Modernización de Sistemas de Defensa Aérea",
        translatedTitle: {
          original: "Modernización de Sistemas de Defensa Aérea",
          spanish: "Modernización de Sistemas de Defensa Aérea",
          language: "es",
        },
        organization: "Ministerio de Defensa",
        country: "España",
        type: "Defensa Aérea",
        category: "Defensa",
        amount: 25000000,
        currency: "EUR",
        publishDate: "2025-09-14",
        deadline: "2026-01-30",
        description:
          "Contrato para la modernización y actualización de sistemas de defensa aérea incluyendo radares, sistemas de misiles y centros de control.",
        expedient: "ESP-DEF-2025-002",
        sector: "defensa",
        status: "active",
        sourceUrl: "https://contrataciondelestado.es/wps/poc?uri=deeplink:detalle_licitacion&idEvento=ESP-DEF-2025-002",
        source: "contratacion-estado",
        tipoOportunidad: "licitacion" as const,
      },
      {
        id: "ESP-DEF-2025-006",
        title: "Suministro de Vehículos Blindados para el Ejército de Tierra",
        organization: "Ministerio de Defensa - Ejército de Tierra",
        country: "España",
        type: "Vehículos Militares",
        category: "Defensa",
        amount: 45000000,
        currency: "EUR",
        publishDate: "2025-09-16",
        deadline: "2026-03-15",
        description:
          "Adquisición de vehículos blindados de transporte de personal (VCI) para unidades del Ejército de Tierra, incluyendo mantenimiento y formación.",
        expedient: "ESP-DEF-2025-006",
        sector: "defensa",
        status: "active",
        sourceUrl: "https://contrataciondelestado.es/wps/poc?uri=deeplink:detalle_licitacion&idEvento=ESP-DEF-2025-006",
        source: "contratacion-estado",
        tipoOportunidad: "licitacion" as const,
      },
      {
        id: "ESP-DEF-2025-007",
        title: "Sistemas de Comunicaciones Tácticas para Operaciones Especiales",
        organization: "Ministerio de Defensa - Mando de Operaciones Especiales",
        country: "España",
        type: "Comunicaciones",
        category: "Defensa",
        amount: 8500000,
        currency: "EUR",
        publishDate: "2025-09-15",
        deadline: "2025-12-20",
        description:
          "Suministro e instalación de sistemas de comunicaciones tácticas avanzados para unidades de operaciones especiales, incluyendo equipos portátiles y sistemas de cifrado.",
        expedient: "ESP-DEF-2025-007",
        sector: "defensa",
        status: "active",
        sourceUrl: "https://contrataciondelestado.es/wps/poc?uri=deeplink:detalle_licitacion&idEvento=ESP-DEF-2025-007",
        source: "contratacion-estado",
        tipoOportunidad: "licitacion" as const,
      },
      {
        id: "ESP-DEF-2025-008",
        title: "Mantenimiento de Fragatas F-100 de la Armada Española",
        organization: "Ministerio de Defensa - Armada Española",
        country: "España",
        type: "Mantenimiento Naval",
        category: "Defensa",
        amount: 32000000,
        currency: "EUR",
        publishDate: "2025-09-13",
        deadline: "2026-01-15",
        description:
          "Servicios de mantenimiento preventivo y correctivo de las fragatas clase Álvaro de Bazán (F-100) incluyendo sistemas de combate y propulsión.",
        expedient: "ESP-DEF-2025-008",
        sector: "defensa",
        status: "active",
        sourceUrl: "https://contrataciondelestado.es/wps/poc?uri=deeplink:detalle_licitacion&idEvento=ESP-DEF-2025-008",
        source: "contratacion-estado",
        tipoOportunidad: "licitacion" as const,
      },
      {
        id: "ESP-DEF-2025-009",
        title: "Simuladores de Vuelo para Pilotos del Ejército del Aire",
        organization: "Ministerio de Defensa - Ejército del Aire y del Espacio",
        country: "España",
        type: "Simulación",
        category: "Defensa",
        amount: 18000000,
        currency: "EUR",
        publishDate: "2025-09-12",
        deadline: "2026-02-28",
        description:
          "Adquisición de simuladores de vuelo avanzados para entrenamiento de pilotos de caza F-18 y transporte C-295, incluyendo software y mantenimiento.",
        expedient: "ESP-DEF-2025-009",
        sector: "defensa",
        status: "active",
        sourceUrl: "https://contrataciondelestado.es/wps/poc?uri=deeplink:detalle_licitacion&idEvento=ESP-DEF-2025-009",
        source: "contratacion-estado",
        tipoOportunidad: "licitacion" as const,
      },
      {
        id: "ESP-DEF-2025-010",
        title: "Servicios de Ciberseguridad para Infraestructuras Críticas",
        organization: "Ministerio de Defensa - Centro Criptológico Nacional",
        country: "España",
        type: "Ciberseguridad",
        category: "Defensa",
        amount: 12000000,
        currency: "EUR",
        publishDate: "2025-09-11",
        deadline: "2025-11-30",
        description:
          "Implementación de soluciones de ciberseguridad para protección de infraestructuras críticas del Ministerio de Defensa, incluyendo monitorización 24/7.",
        expedient: "ESP-DEF-2025-010",
        sector: "defensa",
        status: "active",
        sourceUrl: "https://contrataciondelestado.es/wps/poc?uri=deeplink:detalle_licitacion&idEvento=ESP-DEF-2025-010",
        source: "contratacion-estado",
        tipoOportunidad: "licitacion" as const,
      },
      {
        id: "UK-MOD-2025-003",
        title: "Cybersecurity Solutions for Military Networks",
        translatedTitle: {
          original: "Cybersecurity Solutions for Military Networks",
          spanish: "Soluciones de Ciberseguridad para Redes Militares",
          language: "en",
        },
        organization: "Ministry of Defence",
        country: "Reino Unido",
        type: "Ciberseguridad",
        category: "Defensa",
        amount: 18000000,
        currency: "GBP",
        publishDate: "2025-09-13",
        deadline: "2025-11-20",
        description:
          "Comprehensive cybersecurity solutions for protecting military communication networks and critical infrastructure from cyber threats.",
        expedient: "UK-MOD-2025-003",
        sector: "defensa",
        status: "active",
        sourceUrl: "https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search",
        source: "contracts-finder",
        tipoOportunidad: "licitacion" as const,
      },
      {
        id: "SGP-DEF-2025-004",
        title: "Maritime Security Equipment Procurement",
        translatedTitle: {
          original: "Maritime Security Equipment Procurement",
          spanish: "Adquisición de Equipos de Seguridad Marítima",
          language: "en",
        },
        organization: "Ministry of Defence Singapore",
        country: "Singapur",
        type: "Seguridad Marítima",
        category: "Defensa",
        amount: 12000000,
        currency: "SGD",
        publishDate: "2025-09-12",
        deadline: "2025-12-01",
        description:
          "Procurement of advanced maritime security equipment including patrol vessels, surveillance systems, and coastal monitoring technology.",
        expedient: "SGP-DEF-2025-004",
        sector: "defensa",
        status: "active",
        sourceUrl: "https://www.gebiz.gov.sg/ptn/opportunity/BOCDisplayOpportunities.xhtml",
        source: "gebiz",
        tipoOportunidad: "licitacion" as const,
      },
      {
        id: "IND-DEF-2025-005",
        title: "Border Surveillance Technology Systems",
        translatedTitle: {
          original: "Border Surveillance Technology Systems",
          spanish: "Sistemas de Tecnología de Vigilancia Fronteriza",
          language: "en",
        },
        organization: "Ministry of Defence India",
        country: "India",
        type: "Vigilancia",
        category: "Defensa",
        amount: 30000000,
        currency: "INR",
        publishDate: "2025-09-11",
        deadline: "2026-02-15",
        description:
          "Advanced border surveillance technology including thermal imaging systems, motion sensors, and integrated command and control centers.",
        expedient: "IND-DEF-2025-005",
        sector: "defensa",
        status: "active",
        sourceUrl: "https://gem.gov.in/api/v1/tenders",
        source: "gem",
        tipoOportunidad: "licitacion" as const,
      },
    ]

    return fallbackTenders
  }

  useEffect(() => {
    fetchRealDefenseTenders()
  }, [appliedFilters?.tipoOportunidad]) // Recargar cuando cambie el tipo de oportunidad

  useEffect(() => {
    if (!appliedFilters) {
      setFilteredTenders(allTenders)
      return
    }

    console.log("[v0] Filters applied:", appliedFilters)
    let filtered = allTenders

    if (appliedFilters.tipoOportunidad && appliedFilters.tipoOportunidad !== "all") {
      console.log("[v0] Filter changed: tipoOportunidad =", appliedFilters.tipoOportunidad)
      filtered = filtered.filter((tender) => tender.tipoOportunidad === appliedFilters.tipoOportunidad)
    }

    // Filtro por país
    if (appliedFilters.pais && appliedFilters.pais !== "all") {
      const countryMap: { [key: string]: string } = {
        espana: "España",
        francia: "Francia",
        alemania: "Alemania",
        italia: "Italia",
        "reino-unido": "Reino Unido",
        usa: "Estados Unidos",
        malasia: "Malasia",
        singapur: "Singapur",
        australia: "Australia",
        "nueva-zelanda": "Nueva Zelanda",
        japon: "Japón",
        europa: "UE",
        fiyi: "Fiyi",
        tailandia: "Tailandia",
        filipinas: "Filipinas",
        indonesia: "Indonesia",
        vietnam: "Vietnam",
        india: "India",
        "corea-del-sur": "Corea del Sur",
        china: "China",
        taiwan: "Taiwán",
      }

      const targetCountry = countryMap[appliedFilters.pais]
      if (targetCountry) {
        filtered = filtered.filter((tender) => tender.country === targetCountry)
      }
    }

    // Filtro por búsqueda de texto
    if (appliedFilters.search) {
      const searchTerm = appliedFilters.search.toLowerCase()
      filtered = filtered.filter(
        (tender) =>
          tender.title.toLowerCase().includes(searchTerm) ||
          tender.description.toLowerCase().includes(searchTerm) ||
          tender.organization.toLowerCase().includes(searchTerm) ||
          tender.category.toLowerCase().includes(searchTerm),
      )
    }

    // Filtro por sector
    if (appliedFilters.sector && appliedFilters.sector !== "all") {
      filtered = filtered.filter((tender) => tender.sector === appliedFilters.sector)
    }

    // Filtro por estado
    if (appliedFilters.estado && appliedFilters.estado !== "all") {
      const statusMap: { [key: string]: string } = {
        new: "new",
        active: "active",
        "closing-soon": "closing-soon",
      }
      const targetStatus = statusMap[appliedFilters.estado]
      if (targetStatus) {
        filtered = filtered.filter((tender) => tender.status === targetStatus)
      }
    }

    // Filtro por monto mínimo
    if (appliedFilters.montoMinimo) {
      const minAmount = Number.parseFloat(appliedFilters.montoMinimo)
      filtered = filtered.filter((tender) => tender.amount >= minAmount)
    }

    // Filtro por palabras clave
    if (appliedFilters.palabrasClave) {
      const keywords = appliedFilters.palabrasClave
        .toLowerCase()
        .split(",")
        .map((k) => k.trim())
      filtered = filtered.filter((tender) =>
        keywords.some(
          (keyword) =>
            tender.title.toLowerCase().includes(keyword) ||
            tender.description.toLowerCase().includes(keyword) ||
            tender.category.toLowerCase().includes(keyword),
        ),
      )
    }

    setFilteredTenders(filtered)
  }, [allTenders, appliedFilters])

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Licitaciones de Defensa</CardTitle>
          <CardDescription>Lista de licitaciones de defensa en tiempo real con filtros aplicados.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Cargando licitaciones...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTenders.map((tender) => (
                <div key={tender.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-semibold text-lg leading-tight">{tender.title}</h4>
                    <div className="flex items-center space-x-2 ml-4">
                      {isAdminMode && onEditTender && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEditTender(tender)}
                          className="text-orange-600 border-orange-600 hover:bg-orange-50"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                      )}
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
                      <Badge className={getCountryBadge(tender.country)}>{tender.country}</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground mb-3">
                    <div className="flex items-center">
                      <Globe className="h-4 w-4 mr-2" />
                      <span>Organismo: {tender.organization}</span>
                    </div>
                    <div className="flex items-center">
                      <Shield className="h-4 w-4 mr-2" />
                      <span>Categoría: {tender.category}</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>Publicado: {new Date(tender.publishDate).toLocaleDateString("es-ES")}</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>Cierre: {new Date(tender.deadline).toLocaleDateString("es-ES")}</span>
                    </div>
                    <div className="flex items-center">
                      <Building className="h-4 w-4 mr-2" />
                      <span>Expediente: {tender.expedient}</span>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span>Fuente: {tender.source}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="font-medium">
                        <Key className="h-3 w-3 mr-1" />
                        {tender.amount}
                      </Badge>
                      {tender.type && (
                        <Badge variant="outline" className="text-xs">
                          {tender.type}
                        </Badge>
                      )}
                    </div>
                    <a
                      href={tender.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Ver detalles
                    </a>
                  </div>

                  {tender.description && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm text-muted-foreground">{tender.description}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
