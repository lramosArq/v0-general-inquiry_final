"use client"

import type React from "react"
import Link from "next/link"
import { useState } from "react"
import { Shield, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [nombre, setNombre] = useState("")
  const [apellidos, setApellidos] = useState("")
  const [unidadNegocio, setUnidadNegocio] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [emailError, setEmailError] = useState("")
  const router = useRouter()

  const validateEmail = (email: string) => {
    if (!email.endsWith("@arquimea.com")) {
      setEmailError("Debe usar un email corporativo @arquimea.com")
      return false
    }
    setEmailError("")
    return true
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateEmail(email)) {
      return
    }

    if (!nombre || !apellidos || !unidadNegocio) {
      return
    }

    setIsLoading(true)

    setTimeout(() => {
      // Aquí se verificaría si el usuario está aprobado por el administrador
      const isUserApproved = true // En producción, esto vendría de la base de datos

      if (!isUserApproved) {
        alert("Tu cuenta está pendiente de aprobación por el administrador.")
        setIsLoading(false)
        return
      }

      setIsLoading(false)
      router.push("/")
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">ArquiAlert</h1>
          </div>
          <div>
            <CardTitle className="text-xl">Acceso Corporativo</CardTitle>
            <CardDescription>Sistema de alertas de licitaciones de defensa españolas</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  type="text"
                  placeholder="Juan"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apellidos">Apellidos</Label>
                <Input
                  id="apellidos"
                  type="text"
                  placeholder="García López"
                  value={apellidos}
                  onChange={(e) => setApellidos(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email corporativo</Label>
              <Input
                id="email"
                type="email"
                placeholder="nombre.apellido@arquimea.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (e.target.value) validateEmail(e.target.value)
                }}
                className={emailError ? "border-red-500" : ""}
                required
              />
              {emailError && <p className="text-sm text-red-500">{emailError}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="unidad">Unidad de Negocio</Label>
              <Select value={unidadNegocio} onValueChange={setUnidadNegocio} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tu unidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="defensa">Defensa y Seguridad</SelectItem>
                  <SelectItem value="aeroespacial">Aeroespacial</SelectItem>
                  <SelectItem value="naval">Naval</SelectItem>
                  <SelectItem value="terrestre">Terrestre</SelectItem>
                  <SelectItem value="electronica">Electrónica de Defensa</SelectItem>
                  <SelectItem value="ciberseguridad">Ciberseguridad</SelectItem>
                  <SelectItem value="i+d">I+D+i</SelectItem>
                  <SelectItem value="comercial">Comercial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Iniciando sesión..." : "Acceder a ArquiAlert"}
            </Button>
          </form>
          <div className="mt-6 text-center space-y-2">
            <Button variant="outline" className="w-full mb-4 bg-transparent" onClick={() => router.push("/")}>
              Acceder como Invitado (Sin Registro)
            </Button>

            <p className="text-xs text-muted-foreground">
              ¿No tienes cuenta?{" "}
              <Link href="/register" className="text-primary hover:underline">
                Solicitar registro
              </Link>
            </p>

            <p className="text-xs text-muted-foreground">
              ¿Olvidaste tu contraseña?{" "}
              <Link href="/forgot-password" className="text-primary hover:underline">
                Recuperar contraseña
              </Link>
            </p>

            <p className="text-xs text-muted-foreground mt-1">Acceso restringido a personal autorizado de Arquimea</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
