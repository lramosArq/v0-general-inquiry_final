// Servicio de sincronización de datos compartidos entre usuarios
// Permite que todos los usuarios vean los cambios realizados por otros

export interface SharedDataService {
  // Claims
  syncClaims: (claims: any[]) => Promise<any[]>
  fetchClaims: () => Promise<any[]>
  addClaim: (claim: any) => Promise<any[]>
  removeClaim: (opportunityId: string) => Promise<any[]>

  // Alerts
  syncAlerts: (userId: string, alerts: any[]) => Promise<any[]>
  fetchAlerts: (userId: string) => Promise<any[]>
  addAlert: (userId: string, alert: any) => Promise<any[]>
  removeAlert: (userId: string, alertId: string) => Promise<any[]>

  // Settings
  syncSettings: (userId: string, settings: any) => Promise<any>
  fetchSettings: (userId: string) => Promise<any>

  // Feedback
  syncFeedback: (feedback: any) => Promise<any>
  fetchFeedback: () => Promise<any>

  // All data
  fetchAllData: () => Promise<any>
}

class SharedDataServiceImpl implements SharedDataService {
  private static instance: SharedDataServiceImpl
  private baseUrl = "/api/shared-data"
  private pollingInterval: NodeJS.Timeout | null = null
  private listeners: Map<string, ((data: any) => void)[]> = new Map()

  private constructor() {}

  static getInstance(): SharedDataServiceImpl {
    if (!SharedDataServiceImpl.instance) {
      SharedDataServiceImpl.instance = new SharedDataServiceImpl()
    }
    return SharedDataServiceImpl.instance
  }

  // Subscribe to data changes
  subscribe(dataType: string, callback: (data: any) => void) {
    if (!this.listeners.has(dataType)) {
      this.listeners.set(dataType, [])
    }
    this.listeners.get(dataType)!.push(callback)

    return () => {
      const callbacks = this.listeners.get(dataType) || []
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  // Notify listeners
  private notifyListeners(dataType: string, data: any) {
    const callbacks = this.listeners.get(dataType) || []
    callbacks.forEach((cb) => cb(data))
  }

  // Start polling for changes
  startPolling(intervalMs: number = 5000) {
    if (this.pollingInterval) return

    this.pollingInterval = setInterval(async () => {
      try {
        const allData = await this.fetchAllData()
        this.notifyListeners("claims", allData.opportunityClaims)
        this.notifyListeners("alerts", allData.userAlerts)
        this.notifyListeners("settings", allData.userSettings)
        this.notifyListeners("feedback", allData.feedbackData)
      } catch (error) {
        console.error("Polling error:", error)
      }
    }, intervalMs)
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
    }
  }

  // Claims methods
  async fetchClaims(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}?type=claims`)
      
      // Check if response is OK before parsing JSON
      if (!response.ok) {
        console.warn(`fetchClaims: Server returned ${response.status}`)
        // Fallback to localStorage on server error
        const stored = typeof localStorage !== "undefined" ? localStorage.getItem("opportunityClaims") : null
        return stored ? JSON.parse(stored) : []
      }
      
      const result = await response.json()
      return result.success ? result.data : []
    } catch (error) {
      console.error("Error fetching claims:", error)
      // Fallback to localStorage
      try {
        const stored = typeof localStorage !== "undefined" ? localStorage.getItem("opportunityClaims") : null
        return stored ? JSON.parse(stored) : []
      } catch {
        return []
      }
    }
  }

  async syncClaims(claims: any[]): Promise<any[]> {
    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "claims", action: "sync", data: claims }),
      })
      
      if (!response.ok) {
        console.warn(`syncClaims: Server returned ${response.status}`)
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("opportunityClaims", JSON.stringify(claims))
        }
        return claims
      }
      
      const result = await response.json()
      if (result.success && typeof localStorage !== "undefined") {
        localStorage.setItem("opportunityClaims", JSON.stringify(result.data))
        this.notifyListeners("claims", result.data)
      }
      return result.data || claims
    } catch (error) {
      console.error("Error syncing claims:", error)
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("opportunityClaims", JSON.stringify(claims))
      }
      return claims
    }
  }

  async addClaim(claim: any): Promise<any[]> {
    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "claims", action: "claim", data: claim }),
      })
      
      if (!response.ok) {
        console.warn(`addClaim: Server returned ${response.status}`)
        const current = await this.fetchClaims()
        current.push(claim)
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("opportunityClaims", JSON.stringify(current))
        }
        return current
      }
      
      const result = await response.json()
      if (result.success && typeof localStorage !== "undefined") {
        localStorage.setItem("opportunityClaims", JSON.stringify(result.data))
        this.notifyListeners("claims", result.data)
      }
      return result.data || []
    } catch (error) {
      console.error("Error adding claim:", error)
      const current = await this.fetchClaims()
      current.push(claim)
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("opportunityClaims", JSON.stringify(current))
      }
      return current
    }
  }

  async removeClaim(opportunityId: string): Promise<any[]> {
    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "claims",
          action: "release",
          data: { opportunityId },
        }),
      })
      
      if (!response.ok) {
        console.warn(`removeClaim: Server returned ${response.status}`)
        const current = await this.fetchClaims()
        const filtered = current.filter((c) => c.opportunityId !== opportunityId)
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("opportunityClaims", JSON.stringify(filtered))
        }
        return filtered
      }
      
      const result = await response.json()
      if (result.success && typeof localStorage !== "undefined") {
        localStorage.setItem("opportunityClaims", JSON.stringify(result.data))
        this.notifyListeners("claims", result.data)
      }
      return result.data || []
    } catch (error) {
      console.error("Error removing claim:", error)
      const current = await this.fetchClaims()
      const filtered = current.filter((c) => c.opportunityId !== opportunityId)
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("opportunityClaims", JSON.stringify(filtered))
      }
      return filtered
    }
  }

  // Alerts methods
  async fetchAlerts(userId: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}?type=alerts&userId=${userId}`)
      
