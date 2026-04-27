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
      const result = await response.json()
      return result.success ? result.data : []
    } catch (error) {
      console.error("Error fetching claims:", error)
      // Fallback to localStorage
      const stored = localStorage.getItem("opportunityClaims")
      return stored ? JSON.parse(stored) : []
    }
  }

  async syncClaims(claims: any[]): Promise<any[]> {
    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "claims", action: "sync", data: claims }),
      })
      const result = await response.json()
      if (result.success) {
        localStorage.setItem("opportunityClaims", JSON.stringify(result.data))
        this.notifyListeners("claims", result.data)
      }
      return result.data || claims
    } catch (error) {
      console.error("Error syncing claims:", error)
      localStorage.setItem("opportunityClaims", JSON.stringify(claims))
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
      const result = await response.json()
      if (result.success) {
        localStorage.setItem("opportunityClaims", JSON.stringify(result.data))
        this.notifyListeners("claims", result.data)
      }
      return result.data || []
    } catch (error) {
      console.error("Error adding claim:", error)
      const current = await this.fetchClaims()
      current.push(claim)
      localStorage.setItem("opportunityClaims", JSON.stringify(current))
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
      const result = await response.json()
      if (result.success) {
        localStorage.setItem("opportunityClaims", JSON.stringify(result.data))
        this.notifyListeners("claims", result.data)
      }
      return result.data || []
    } catch (error) {
      console.error("Error removing claim:", error)
      const current = await this.fetchClaims()
      const filtered = current.filter((c) => c.opportunityId !== opportunityId)
      localStorage.setItem("opportunityClaims", JSON.stringify(filtered))
      return filtered
    }
  }

  // Alerts methods
  async fetchAlerts(userId: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}?type=alerts&userId=${userId}`)
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
      const result = await response.json()
      return result.success ? result.data : {}
    } catch (error) {
      console.error("Error fetching feedback:", error)
      const stored = localStorage.getItem("grantInterestFeedback")
      return stored ? JSON.parse(stored) : {}
    }
  }

  async syncFeedback(feedback: any): Promise<any> {
    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "feedback", action: "update", data: feedback }),
      })
      const result = await response.json()
      if (result.success) {
        localStorage.setItem("grantInterestFeedback", JSON.stringify(result.data))
        this.notifyListeners("feedback", result.data)
      }
      return result.data || feedback
    } catch (error) {
      console.error("Error syncing feedback:", error)
      localStorage.setItem("grantInterestFeedback", JSON.stringify(feedback))
      return feedback
    }
  }

  // Fetch all data
  async fetchAllData(): Promise<any> {
    try {
      const response = await fetch(this.baseUrl)
      const result = await response.json()
      return result.success ? result.data : {}
    } catch (error) {
      console.error("Error fetching all data:", error)
      return {}
    }
  }
}

export const sharedDataService = SharedDataServiceImpl.getInstance()
