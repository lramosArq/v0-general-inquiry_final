"use client"
import { useState, useEffect } from "react"
import type React from "react"

// Inline SVG components
const Shield = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
    />
  </svg>
)

const Users = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
    />
  </svg>
)

const CheckCircle = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
)

const XCircle = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
)

const Clock = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
)

const Mail = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
)

const Building = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
    />
  </svg>
)

const User = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  </svg>
)

const Plus = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 6v6m0 0v6m0-6h6m-6 0H7m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
)

const Edit = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
    />
  </svg>
)

const Trash2 = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
)

const FileText = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
)

const Settings = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c-.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const Database = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
    />
  </svg>
)

const Upload = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 11l3 3m0 0l3-3m-3 3V8"
    />
  </svg>
)

const Download = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 11l3 3m0 0l3-3m-3 3V4"
    />
  </svg>
)

const Save = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
    />
  </svg>
)

const AlertTriangle = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
    />
  </svg>
)

const RefreshCw = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
)

const ExternalLink = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6l-6 6"
    />
  </svg>
)

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useRouter } from "next/navigation"

interface PendingUser {
  id: string
  nombre: string
  apellidos: string
  email: string
  unidadNegocio: string
  cargo: string
  justificacion: string
  fechaSolicitud: string
  estado: "pendiente" | "aprobado" | "rechazado"
}

interface ManualTender {
  id: string
  title: string
  description: string
  amount: number
  currency: string
  deadline: string
  country: string
  agency: string
  status: string
  url: string
  publishedDate: string
  sector: string
  type: string
  source: "manual" | "automatic"
  createdBy: string
  createdAt: string
  lastModified: string
}

// Adding interface for all dashboard tenders
interface RealTender {
  id: string
  title: string
  translatedTitle?: {
    original: string
    spanish: string
    language: string
  }
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
  sector: "defensa" | "civil" | "espacio"
  status: "active" | "closed" | "pending"
  sourceUrl: string
  source: string
}

