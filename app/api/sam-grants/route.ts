import { NextRequest, NextResponse } from 'next/server'
import { SAMGovFetcher } from '@/lib/sam-gov-fetcher'
import { GrantsGovFetcher } from '@/lib/grants-gov-fetcher'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const source = searchParams.get('source') || 'both' // 'sam', 'grants', or 'both'

    console.log('[v0] 🚀 Iniciando obtención de datos desde SAM.gov/Grants.gov')

    const results: any[] = []

    // Obtener licitaciones de SAM.gov
    if (source === 'sam' || source === 'both') {
      const samApiKey = process.env.SAM_GOV_API_KEY || ''
      
      if (!samApiKey) {
        console.warn('[v0] ⚠️ SAM_GOV_API_KEY no configurada')
      }

      const samFetcher = new SAMGovFetcher(samApiKey)
      const samTenders = await samFetcher.fetchDefenseTenders()
      
      console.log(`[v0] ✅ Obtenidas ${samTenders.length} licitaciones de SAM.gov`)
      
      // Transformar a formato estándar
      const samResults = samTenders.map(tender => ({
        ...tender,
        country: 'Estados Unidos',
        type: tender.category,
        sector: 'defensa' as const,
        status: 'active' as const,
        source: 'sam.gov'
      }))
      
      results.push(...samResults)
    }

    // Obtener subvenciones de Grants.gov
    if (source === 'grants' || source === 'both') {
      const grantsApiKey = process.env.GRANTS_GOV_API_KEY || ''
      
      if (!grantsApiKey) {
        console.warn('[v0] ⚠️ GRANTS_GOV_API_KEY no configurada, usando acceso público')
      }

      const grantsFetcher = new GrantsGovFetcher(grantsApiKey)
      const grants = await grantsFetcher.fetchDefenseGrants()
      
      console.log(`[v0] ✅ Obtenidas ${grants.length} subvenciones de Grants.gov`)
      
      // Transformar a formato estándar
      const grantsResults = grants.map(grant => ({
        ...grant,
        country: 'Estados Unidos',
        type: 'Subvención',
        sector: 'defensa' as const,
        status: 'active' as const,
        source: 'grants.gov'
      }))
      
      results.push(...grantsResults)
    }

    console.log(`[v0] 📊 Total: ${results.length} oportunidades obtenidas`)

    return NextResponse.json({
      success: true,
      data: results,
      total: results.length,
      sources: {
        sam: source === 'sam' || source === 'both',
        grants: source === 'grants' || source === 'both'
      }
    })

  } catch (error) {
    console.error('[v0] ❌ Error en endpoint SAM/Grants:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        data: []
      },
      { status: 500 }
    )
  }
}
