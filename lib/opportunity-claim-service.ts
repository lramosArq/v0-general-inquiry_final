// Service to manage opportunity claims across users
// Data is synchronized via API and shared between all users in real-time

import { sharedDataService } from "./shared-data-service"

export interface OpportunityClaim {
  opportunityId: string
  claimedBy: {
    id: string
    name: string
    email: string
    businessUnit: string
  }
  claimedAt: string
  notes?: string
}

const CLAIMS_STORAGE_KEY = "arquimea_opportunity_claims"

export class OpportunityClaimService {
  private static instance: OpportunityClaimService
  private claims: OpportunityClaim[] = []
  private initialized = false

  static getInstance(): OpportunityClaimService {
    if (!OpportunityClaimService.instance) {
      OpportunityClaimService.instance = new OpportunityClaimService()
    }
    return OpportunityClaimService.instance
  }

  // Initialize and sync with server
  async initialize(): Promise<void> {
    if (this.initialized) return
    
    try {
      // Fetch from server first
      const serverClaims = await sharedDataService.fetchClaims()
      if (serverClaims.length > 0) {
        this.claims = serverClaims
        this.saveToLocalStorage()
      } else {
        // If server is empty, sync local data to server
        this.claims = this.getFromLocalStorage()
        if (this.claims.length > 0) {
          await sharedDataService.syncClaims(this.claims)
        }
      }
      
      // Subscribe to changes from other users
      sharedDataService.subscribe("claims", (newClaims) => {
        this.claims = newClaims
        this.saveToLocalStorage()
      })
      
      // Start polling for updates
      sharedDataService.startPolling(3000)
      
      this.initialized = true
    } catch (error) {
      console.error("Error initializing claims service:", error)
      this.claims = this.getFromLocalStorage()
    }
  }

  private getFromLocalStorage(): OpportunityClaim[] {
    if (typeof window === "undefined") return []
    const data = localStorage.getItem(CLAIMS_STORAGE_KEY)
    return data ? JSON.parse(data) : []
  }

  private saveToLocalStorage(): void {
    if (typeof window === "undefined") return
    localStorage.setItem(CLAIMS_STORAGE_KEY, JSON.stringify(this.claims))
  }

  private getClaims(): OpportunityClaim[] {
    if (!this.initialized) {
      this.claims = this.getFromLocalStorage()
    }
    return this.claims
  }

  private async saveClaims(claims: OpportunityClaim[]): Promise<void> {
    this.claims = claims
    this.saveToLocalStorage()
    
    // Sync to server
    try {
      await sharedDataService.syncClaims(claims)
    } catch (error) {
      console.error("Error syncing claims to server:", error)
    }
  }

  // Claim an opportunity
  async claimOpportunity(
    opportunityId: string,
    user: { id: string; name: string; email: string; businessUnit: string },
    notes?: string
  ): Promise<{ success: boolean; message: string; claim?: OpportunityClaim }> {
    // Refresh claims from server before claiming
    try {
      const serverClaims = await sharedDataService.fetchClaims()
      this.claims = serverClaims
    } catch (error) {
      this.claims = this.getClaims()
    }
    
    // Check if already claimed
    const existingClaim = this.claims.find(c => c.opportunityId === opportunityId)
    if (existingClaim) {
      if (existingClaim.claimedBy.id === user.id) {
        return { success: false, message: "Ya tienes el control de esta oportunidad" }
      }
      return { 
        success: false, 
        message: `Esta oportunidad ya esta siendo trabajada por ${existingClaim.claimedBy.name}` 
      }
    }

    const newClaim: OpportunityClaim = {
      opportunityId,
      claimedBy: {
        id: user.id,
        name: user.name,
        email: user.email,
        businessUnit: user.businessUnit,
      },
      claimedAt: new Date().toISOString(),
      notes,
    }

    // Add to server
    try {
      const updatedClaims = await sharedDataService.addClaim(newClaim)
      this.claims = updatedClaims
      this.saveToLocalStorage()
    } catch (error) {
      this.claims.push(newClaim)
      await this.saveClaims(this.claims)
    }

    return { success: true, message: "Control tomado exitosamente", claim: newClaim }
  }

  // Release an opportunity claim
  async releaseOpportunity(opportunityId: string, userId: string): Promise<{ success: boolean; message: string }> {
    const claims = this.getClaims()
    const claimIndex = claims.findIndex(c => c.opportunityId === opportunityId)

    if (claimIndex === -1) {
      return { success: false, message: "Esta oportunidad no tiene control asignado" }
    }

    const claim = claims[claimIndex]
    if (claim.claimedBy.id !== userId) {
      return { success: false, message: "Solo el usuario que tomo el control puede liberarlo" }
    }

    // Remove from server
    try {
      const updatedClaims = await sharedDataService.removeClaim(opportunityId)
      this.claims = updatedClaims
      this.saveToLocalStorage()
    } catch (error) {
      claims.splice(claimIndex, 1)
      await this.saveClaims(claims)
    }

    return { success: true, message: "Control liberado exitosamente" }
  }

  // Get claim for a specific opportunity
  getClaim(opportunityId: string): OpportunityClaim | null {
    const claims = this.getClaims()
    return claims.find(c => c.opportunityId === opportunityId) || null
  }

  // Get all claims by a specific user
  getUserClaims(userId: string): OpportunityClaim[] {
    const claims = this.getClaims()
    return claims.filter(c => c.claimedBy.id === userId)
  }

  // Get all claims
  getAllClaims(): OpportunityClaim[] {
    return this.getClaims()
  }

  // Refresh claims from server
  async refreshClaims(): Promise<OpportunityClaim[]> {
    try {
      const serverClaims = await sharedDataService.fetchClaims()
      this.claims = serverClaims
      this.saveToLocalStorage()
      return serverClaims
    } catch (error) {
      console.error("Error refreshing claims:", error)
      return this.getClaims()
    }
  }

  // Check if an opportunity is claimed
  isOpportunityClaimed(opportunityId: string): boolean {
    const claims = this.getClaims()
    return claims.some(c => c.opportunityId === opportunityId)
  }

  // Check if current user has claimed an opportunity
  isClaimedByUser(opportunityId: string, userId: string): boolean {
    const claims = this.getClaims()
    return claims.some(c => c.opportunityId === opportunityId && c.claimedBy.id === userId)
  }

  // Update notes for a claim
  async updateClaimNotes(opportunityId: string, userId: string, notes: string): Promise<{ success: boolean; message: string }> {
    const claims = this.getClaims()
    const claim = claims.find(c => c.opportunityId === opportunityId)

    if (!claim) {
      return { success: false, message: "No hay control asignado para esta oportunidad" }
    }

    if (claim.claimedBy.id !== userId) {
      return { success: false, message: "Solo el usuario que tomo el control puede actualizar las notas" }
    }

    claim.notes = notes
    await this.saveClaims(claims)

    return { success: true, message: "Notas actualizadas" }
  }
}
