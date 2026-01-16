// User and Alert types
export interface UserAlert {
  id: string
  name: string
  filters: {
    keyword: string
    sources: string[]
    statuses: string[]
    categories: string[]
    fundingInstruments: string[]
  }
  emailNotifications: boolean
  frequency: "immediate" | "daily" | "weekly"
  createdAt: string
  lastTriggered?: string
}

export interface User {
  id: string
  email: string
  password: string
  name: string
  businessUnit: string
  role: string
  alerts: UserAlert[]
  createdAt: string
  lastLogin?: string
}

// Arquimea Group business units
export const ARQUIMEA_BUSINESS_UNITS = [
  "Connect",
  "Defense",
  "Space",
  "Molefy",
  "Pulsar",
  "Research Center",
  "Other",
] as const

export type BusinessUnit = (typeof ARQUIMEA_BUSINESS_UNITS)[number]

const PREDEFINED_USERS: User[] = [
  {
    id: "user-jcmarin-001",
    email: "jcmarin@arquimea.com",
    password: "Arquimea2025",
    name: "Juan Carlos Marín",
    businessUnit: "Connect",
    role: "Director de Arquimea Connect",
    alerts: [],
    createdAt: "2025-01-01T00:00:00.000Z",
  },
]

// Simple in-memory/localStorage user service
export class UserService {
  private static instance: UserService
  private storageKey = "arquimea_users"
  private currentUserKey = "arquimea_current_user"

  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService()
    }
    return UserService.instance
  }

  private getUsers(): User[] {
    if (typeof window === "undefined") return [...PREDEFINED_USERS]

    const data = localStorage.getItem(this.storageKey)
    const storedUsers: User[] = data ? JSON.parse(data) : []

    // Combinar usuarios predefinidos con los almacenados, evitando duplicados
    const allUsers = [...PREDEFINED_USERS]
    for (const storedUser of storedUsers) {
      const exists = allUsers.some((u) => u.email.toLowerCase() === storedUser.email.toLowerCase())
      if (!exists) {
        allUsers.push(storedUser)
      }
    }

    return allUsers
  }

  private saveUsers(users: User[]): void {
    if (typeof window === "undefined") return
    // Solo guardar usuarios que no son predefinidos
    const nonPredefinedUsers = users.filter(
      (u) => !PREDEFINED_USERS.some((p) => p.email.toLowerCase() === u.email.toLowerCase()),
    )
    localStorage.setItem(this.storageKey, JSON.stringify(nonPredefinedUsers))
  }

  async register(
    email: string,
    password: string,
    name: string,
    businessUnit: string,
    role?: string,
  ): Promise<{ success: boolean; message: string; user?: User }> {
    const users = this.getUsers()

    // Check if user already exists
    if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, message: "Este email ya está registrado" }
    }

    const newUser: User = {
      id: crypto.randomUUID(),
      email: email.toLowerCase(),
      password,
      name,
      businessUnit,
      role: role || "",
      alerts: [],
      createdAt: new Date().toISOString(),
    }

    users.push(newUser)
    this.saveUsers(users)

    // Send registration notification email
    try {
      await fetch("/api/register-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUser.name,
          email: newUser.email,
          businessUnit: newUser.businessUnit,
          role: newUser.role,
        }),
      })
    } catch (e) {
      console.log("[v0] Could not send registration notification email")
    }

    return { success: true, message: "Registro exitoso", user: newUser }
  }

  async login(email: string, password: string): Promise<{ success: boolean; message: string; user?: User }> {
    // Primero verificar contra usuarios predefinidos directamente
    const predefinedUser = PREDEFINED_USERS.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password,
    )

    if (predefinedUser) {
      const userWithLogin = { ...predefinedUser, lastLogin: new Date().toISOString() }
      if (typeof window !== "undefined") {
        localStorage.setItem(this.currentUserKey, JSON.stringify(userWithLogin))
      }
      return { success: true, message: "Login exitoso", user: userWithLogin }
    }

    // Luego verificar usuarios registrados
    const users = this.getUsers()
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password)

    if (!user) {
      return { success: false, message: "Email o contraseña incorrectos" }
    }

    // Update last login
    user.lastLogin = new Date().toISOString()
    this.saveUsers(users)

    // Store current user
    if (typeof window !== "undefined") {
      localStorage.setItem(this.currentUserKey, JSON.stringify(user))
    }

    return { success: true, message: "Login exitoso", user }
  }

  logout(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem(this.currentUserKey)
    }
  }

  getCurrentUser(): User | null {
    if (typeof window === "undefined") return null
    const data = localStorage.getItem(this.currentUserKey)
    return data ? JSON.parse(data) : null
  }

  async addAlert(
    userId: string,
    alert: Omit<UserAlert, "id" | "createdAt">,
  ): Promise<{ success: boolean; message: string; alert?: UserAlert }> {
    const users = this.getUsers()
    const userIndex = users.findIndex((u) => u.id === userId)

    if (userIndex === -1) {
      return { success: false, message: "Usuario no encontrado" }
    }

    const newAlert: UserAlert = {
      ...alert,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }

    users[userIndex].alerts.push(newAlert)
    this.saveUsers(users)

    if (typeof window !== "undefined") {
      localStorage.setItem(this.currentUserKey, JSON.stringify(users[userIndex]))
    }

    return { success: true, message: "Alerta creada exitosamente", alert: newAlert }
  }

  async updateAlert(
    userId: string,
    alertId: string,
    updates: Partial<UserAlert>,
  ): Promise<{ success: boolean; message: string }> {
    const users = this.getUsers()
    const userIndex = users.findIndex((u) => u.id === userId)

    if (userIndex === -1) {
      return { success: false, message: "Usuario no encontrado" }
    }

    const alertIndex = users[userIndex].alerts.findIndex((a) => a.id === alertId)
    if (alertIndex === -1) {
      return { success: false, message: "Alerta no encontrada" }
    }

    users[userIndex].alerts[alertIndex] = { ...users[userIndex].alerts[alertIndex], ...updates }
    this.saveUsers(users)

    if (typeof window !== "undefined") {
      localStorage.setItem(this.currentUserKey, JSON.stringify(users[userIndex]))
    }

    return { success: true, message: "Alerta actualizada" }
  }

  async deleteAlert(userId: string, alertId: string): Promise<{ success: boolean; message: string }> {
    const users = this.getUsers()
    const userIndex = users.findIndex((u) => u.id === userId)

    if (userIndex === -1) {
      return { success: false, message: "Usuario no encontrado" }
    }

    users[userIndex].alerts = users[userIndex].alerts.filter((a) => a.id !== alertId)
    this.saveUsers(users)

    if (typeof window !== "undefined") {
      localStorage.setItem(this.currentUserKey, JSON.stringify(users[userIndex]))
    }

    return { success: true, message: "Alerta eliminada" }
  }

  getUserAlerts(userId: string): UserAlert[] {
    const users = this.getUsers()
    const user = users.find((u) => u.id === userId)
    return user?.alerts || []
  }
}
