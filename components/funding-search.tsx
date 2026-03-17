"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Search,
  Save,
  FolderOpen,
  RotateCcw,
  Calendar,
  Trash2,
  Edit3,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

// Types
interface SavedSearch {
  id: string
  name: string
  createdAt: string
  modifiedAt: string
  filters: SearchFilters
}

interface SearchFilters {
  prompt: string
  keywords: string
  status: string[]
  releaseDateFrom: string
  releaseDateTo: string
  closeDateFrom: string
  closeDateTo: string
  region: string[]
  orbVent: string[]
  programTechMap: string[]
  type: string[]
  naics: string[]
}

interface FundingSearchProps {
  onSearch: (filters: SearchFilters) => void
  onFiltersChange?: (filters: SearchFilters) => void
}

const DEFAULT_FILTERS: SearchFilters = {
  prompt: "",
  keywords: "",
  status: ["ALL"],
  releaseDateFrom: "",
  releaseDateTo: "",
  closeDateFrom: "",
  closeDateTo: "",
  region: ["ALL"],
  orbVent: ["ALL"],
  programTechMap: ["ALL"],
  type: ["ALL"],
  naics: [],
}

const STATUS_OPTIONS = ["ALL", "Active", "Closed"]
const REGION_OPTIONS = ["ALL", "US", "Europe", "Spain", "Other"]
const ORB_VENT_OPTIONS = [
  "ALL",
  "ARC-OTHERS",
  "BIO",
  "CONNECT",
  "DEFENSE",
  "MOLEFY",
  "ND",
  "PULSAR",
  "SPACE",
  "VOLINGA",
  "None",
]
const PROGRAM_TECHMAP_OPTIONS = ["ALL", "1", "2", "3", "N", "Others", "None"]
const TYPE_OPTIONS = ["ALL", "Grant", "Contract", "Cooperative Agreement", "Other"]

// Common NAICS codes for R&D
const NAICS_OPTIONS = [
  { code: "541710", description: "Research and Development in the Physical, Engineering, and Life Sciences" },
  { code: "541711", description: "Research and Development in Biotechnology" },
  { code: "541712", description: "Research and Development in Physical, Engineering, and Life Sciences (except Nanotechnology and Biotechnology)" },
  { code: "541713", description: "Research and Development in Nanotechnology" },
  { code: "541714", description: "Research and Development in Physical, Engineering, and Life Sciences (except Nanotechnology and Biotechnology)" },
  { code: "541715", description: "Research and Development in Physical, Engineering, and Life Sciences (except Nanotechnology and Biotechnology)" },
  { code: "541720", description: "Research and Development in the Social Sciences and Humanities" },
  { code: "334511", description: "Search, Detection, Navigation, Guidance, Aeronautical, and Nautical System and Instrument Manufacturing" },
  { code: "336411", description: "Aircraft Manufacturing" },
  { code: "336414", description: "Guided Missile and Space Vehicle Manufacturing" },
  { code: "336415", description: "Guided Missile and Space Vehicle Propulsion Unit and Propulsion Unit Parts Manufacturing" },
]

