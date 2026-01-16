"use client"

import type React from "react"
import { useState } from "react"
import { Shield, Eye, EyeOff, UserPlus, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    nombre: "",
    apellidos: "",
    email: "",
    unidadNegocio: "",
    cargo: "",
    justificacion: "",
    password: "",
    confirmPassword: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    // Validar email corporativo
    if (!formData.email.endsWith("@arquimea.com")) {
      newErrors.email = "Debe usar un email corporativo @arquimea.com"
    }

    // Validar contraseñas
    if (formData.password.length < 8) {
      newErrors.password = "La contraseña debe tener al menos 8 caracteres"
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden"
    }

    // Validar campos requeridos
    const requiredFields = ["nombre", "apellidos", "email", "unidadNegocio", "cargo", "justificacion"]
    requiredFields.forEach((field) => {
      if (!formData[field as keyof typeof formData]) {
        newErrors[field] = "Este campo es obligatorio"
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    // Simular envío de solicitud de registro
    setTimeout(() => {
      // Aquí se enviaría la solicitud al administrador
      console.log("[v0] Solicitud de registro enviada:", formData)
      setIsLoading(false)
      setIsSubmitted(true)
    }, 2000)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <div>
              <CardTitle className="text-xl text-green-700">Solicitud Enviada</CardTitle>
              <CardDescription>Tu solicitud de registro ha sido enviada correctamente</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                Tu solicitud de acceso a ArquiAlert ha sido enviada al administrador del sistema. Recibirás un email de
                confirmación una vez que tu cuenta sea aprobada.
              </AlertDescription>
            </Alert>
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">Tiempo estimado de aprobación: 24-48 horas</p>
              <Link href="/login">
                <Button variant="outline" className="w-full bg-transparent">
                  Volver al Login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">ArquiAlert</h1>
          </div>
          <div>
            <CardTitle className="text-xl flex items-center justify-center gap-2">
              <UserPlus className="h-5 w-5" />
              Solicitud de Registro
            </CardTitle>
            <CardDescription>Solicita acceso al sistema de alertas de licitaciones de defensa</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  type="text"
                  placeholder="Juan"
                  value={formData.nombre}
                  onChange={(e) => handleInputChange("nombre", e.target.value)}
                  className={errors.nombre ? "border-red-500" : ""}
                />
                {errors.nombre && <p className="text-sm text-red-500">{errors.nombre}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="apellidos">Apellidos *</Label>
                <Input
                  id="apellidos"
                  type="text"
                  placeholder="García López"
                  value={formData.apellidos}
                  onChange={(e) => handleInputChange("apellidos", e.target.value)}
                  className={errors.apellidos ? "border-red-500" : ""}
                />
                {errors.apellidos && <p className="text-sm text-red-500">{errors.apellidos}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email corporativo *</Label>
              <Input
                id="email"
                type="email"
                placeholder="nombre.apellido@arquimea.com"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unidad">Unidad de Negocio *</Label>
                <Select
                  value={formData.unidadNegocio}
                  onValueChange={(value) => handleInputChange("unidadNegocio", value)}
                >
                  <SelectTrigger className={errors.unidadNegocio ? "border-red-500" : ""}>
                    <SelectValue placeholder="Selecciona tu unidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aeroespacial-defensa">Aeroespacial y defensa</SelectItem>
                    <SelectItem value="space">Space</SelectItem>
                    <SelectItem value="big-science">Big Science</SelectItem>
                    <SelectItem value="fintech">Fintech</SelectItem>
                    <SelectItem value="research-center">Research Center</SelectItem>
                  </SelectContent>
                </Select>
                {errors.unidadNegocio && <p className="text-sm text-red-500">{errors.unidadNegocio}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cargo">Cargo/Posición *</Label>
                <Input
                  id="cargo"
                  type="text"
                  placeholder="Ingeniero Senior, Director, etc."
                  value={formData.cargo}
                  onChange={(e) => handleInputChange("cargo", e.target.value)}
                  className={errors.cargo ? "border-red-500" : ""}
                />
                {errors.cargo && <p className="text-sm text-red-500">{errors.cargo}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="justificacion">Justificación del acceso *</Label>
              <Textarea
                id="justificacion"
                placeholder="Explica brevemente por qué necesitas acceso al sistema de alertas de licitaciones..."
                value={formData.justificacion}
                onChange={(e) => handleInputChange("justificacion", e.target.value)}
                className={errors.justificacion ? "border-red-500" : ""}
                rows={3}
              />
              {errors.justificacion && <p className="text-sm text-red-500">{errors.justificacion}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    className={errors.password ? "border-red-500" : ""}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Contraseña *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    className={errors.confirmPassword ? "border-red-500" : ""}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword}</p>}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Enviando solicitud..." : "Enviar Solicitud de Registro"}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              ¿Ya tienes una cuenta?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Iniciar sesión
              </Link>
            </p>
            <p className="text-sm text-muted-foreground">
              ¿Olvidaste tu contraseña?{" "}
              <Link href="/forgot-password" className="text-primary hover:underline">
                Recuperar contraseña
              </Link>
            </p>
            <p className="text-xs text-muted-foreground">Acceso restringido a personal autorizado de Arquimea</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
