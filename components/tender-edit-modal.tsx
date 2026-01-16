"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Save, X, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface RealTender {
  id: string
  title: string
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

interface TenderEditModalProps {
  tender: RealTender | null
  isOpen: boolean
  onClose: () => void
  onSave: (updatedTender: RealTender) => Promise<void>
  isLoading?: boolean
}

export function TenderEditModal({ tender, isOpen, onClose, onSave, isLoading = false }: TenderEditModalProps) {
  const [formData, setFormData] = useState<Partial<RealTender>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (tender) {
      setFormData({
        title: tender.title,
        description: tender.description,
        amount: tender.amount,
        currency: tender.currency,
        deadline: tender.deadline,
        country: tender.country,
        organization: tender.organization,
        type: tender.type || "",
        category: tender.category,
        sector: tender.sector,
        status: tender.status,
        sourceUrl: tender.sourceUrl,
      })
      setErrors({})
    }
  }, [tender])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.title?.trim()) {
      newErrors.title = "El título es obligatorio"
    }

    if (!formData.description?.trim()) {
      newErrors.description = "La descripción es obligatoria"
    }

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = "El monto debe ser mayor a 0"
    }

    if (!formData.deadline) {
      newErrors.deadline = "La fecha límite es obligatoria"
    }

    if (!formData.country?.trim()) {
      newErrors.country = "El país es obligatorio"
    }

    if (!formData.organization?.trim()) {
      newErrors.organization = "El organismo es obligatorio"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!tender || !validateForm()) {
      return
    }

    setIsSaving(true)
    try {
      const updatedTender: RealTender = {
        ...tender,
        ...formData,
        title: formData.title!,
        description: formData.description!,
        amount: formData.amount!,
        currency: formData.currency!,
        deadline: formData.deadline!,
        country: formData.country!,
        organization: formData.organization!,
        category: formData.category!,
        sector: formData.sector!,
        status: formData.status!,
        sourceUrl: formData.sourceUrl!,
      }

      await onSave(updatedTender)
      onClose()
    } catch (error) {
      console.error("[v0] Error saving tender:", error)
      setErrors({ general: "Error al guardar la licitación. Inténtelo de nuevo." })
    } finally {
      setIsSaving(false)
    }
  }

  const handleInputChange = (field: keyof RealTender, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  if (!tender) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Editar Licitación</span>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                ID: {tender.id}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Fuente: {tender.source}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {errors.general && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Información Básica</h3>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={formData.title || ""}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  className={errors.title ? "border-red-500" : ""}
                />
                {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title}</p>}
              </div>

              <div>
                <Label htmlFor="description">Descripción *</Label>
                <Textarea
                  id="description"
                  value={formData.description || ""}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  rows={4}
                  className={errors.description ? "border-red-500" : ""}
                />
                {errors.description && <p className="text-sm text-red-500 mt-1">{errors.description}</p>}
              </div>
            </div>
          </div>

          {/* Financial Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Información Financiera</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Monto *</Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount || ""}
                  onChange={(e) => handleInputChange("amount", Number(e.target.value))}
                  className={errors.amount ? "border-red-500" : ""}
                />
                {errors.amount && <p className="text-sm text-red-500 mt-1">{errors.amount}</p>}
              </div>

              <div>
                <Label htmlFor="currency">Moneda</Label>
                <Select
                  value={formData.currency || "EUR"}
                  onValueChange={(value) => handleInputChange("currency", value)}
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
            </div>
          </div>

          {/* Location and Organization */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Ubicación y Organización</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="country">País *</Label>
                <Input
                  id="country"
                  value={formData.country || ""}
                  onChange={(e) => handleInputChange("country", e.target.value)}
                  className={errors.country ? "border-red-500" : ""}
                />
                {errors.country && <p className="text-sm text-red-500 mt-1">{errors.country}</p>}
              </div>

              <div>
                <Label htmlFor="organization">Organismo *</Label>
                <Input
                  id="organization"
                  value={formData.organization || ""}
                  onChange={(e) => handleInputChange("organization", e.target.value)}
                  className={errors.organization ? "border-red-500" : ""}
                />
                {errors.organization && <p className="text-sm text-red-500 mt-1">{errors.organization}</p>}
              </div>
            </div>
          </div>

          {/* Classification */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Clasificación</h3>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="sector">Sector</Label>
                <Select
                  value={formData.sector || "defensa"}
                  onValueChange={(value) => handleInputChange("sector", value)}
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
                <Label htmlFor="category">Categoría</Label>
                <Input
                  id="category"
                  value={formData.category || ""}
                  onChange={(e) => handleInputChange("category", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="type">Tipo</Label>
                <Input
                  id="type"
                  value={formData.type || ""}
                  onChange={(e) => handleInputChange("type", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Dates and Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Fechas y Estado</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="deadline">Fecha Límite *</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline ? formData.deadline.split("T")[0] : ""}
                  onChange={(e) => handleInputChange("deadline", e.target.value)}
                  className={errors.deadline ? "border-red-500" : ""}
                />
                {errors.deadline && <p className="text-sm text-red-500 mt-1">{errors.deadline}</p>}
              </div>

              <div>
                <Label htmlFor="status">Estado</Label>
                <Select
                  value={formData.status || "active"}
                  onValueChange={(value) => handleInputChange("status", value)}
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
          </div>

          {/* Source URL */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Información Adicional</h3>

            <div>
              <Label htmlFor="sourceUrl">URL de la Fuente</Label>
              <Input
                id="sourceUrl"
                type="url"
                value={formData.sourceUrl || ""}
                onChange={(e) => handleInputChange("sourceUrl", e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-6 border-t">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
