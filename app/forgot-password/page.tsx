"use client"

import type React from "react"
import { useState } from "react"
import { Shield, Mail, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [emailError, setEmailError] = useState("")

  const validateEmail = (email: string) => {
    if (!email.endsWith("@arquimea.com")) {
      setEmailError("Debe usar un email corporativo @arquimea.com")
      return false
    }
    setEmailError("")
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateEmail(email)) {
      return
    }

    setIsLoading(true)

    // Simular envío de email de recuperación
    setTimeout(() => {
      console.log("[v0] Email de recuperación enviado a:", email)
      setIsLoading(false)
      setIsSubmitted(true)
    }, 2000)
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <Mail className="h-16 w-16 text-primary mx-auto" />
            <div>
              <CardTitle className="text-xl text-primary">Email Enviado</CardTitle>
              <CardDescription>Revisa tu bandeja de entrada</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                Se ha enviado un enlace de recuperación de contraseña a <strong>{email}</strong>. Revisa tu bandeja de
                entrada y sigue las instrucciones para restablecer tu contraseña.
              </AlertDescription>
            </Alert>
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">¿No recibiste el email? Revisa tu carpeta de spam</p>
              <Link href="/login">
                <Button variant="outline" className="w-full bg-transparent">
                  <ArrowLeft className="h-4 w-4 mr-2" />
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
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">ArquiAlert</h1>
          </div>
          <div>
            <CardTitle className="text-xl">Recuperar Contraseña</CardTitle>
            <CardDescription>Ingresa tu email corporativo para recibir un enlace de recuperación</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Enviando..." : "Enviar Enlace de Recuperación"}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <Link href="/login">
              <Button variant="ghost" className="text-sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver al Login
              </Button>
            </Link>
            <p className="text-xs text-muted-foreground">
              ¿No tienes cuenta?{" "}
              <Link href="/register" className="text-primary hover:underline">
                Solicitar registro
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
