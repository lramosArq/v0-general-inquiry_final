// Script para leer y procesar los datos de procurement APAC
const csvUrl =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/APAC_Defense_Space_Procurement_with_URLs_and_Code-E2p8YeBoOnOlYB5I4ZNQZirAHFuQR8.csv"

async function readAPACData() {
  try {
    console.log("[v0] Fetching APAC procurement data...")
    const response = await fetch(csvUrl)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const csvText = await response.text()
    console.log("[v0] CSV data received, length:", csvText.length)

    // Parse CSV manually
    const lines = csvText.split("\n")
    const headers = lines[0].split(",").map((h) => h.replace(/"/g, "").trim())
    console.log("[v0] Headers:", headers)

    const countries = []

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        // Simple CSV parsing - handle quoted fields
        const values = []
        let current = ""
        let inQuotes = false

        for (let j = 0; j < lines[i].length; j++) {
          const char = lines[i][j]
          if (char === '"') {
            inQuotes = !inQuotes
          } else if (char === "," && !inQuotes) {
            values.push(current.trim())
            current = ""
          } else {
            current += char
          }
        }
        values.push(current.trim()) // Add last value

        if (values.length >= headers.length) {
          const country = {}
          headers.forEach((header, index) => {
            country[header] = values[index] || ""
          })
          countries.push(country)
        }
      }
    }

    console.log("[v0] Processed countries:", countries.length)
    console.log("[v0] Sample country:", countries[0])

    // Show first 5 countries for verification
    countries.slice(0, 5).forEach((country, index) => {
      console.log(`[v0] Country ${index + 1}:`, {
        name: country["País"],
        originalUrl: country["URL original"],
        endpoint: country["Endpoint_Exacto"],
        curl: country["cURL_Exacto"]?.substring(0, 100) + "...",
      })
    })

    return countries
  } catch (error) {
    console.error("[v0] Error reading APAC data:", error)
    return []
  }
}

// Execute the function
readAPACData().then((data) => {
  console.log("[v0] Total countries processed:", data.length)
})
