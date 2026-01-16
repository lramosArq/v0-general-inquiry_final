"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Building2, Target, Rocket, Shield, Cpu, Calendar, AlertCircle } from "lucide-react"

interface Grant {
  id: string
  title: string
  category: string
  source: "usa" | "eu"
  openDate: string
  closeDate: string
  status: string
  agency?: string
  description?: string
}

interface MarketIntelligenceProps {
  grants: Grant[]
}

// Arquimea Group companies and their focus areas
const ARQUIMEA_COMPANIES = [
  {
    name: "Defense",
    icon: Shield,
    focus: ["defense", "defence", "military", "security"],
    description: "Defense & security systems",
  },
  {
    name: "Space",
    icon: Rocket,
    focus: ["space", "satellite", "orbit", "lunar", "gravimetry", "earth observation"],
    description: "Space technologies & missions",
  },
  {
    name: "Connect",
    icon: Cpu,
    focus: ["digital", "connectivity", "infrastructure", "network", "5g", "6g", "internet"],
    description: "Digital connectivity solutions",
  },
  {
    name: "Molefy",
    icon: Target,
    focus: ["biotech", "molecular", "diagnostics", "life science", "als", "neurodegenerative"],
    description: "Molecular diagnostics",
  },
  {
    name: "Pulsar",
    icon: Rocket,
    focus: ["propulsion", "rocket", "launch", "thruster"],
    description: "Propulsion systems",
  },
  {
    name: "Research Center",
    icon: Building2,
    focus: ["research", "innovation", "r&d", "development", "quantum"],
    description: "R&D hub",
  },
]

// Category definitions for classification
const CATEGORIES = {
  "Space & Satellite": [
    "space",
    "satellite",
    "orbit",
    "lunar",
    "gravimetry",
    "earth observation",
    "galileo",
    "copernicus",
  ],
  Cybersecurity: ["cyber", "security", "threat", "protection", "resilience"],
  "Artificial Intelligence": ["ai", "artificial intelligence", "machine learning", "neural", "deep learning"],
  "Digital Infrastructure": [
    "digital",
    "infrastructure",
    "network",
    "connectivity",
    "5g",
    "6g",
    "internet",
    "cloud",
    "data hub",
  ],
  "Defense & Security": ["defense", "defence", "military", "drone", "uav", "surveillance"],
  "Biotech & Life Sciences": [
    "biotech",
    "health",
    "medical",
    "als",
    "neurodegenerative",
    "pharmaceutical",
    "life science",
  ],
  "Quantum Technologies": ["quantum", "qubit", "superposition"],
  "Civil Society & Values": ["citizen", "values", "democracy", "civil society", "civic"],
}

