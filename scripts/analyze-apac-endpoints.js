async function analyzeAPACEndpoints() {
  console.log("[v0] Iniciando análisis de endpoints APAC...")

  const csvUrl =
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/APAC_Defense_Space_Procurement_with_URLs_and_Code-E2p8YeBoOnOlYB5I4ZNQZirAHFuQR8.csv"

  try {
    // Intentar leer el CSV
    const response = await fetch(csvUrl)
    if (!response.ok) {
      console.log("[v0] Error al obtener CSV:", response.status)
      return
    }

    const csvText = await response.text()
    console.log("[v0] CSV obtenido, tamaño:", csvText.length)

    // Parsear CSV manualmente
    const lines = csvText.split("\n")
    const headers = lines[0].split(",").map((h) => h.replace(/"/g, "").trim())
    console.log("[v0] Headers encontrados:", headers)

    const countries = []
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(",").map((v) => v.replace(/"/g, "").trim())
        const country = {}
        headers.forEach((header, index) => {
          country[header] = values[index] || ""
        })
        countries.push(country)
      }
    }

    console.log("[v0] Países encontrados:", countries.length)

    // Analizar cada endpoint
    for (const country of countries) {
      console.log(`[v0] Analizando ${country.País}:`)
      console.log(`  - URL Original: ${country["URL original"]}`)
      console.log(`  - Endpoint Exacto: ${country.Endpoint_Exacto}`)
      console.log(`  - cURL: ${country.cURL_Exacto}`)

      // Probar conectividad básica
      try {
        const testResponse = await fetch(country.Endpoint_Exacto, {
          method: "HEAD",
          timeout: 5000,
        })
        console.log(`  - Status: ${testResponse.status}`)
      } catch (error) {
        console.log(`  - Error: ${error.message}`)
      }
    }

    return countries
  } catch (error) {
    console.log("[v0] Error general:", error.message)
  }
}

// Ejecutar análisis
analyzeAPACEndpoints()
