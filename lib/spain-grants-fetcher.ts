/**
 * Spain Grants/Subsidies Fetcher
 * Fetches grants from Base de Datos Nacional de Subvenciones (BDNS) API
 * Only returns real data from official Spanish government sources
 */

export interface SpainGrant {
  id: string
  title: string
  organization: string
  publishDate: string
  deadline: string
  amount?: string
  category: string
  description: string
  expedient: string
  sourceUrl: string
  source: "spain"
  portal: string
}

export class SpainGrantsFetcher {
  // BDNS API endpoint (Base de Datos Nacional de Subvenciones)
  private bdnsApiUrl = "https://www.pap.hacienda.gob.es/bdnstrans/api/convocatorias"

  async fetchAllGrants(keyword?: string): Promise<SpainGrant[]> {
    console.log("[v0] Spain - Fetching grants from BDNS API...")

    try {
      const grants = await this.fetchFromBDNS(keyword)
      console.log(`[v0] Spain - Total grants from API: ${grants.length}`)
      return grants
    } catch (error) {
      console.error("[v0] Spain - Error fetching from BDNS:", error)
      return []
    }
  }

  private async fetchFromBDNS(keyword?: string): Promise<SpainGrant[]> {
    try {
      // BDNS public search endpoint
      const params = new URLSearchParams({
        estadoConvocatoria: "Abierta",
        numElementos: "50",
        pagina: "1",
      })

      if (keyword && keyword !== "all" && keyword !== "*") {
        params.append("texto", keyword)
      }

      const response = await fetch(
        `https://www.pap.hacienda.gob.es/bdnstrans/GE/es/convocatorias/busqueda?${params}`,
        {
          headers: {
            "Accept": "application/json, text/html",
            "User-Agent": "Mozilla/5.0 (compatible; GrantsApp/1.0)",
          },
        }
      )

      if (!response.ok) {
        // Try alternative BDNS endpoint
        return await this.fetchFromBDNSAlternative(keyword)
      }

      const contentType = response.headers.get("content-type")
      
      if (contentType?.includes("application/json")) {
        const data = await response.json()
        
        if (data.convocatorias && Array.isArray(data.convocatorias)) {
          return data.convocatorias.map((conv: any) => this.mapBDNSResult(conv)).filter(Boolean)
        }
        
        if (Array.isArray(data)) {
          return data.map((conv: any) => this.mapBDNSResult(conv)).filter(Boolean)
        }
      }

      // If HTML response, try alternative
      return await this.fetchFromBDNSAlternative(keyword)
    } catch (error) {
      console.error("[v0] Spain - BDNS fetch error:", error)
      return await this.fetchFromBDNSAlternative(keyword)
    }
  }

  private async fetchFromBDNSAlternative(keyword?: string): Promise<SpainGrant[]> {
    try {
      // Try the infosubvenciones API
      const response = await fetch(
        "https://www.infosubvenciones.es/bdnstrans/GE/es/api/convocatorias",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify({
            estadoConvocatoria: "Abierta",
            numElementos: 50,
            pagina: 1,
            texto: keyword || "",
          }),
        }
      )

      if (!response.ok) {
        console.log("[v0] Spain - Alternative API failed")
        return []
      }

      const data = await response.json()
      
      if (data.convocatorias && Array.isArray(data.convocatorias)) {
        return data.convocatorias.map((conv: any) => this.mapBDNSResult(conv)).filter(Boolean)
      }

      return []
    } catch (error) {
      console.error("[v0] Spain - Alternative API error:", error)
      return []
    }
  }

  private mapBDNSResult(conv: any): SpainGrant | null {
    if (!conv) return null

    const id = conv.idConvocatoria || conv.codigoBDNS || conv.id || `BDNS-${Date.now()}`
    const title = conv.tituloConvocatoria || conv.titulo || conv.descripcion || "Sin titulo"
    
    // Generate direct URL to BDNS convocatoria
    const bdnsUrl = `https://www.pap.hacienda.gob.es/bdnstrans/GE/es/convocatoria/${id}`

    return {
      id: String(id),
      title: title,
      organization: conv.organoConvocante || conv.administracion || "Administracion Publica",
      publishDate: conv.fechaPublicacion || conv.fechaInicio || "",
      deadline: conv.fechaFinPresentacion || conv.fechaFin || conv.plazo || "",
      amount: conv.presupuestoTotal || conv.importe || "",
      category: conv.tipoConvocatoria || conv.tipoAyuda || "Subvencion",
      description: conv.descripcion || conv.objeto || title,
      expedient: conv.codigoBDNS || String(id),
      sourceUrl: bdnsUrl,
      source: "spain",
      portal: "BDNS",
    }
  }
}
