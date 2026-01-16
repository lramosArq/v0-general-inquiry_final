"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Globe, Flag, LogOut, Bell, BarChart3, Loader2 } from "lucide-react"
import { AlertsPanel } from "@/components/alerts-panel"
import { MarketIntelligence } from "@/components/market-intelligence"
import { LoginScreen } from "@/components/login-screen"
import { UserService, type User as UserType } from "@/lib/user-service"

interface Grant {
  id: string
  opportunityNumber: string
  title: string
  agency: string
  status: "Forecasted" | "Open" | "Closed" | "Archived"
  postedDate: string
  closeDate: string
  category: string
  fundingInstrument: string
  eligibility: string[]
  amount?: number
  description: string
  url: string
  source: "usa" | "eu"
}

export default function GrantsSearchPage() {
  const [grants, setGrants] = useState<Grant[]>([])
  const [filteredGrants, setFilteredGrants] = useState<Grant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [activeTab, setActiveTab] = useState("search")
  const itemsPerPage = 25

  const [currentUser, setCurrentUser] = useState<UserType | null>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [showAlertsPanel, setShowAlertsPanel] = useState(false)

  // Search filters
  const [keyword, setKeyword] = useState("")
  const [opportunityNumber, setOpportunityNumber] = useState("")
  const [assistanceListings, setAssistanceListings] = useState("")
  const [sortBy, setSortBy] = useState("posted-desc")
  const [dateRange, setDateRange] = useState("all")

  const [sourceFilter, setSourceFilter] = useState({
    all: true,
    usa: false,
    eu: false,
  })

  const [statusFilters, setStatusFilters] = useState({
    forecasted: true,
    open: true,
    closed: false,
    archived: false,
  })

  const [fundingInstruments, setFundingInstruments] = useState({
    all: true,
    researchInnovation: false,
    innovation: false,
    coordination: false,
    cascade: false,
    simpleGrants: false,
  })

  const [eligibilityFilters, setEligibilityFilters] = useState({
    all: true,
    universities: false,
    research: false,
    smes: false,
    publicBodies: false,
    ngos: false,
  })

  const [categoryFilters, setCategoryFilters] = useState({
    all: true,
    horizonEurope: false,
    digitalEurope: false,
    cerv: false,
    cybersecurity: false,
    ai: false,
    space: false,
  })

  const [agencyFilters, setAgencyFilters] = useState({
    all: true,
    horizon: false,
    digital: false,
    cerv: false,
  })

  useEffect(() => {
    const userService = UserService.getInstance()
    const user = userService.getCurrentUser()
    if (user) {
      setCurrentUser({ ...user, alerts: user.alerts || [] })
    }
    setIsCheckingAuth(false)
  }, [])

  useEffect(() => {
    if (currentUser) {
      fetchGrants()
    }
  }, [currentUser])

  useEffect(() => {
    if (grants.length > 0) {
      applyFilters()
    }
  }, [grants, keyword, opportunityNumber, sourceFilter, statusFilters, fundingInstruments, categoryFilters, sortBy])

  const fetchGrants = async () => {
    setIsLoading(true)
    try {
      console.log("[v0] Fetching grants...")
      const response = await fetch("/api/grants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: "all",
          source: "all",
        }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log("[v0] API Response:", result)
        const fetchedGrants = result.data || result.grants || []
        console.log("[v0] Fetched grants count:", fetchedGrants.length)
        setGrants(fetchedGrants)
        setFilteredGrants(fetchedGrants)
      } else {
        console.error("[v0] API Error:", response.status)
      }
    } catch (error) {
      console.error("[v0] Error fetching grants:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...grants]

    // Source filter
    if (!sourceFilter.all) {
      if (sourceFilter.usa) {
        filtered = filtered.filter((g) => g.source === "usa")
      } else if (sourceFilter.eu) {
        filtered = filtered.filter((g) => g.source === "eu")
      }
    }

    // Keyword filter
    if (keyword) {
      const lowerKeyword = keyword.toLowerCase()
      filtered = filtered.filter(
        (g) =>
          g.title.toLowerCase().includes(lowerKeyword) ||
          g.opportunityNumber.toLowerCase().includes(lowerKeyword) ||
          g.agency.toLowerCase().includes(lowerKeyword) ||
          g.description?.toLowerCase().includes(lowerKeyword),
      )
    }

    // Opportunity number filter
    if (opportunityNumber) {
      filtered = filtered.filter((g) => g.opportunityNumber.toLowerCase().includes(opportunityNumber.toLowerCase()))
    }

    // Status filter
    const activeStatuses: string[] = []
    if (statusFilters.forecasted) activeStatuses.push("Forecasted")
    if (statusFilters.open) activeStatuses.push("Open")
    if (statusFilters.closed) activeStatuses.push("Closed")
    if (statusFilters.archived) activeStatuses.push("Archived")

    if (activeStatuses.length > 0 && activeStatuses.length < 4) {
      filtered = filtered.filter((g) => {
        const mappedStatus = mapStatus(g.status)
        return activeStatuses.includes(mappedStatus)
      })
    }

    // Category filter
    if (!categoryFilters.all) {
      filtered = filtered.filter((g) => {
        const titleLower = g.title.toLowerCase()
        const idLower = g.opportunityNumber.toLowerCase()

        if (categoryFilters.horizonEurope && (titleLower.includes("horizon") || idLower.includes("horizon")))
          return true
        if (categoryFilters.digitalEurope && (titleLower.includes("digital") || idLower.includes("digital")))
          return true
        if (categoryFilters.cerv && (titleLower.includes("cerv") || idLower.includes("cerv"))) return true
        if (categoryFilters.cybersecurity && titleLower.includes("cyber")) return true
        if (categoryFilters.ai && (titleLower.includes("artificial intelligence") || titleLower.includes(" ai ")))
          return true
        if (
          categoryFilters.space &&
          (titleLower.includes("space") || titleLower.includes("satellite") || titleLower.includes("gravimetry"))
        )
          return true

        return false
      })
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "posted-desc":
          return new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime()
        case "posted-asc":
          return new Date(a.postedDate).getTime() - new Date(b.postedDate).getTime()
        case "close-desc":
          return new Date(b.closeDate).getTime() - new Date(a.closeDate).getTime()
        case "close-asc":
          return new Date(a.closeDate).getTime() - new Date(b.closeDate).getTime()
        default:
          return 0
      }
    })

    setFilteredGrants(filtered)
    setCurrentPage(1)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    applyFilters()
  }

  const getCurrentFilters = () => {
    const sources: string[] = []
    if (sourceFilter.all) sources.push("all")
    if (sourceFilter.usa) sources.push("usa")
    if (sourceFilter.eu) sources.push("eu")

    const categories: string[] = []
    if (categoryFilters.all) categories.push("all")
    if (categoryFilters.horizonEurope) categories.push("horizonEurope")
    if (categoryFilters.digitalEurope) categories.push("digitalEurope")
    if (categoryFilters.cerv) categories.push("cerv")
    if (categoryFilters.cybersecurity) categories.push("cybersecurity")
    if (categoryFilters.ai) categories.push("ai")
    if (categoryFilters.space) categories.push("space")

    const statuses: string[] = []
    if (statusFilters.forecasted) statuses.push("forecasted")
    if (statusFilters.open) statuses.push("open")
    if (statusFilters.closed) statuses.push("closed")
    if (statusFilters.archived) statuses.push("archived")

    const instruments: string[] = []
    if (fundingInstruments.all) instruments.push("all")
    if (fundingInstruments.researchInnovation) instruments.push("researchInnovation")
    if (fundingInstruments.innovation) instruments.push("innovation")
    if (fundingInstruments.coordination) instruments.push("coordination")
    if (fundingInstruments.cascade) instruments.push("cascade")
    if (fundingInstruments.simpleGrants) instruments.push("simpleGrants")

    return {
      keyword: keyword || "all",
      sources,
      statuses,
      categories,
      fundingInstruments: instruments,
    }
  }

  const handleLogout = () => {
    const userService = UserService.getInstance()
    userService.logout()
    setCurrentUser(null)
    setShowAlertsPanel(false)
    setGrants([])
    setFilteredGrants([])
  }

  const handleAuthSuccess = (user: UserType) => {
    setCurrentUser({ ...user, alerts: user.alerts || [] })
  }

  // Pagination
  const totalPages = Math.ceil(filteredGrants.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedGrants = filteredGrants.slice(startIndex, startIndex + itemsPerPage)

  const mapStatus = (status: string | undefined | null): "Forecasted" | "Open" | "Closed" | "Archived" => {
    if (!status) return "Open"
    const s = status.toLowerCase()
    if (s.includes("open") || s.includes("posted") || s.includes("active") || s.includes("submission")) return "Open"
    if (s.includes("forecast") || s.includes("forthcoming")) return "Forecasted"
    if (s.includes("closed") || s.includes("expired")) return "Closed"
    if (s.includes("archived")) return "Archived"
    return "Open"
  }

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] to-[#2d4a6f] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-white animate-spin" />
      </div>
    )
  }

  if (!currentUser) {
    return <LoginScreen onAuthSuccess={handleAuthSuccess} />
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Header */}
      <header className="bg-[#1e3a5f] text-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-wide">ARQUIMEA GRANTS SEARCH</h1>
              <p className="text-sm text-blue-200">DISCOVER. APPLY. SUCCEED.</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAlertsPanel(!showAlertsPanel)}
                className="text-white hover:bg-white/10"
              >
                <Bell className="h-4 w-4 mr-2" />
                Alertas ({currentUser?.alerts?.length || 0})
              </Button>
              <span className="text-sm text-blue-200">
                {currentUser.name} ({currentUser.businessUnit})
              </span>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white hover:bg-white/10">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-[#1e3a5f] border-t border-white/20">
        <div className="container mx-auto px-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-transparent h-auto p-0 gap-0">
              <TabsTrigger
                value="search"
                className="text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10 rounded-none border-b-2 border-transparent data-[state=active]:border-white px-6 py-3"
              >
                <Search className="h-4 w-4 mr-2" />
                Search Grants
              </TabsTrigger>
              <TabsTrigger
                value="intelligence"
                className="text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10 rounded-none border-b-2 border-transparent data-[state=active]:border-white px-6 py-3"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Market Intelligence
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {showAlertsPanel && (
          <Card className="mb-6 border-[#1e3a5f] border-2">
            <CardContent className="py-4">
              <AlertsPanel
                user={currentUser}
                onUserUpdate={setCurrentUser}
                currentFilters={getCurrentFilters()}
                grants={filteredGrants}
              />
            </CardContent>
          </Card>
        )}

        {activeTab === "intelligence" ? (
          <MarketIntelligence grants={grants} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Filters Sidebar */}
            <div className="lg:col-span-1">
              <Card className="border-[#d1d5db]">
                <CardContent className="p-4">
                  <h2 className="font-semibold text-[#1e3a5f] mb-4 text-lg">Filters</h2>

                  {/* Source Filter */}
                  <div className="mb-6">
                    <h3 className="font-medium text-sm mb-2 text-gray-700">Source</h3>
                    <div className="space-y-2">
                      {[
                        { key: "all", label: "All Sources", icon: Globe },
                        { key: "usa", label: "USA (Grants.gov)", icon: Flag },
                        { key: "eu", label: "EU (Funding & Tenders)", icon: Globe },
                      ].map(({ key, label, icon: Icon }) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Checkbox
                            id={`source-${key}`}
                            checked={sourceFilter[key as keyof typeof sourceFilter]}
                            onCheckedChange={(checked) => {
                              if (key === "all") {
                                setSourceFilter({ all: true, usa: false, eu: false })
                              } else {
                                setSourceFilter({
                                  all: false,
                                  usa: key === "usa" ? !!checked : false,
                                  eu: key === "eu" ? !!checked : false,
                                })
                              }
                            }}
                          />
                          <Label htmlFor={`source-${key}`} className="text-sm flex items-center gap-1 cursor-pointer">
                            <Icon className="h-3 w-3" />
                            {label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div className="mb-6">
                    <h3 className="font-medium text-sm mb-2 text-gray-700">Status</h3>
                    <div className="space-y-2">
                      {[
                        { key: "open", label: "Open" },
                        { key: "forecasted", label: "Forecasted" },
                        { key: "closed", label: "Closed" },
                        { key: "archived", label: "Archived" },
                      ].map(({ key, label }) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Checkbox
                            id={`status-${key}`}
                            checked={statusFilters[key as keyof typeof statusFilters]}
                            onCheckedChange={(checked) => setStatusFilters((prev) => ({ ...prev, [key]: !!checked }))}
                          />
                          <Label htmlFor={`status-${key}`} className="text-sm cursor-pointer">
                            {label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Category Filter */}
                  <div className="mb-6">
                    <h3 className="font-medium text-sm mb-2 text-gray-700">Category</h3>
                    <div className="space-y-2">
                      {[
                        { key: "all", label: "All Categories" },
                        { key: "horizonEurope", label: "Horizon Europe" },
                        { key: "digitalEurope", label: "Digital Europe" },
                        { key: "cerv", label: "CERV" },
                        { key: "cybersecurity", label: "Cybersecurity" },
                        { key: "ai", label: "Artificial Intelligence" },
                        { key: "space", label: "Space" },
                      ].map(({ key, label }) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Checkbox
                            id={`category-${key}`}
                            checked={categoryFilters[key as keyof typeof categoryFilters]}
                            onCheckedChange={(checked) => {
                              if (key === "all") {
                                setCategoryFilters({
                                  all: true,
                                  horizonEurope: false,
                                  digitalEurope: false,
                                  cerv: false,
                                  cybersecurity: false,
                                  ai: false,
                                  space: false,
                                })
                              } else {
                                setCategoryFilters((prev) => ({
                                  ...prev,
                                  all: false,
                                  [key]: !!checked,
                                }))
                              }
                            }}
                          />
                          <Label htmlFor={`category-${key}`} className="text-sm cursor-pointer">
                            {label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Funding Instrument Filter */}
                  <div className="mb-6">
                    <h3 className="font-medium text-sm mb-2 text-gray-700">Type of Action</h3>
                    <div className="space-y-2">
                      {[
                        { key: "all", label: "All Types" },
                        { key: "researchInnovation", label: "RIA (Research & Innovation)" },
                        { key: "innovation", label: "IA (Innovation Action)" },
                        { key: "coordination", label: "CSA (Coordination & Support)" },
                        { key: "cascade", label: "Cascade Funding" },
                        { key: "simpleGrants", label: "Simple Grants" },
                      ].map(({ key, label }) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Checkbox
                            id={`funding-${key}`}
                            checked={fundingInstruments[key as keyof typeof fundingInstruments]}
                            onCheckedChange={(checked) => {
                              if (key === "all") {
                                setFundingInstruments({
                                  all: true,
                                  researchInnovation: false,
                                  innovation: false,
                                  coordination: false,
                                  cascade: false,
                                  simpleGrants: false,
                                })
                              } else {
                                setFundingInstruments((prev) => ({
                                  ...prev,
                                  all: false,
                                  [key]: !!checked,
                                }))
                              }
                            }}
                          />
                          <Label htmlFor={`funding-${key}`} className="text-sm cursor-pointer">
                            {label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Programme Filter */}
                  <div className="mb-6">
                    <h3 className="font-medium text-sm mb-2 text-gray-700">Programme</h3>
                    <div className="space-y-2">
                      {[
                        { key: "all", label: "All Programmes" },
                        { key: "horizon", label: "Horizon Europe" },
                        { key: "digital", label: "Digital Europe" },
                        { key: "cerv", label: "CERV" },
                      ].map(({ key, label }) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Checkbox
                            id={`agency-${key}`}
                            checked={agencyFilters[key as keyof typeof agencyFilters]}
                            onCheckedChange={(checked) => {
                              if (key === "all") {
                                setAgencyFilters({
                                  all: true,
                                  horizon: false,
                                  digital: false,
                                  cerv: false,
                                })
                              } else {
                                setAgencyFilters((prev) => ({
                                  ...prev,
                                  all: false,
                                  [key]: !!checked,
                                }))
                              }
                            }}
                          />
                          <Label htmlFor={`agency-${key}`} className="text-sm cursor-pointer">
                            {label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Search Bar */}
              <Card className="mb-6 border-[#d1d5db]">
                <CardContent className="p-4">
                  <form onSubmit={handleSearch} className="flex gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search by keyword, opportunity number, or agency..."
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#2d4a6f]">
                      Search
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Results */}
              <Card className="border-[#d1d5db]">
                <CardContent className="p-0">
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex justify-between items-center">
                      <h2 className="font-semibold text-[#1e3a5f]">
                        {isLoading ? "Loading..." : `${filteredGrants.length} Opportunities Found`}
                      </h2>
                      <select
                        className="text-sm border rounded px-2 py-1"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                      >
                        <option value="posted-desc">Posted Date (Newest)</option>
                        <option value="posted-asc">Posted Date (Oldest)</option>
                        <option value="close-desc">Close Date (Latest)</option>
                        <option value="close-asc">Close Date (Soonest)</option>
                      </select>
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" />
                      <span className="ml-2 text-gray-600">Loading grants...</span>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-[#1e3a5f] text-white text-sm">
                          <tr>
                            <th className="text-left p-3">Opportunity Number</th>
                            <th className="text-left p-3">Title & Description</th>
                            <th className="text-left p-3">Agency</th>
                            <th className="text-left p-3">Status</th>
                            <th className="text-left p-3">Open Date</th>
                            <th className="text-left p-3">Close Date</th>
                            <th className="text-left p-3">Source</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {paginatedGrants.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="text-center py-8 text-gray-500">
                                No grants found matching your criteria
                              </td>
                            </tr>
                          ) : (
                            paginatedGrants.map((grant) => (
                              <tr key={grant.id} className="hover:bg-gray-50">
                                <td className="p-3 text-sm font-mono text-[#1e3a5f]">{grant.opportunityNumber}</td>
                                <td className="p-3 align-top">
                                  <a
                                    href={grant.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#1e3a5f] hover:underline font-medium text-sm block"
                                  >
                                    {grant.title}
                                  </a>
                                  {grant.description && (
                                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{grant.description}</p>
                                  )}
                                  <div className="flex gap-1 mt-2 flex-wrap">
                                    {grant.category && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs bg-purple-50 text-purple-700 border-purple-200"
                                      >
                                        {grant.category}
                                      </Badge>
                                    )}
                                    {grant.fundingInstrument && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs bg-amber-50 text-amber-700 border-amber-200"
                                      >
                                        {grant.fundingInstrument}
                                      </Badge>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3 text-sm text-gray-600">{grant.agency}</td>
                                <td className="p-3">
                                  <Badge
                                    className={
                                      mapStatus(grant.status) === "Open"
                                        ? "bg-green-100 text-green-800"
                                        : mapStatus(grant.status) === "Forecasted"
                                          ? "bg-blue-100 text-blue-800"
                                          : mapStatus(grant.status) === "Closed"
                                            ? "bg-red-100 text-red-800"
                                            : "bg-gray-100 text-gray-800"
                                    }
                                  >
                                    {mapStatus(grant.status)}
                                  </Badge>
                                </td>
                                <td className="p-3 text-sm text-gray-600">
                                  {new Date(grant.postedDate).toLocaleDateString()}
                                </td>
                                <td className="p-3 text-sm text-gray-600">
                                  {grant.closeDate ? new Date(grant.closeDate).toLocaleDateString() : "N/A"}
                                </td>
                                <td className="p-3">
                                  <Badge
                                    variant="outline"
                                    className={
                                      grant.source === "usa"
                                        ? "bg-blue-50 text-blue-700 border-blue-200"
                                        : "bg-yellow-50 text-yellow-700 border-yellow-200"
                                    }
                                  >
                                    {grant.source === "usa" ? "USA" : "EU"}
                                  </Badge>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="p-4 border-t border-gray-200 flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredGrants.length)} of{" "}
                        {filteredGrants.length}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <span className="flex items-center px-3 text-sm">
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-[#1e3a5f] text-white py-6 mt-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-blue-200">
            &copy; 2025 Arquimea Group. Data sourced from{" "}
            <a href="https://www.grants.gov" className="underline hover:text-white">
              Grants.gov
            </a>{" "}
            and{" "}
            <a href="https://ec.europa.eu/info/funding-tenders" className="underline hover:text-white">
              EU Funding & Tenders Portal
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
