"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import {
  Globe,
  Flag,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  Save,
  RefreshCw,
  Trash2,
  Plus,
  Plug,
  Database,
} from "lucide-react"

export interface APIConfig {
  sam: {
    enabled: boolean
    keywords: string[]
    naicsCodes: string[]
    noticeTypes: {
      solicitation: boolean
      sourcesSought: boolean
      specialNotice: boolean
      baa: boolean
      presolicitation: boolean
    }
    activeOnly: boolean
    additionalPortals: {
      sbirSttr: boolean
      darpa: boolean
      afwerxDiu: boolean
    }
  }
  eu: {
    enabled: boolean
    keywords: string[]
    programmes: {
      horizonEurope: boolean
      digitalEurope: boolean
      euSpace: boolean
      edf: boolean
      edirpaAsap: boolean
      esa: boolean
    }
    topicPrefixes: string[]
    status: {
      open: boolean
      forthcoming: boolean
      closed: boolean
    }
  }
  blocklist: {
    ids: string[]
    keywords: string[]
  }
}

const DEFAULT_CONFIG: APIConfig = {
  sam: {
    enabled: true,
    keywords: [
      "UAS", "UAV", "drone", "loitering munition", "counter-UAS", "C-UAS",
      "electronic warfare", "EW systems", "satellite systems", "space components",
      "small satellites", "ISR", "surveillance systems", "naval autonomous systems",
      "USV", "UUV", "defense electronics", "dual-use technology",
      "secure communications", "advanced aerospace manufacturing",
      "defense R&D", "military innovation funding",
    ],
    naicsCodes: [
      "541715", "334511", "336414", "541330", "336419", "928110",
      "334220", "334290", "336411", "334519", "541512",
    ],
    noticeTypes: {
      solicitation: true,
      sourcesSought: true,
      specialNotice: true,
      baa: true,
      presolicitation: true,
    },
    activeOnly: true,
    additionalPortals: {
      sbirSttr: true,
      darpa: true,
      afwerxDiu: true,
    },
  },
  eu: {
    enabled: true,
    keywords: [
      "UAS", "UAV", "drone", "counter-UAS", "electronic warfare",
      "satellite", "space systems", "ISR", "sensors", "autonomous systems",
      "defense", "dual-use", "secure communications", "cybersecurity",
      "advanced manufacturing", "naval systems",
    ],
    programmes: {
      horizonEurope: true,
      digitalEurope: true,
      euSpace: true,
      edf: true,
      edirpaAsap: true,
      esa: true,
    },
    topicPrefixes: [
      "HORIZON-CL4-2026-SPACE",
      "HORIZON-CL3-2026",
      "DIGITAL-ECCC",
      "HORIZON-WIDERA",
      "HORIZON-EIC",
      "EDF-2026",
      "EDIRPA",
      "EDIP",
      "HORIZON-CL4-2026-DIGITAL",
    ],
    status: {
      open: true,
      forthcoming: true,
      closed: false,
    },
  },
  blocklist: {
    ids: ["VA-NCA-VCGP-2026"],
    keywords: ["veterans cemetery"],
  },
}

const NAICS_DESCRIPTIONS: Record<string, string> = {
  "541715": "R&D in Physical, Engineering and Life Sciences",
  "334511": "Search, Detection, Navigation & Guidance Systems",
  "336414": "Guided Missile & Space Vehicle Manufacturing",
  "541330": "Engineering Services",
  "541512": "Computer Systems Design Services",
  "334220": "Radio & TV Broadcasting Equipment",
  "336419": "Other Guided Missile & Space Vehicle Parts",
  "928110": "National Security",
  "334290": "Other Communications Equipment",
  "336411": "Aircraft Manufacturing",
  "334519": "Other Measuring & Controlling Device Mfg",
  "541711": "R&D in Biotechnology",
  "334515": "Electricity & Signal Testing Instruments",
  "336413": "Other Aircraft Parts & Auxiliary Equipment",
}

interface TestResult {
  source: "sam" | "eu"
  success: boolean
  count: number
  message: string
  sample?: string[]
}

interface APIConnectionsPanelProps {
  onConfigSave: (config: APIConfig) => void
  onRefresh: () => void
}