export function FundingSearch({ onSearch, onFiltersChange }: FundingSearchProps) {
  console.log("[v0] FundingSearch component rendering")
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS)
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const [showSavedSearches, setShowSavedSearches] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [newSearchName, setNewSearchName] = useState("")
  const [expandedSections, setExpandedSections] = useState({
    dates: true,
    classification: true,
    naics: false,
  })

  // Load saved searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("fundingSavedSearches")
      if (saved) {
        setSavedSearches(JSON.parse(saved))
      }
    } catch {
      /* ignore */
    }
  }, [])

  // Notify parent of filter changes
  useEffect(() => {
    onFiltersChange?.(filters)
  }, [filters, onFiltersChange])

  const updateFilter = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleMultiSelect = (key: keyof SearchFilters, value: string, currentValues: string[]) => {
    if (value === "ALL") {
      updateFilter(key, ["ALL"])
    } else {
      const newValues = currentValues.includes(value)
        ? currentValues.filter((v) => v !== value)
        : [...currentValues.filter((v) => v !== "ALL"), value]
      updateFilter(key, newValues.length === 0 ? ["ALL"] : newValues)
    }
  }

  const handleSearch = () => {
    onSearch(filters)
  }

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS)
  }

  const handleSaveSearch = () => {
    if (!newSearchName.trim()) return

    const newSearch: SavedSearch = {
      id: Date.now().toString(),
      name: newSearchName.trim(),
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      filters: { ...filters },
    }

    const updated = [...savedSearches, newSearch]
    setSavedSearches(updated)
    localStorage.setItem("fundingSavedSearches", JSON.stringify(updated))
    setNewSearchName("")
    setSaveDialogOpen(false)
  }

  const handleOpenSearch = (search: SavedSearch) => {
    setFilters(search.filters)
    setShowSavedSearches(false)
  }

  const handleDeleteSearch = (id: string) => {
    const updated = savedSearches.filter((s) => s.id !== id)
    setSavedSearches(updated)
    localStorage.setItem("fundingSavedSearches", JSON.stringify(updated))
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  return (
    <div className="space-y-4">
      {/* Main Search Card */}
      <Card className="border-[#1e3a5f] border-2">
        <CardHeader className="bg-[#1e3a5f] text-white py-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5" />
            Funding Opportunity Search
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {/* Prompt Field */}
          <div className="mb-4">
            <Label htmlFor="prompt" className="text-sm font-medium text-gray-700 mb-1 block">
              Prompt
            </Label>
            <Textarea
              id="prompt"
              placeholder="Describe in natural language the type of funding opportunity you want to find..."
              value={filters.prompt}
              onChange={(e) => updateFilter("prompt", e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* Keywords Field */}
          <div className="mb-4">
            <Label htmlFor="keywords" className="text-sm font-medium text-gray-700 mb-1 block">
              Keywords
            </Label>
            <Input
              id="keywords"
              placeholder="Enter keywords separated by commas..."
              value={filters.keywords}
              onChange={(e) => updateFilter("keywords", e.target.value)}
            />
          </div>

          {/* Quick Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Status */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Status</Label>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((status) => (
                  <Badge
                    key={status}
                    variant={filters.status.includes(status) ? "default" : "outline"}
                    className={`cursor-pointer ${
                      filters.status.includes(status)
                        ? "bg-[#1e3a5f] hover:bg-[#2d4a6f]"
                        : "hover:bg-gray-100"
                    }`}
                    onClick={() => handleMultiSelect("status", status, filters.status)}
                  >
                    {status}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Region */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Region</Label>
              <div className="flex flex-wrap gap-2">
                {REGION_OPTIONS.map((region) => (
                  <Badge
                    key={region}
                    variant={filters.region.includes(region) ? "default" : "outline"}
                    className={`cursor-pointer ${
                      filters.region.includes(region)
                        ? "bg-[#1e3a5f] hover:bg-[#2d4a6f]"
                        : "hover:bg-gray-100"
                    }`}
                    onClick={() => handleMultiSelect("region", region, filters.region)}
                  >
                    {region}
                  </Badge>
                ))}
              </div>
            </div>

            {/* ORB/Vent */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">ORB/Vent</Label>
              <div className="flex flex-wrap gap-1">
                {ORB_VENT_OPTIONS.slice(0, 5).map((orb) => (
                  <Badge
                    key={orb}
                    variant={filters.orbVent.includes(orb) ? "default" : "outline"}
                    className={`cursor-pointer text-xs ${
                      filters.orbVent.includes(orb)
                        ? "bg-[#1e3a5f] hover:bg-[#2d4a6f]"
                        : "hover:bg-gray-100"
                    }`}
                    onClick={() => handleMultiSelect("orbVent", orb, filters.orbVent)}
                  >
                    {orb}
                  </Badge>
                ))}
                <Dialog>
                  <DialogTrigger asChild>
                    <Badge variant="outline" className="cursor-pointer text-xs hover:bg-gray-100">
                      +{ORB_VENT_OPTIONS.length - 5} more
                    </Badge>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Select ORB/Vent</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-wrap gap-2 py-4">
                      {ORB_VENT_OPTIONS.map((orb) => (
                        <Badge
                          key={orb}
                          variant={filters.orbVent.includes(orb) ? "default" : "outline"}
                          className={`cursor-pointer ${
                            filters.orbVent.includes(orb)
                              ? "bg-[#1e3a5f] hover:bg-[#2d4a6f]"
                              : "hover:bg-gray-100"
                          }`}
                          onClick={() => handleMultiSelect("orbVent", orb, filters.orbVent)}
                        >
                          {orb}
                        </Badge>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Program / TechMap */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Program / TechMap</Label>
              <div className="flex flex-wrap gap-2">
                {PROGRAM_TECHMAP_OPTIONS.map((prog) => (
                  <Badge
                    key={prog}
                    variant={filters.programTechMap.includes(prog) ? "default" : "outline"}
                    className={`cursor-pointer text-xs ${
                      filters.programTechMap.includes(prog)
                        ? "bg-[#1e3a5f] hover:bg-[#2d4a6f]"
                        : "hover:bg-gray-100"
                    }`}
                    onClick={() => handleMultiSelect("programTechMap", prog, filters.programTechMap)}
                  >
                    {prog}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Collapsible Sections */}
          {/* Date Filters Section */}
          <div className="border rounded-lg mb-4">
            <button
              className="w-full flex items-center justify-between p-3 text-left font-medium text-gray-700 hover:bg-gray-50"
              onClick={() => toggleSection("dates")}
            >
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date Filters
              </span>
              {expandedSections.dates ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {expandedSections.dates && (
              <div className="p-3 pt-0 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Release Date */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Release Date</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={filters.releaseDateFrom}
                      onChange={(e) => updateFilter("releaseDateFrom", e.target.value)}
                      className="flex-1"
                    />
                    <span className="text-gray-500">to</span>
                    <Input
                      type="date"
                      value={filters.releaseDateTo}
                      onChange={(e) => updateFilter("releaseDateTo", e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* Close Date */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Close Date</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={filters.closeDateFrom}
                      onChange={(e) => updateFilter("closeDateFrom", e.target.value)}
                      className="flex-1"
                    />
                    <span className="text-gray-500">to</span>
                    <Input
                      type="date"
                      value={filters.closeDateTo}
                      onChange={(e) => updateFilter("closeDateTo", e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Type Filter */}
          <div className="mb-4">
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Type</Label>
            <div className="flex flex-wrap gap-2">
              {TYPE_OPTIONS.map((type) => (
                <Badge
                  key={type}
                  variant={filters.type.includes(type) ? "default" : "outline"}
                  className={`cursor-pointer ${
                    filters.type.includes(type)
                      ? "bg-[#1e3a5f] hover:bg-[#2d4a6f]"
                      : "hover:bg-gray-100"
                  }`}
                  onClick={() => handleMultiSelect("type", type, filters.type)}
                >
                  {type}
                </Badge>
              ))}
            </div>
          </div>

          {/* NAICS Section */}
          <div className="border rounded-lg mb-4">
            <button
              className="w-full flex items-center justify-between p-3 text-left font-medium text-gray-700 hover:bg-gray-50"
              onClick={() => toggleSection("naics")}
            >
              <span>NAICS Codes (Optional)</span>
              {expandedSections.naics ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {expandedSections.naics && (
              <div className="p-3 pt-0">
                <Input
                  placeholder="Search NAICS code or description..."
                  className="mb-2"
                />
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {NAICS_OPTIONS.map((naics) => (
                    <div key={naics.code} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                      <Checkbox
                        id={`naics-${naics.code}`}
                        checked={filters.naics.includes(naics.code)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            updateFilter("naics", [...filters.naics, naics.code])
                          } else {
                            updateFilter("naics", filters.naics.filter((c) => c !== naics.code))
                          }
                        }}
                      />
                      <Label htmlFor={`naics-${naics.code}`} className="text-sm cursor-pointer flex-1">
                        <span className="font-mono text-[#1e3a5f]">{naics.code}</span>
                        <span className="text-gray-600 ml-2">{naics.description}</span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-4 border-t">
            <Button onClick={handleSearch} className="bg-[#1e3a5f] hover:bg-[#2d4a6f]">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>

            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Filters
            </Button>

            <div className="flex-1" />

            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Save className="h-4 w-4 mr-2" />
                  Save Search
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Search</DialogTitle>
                  <DialogDescription>
                    Enter a name for this search to save it for later use.
                  </DialogDescription>
                </DialogHeader>
                <Input
                  placeholder="Search name..."
                  value={newSearchName}
                  onChange={(e) => setNewSearchName(e.target.value)}
                />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveSearch} className="bg-[#1e3a5f] hover:bg-[#2d4a6f]">
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button variant="outline" onClick={() => setShowSavedSearches(!showSavedSearches)}>
              <FolderOpen className="h-4 w-4 mr-2" />
              Saved Searches ({savedSearches.length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Saved Searches Panel */}
      {showSavedSearches && (
        <Card className="border-[#1e3a5f]">
          <CardHeader className="py-3 flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Saved Searches</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowSavedSearches(false)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {savedSearches.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No saved searches yet.</p>
            ) : (
              <div className="space-y-2">
                {savedSearches.map((search) => (
                  <div
                    key={search.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-[#1e3a5f]">{search.name}</p>
                      <p className="text-xs text-gray-500">
                        Created: {new Date(search.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenSearch(search)}
                        title="Open Search"
                      >
                        <FolderOpen className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSearch(search.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Delete Search"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Active Filters Summary */}
      {(filters.prompt ||
        filters.keywords ||
        !filters.status.includes("ALL") ||
        !filters.region.includes("ALL") ||
        !filters.orbVent.includes("ALL") ||
        !filters.programTechMap.includes("ALL") ||
        !filters.type.includes("ALL") ||
        filters.naics.length > 0 ||
        filters.releaseDateFrom ||
        filters.closeDateFrom) && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-blue-800">Active Filters:</span>
              {filters.prompt && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  Prompt: {filters.prompt.substring(0, 30)}...
                </Badge>
              )}
              {filters.keywords && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  Keywords: {filters.keywords}
                </Badge>
              )}
              {!filters.status.includes("ALL") && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  Status: {filters.status.join(", ")}
                </Badge>
              )}
              {!filters.region.includes("ALL") && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  Region: {filters.region.join(", ")}
                </Badge>
              )}
              {!filters.orbVent.includes("ALL") && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  ORB/Vent: {filters.orbVent.join(", ")}
                </Badge>
              )}
              {!filters.programTechMap.includes("ALL") && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  Program: {filters.programTechMap.join(", ")}
                </Badge>
              )}
              {!filters.type.includes("ALL") && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  Type: {filters.type.join(", ")}
                </Badge>
              )}
              {filters.naics.length > 0 && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  NAICS: {filters.naics.length} selected
                </Badge>
              )}
              {(filters.releaseDateFrom || filters.releaseDateTo) && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  Release: {filters.releaseDateFrom || "Any"} - {filters.releaseDateTo || "Any"}
                </Badge>
              )}
              {(filters.closeDateFrom || filters.closeDateTo) && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  Close: {filters.closeDateFrom || "Any"} - {filters.closeDateTo || "Any"}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 ml-auto"
              >
                Clear All
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export type { SearchFilters, SavedSearch }