export default function AdminPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [adminCredentials, setAdminCredentials] = useState({ username: "", password: "" })
  const [isLoading, setIsLoading] = useState(false)
  const [currentTab, setCurrentTab] = useState("users")

  const [manualTenders, setManualTenders] = useState<ManualTender[]>([])
  const [isAddTenderDialogOpen, setIsAddTenderDialogOpen] = useState(false)
  const [editingTender, setEditingTender] = useState<ManualTender | null>(null)
  const [isLoadingTenders, setIsLoadingTenders] = useState(false)
  const [newTender, setNewTender] = useState({
    title: "",
    description: "",
    amount: "",
    currency: "EUR",
    deadline: "",
    country: "",
    agency: "",
    url: "",
    sector: "defensa",
    type: "",
  })

  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([
    {
      id: "1",
      nombre: "María",
      apellidos: "González Ruiz",
      email: "maria.gonzalez@arquimea.com",
      unidadNegocio: "defensa",
      cargo: "Ingeniera de Sistemas",
      justificacion:
        "Necesito acceso para monitorear licitaciones relacionadas con sistemas de comunicación táctica para proyectos en desarrollo.",
      fechaSolicitud: "2025-01-09",
      estado: "pendiente",
    },
    {
      id: "2",
      nombre: "Carlos",
      apellidos: "Martín López",
      email: "carlos.martin@arquimea.com",
      unidadNegocio: "aeroespacial",
      cargo: "Director de Proyectos",
      justificacion:
        "Como director de proyectos aeroespaciales, requiero acceso para identificar oportunidades de negocio en el sector defensa.",
      fechaSolicitud: "2025-01-08",
      estado: "pendiente",
    },
    {
      id: "3",
      nombre: "Ana",
      apellidos: "Rodríguez Sánchez",
      email: "ana.rodriguez@arquimea.com",
      unidadNegocio: "comercial",
      cargo: "Responsable de Desarrollo de Negocio",
      justificacion:
        "Necesito monitorear licitaciones para identificar nuevas oportunidades comerciales y preparar propuestas competitivas.",
      fechaSolicitud: "2025-01-07",
      estado: "pendiente",
    },
  ])

  const [stats, setStats] = useState({
    pendientes: 0,
    aprobados: 0,
    rechazados: 0,
    total: 0,
  })

  const [allDashboardTenders, setAllDashboardTenders] = useState<RealTender[]>([])
  const [isLoadingDashboardTenders, setIsLoadingDashboardTenders] = useState(false)
  const [editingDashboardTender, setEditingDashboardTender] = useState<RealTender | null>(null)
  const [isEditDashboardTenderDialogOpen, setIsEditDashboardTenderDialogOpen] = useState(false) // Declare the variable
  const [dashboardTenderForm, setDashboardTenderForm] = useState({
    title: "",
    description: "",
    amount: "",
    currency: "EUR",
    deadline: "",
    country: "",
    organization: "",
    type: "",
    category: "",
    sector: "defensa" as "defensa" | "civil" | "espacio",
    status: "active" as "active" | "closed" | "pending",
    sourceUrl: "",
  })

  useEffect(() => {
    const adminAuth = localStorage.getItem("adminAuth")
    if (adminAuth === "authenticated") {
      setIsAuthenticated(true)
      loadManualTenders()
      loadAllDashboardTenders()
    }
  }, [])

  const loadManualTenders = async () => {
    setIsLoadingTenders(true)
    try {
      const response = await fetch("/api/admin/tenders")
      if (response.ok) {
        const result = await response.json()
        setManualTenders(result.data || [])
        console.log("[v0] Loaded manual tenders:", result.data?.length || 0)
      }
    } catch (error) {
      console.error("[v0] Error loading manual tenders:", error)
    } finally {
      setIsLoadingTenders(false)
    }
  }

  const loadAllDashboardTenders = async () => {
    setIsLoadingDashboardTenders(true)
    try {
      const response = await fetch("/api/procurement?country=all")
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          const dashboardTenders = result.data.map((tender: any) => ({
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
            sector: "defensa" as const, // Defaulting to 'defensa' for now, might need adjustment if 'sector' can be other types
            status: "active" as const, // Defaulting to 'active' for now
            sourceUrl: tender.url,
            source: getSourceName(tender.country),
          }))
          setAllDashboardTenders(dashboardTenders)
          console.log("[v0] Loaded dashboard tenders for admin:", dashboardTenders.length)
        }
      }
    } catch (error) {
      console.error("[v0] Error loading dashboard tenders:", error)
    } finally {
      setIsLoadingDashboardTenders(false)
    }
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

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    setTimeout(() => {
      if (adminCredentials.username === "admin" && adminCredentials.password === "Admin2025") {
        localStorage.setItem("adminAuth", "authenticated")
        setIsAuthenticated(true)
        loadManualTenders()
        console.log("[v0] Admin authenticated successfully")
      } else {
        alert("Credenciales incorrectas")
      }
      setIsLoading(false)
    }, 1000)
  }

  const handleCreateManualTender = async () => {
    console.log("[v0] Creating manual tender with data:", newTender)

    if (!newTender.title?.trim()) {
      console.log("[v0] Validation failed: title is empty")
      alert("Por favor, ingrese un título para la licitación")
      return
    }

    if (!newTender.description?.trim()) {
      console.log("[v0] Validation failed: description is empty")
      alert("Por favor, ingrese una descripción para la licitación")
      return
    }

    if (!newTender.amount?.trim() || isNaN(Number(newTender.amount))) {
      console.log("[v0] Validation failed: amount is invalid", newTender.amount)
      alert("Por favor, ingrese un monto válido para la licitación")
      return
    }

    if (!newTender.deadline?.trim()) {
      console.log("[v0] Validation failed: deadline is empty")
      alert("Por favor, ingrese una fecha límite para la licitación")
      return
    }

    setIsLoading(true)
    try {
      console.log("[v0] Sending POST request to create tender")

      const tenderData = {
        title: newTender.title,
        description: newTender.description,
        amount: Number(newTender.amount),
        currency: newTender.currency,
        deadline: newTender.deadline,
        country: newTender.country || "",
        agency: newTender.agency || "",
        url: newTender.url || "",
        sector: newTender.sector || "defensa",
        type: newTender.type || "",
      }

      console.log("[v0] Tender data to send:", tenderData)

      const response = await fetch("/api/admin/tenders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tenderData),
      })

      console.log("[v0] Response status:", response.status)

      if (response.ok) {
        const result = await response.json()
        console.log("[v0] Tender created successfully:", result)

        setManualTenders([...manualTenders, result.data])
        setNewTender({
          title: "",
          description: "",
          amount: "",
          currency: "EUR",
          deadline: "",
          country: "",
          agency: "",
          url: "",
          sector: "defensa",
          type: "",
        })
        setIsAddTenderDialogOpen(false)
        console.log("[v0] Manual tender created successfully:", result.data.id)
        alert("Licitación creada exitosamente")
      } else {
        let errorMessage = `${response.status} - Internal server error`
        try {
          const errorData = await response.json()
          if (errorData.error) {
            errorMessage = `${response.status} - ${errorData.error}`
          }
          console.error("[v0] Error response data:", errorData)
        } catch (parseError) {
          console.error("[v0] Could not parse error response as JSON, trying text")
          try {
            const errorText = await response.text()
            errorMessage = `${response.status} - ${errorText}`
            console.error("[v0] Error response text:", errorText)
          } catch (textError) {
            console.error("[v0] Could not parse error response as text either:", textError)
          }
        }
        console.error("[v0] Error response:", response.status, errorMessage)
        alert(`Error al crear la licitación: ${errorMessage}`)
      }
    } catch (error) {
      console.error("[v0] Network error creating manual tender:", error)
      alert(`Error de conexión al crear la licitación: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteManualTender = async (tenderId: string) => {
    if (!confirm("¿Está seguro de que desea eliminar esta licitación?")) {
      return
    }

    try {
      const response = await fetch(`/api/admin/tenders?id=${tenderId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setManualTenders(manualTenders.filter((t) => t.id !== tenderId))
        console.log("[v0] Manual tender deleted:", tenderId)
      } else {
        alert("Error al eliminar la licitación")
      }
    } catch (error) {
      console.error("[v0] Error deleting manual tender:", error)
      alert("Error al eliminar la licitación")
    }
  }

  const handleEditTender = (tender: ManualTender) => {
    setEditingTender(tender)
    setNewTender({
      title: tender.title,
      description: tender.description,
      amount: tender.amount.toString(),
      currency: tender.currency,
      deadline: tender.deadline,
      country: tender.country,
      agency: tender.agency,
      url: tender.url,
      sector: tender.sector,
      type: tender.type,
    })
    setIsAddTenderDialogOpen(true)
  }

  const handleUpdateTender = async () => {
    if (!editingTender || !newTender.title || !newTender.description || !newTender.amount) {
      alert("Por favor, complete los campos obligatorios")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/admin/tenders", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingTender.id,
          ...newTender,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setManualTenders(manualTenders.map((t) => (t.id === editingTender.id ? result.data : t)))
        setEditingTender(null)
        setNewTender({
          title: "",
          description: "",
          amount: "",
          currency: "EUR",
          deadline: "",
          country: "",
          agency: "",
          url: "",
          sector: "defensa",
          type: "",
        })
        setIsAddTenderDialogOpen(false)
        console.log("[v0] Manual tender updated:", result.data.id)
      } else {
        alert("Error al actualizar la licitación")
      }
    } catch (error) {
      console.error("[v0] Error updating manual tender:", error)
      alert("Error al actualizar la licitación")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefreshData = async () => {
    setIsLoadingTenders(true)
    try {
      // Force refresh of automatic data
      const response = await fetch("/api/procurement?refresh=true")
      if (response.ok) {
        console.log("[v0] Automatic data refreshed")
      }

      // Reload manual tenders
      await loadManualTenders()
    } catch (error) {
      console.error("[v0] Error refreshing data:", error)
    } finally {
      setIsLoadingTenders(false)
    }
  }

  const handleEditDashboardTender = (tender: RealTender) => {
    setEditingDashboardTender(tender)
    setDashboardTenderForm({
      title: tender.title,
      description: tender.description,
      amount: tender.amount.toString(),
      currency: tender.currency,
      deadline: tender.deadline,
      country: tender.country,
      organization: tender.organization,
      type: tender.type || "",
      category: tender.category,
      sector: tender.sector || "defensa",
      status: tender.status || "active",
      sourceUrl: tender.sourceUrl,
    })
    setIsEditDashboardTenderDialogOpen(true) // Set the state to true
  }

  const handleUpdateDashboardTender = async () => {
    if (!editingDashboardTender) return

    if (
      !dashboardTenderForm.title?.trim() ||
      !dashboardTenderForm.description?.trim() ||
      !dashboardTenderForm.amount?.trim()
    ) {
      alert("Por favor, complete los campos obligatorios")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/tenders/${editingDashboardTender.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...dashboardTenderForm,
          amount: Number(dashboardTenderForm.amount),
        }),
      })

      if (response.ok) {
        const result = await response.json()
        // Update the tender in the list
        setAllDashboardTenders((prev) =>
          prev.map((t) =>
            t.id === editingDashboardTender.id
              ? {
                  ...t,
                  title: dashboardTenderForm.title,
                  description: dashboardTenderForm.description,
                  amount: Number(dashboardTenderForm.amount),
                  currency: dashboardTenderForm.currency,
                  deadline: dashboardTenderForm.deadline,
                  country: dashboardTenderForm.country,
                  organization: dashboardTenderForm.organization,
                  type: dashboardTenderForm.type,
                  category: dashboardTenderForm.category,
                  sector: dashboardTenderForm.sector,
                  status: dashboardTenderForm.status,
                  sourceUrl: dashboardTenderForm.sourceUrl,
                }
              : t,
          ),
        )

        setEditingDashboardTender(null)
        setIsEditDashboardTenderDialogOpen(false)
        console.log("[v0] Dashboard tender updated:", result)
        alert("Licitación actualizada exitosamente")
      } else {
        const errorData = await response.json()
        alert(`Error al actualizar la licitación: ${errorData.error || response.statusText}`)
      }
    } catch (error) {
      console.error("[v0] Error updating dashboard tender:", error)
      alert("Error al actualizar la licitación")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const pendientes = pendingUsers.filter((u) => u.estado === "pendiente").length
    const aprobados = pendingUsers.filter((u) => u.estado === "aprobado").length
    const rechazados = pendingUsers.filter((u) => u.estado === "rechazado").length

    setStats({
      pendientes,
      aprobados,
      rechazados,
      total: pendingUsers.length,
    })
  }, [pendingUsers])

  const handleApproveUser = (userId: string) => {
    setPendingUsers((prev) =>
      prev.map((user) => (user.id === userId ? { ...user, estado: "aprobado" as const } : user)),
    )
    console.log("[v0] Usuario aprobado:", userId)
  }

  const handleRejectUser = (userId: string) => {
    setPendingUsers((prev) =>
      prev.map((user) => (user.id === userId ? { ...user, estado: "rechazado" as const } : user)),
    )
    console.log("[v0] Usuario rechazado:", userId)
  }

  const getUnidadNegocioLabel = (unidad: string) => {
    const labels: { [key: string]: string } = {
      defensa: "Defensa y Seguridad",
      aeroespacial: "Aeroespacial",
      naval: "Naval",
      terrestre: "Terrestre",
      electronica: "Electrónica de Defensa",
      ciberseguridad: "Ciberseguridad",
      "i+d": "I+D+i",
      comercial: "Comercial",
    }
    return labels[unidad] || unidad
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "pendiente":
        return (
          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
            <Clock className="h-3 w-3 mr-1" />
            Pendiente
          </Badge>
        )
      case "aprobado":
        return (
          <Badge variant="outline" className="text-green-600 border-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Aprobado
          </Badge>
        )
      case "rechazado":
        return (
          <Badge variant="outline" className="text-red-600 border-red-600">
            <XCircle className="h-3 w-3 mr-1" />
            Rechazado
          </Badge>
        )
      default:
        return <Badge variant="outline">{estado}</Badge>
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Panel de Administración</h1>
            </div>
            <div>
              <CardTitle className="text-xl">Acceso Restringido</CardTitle>
              <CardDescription>Solo administradores autorizados</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuario</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="admin"
                  value={adminCredentials.username}
                  onChange={(e) => setAdminCredentials({ ...adminCredentials, username: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={adminCredentials.password}
                  onChange={(e) => setAdminCredentials({ ...adminCredentials, password: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Verificando..." : "Acceder"}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <Button variant="outline" onClick={() => router.push("/")} className="w-full">
                Volver al Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const UserCard = ({ user }: { user: PendingUser }) => (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {user.nombre} {user.apellidos}
              </CardTitle>
              <CardDescription className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {user.email}
              </CardDescription>
            </div>
          </div>
          {getEstadoBadge(user.estado)}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Unidad:</span>
            <span>{getUnidadNegocioLabel(user.unidadNegocio)}</span>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Cargo:</span>
            <span>{user.cargo}</span>
          </div>
        </div>

        <div>
          <p className="font-medium text-sm mb-1">Justificación:</p>
          <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">{user.justificacion}</p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">
            Solicitud: {new Date(user.fechaSolicitud).toLocaleDateString("es-ES")}
          </span>

          {user.estado === "pendiente" && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRejectUser(user.id)}
                className="text-red-600 border-red-600 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Rechazar
              </Button>
              <Button size="sm" onClick={() => handleApproveUser(user.id)} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="h-4 w-4 mr-1" />
                Aprobar
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  const TenderCard = ({ tender }: { tender: ManualTender }) => (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{tender.title}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Building className="h-3 w-3" />
              {tender.agency}
              <Badge variant="outline" className="ml-2">
                {tender.source === "manual" ? "Manual" : "Automático"}
              </Badge>
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg">
              {tender.currency} {tender.amount.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">{tender.country}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{tender.description}</p>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Sector:</span> {tender.sector}
          </div>
          <div>
            <span className="font-medium">Tipo:</span> {tender.type}
          </div>
          <div>
            <span className="font-medium">Fecha límite:</span> {new Date(tender.deadline).toLocaleDateString("es-ES")}
          </div>
          <div>
            <span className="font-medium">Publicado:</span> {new Date(tender.publishedDate).toLocaleDateString("es-ES")}
          </div>
        </div>

        {tender.source === "manual" && (
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-xs text-muted-foreground">
              Creado por: {tender.createdBy} • {new Date(tender.createdAt).toLocaleDateString("es-ES")}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleEditTender(tender)}>
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDeleteManualTender(tender.id)}
                className="text-red-600 border-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Eliminar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )

  const DashboardTenderCard = ({ tender }: { tender: RealTender }) => (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{tender.title}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Building className="h-3 w-3" />
              {tender.organization}
              <Badge variant="outline" className="ml-2">
                {tender.source}
              </Badge>
              <Badge variant="outline" className="ml-1">
                {tender.country}
              </Badge>
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg">
              {tender.currency} {tender.amount.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">{tender.category}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{tender.description}</p>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Tipo:</span> {tender.type}
          </div>
          <div>
            <span className="font-medium">Estado:</span> {tender.status}
          </div>
          <div>
            <span className="font-medium">Fecha límite:</span> {new Date(tender.deadline).toLocaleDateString("es-ES")}
          </div>
          <div>
            <span className="font-medium">Publicado:</span> {new Date(tender.publishDate).toLocaleDateString("es-ES")}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-xs text-muted-foreground">
            ID: {tender.expedient} • Fuente: {tender.source}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => window.open(tender.sourceUrl, "_blank")}>
              <ExternalLink className="h-4 w-4 mr-1" />
              Ver Original
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleEditDashboardTender(tender)}
              className="text-orange-600 border-orange-600 hover:bg-orange-50"
            >
              <Edit className="h-4 w-4 mr-1" />
              Editar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">Panel de Administración</h1>
              <p className="text-muted-foreground">Gestión de usuarios y licitaciones de ArquiAlert</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                localStorage.removeItem("adminAuth")
                setIsAuthenticated(false)
              }}
            >
              Cerrar Sesión
            </Button>
            <Button variant="outline" onClick={() => router.push("/")}>
              Volver al Dashboard
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pendientes}</p>
                  <p className="text-sm text-muted-foreground">Pendientes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-green-600">{stats.aprobados}</p>
                  <p className="text-sm text-muted-foreground">Aprobados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-2xl font-bold text-red-600">{stats.rechazados}</p>
                  <p className="text-sm text-muted-foreground">Rechazados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-primary">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Usuarios</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold text-blue-600">{manualTenders.length}</p>
                  <p className="text-sm text-muted-foreground">Licitaciones Manuales</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold text-purple-600">{allDashboardTenders.length}</p>
                  <p className="text-sm text-muted-foreground">Licitaciones Dashboard</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">Gestión de Usuarios</TabsTrigger>
            <TabsTrigger value="tenders">Licitaciones Manuales</TabsTrigger>
            <TabsTrigger value="all-tenders">Todas las Licitaciones</TabsTrigger>
            <TabsTrigger value="ingestion">Control de Ingesta</TabsTrigger>
            <TabsTrigger value="settings">Configuración</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Tabs defaultValue="pendientes" className="space-y-4">
              <TabsList>
                <TabsTrigger value="pendientes">Solicitudes Pendientes ({stats.pendientes})</TabsTrigger>
                <TabsTrigger value="aprobados">Usuarios Aprobados ({stats.aprobados})</TabsTrigger>
                <TabsTrigger value="rechazados">Solicitudes Rechazadas ({stats.rechazados})</TabsTrigger>
              </TabsList>

              <TabsContent value="pendientes" className="space-y-4">
                {stats.pendientes === 0 ? (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>No hay solicitudes pendientes de aprobación.</AlertDescription>
                  </Alert>
                ) : (
                  <div>
                    {pendingUsers
                      .filter((user) => user.estado === "pendiente")
                      .map((user) => (
                        <UserCard key={user.id} user={user} />
                      ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="aprobados" className="space-y-4">
                {stats.aprobados === 0 ? (
                  <Alert>
                    <AlertDescription>No hay usuarios aprobados aún.</AlertDescription>
                  </Alert>
                ) : (
                  <div>
                    {pendingUsers
                      .filter((user) => user.estado === "aprobado")
                      .map((user) => (
                        <UserCard key={user.id} user={user} />
                      ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="rechazados" className="space-y-4">
                {stats.rechazados === 0 ? (
                  <Alert>
                    <AlertDescription>No hay solicitudes rechazadas.</AlertDescription>
                  </Alert>
                ) : (
                  <div>
                    {pendingUsers
                      .filter((user) => user.estado === "rechazado")
                      .map((user) => (
                        <UserCard key={user.id} user={user} />
                      ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="tenders" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Gestión de Licitaciones</h2>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleRefreshData} disabled={isLoadingTenders}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingTenders ? "animate-spin" : ""}`} />
                  Actualizar Datos
                </Button>
                <Dialog open={isAddTenderDialogOpen} onOpenChange={setIsAddTenderDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      onClick={() => {
                        setEditingTender(null)
                        setNewTender({
                          title: "",
                          description: "",
                          amount: "",
                          currency: "EUR",
                          deadline: "",
                          country: "",
                          agency: "",
                          url: "",
                          sector: "defensa",
                          type: "",
                        })
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Licitación Manual
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{editingTender ? "Editar Licitación" : "Agregar Nueva Licitación"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="title">Título *</Label>
                          <Input
                            id="title"
                            placeholder="Título de la licitación"
                            value={newTender.title}
                            onChange={(e) => setNewTender({ ...newTender, title: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="amount">Monto *</Label>
                          <Input
                            id="amount"
                            type="number"
                            placeholder="1000000"
                            value={newTender.amount}
                            onChange={(e) => setNewTender({ ...newTender, amount: e.target.value })}
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="description">Descripción *</Label>
                        <Textarea
                          id="description"
                          placeholder="Descripción detallada de la licitación"
                          value={newTender.description}
                          onChange={(e) => setNewTender({ ...newTender, description: e.target.value })}
                          rows={3}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="currency">Moneda</Label>
                          <Select
                            value={newTender.currency}
                            onValueChange={(value) => setNewTender({ ...newTender, currency: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="EUR">EUR</SelectItem>
                              <SelectItem value="USD">USD</SelectItem>
                              <SelectItem value="GBP">GBP</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="country">País</Label>
                          <Input
                            id="country"
                            placeholder="España"
                            value={newTender.country}
                            onChange={(e) => setNewTender({ ...newTender, country: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="deadline">Fecha Límite</Label>
                          <Input
                            id="deadline"
                            type="date"
                            value={newTender.deadline}
                            onChange={(e) => setNewTender({ ...newTender, deadline: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="sector">Sector *</Label>
                          <Select
                            value={newTender.sector}
                            onValueChange={(value) => setNewTender({ ...newTender, sector: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="defensa">Defensa</SelectItem>
                              <SelectItem value="civil">Civil</SelectItem>
                              <SelectItem value="espacio">Espacio</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="agency">Organismo</Label>
                          <Input
                            id="agency"
                            placeholder="Ministerio de Defensa"
                            value={newTender.agency}
                            onChange={(e) => setNewTender({ ...newTender, agency: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="type">Tipo</Label>
                          <Input
                            id="type"
                            placeholder="Sistemas de Comunicación"
                            value={newTender.type}
                            onChange={(e) => setNewTender({ ...newTender, type: e.target.value })}
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="url">URL (opcional)</Label>
                        <Input
                          id="url"
                          placeholder="https://..."
                          value={newTender.url}
                          onChange={(e) => setNewTender({ ...newTender, url: e.target.value })}
                        />
                      </div>

                      <div className="flex justify-end space-x-2 pt-4">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsAddTenderDialogOpen(false)
                            setEditingTender(null)
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={editingTender ? handleUpdateTender : handleCreateManualTender}
                          disabled={isLoading}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {isLoading ? "Guardando..." : editingTender ? "Actualizar" : "Guardar"} Licitación
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="space-y-4">
              {isLoadingTenders ? (
                <div className="flex items-center justify-center p-8">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Cargando licitaciones...</span>
                </div>
              ) : manualTenders.length === 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    No hay licitaciones manuales creadas. Use el botón "Agregar Licitación Manual" para crear una nueva.
                  </AlertDescription>
                </Alert>
              ) : (
                manualTenders.map((tender) => <TenderCard key={tender.id} tender={tender} />)
              )}
            </div>
          </TabsContent>

          <TabsContent value="all-tenders" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Todas las Licitaciones del Dashboard</h2>
              <div className="flex gap-2">
                <Button variant="outline" onClick={loadAllDashboardTenders} disabled={isLoadingDashboardTenders}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingDashboardTenders ? "animate-spin" : ""}`} />
                  Actualizar
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {isLoadingDashboardTenders ? (
                <div className="flex items-center justify-center p-8">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Cargando licitaciones del dashboard...</span>
                </div>
              ) : allDashboardTenders.length === 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    No se encontraron licitaciones en el dashboard. Use el botón "Actualizar" para cargar los datos.
                  </AlertDescription>
                </Alert>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Mostrando {allDashboardTenders.length} licitaciones del dashboard. Puede editar cualquier licitación
                    para corregir errores.
                  </p>
                  {allDashboardTenders.map((tender) => (
                    <DashboardTenderCard key={tender.id} tender={tender} />
                  ))}
                </div>
              )}
            </div>

            <Dialog open={isEditDashboardTenderDialogOpen} onOpenChange={setIsEditDashboardTenderDialogOpen}>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Editar Licitación del Dashboard</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="dashboard-title">Título *</Label>
                      <Input
                        id="dashboard-title"
                        placeholder="Título de la licitación"
                        value={dashboardTenderForm.title}
                        onChange={(e) => setDashboardTenderForm({ ...dashboardTenderForm, title: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="dashboard-amount">Monto *</Label>
                      <Input
                        id="dashboard-amount"
                        type="number"
                        placeholder="1000000"
                        value={dashboardTenderForm.amount}
                        onChange={(e) => setDashboardTenderForm({ ...dashboardTenderForm, amount: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="dashboard-description">Descripción *</Label>
                    <Textarea
                      id="dashboard-description"
                      placeholder="Descripción detallada de la licitación"
                      value={dashboardTenderForm.description}
                      onChange={(e) => setDashboardTenderForm({ ...dashboardTenderForm, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="dashboard-currency">Moneda</Label>
                      <Select
                        value={dashboardTenderForm.currency}
                        onValueChange={(value) => setDashboardTenderForm({ ...dashboardTenderForm, currency: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="AUD">AUD</SelectItem>
                          <SelectItem value="SGD">SGD</SelectItem>
                          <SelectItem value="INR">INR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="dashboard-country">País</Label>
                      <Input
                        id="dashboard-country"
                        placeholder="España"
                        value={dashboardTenderForm.country}
                        onChange={(e) => setDashboardTenderForm({ ...dashboardTenderForm, country: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="dashboard-deadline">Fecha Límite</Label>
                      <Input
                        id="dashboard-deadline"
                        type="date"
                        value={dashboardTenderForm.deadline}
                        onChange={(e) => setDashboardTenderForm({ ...dashboardTenderForm, deadline: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="dashboard-organization">Organismo</Label>
                      <Input
                        id="dashboard-organization"
                        placeholder="Ministerio de Defensa"
                        value={dashboardTenderForm.organization}
                        onChange={(e) =>
                          setDashboardTenderForm({ ...dashboardTenderForm, organization: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="dashboard-type">Tipo</Label>
                      <Input
                        id="dashboard-type"
                        placeholder="Sistemas de Comunicación"
                        value={dashboardTenderForm.type}
                        onChange={(e) => setDashboardTenderForm({ ...dashboardTenderForm, type: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="dashboard-category">Categoría</Label>
                      <Input
                        id="dashboard-category"
                        placeholder="Defensa"
                        value={dashboardTenderForm.category}
                        onChange={(e) => setDashboardTenderForm({ ...dashboardTenderForm, category: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="dashboard-sourceUrl">URL Fuente</Label>
                      <Input
                        id="dashboard-sourceUrl"
                        placeholder="https://..."
                        value={dashboardTenderForm.sourceUrl}
                        onChange={(e) => setDashboardTenderForm({ ...dashboardTenderForm, sourceUrl: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="dashboard-sector">Sector *</Label>
                      <Select
                        value={dashboardTenderForm.sector}
                        onValueChange={(value: "defensa" | "civil" | "espacio") =>
                          setDashboardTenderForm({ ...dashboardTenderForm, sector: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="defensa">Defensa</SelectItem>
                          <SelectItem value="civil">Civil</SelectItem>
                          <SelectItem value="espacio">Espacio</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="dashboard-status">Estado *</Label>
                      <Select
                        value={dashboardTenderForm.status}
                        onValueChange={(value: "active" | "closed" | "pending") =>
                          setDashboardTenderForm({ ...dashboardTenderForm, status: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Activo</SelectItem>
                          <SelectItem value="pending">Pendiente</SelectItem>
                          <SelectItem value="closed">Cerrado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditDashboardTenderDialogOpen(false)
                        setEditingDashboardTender(null)
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button onClick={handleUpdateDashboardTender} disabled={isLoading}>
                      <Save className="h-4 w-4 mr-2" />
                      {isLoading ? "Guardando..." : "Actualizar"} Licitación
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="ingestion" className="space-y-4">
            <h2 className="text-2xl font-bold">Control de Ingesta de Datos</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Database className="h-5 w-5 mr-2" />
                    Fuentes Automáticas
                  </CardTitle>
                  <CardDescription>Control de las fuentes de datos automáticas</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">API España (Contratación del Estado)</p>
                      <p className="text-sm text-muted-foreground">Última actualización: Hace 2 horas</p>
                    </div>
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Activo
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">API Francia (BOAMP)</p>
                      <p className="text-sm text-muted-foreground">Última actualización: Hace 4 horas</p>
                    </div>
                    <Badge variant="outline" className="text-red-600 border-red-600">
                      Error
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">TED Europa</p>
                      <p className="text-sm text-muted-foreground">Última actualización: Hace 1 hora</p>
                    </div>
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Activo
                    </Badge>
                  </div>

                  <Button className="w-full" onClick={handleRefreshData} disabled={isLoadingTenders}>
                    <Download className="h-4 w-4 mr-2" />
                    {isLoadingTenders ? "Actualizando..." : "Forzar Actualización"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="h-5 w-5 mr-2" />
                    Configuración de Categorización
                  </CardTitle>
                  <CardDescription>Reglas automáticas de categorización</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Palabras clave para Defensa</Label>
                    <Textarea placeholder="defensa, militar, armamento, seguridad..." rows={2} />
                  </div>

                  <div className="space-y-2">
                    <Label>Palabras clave para Aeroespacial</Label>
                    <Textarea placeholder="aeroespacial, satélite, radar, aviación..." rows={2} />
                  </div>

                  <Button className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Configuración
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <h2 className="text-2xl font-bold">Configuración del Sistema</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configuración General</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Frecuencia de actualización automática</Label>
                    <Select defaultValue="2h">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1h">Cada hora</SelectItem>
                        <SelectItem value="2h">Cada 2 horas</SelectItem>
                        <SelectItem value="4h">Cada 4 horas</SelectItem>
                        <SelectItem value="12h">Cada 12 horas</SelectItem>
                        <SelectItem value="24h">Diariamente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Retención de datos (días)</Label>
                    <Input type="number" defaultValue="365" />
                  </div>

                  <Button>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Configuración
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Exportar/Importar Datos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full bg-transparent">
                      <Download className="h-4 w-4 mr-2" />
                      Exportar Licitaciones (CSV)
                    </Button>

                    <Button variant="outline" className="w-full bg-transparent">
                      <Upload className="h-4 w-4 mr-2" />
                      Importar Licitaciones
                    </Button>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">Última copia de seguridad: Hace 6 horas</p>
                    <Button variant="outline" className="w-full bg-transparent">
                      <Database className="h-4 w-4 mr-2" />
                      Crear Copia de Seguridad
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
