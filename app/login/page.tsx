"use client"

import type React from "react"
import Link from "next/link"
import { useState } from "react"
import { Eye, EyeOff, Loader2, Mail, Lock, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { UserService } from "@/lib/user-service"

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setIsLoading(true)

    try {
      const userService = UserService.getInstance()
      const result = await userService.login(email, password)

      if (result.success && result.user) {
        setSuccess("Login exitoso! Redirigiendo...")
        setTimeout(() => {
          router.push("/")
        }, 500)
      } else {
        setError(result.message || "Email o contrasena incorrectos")
      }
    } catch (err) {
      setError("Ha ocurrido un error. Por favor, intentelo de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] to-[#2d4a6f] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <ShieldCheck className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-wide">ARQUIMEA</h1>
          <h2 className="text-xl text-blue-200">GRANTS SEARCH</h2>
          <p className="text-blue-300 text-sm mt-2">Plataforma de busqueda de subvenciones</p>
        </div>

        <Card className="border-0 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl text-[#1e3a5f]">Iniciar Sesion</CardTitle>
            <CardDescription>
              Introduzca sus credenciales para acceder a la plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="su@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contrasena</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="********"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
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

              {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}
              {success && <p className="text-sm text-green-600 bg-green-50 p-2 rounded">{success}</p>}

              <Button type="submit" className="w-full bg-[#1e3a5f] hover:bg-[#2d4a6f] text-white" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando sesion...
                  </>
                ) : (
                  "Iniciar Sesion"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-2">
              <p className="text-xs text-muted-foreground">
                {"No tienes cuenta? "}
                <Link href="/register" className="text-[#1e3a5f] font-medium hover:underline">
                  Registrarse
                </Link>
              </p>

              <p className="text-xs text-muted-foreground">
                {"Olvidaste tu contrasena? "}
                <Link href="/forgot-password" className="text-[#1e3a5f] font-medium hover:underline">
                  Recuperar contrasena
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-blue-200 text-xs mt-6">
          {'(c) 2025 Arquimea Group. Todos los derechos reservados.'}
        </p>
      </div>
    </div>
  )
}
