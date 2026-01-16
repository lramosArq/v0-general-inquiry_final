"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserService, ARQUIMEA_BUSINESS_UNITS, type User } from "@/lib/user-service"
import { Loader2, Mail, Lock, UserIcon, Building2, Briefcase, ShieldCheck } from "lucide-react"

interface LoginScreenProps {
  onAuthSuccess: (user: User) => void
}

export function LoginScreen({ onAuthSuccess }: LoginScreenProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Login state
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")

  // Register state
  const [registerName, setRegisterName] = useState("")
  const [registerEmail, setRegisterEmail] = useState("")
  const [registerPassword, setRegisterPassword] = useState("")
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("")
  const [registerBusinessUnit, setRegisterBusinessUnit] = useState("")
  const [registerRole, setRegisterRole] = useState("")

  const userService = UserService.getInstance()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const result = await userService.login(loginEmail, loginPassword)
      if (result.success && result.user) {
        setSuccess("Login exitoso!")
        setTimeout(() => {
          onAuthSuccess(result.user!)
        }, 500)
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError("Ha ocurrido un error. Por favor, inténtelo de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    if (registerPassword !== registerConfirmPassword) {
      setError("Las contraseñas no coinciden")
      setIsLoading(false)
      return
    }

    if (registerPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres")
      setIsLoading(false)
      return
    }

    if (!registerBusinessUnit) {
      setError("Por favor seleccione su unidad de negocio")
      setIsLoading(false)
      return
    }

    try {
      const result = await userService.register(
        registerEmail,
        registerPassword,
        registerName,
        registerBusinessUnit,
        registerRole,
      )
      if (result.success && result.user) {
        await userService.login(registerEmail, registerPassword)
        setSuccess("Registro exitoso! Bienvenido a Arquimea Grants Search.")
        setTimeout(() => {
          onAuthSuccess(result.user!)
        }, 1000)
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError("Ha ocurrido un error. Por favor, inténtelo de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] to-[#2d4a6f] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <ShieldCheck className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-wide">ARQUIMEA</h1>
          <h2 className="text-xl text-blue-200">GRANTS SEARCH</h2>
          <p className="text-blue-300 text-sm mt-2">Plataforma de búsqueda de subvenciones</p>
        </div>

        <Card className="border-0 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl text-[#1e3a5f]">Acceso a la plataforma</CardTitle>
            <CardDescription>
              Inicie sesión o regístrese para acceder a las oportunidades de financiación
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="mt-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                <TabsTrigger value="register">Registrarse</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="su@email.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}
                  {success && <p className="text-sm text-green-600 bg-green-50 p-2 rounded">{success}</p>}

                  <Button type="submit" className="w-full bg-[#1e3a5f] hover:bg-[#2d4a6f]" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Iniciando sesión...
                      </>
                    ) : (
                      "Iniciar Sesión"
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Nombre Completo</Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="register-name"
                        type="text"
                        placeholder="Juan Pérez"
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email Corporativo</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="su@arquimea.com"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-business-unit">Unidad de Negocio</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-3 h-4 w-4 text-gray-400 z-10" />
                      <Select value={registerBusinessUnit} onValueChange={setRegisterBusinessUnit}>
                        <SelectTrigger className="pl-10">
                          <SelectValue placeholder="Seleccione su unidad" />
                        </SelectTrigger>
                        <SelectContent>
                          {ARQUIMEA_BUSINESS_UNITS.map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-role">Cargo (opcional)</Label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="register-role"
                        type="text"
                        placeholder="Director, Manager, Engineer..."
                        value={registerRole}
                        onChange={(e) => setRegisterRole(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password">Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="••••••••"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-confirm">Confirmar Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="register-confirm"
                        type="password"
                        placeholder="••••••••"
                        value={registerConfirmPassword}
                        onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}
                  {success && <p className="text-sm text-green-600 bg-green-50 p-2 rounded">{success}</p>}

                  <Button type="submit" className="w-full bg-[#1e3a5f] hover:bg-[#2d4a6f]" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creando cuenta...
                      </>
                    ) : (
                      "Crear Cuenta"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-blue-200 text-xs mt-6">
          &copy; 2025 Arquimea Group. Todos los derechos reservados.
        </p>
      </div>
    </div>
  )
}