      if (!response.ok) {
        console.warn(`fetchAlerts: Server returned ${response.status}`)
        return []
      }
      
      const result = await response.json()
      return result.success ? result.data : []
    } catch (error) {
      console.error("Error fetching alerts:", error)
      return []
    }
  }

  async syncAlerts(userId: string, alerts: any[]): Promise<any[]> {
    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "alerts", userId, action: "sync", data: alerts }),
      })
      
      if (!response.ok) {
        console.warn(`syncAlerts: Server returned ${response.status}`)
        return alerts
      }
      
      const result = await response.json()
      if (result.success) {
        this.notifyListeners("alerts", { userId, alerts: result.data })
      }
      return result.data || alerts
    } catch (error) {
      console.error("Error syncing alerts:", error)
      return alerts
    }
  }

  async addAlert(userId: string, alert: any): Promise<any[]> {
    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "alerts", userId, action: "add", data: alert }),
      })
      
      if (!response.ok) {
        console.warn(`addAlert: Server returned ${response.status}`)
        return []
      }
      
      const result = await response.json()
      if (result.success) {
        this.notifyListeners("alerts", { userId, alerts: result.data })
      }
      return result.data || []
    } catch (error) {
      console.error("Error adding alert:", error)
      return []
    }
  }

  async removeAlert(userId: string, alertId: string): Promise<any[]> {
    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "alerts",
          userId,
          action: "remove",
          data: { alertId },
        }),
      })
      
      if (!response.ok) {
        console.warn(`removeAlert: Server returned ${response.status}`)
        return []
      }
      
      const result = await response.json()
      if (result.success) {
        this.notifyListeners("alerts", { userId, alerts: result.data })
      }
      return result.data || []
    } catch (error) {
      console.error("Error removing alert:", error)
      return []
    }
  }

  // Settings methods
  async fetchSettings(userId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}?type=settings&userId=${userId}`)
      
      if (!response.ok) {
        console.warn(`fetchSettings: Server returned ${response.status}`)
        return {}
      }
      
      const result = await response.json()
      return result.success ? result.data : {}
    } catch (error) {
      console.error("Error fetching settings:", error)
      return {}
    }
  }

  async syncSettings(userId: string, settings: any): Promise<any> {
    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "settings", userId, data: settings }),
      })
      
      if (!response.ok) {
        console.warn(`syncSettings: Server returned ${response.status}`)
        return settings
      }
      
      const result = await response.json()
      if (result.success) {
        this.notifyListeners("settings", { userId, settings: result.data })
      }
      return result.data || settings
    } catch (error) {
      console.error("Error syncing settings:", error)
      return settings
    }
  }

  // Feedback methods
  async fetchFeedback(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}?type=feedback`)
      
      if (!response.ok) {
        console.warn(`fetchFeedback: Server returned ${response.status}`)
        try {
          const stored = typeof localStorage !== "undefined" ? localStorage.getItem("grantInterestFeedback") : null
          return stored ? JSON.parse(stored) : {}
        } catch {
          return {}
        }
      }
      
      const result = await response.json()
      return result.success ? result.data : {}
    } catch (error) {
      console.error("Error fetching feedback:", error)
      try {
        const stored = typeof localStorage !== "undefined" ? localStorage.getItem("grantInterestFeedback") : null
        return stored ? JSON.parse(stored) : {}
      } catch {
        return {}
      }
    }
  }

  async syncFeedback(feedback: any): Promise<any> {
    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "feedback", action: "update", data: feedback }),
      })
      
      if (!response.ok) {
        console.warn(`syncFeedback: Server returned ${response.status}`)
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("grantInterestFeedback", JSON.stringify(feedback))
        }
        return feedback
      }
      
      const result = await response.json()
      if (result.success && typeof localStorage !== "undefined") {
        localStorage.setItem("grantInterestFeedback", JSON.stringify(result.data))
        this.notifyListeners("feedback", result.data)
      }
      return result.data || feedback
    } catch (error) {
      console.error("Error syncing feedback:", error)
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("grantInterestFeedback", JSON.stringify(feedback))
      }
      return feedback
    }
  }

  // Fetch all data
  async fetchAllData(): Promise<any> {
    try {
      const response = await fetch(this.baseUrl)
      
      if (!response.ok) {
        console.warn(`fetchAllData: Server returned ${response.status}`)
        return {}
      }
      
      const result = await response.json()
      return result.success ? result.data : {}
    } catch (error) {
      console.error("Error fetching all data:", error)
      return {}
    }
  }
}

export const sharedDataService = SharedDataServiceImpl.getInstance()