export function MarketIntelligence({ grants }: MarketIntelligenceProps) {
  // Count grants by category using real data
  const grantsByCategory = Object.entries(CATEGORIES)
    .map(([category, keywords]) => {
      const matchingGrants = grants.filter((grant) => {
        const searchText = `${grant.title} ${grant.description || ""} ${grant.category || ""}`.toLowerCase()
        return keywords.some((keyword) => searchText.includes(keyword))
      })
      return {
        category,
        count: matchingGrants.length,
        grants: matchingGrants,
        euCount: matchingGrants.filter((g) => g.source === "eu").length,
        usaCount: matchingGrants.filter((g) => g.source === "usa").length,
      }
    })
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count)

  // Calculate grants closing soon (real deadlines)
  const now = new Date()
  const closingSoon = grants
    .filter((grant) => {
      const closeDate = new Date(grant.closeDate)
      const daysUntilClose = Math.ceil((closeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return daysUntilClose > 0 && daysUntilClose <= 30
    })
    .sort((a, b) => new Date(a.closeDate).getTime() - new Date(b.closeDate).getTime())

  const closingIn60Days = grants.filter((grant) => {
    const closeDate = new Date(grant.closeDate)
    const daysUntilClose = Math.ceil((closeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntilClose > 30 && daysUntilClose <= 60
  })

  const closingIn90Days = grants.filter((grant) => {
    const closeDate = new Date(grant.closeDate)
    const daysUntilClose = Math.ceil((closeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntilClose > 60 && daysUntilClose <= 90
  })

  // Calculate opportunities by Arquimea company (real matching)
  const opportunitiesByCompany = ARQUIMEA_COMPANIES.map((company) => {
    const relevantGrants = grants.filter((grant) => {
      const searchText = `${grant.title} ${grant.description || ""} ${grant.category || ""}`.toLowerCase()
      return company.focus.some((keyword) => searchText.includes(keyword))
    })
    return {
      ...company,
      opportunities: relevantGrants.length,
      relevantGrants,
      topGrants: relevantGrants.slice(0, 3),
    }
  }).sort((a, b) => b.opportunities - a.opportunities)

  // Calculate timeline distribution (real data)
  const monthlyDistribution = grants.reduce(
    (acc, grant) => {
      const closeDate = new Date(grant.closeDate)
      const monthKey = closeDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })
      acc[monthKey] = (acc[monthKey] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  return (
    <div className="space-y-6">
      {/* Real-time Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-[#1e3a5f] text-white">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{grants.length}</p>
            <p className="text-sm text-blue-200">Total Open Grants</p>
          </CardContent>
        </Card>
        <Card className="bg-green-600 text-white">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{grants.filter((g) => g.source === "eu").length}</p>
            <p className="text-sm text-green-200">EU Opportunities</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-600 text-white">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{grants.filter((g) => g.source === "usa").length}</p>
            <p className="text-sm text-blue-200">USA Opportunities</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-600 text-white">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{closingSoon.length}</p>
            <p className="text-sm text-amber-200">Closing in 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Distribution by Category (Real Data) */}
      <Card className="border-[#1e3a5f]">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-[#1e3a5f] flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Open Opportunities by Category
          </CardTitle>
          <p className="text-sm text-gray-500">Real-time distribution based on {grants.length} available grants</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {grantsByCategory.map(({ category, count, euCount, usaCount }) => (
              <Card key={category} className="bg-gray-50">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-sm text-[#1e3a5f]">{category}</h4>
                    <Badge className="bg-[#1e3a5f]">{count}</Badge>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {euCount > 0 && (
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                        EU: {euCount}
                      </Badge>
                    )}
                    {usaCount > 0 && (
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-300">
                        USA: {usaCount}
                      </Badge>
                    )}
                  </div>
                  {/* Progress bar showing relative distribution */}
                  <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#1e3a5f] rounded-full"
                      style={{ width: `${Math.min((count / grants.length) * 100 * 3, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{((count / grants.length) * 100).toFixed(1)}% of total</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Deadline Timeline (Real Data) */}
      <Card className="border-[#1e3a5f]">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-[#1e3a5f] flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Deadline Timeline
          </CardTitle>
          <p className="text-sm text-gray-500">Grants organized by closing date</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <h4 className="font-semibold text-red-800">Next 30 Days</h4>
                </div>
                <p className="text-3xl font-bold text-red-600">{closingSoon.length}</p>
                <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                  {closingSoon.slice(0, 5).map((grant) => (
                    <div key={grant.id} className="text-xs text-red-700 truncate">
                      • {grant.title.substring(0, 40)}...
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-5 w-5 text-amber-600" />
                  <h4 className="font-semibold text-amber-800">31-60 Days</h4>
                </div>
                <p className="text-3xl font-bold text-amber-600">{closingIn60Days.length}</p>
                <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                  {closingIn60Days.slice(0, 5).map((grant) => (
                    <div key={grant.id} className="text-xs text-amber-700 truncate">
                      • {grant.title.substring(0, 40)}...
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-5 w-5 text-green-600" />
                  <h4 className="font-semibold text-green-800">61-90 Days</h4>
                </div>
                <p className="text-3xl font-bold text-green-600">{closingIn90Days.length}</p>
                <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                  {closingIn90Days.slice(0, 5).map((grant) => (
                    <div key={grant.id} className="text-xs text-green-700 truncate">
                      • {grant.title.substring(0, 40)}...
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Opportunities by Arquimea Company (Real Matching) */}
      <Card className="border-[#1e3a5f]">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-[#1e3a5f] flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Opportunities by Arquimea Group Company
          </CardTitle>
          <p className="text-sm text-gray-500">Real-time matching based on company focus areas and available grants</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {opportunitiesByCompany.map((company) => {
              const Icon = company.icon
              return (
                <Card
                  key={company.name}
                  className={company.opportunities > 0 ? "bg-blue-50 border-blue-200" : "bg-gray-50"}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className={`p-2 rounded-lg ${company.opportunities > 0 ? "bg-[#1e3a5f] text-white" : "bg-gray-300 text-gray-600"}`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-[#1e3a5f]">{company.name}</h4>
                        <p className="text-xs text-gray-500">{company.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex flex-wrap gap-1">
                        {company.focus.slice(0, 2).map((f) => (
                          <Badge key={f} variant="outline" className="text-xs py-0 capitalize">
                            {f}
                          </Badge>
                        ))}
                      </div>
                      <div
                        className={`text-2xl font-bold ${company.opportunities > 0 ? "text-[#1e3a5f]" : "text-gray-400"}`}
                      >
                        {company.opportunities}
                      </div>
                    </div>
                    {company.opportunities > 0 && (
                      <div className="mt-3 pt-2 border-t">
                        <p className="text-xs text-gray-600 mb-1">Top opportunities:</p>
                        <div className="space-y-1">
                          {company.topGrants.map((grant) => (
                            <p key={grant.id} className="text-xs text-[#1e3a5f] truncate">
                              • {grant.title.substring(0, 45)}...
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Distribution */}
      <Card className="border-[#1e3a5f]">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-[#1e3a5f] flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Deadline Distribution by Month
          </CardTitle>
          <p className="text-sm text-gray-500">Number of grants closing each month</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(monthlyDistribution)
              .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
              .map(([month, count]) => (
                <Badge key={month} variant="outline" className="py-2 px-3">
                  <span className="font-medium">{month}:</span>
                  <span className="ml-1 text-[#1e3a5f] font-bold">{count}</span>
                </Badge>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Source Notice */}
      <div className="text-center text-xs text-gray-500 mt-4 p-3 bg-gray-50 rounded-lg">
        <p>All data shown is calculated in real-time from {grants.length} grants loaded from official sources:</p>
        <p className="mt-1">
          <span className="font-medium">EU:</span> EU Funding & Tenders Portal |
          <span className="font-medium ml-2">USA:</span> Grants.gov & SAM.gov
        </p>
        <p className="mt-1 text-gray-400">Last updated: {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  )
}