export function APIConnectionsPanel({ onConfigSave, onRefresh }: APIConnectionsPanelProps) {
  const [config, setConfig] = useState<APIConfig>(DEFAULT_CONFIG)
  const [testingSam, setTestingSam] = useState(false)
  const [testingEu, setTestingEu] = useState(false)
  const [samResult, setSamResult] = useState<TestResult | null>(null)
  const [euResult, setEuResult] = useState<TestResult | null>(null)
  const [saved, setSaved] = useState(false)
  const [newBlockId, setNewBlockId] = useState("")
  const [newBlockKeyword, setNewBlockKeyword] = useState("")
  const [newSamKeyword, setNewSamKeyword] = useState("")
  const [newEuKeyword, setNewEuKeyword] = useState("")
  const [newNaics, setNewNaics] = useState("")
  const [newTopicPrefix, setNewTopicPrefix] = useState("")

  useEffect(() => {
    const savedConfig = localStorage.getItem("apiConfig")
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig)
        // Deep merge with defaults to ensure new fields exist
        setConfig({
          sam: {
            ...DEFAULT_CONFIG.sam,
            ...parsed.sam,
            noticeTypes: { ...DEFAULT_CONFIG.sam.noticeTypes, ...(parsed.sam?.noticeTypes || {}) },
            additionalPortals: { ...DEFAULT_CONFIG.sam.additionalPortals, ...(parsed.sam?.additionalPortals || {}) },
          },
          eu: {
            ...DEFAULT_CONFIG.eu,
            ...parsed.eu,
            programmes: { ...DEFAULT_CONFIG.eu.programmes, ...(parsed.eu?.programmes || {}) },
            status: { ...DEFAULT_CONFIG.eu.status, ...(parsed.eu?.status || {}) },
          },
          blocklist: {
            ...DEFAULT_CONFIG.blocklist,
            ...parsed.blocklist,
          },
        })
      } catch {
        // use default
      }
    }
  }, [])

  const handleTestSam = async () => {
    setTestingSam(true)
    setSamResult(null)
    try {
      const response = await fetch("/api/grants/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "sam", config: config.sam }),
      })
      const result = await response.json()
      setSamResult({
        source: "sam",
        success: result.success,
        count: result.count || 0,
        message: result.message || "",
        sample: result.sample || [],
      })
    } catch (error) {
      setSamResult({
        source: "sam",
        success: false,
        count: 0,
        message: error instanceof Error ? error.message : "Connection failed",
      })
    } finally {
      setTestingSam(false)
    }
  }

  const handleTestEu = async () => {
    setTestingEu(true)
    setEuResult(null)
    try {
      const response = await fetch("/api/grants/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "eu", config: config.eu }),
      })
      const result = await response.json()
      setEuResult({
        source: "eu",
        success: result.success,
        count: result.count || 0,
        message: result.message || "",
        sample: result.sample || [],
      })
    } catch (error) {
      setEuResult({
        source: "eu",
        success: false,
        count: 0,
        message: error instanceof Error ? error.message : "Connection failed",
      })
    } finally {
      setTestingEu(false)
    }
  }

  const handleSave = () => {
    localStorage.setItem("apiConfig", JSON.stringify(config))
    onConfigSave(config)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleSaveAndApply = () => {
    handleSave()
    onRefresh()
  }

  const addToList = (
    path: "sam.keywords" | "sam.naicsCodes" | "eu.keywords" | "eu.topicPrefixes" | "blocklist.ids" | "blocklist.keywords",
    value: string,
    setter: (v: string) => void,
  ) => {
    if (!value.trim()) return
    setConfig((prev) => {
      const newConfig = { ...prev }
      const [section, key] = path.split(".") as [keyof APIConfig, string]
      const sectionObj = { ...newConfig[section] } as any
      if (!sectionObj[key].includes(value.trim())) {
        sectionObj[key] = [...sectionObj[key], value.trim()]
      }
      ;(newConfig as any)[section] = sectionObj
      return newConfig
    })
    setter("")
  }

  const removeFromList = (
    path: "sam.keywords" | "sam.naicsCodes" | "eu.keywords" | "eu.topicPrefixes" | "blocklist.ids" | "blocklist.keywords",
    value: string,
  ) => {
    setConfig((prev) => {
      const newConfig = { ...prev }
      const [section, key] = path.split(".") as [keyof APIConfig, string]
      const sectionObj = { ...newConfig[section] } as any
      sectionObj[key] = sectionObj[key].filter((v: string) => v !== value)
      ;(newConfig as any)[section] = sectionObj
      return newConfig
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#1e3a5f] flex items-center gap-2">
            <Plug className="h-5 w-5" />
            API Connections & Search Configuration
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Configure the search parameters for SAM.gov and EU Funding & Tenders Portal APIs. Test connections and apply filters to your grant search.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSave} className="border-[#1e3a5f] text-[#1e3a5f]">
            {saved ? <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" /> : <Save className="h-4 w-4 mr-2" />}
            {saved ? "Saved" : "Save Config"}
          </Button>
          <Button size="sm" onClick={handleSaveAndApply} className="bg-[#1e3a5f] hover:bg-[#2a4f7f] text-white">
            <RefreshCw className="h-4 w-4 mr-2" />
            Save & Apply
          </Button>
        </div>
      </div>

      {/* ARQUIMEA Strategic Focus Areas */}
      <Card className="border-[#1e3a5f]/20 bg-[#f0f4f8]">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Search className="h-4 w-4 text-[#1e3a5f]" />
            <h3 className="font-semibold text-[#1e3a5f] text-sm">ARQUIMEA Group - Strategic Technology Areas</h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              "UAS / UAV / Drones",
              "Loitering Munitions",
              "Counter-UAS (C-UAS)",
              "Space Systems & Satellite Components",
              "Defense Electronics",
              "Electronic Warfare (EW)",
              "ISR & Advanced Sensors",
              "Naval Autonomous Systems (USV/UUV)",
              "Secure Communications",
              "Dual-use Aerospace Tech",
              "Advanced Manufacturing",
            ].map((area) => (
              <Badge
                key={area}
                variant="secondary"
                className="text-xs bg-[#1e3a5f]/10 text-[#1e3a5f] border border-[#1e3a5f]/20"
              >
                {area}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Search configuration aligned with ARQUIMEA Group capabilities across defense, space, and dual-use sectors.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SAM.gov Panel */}
        <Card className="border-[#1e3a5f]/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flag className="h-5 w-5 text-[#1e3a5f]" />
                <h3 className="font-semibold text-[#1e3a5f] text-lg">SAM.gov API</h3>
                <Badge variant="outline" className="text-xs border-blue-300 text-blue-700 bg-blue-50">
                  USA
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="sam-enabled" className="text-xs text-gray-500">
                  Enabled
                </Label>
                <Switch
                  id="sam-enabled"
                  checked={config.sam.enabled}
                  onCheckedChange={(checked) =>
                    setConfig((prev) => ({ ...prev, sam: { ...prev.sam, enabled: checked } }))
                  }
                />
              </div>
            </div>

            <div className={`space-y-4 ${!config.sam.enabled ? "opacity-50 pointer-events-none" : ""}`}>
              {/* SAM Keywords */}
              <div>
                <Label className="text-sm font-medium text-gray-700">Search Keywords</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="e.g. radar, drones, C5ISR..."
                    value={newSamKeyword}
                    onChange={(e) => setNewSamKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addToList("sam.keywords", newSamKeyword, setNewSamKeyword)}
                    className="text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addToList("sam.keywords", newSamKeyword, setNewSamKeyword)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {config.sam.keywords.map((kw) => (
                    <Badge
                      key={kw}
                      variant="secondary"
                      className="text-xs bg-blue-50 text-blue-700 cursor-pointer hover:bg-red-50 hover:text-red-700 transition-colors"
                      onClick={() => removeFromList("sam.keywords", kw)}
                    >
                      {kw} <Trash2 className="h-2.5 w-2.5 ml-1" />
                    </Badge>
                  ))}
                </div>
              </div>

              {/* NAICS Codes */}
              <div>
                <Label className="text-sm font-medium text-gray-700">NAICS Codes</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="e.g. 541715"
                    value={newNaics}
                    onChange={(e) => setNewNaics(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addToList("sam.naicsCodes", newNaics, setNewNaics)}
                    className="text-sm"
                  />
                  <Button size="sm" variant="outline" onClick={() => addToList("sam.naicsCodes", newNaics, setNewNaics)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {config.sam.naicsCodes.map((code) => (
                    <Badge
                      key={code}
                      variant="secondary"
                      className="text-xs bg-amber-50 text-amber-700 cursor-pointer hover:bg-red-50 hover:text-red-700 transition-colors"
                      onClick={() => removeFromList("sam.naicsCodes", code)}
                    >
                      {code}
                      {NAICS_DESCRIPTIONS[code] ? ` - ${NAICS_DESCRIPTIONS[code]}` : ""}
                      <Trash2 className="h-2.5 w-2.5 ml-1" />
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Notice Types */}
              <div>
                <Label className="text-sm font-medium text-gray-700">Notice Types</Label>
                <div className="flex flex-wrap gap-4 mt-2">
                  {[
                    { key: "solicitation", label: "Solicitation" },
                    { key: "sourcesSought", label: "Sources Sought" },
                    { key: "specialNotice", label: "Special Notice" },
                    { key: "baa", label: "BAA (Broad Agency)" },
                    { key: "presolicitation", label: "Presolicitation" },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-1.5">
                      <Checkbox
                        id={`sam-${key}`}
                        checked={config.sam.noticeTypes[key as keyof typeof config.sam.noticeTypes]}
                        onCheckedChange={(checked) =>
                          setConfig((prev) => ({
                            ...prev,
                            sam: {
                              ...prev.sam,
                              noticeTypes: { ...prev.sam.noticeTypes, [key]: checked },
                            },
                          }))
                        }
                      />
                      <Label htmlFor={`sam-${key}`} className="text-xs text-gray-600">
                        {label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional US Portals */}
              <div>
                <Label className="text-sm font-medium text-gray-700">Additional US Portals</Label>
                <div className="flex flex-wrap gap-4 mt-2">
                  {[
                    { key: "sbirSttr", label: "DoD SBIR/STTR" },
                    { key: "darpa", label: "DARPA BAA" },
                    { key: "afwerxDiu", label: "AFWERX / DIU" },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-1.5">
                      <Checkbox
                        id={`sam-portal-${key}`}
                        checked={config.sam.additionalPortals[key as keyof typeof config.sam.additionalPortals]}
                        onCheckedChange={(checked) =>
                          setConfig((prev) => ({
                            ...prev,
                            sam: {
                              ...prev.sam,
                              additionalPortals: { ...prev.sam.additionalPortals, [key]: checked },
                            },
                          }))
                        }
                      />
                      <Label htmlFor={`sam-portal-${key}`} className="text-xs text-gray-600">
                        {label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Only */}
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-gray-700">Active Opportunities Only</Label>
                <Switch
                  checked={config.sam.activeOnly}
                  onCheckedChange={(checked) =>
                    setConfig((prev) => ({ ...prev, sam: { ...prev.sam, activeOnly: checked } }))
                  }
                />
              </div>

              {/* Test Connection Button */}
              <Button
                onClick={handleTestSam}
                disabled={testingSam}
                className="w-full bg-[#1e3a5f] hover:bg-[#2a4f7f] text-white"
              >
                {testingSam ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Testing Connection...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" /> Test SAM.gov Connection
                  </>
                )}
              </Button>

              {/* Test Result */}
              {samResult && (
                <div
                  className={`p-3 rounded-lg border ${samResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {samResult.success ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className={`text-sm font-medium ${samResult.success ? "text-green-700" : "text-red-700"}`}>
                      {samResult.success
                        ? `${samResult.count} opportunities found`
                        : "Connection failed"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">{samResult.message}</p>
                  {samResult.sample && samResult.sample.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs font-medium text-gray-500">Sample results:</p>
                      {samResult.sample.map((title, i) => (
                        <p key={i} className="text-xs text-gray-600 truncate">
                          {i + 1}. {title}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* EU Funding Panel */}
        <Card className="border-[#1e3a5f]/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-[#1e3a5f]" />
                <h3 className="font-semibold text-[#1e3a5f] text-lg">EU Funding & Tenders</h3>
                <Badge variant="outline" className="text-xs border-yellow-400 text-yellow-700 bg-yellow-50">
                  EU
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="eu-enabled" className="text-xs text-gray-500">
                  Enabled
                </Label>
                <Switch
                  id="eu-enabled"
                  checked={config.eu.enabled}
                  onCheckedChange={(checked) =>
                    setConfig((prev) => ({ ...prev, eu: { ...prev.eu, enabled: checked } }))
                  }
                />
              </div>
            </div>

            <div className={`space-y-4 ${!config.eu.enabled ? "opacity-50 pointer-events-none" : ""}`}>
              {/* EU Keywords */}
              <div>
                <Label className="text-sm font-medium text-gray-700">Search Keywords</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="e.g. quantum, satellite, AI..."
                    value={newEuKeyword}
                    onChange={(e) => setNewEuKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addToList("eu.keywords", newEuKeyword, setNewEuKeyword)}
                    className="text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addToList("eu.keywords", newEuKeyword, setNewEuKeyword)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {config.eu.keywords.map((kw) => (
                    <Badge
                      key={kw}
                      variant="secondary"
                      className="text-xs bg-yellow-50 text-yellow-700 cursor-pointer hover:bg-red-50 hover:text-red-700 transition-colors"
                      onClick={() => removeFromList("eu.keywords", kw)}
                    >
                      {kw} <Trash2 className="h-2.5 w-2.5 ml-1" />
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Programmes */}
              <div>
                <Label className="text-sm font-medium text-gray-700">Programmes</Label>
                <div className="flex flex-wrap gap-4 mt-2">
                  {[
                    { key: "horizonEurope", label: "Horizon Europe" },
                    { key: "digitalEurope", label: "Digital Europe" },
                    { key: "euSpace", label: "EU Space Programme" },
                    { key: "edf", label: "EDF (European Defence Fund)" },
                    { key: "edirpaAsap", label: "EDIRPA / ASAP / EDIP" },
                    { key: "esa", label: "ESA Funding Calls" },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-1.5">
                      <Checkbox
                        id={`eu-${key}`}
                        checked={config.eu.programmes[key as keyof typeof config.eu.programmes]}
                        onCheckedChange={(checked) =>
                          setConfig((prev) => ({
                            ...prev,
                            eu: {
                              ...prev.eu,
                              programmes: { ...prev.eu.programmes, [key]: checked },
                            },
                          }))
                        }
                      />
                      <Label htmlFor={`eu-${key}`} className="text-xs text-gray-600">
                        {label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Topic Prefixes */}
              <div>
                <Label className="text-sm font-medium text-gray-700">Topic Prefixes (Call IDs)</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="e.g. HORIZON-CL4-2026-SPACE"
                    value={newTopicPrefix}
                    onChange={(e) => setNewTopicPrefix(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && addToList("eu.topicPrefixes", newTopicPrefix, setNewTopicPrefix)
                    }
                    className="text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addToList("eu.topicPrefixes", newTopicPrefix, setNewTopicPrefix)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {config.eu.topicPrefixes.map((prefix) => (
                    <Badge
                      key={prefix}
                      variant="secondary"
                      className="text-xs bg-indigo-50 text-indigo-700 cursor-pointer hover:bg-red-50 hover:text-red-700 transition-colors font-mono"
                      onClick={() => removeFromList("eu.topicPrefixes", prefix)}
                    >
                      {prefix} <Trash2 className="h-2.5 w-2.5 ml-1" />
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <Label className="text-sm font-medium text-gray-700">Status Filter</Label>
                <div className="flex flex-wrap gap-4 mt-2">
                  {[
                    { key: "open", label: "Open" },
                    { key: "forthcoming", label: "Forthcoming" },
                    { key: "closed", label: "Closed" },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-1.5">
                      <Checkbox
                        id={`eu-status-${key}`}
                        checked={config.eu.status[key as keyof typeof config.eu.status]}
                        onCheckedChange={(checked) =>
                          setConfig((prev) => ({
                            ...prev,
                            eu: {
                              ...prev.eu,
                              status: { ...prev.eu.status, [key]: checked },
                            },
                          }))
                        }
                      />
                      <Label htmlFor={`eu-status-${key}`} className="text-xs text-gray-600">
                        {label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Test Connection Button */}
              <Button
                onClick={handleTestEu}
                disabled={testingEu}
                className="w-full bg-[#1e3a5f] hover:bg-[#2a4f7f] text-white"
              >
                {testingEu ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Testing Connection...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" /> Test EU Portal Connection
                  </>
                )}
              </Button>

              {/* Test Result */}
              {euResult && (
                <div
                  className={`p-3 rounded-lg border ${euResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {euResult.success ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className={`text-sm font-medium ${euResult.success ? "text-green-700" : "text-red-700"}`}>
                      {euResult.success ? `${euResult.count} topics found` : "Connection failed"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">{euResult.message}</p>
                  {euResult.sample && euResult.sample.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs font-medium text-gray-500">Sample results:</p>
                      {euResult.sample.map((title, i) => (
                        <p key={i} className="text-xs text-gray-600 truncate">
                          {i + 1}. {title}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Blocklist Section */}
      <Card className="border-red-200">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <XCircle className="h-5 w-5 text-red-500" />
            <h3 className="font-semibold text-gray-800 text-lg">Blocklist - Excluded Grants</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Grants matching these IDs or keywords will be automatically excluded from results.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Blocked IDs */}
            <div>
              <Label className="text-sm font-medium text-gray-700">Blocked Grant IDs</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder="e.g. VA-NCA-VCGP-2026"
                  value={newBlockId}
                  onChange={(e) => setNewBlockId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addToList("blocklist.ids", newBlockId, setNewBlockId)}
                  className="text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addToList("blocklist.ids", newBlockId, setNewBlockId)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {config.blocklist.ids.map((id) => (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="text-xs bg-red-50 text-red-700 cursor-pointer hover:bg-red-100 transition-colors font-mono"
                    onClick={() => removeFromList("blocklist.ids", id)}
                  >
                    {id} <Trash2 className="h-2.5 w-2.5 ml-1" />
                  </Badge>
                ))}
              </div>
            </div>

            {/* Blocked Keywords */}
            <div>
              <Label className="text-sm font-medium text-gray-700">Blocked Keywords</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder="e.g. cemetery, housing"
                  value={newBlockKeyword}
                  onChange={(e) => setNewBlockKeyword(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && addToList("blocklist.keywords", newBlockKeyword, setNewBlockKeyword)
                  }
                  className="text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addToList("blocklist.keywords", newBlockKeyword, setNewBlockKeyword)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {config.blocklist.keywords.map((kw) => (
                  <Badge
                    key={kw}
                    variant="secondary"
                    className="text-xs bg-red-50 text-red-700 cursor-pointer hover:bg-red-100 transition-colors"
                    onClick={() => removeFromList("blocklist.keywords", kw)}
                  >
                    {kw} <Trash2 className="h-2.5 w-2.5 ml-1" />
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Actions */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-sm text-gray-500">
          <span className="font-medium text-gray-700">Current config:</span>{" "}
          SAM.gov {config.sam.enabled ? "ON" : "OFF"} ({config.sam.keywords.length} keywords, {config.sam.naicsCodes.length} NAICS, {Object.values(config.sam.additionalPortals).filter(Boolean).length} extra portals)
          {" | "}
          EU {config.eu.enabled ? "ON" : "OFF"} ({config.eu.keywords.length} keywords, {Object.values(config.eu.programmes).filter(Boolean).length} programmes, {config.eu.topicPrefixes.length} prefixes)
          {" | "}
          Blocklist: {config.blocklist.ids.length + config.blocklist.keywords.length} rules
        </div>
        <Button size="sm" onClick={handleSaveAndApply} className="bg-[#1e3a5f] hover:bg-[#2a4f7f] text-white">
          <RefreshCw className="h-4 w-4 mr-2" />
          Save & Reload Grants
        </Button>
      </div>
    </div>
  )
}
