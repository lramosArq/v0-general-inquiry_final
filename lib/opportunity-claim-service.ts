// Service to manage opportunity claims across users
// Data is stored in localStorage and shared between all users

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

  static getInstance(): OpportunityClaimService {
    if (!OpportunityClaimService.instance) {
      OpportunityClaimService.instance = new OpportunityClaimService()
    }
    return OpportunityClaimService.instance
  }

  private getClaims(): OpportunityClaim[] {
    if (typeof window === "undefined") return []
    const data = localStorage.getItem(CLAIMS_STORAGE_KEY)
    return data ? JSON.parse(data) : []
  }

  private saveClaims(claims: OpportunityClaim[]): void {
    if (typeof window === "undefined") return
    localStorage.setItem(CLAIMS_STORAGE_KEY, JSON.stringify(claims))
  }

  // Claim an opportunity
  claimOpportunity(
    opportunityId: string,
    user: { id: string; name: string; email: string; businessUnit: string },
    notes?: string
  ): { success: boolean; message: string; claim?: OpportunityClaim } {
    const claims = this.getClaims()
    
    // Check if already claimed
    const existingClaim = claims.find(c => c.opportunityId === opportunityId)
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

    claims.push(newClaim)
    this.saveClaims(claims)

    return { success: true, message: "Control tomado exitosamente", claim: newClaim }
  }

  // Release an opportunity claim
  releaseOpportunity(opportunityId: string, userId: string): { success: boolean; message: string } {
    const claims = this.getClaims()
    const claimIndex = claims.findIndex(c => c.opportunityId === opportunityId)

    if (claimIndex === -1) {
      return { success: false, message: "Esta oportunidad no tiene control asignado" }
    }

    const claim = claims[claimIndex]
    if (claim.claimedBy.id !== userId) {
      return { success: false, message: "Solo el usuario que tomo el control puede liberarlo" }
    }

    claims.splice(claimIndex, 1)
    this.saveClaims(claims)

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
  updateClaimNotes(opportunityId: string, userId: string, notes: string): { success: boolean; message: string } {
    const claims = this.getClaims()
    const claim = claims.find(c => c.opportunityId === opportunityId)

    if (!claim) {
      return { success: false, message: "No hay control asignado para esta oportunidad" }
    }

    if (claim.claimedBy.id !== userId) {
      return { success: false, message: "Solo el usuario que tomo el control puede actualizar las notas" }
    }

    claim.notes = notes
    this.saveClaims(claims)

    return { success: true, message: "Notas actualizadas" }
  }
}
