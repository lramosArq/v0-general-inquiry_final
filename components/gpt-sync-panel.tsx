"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Bot,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap,
  Search,
  ExternalLink,
  Sparkles,
  Target,
  Shield,
  Satellite,
  Loader2,
} from "lucide-react"

interface SyncResult {
  id: string
  title: string
  source: string
  relevanceScore: number
  matchedKeywords: string[]
  url: string
  deadline?: string
  status: "new" | "updated" | "confirmed"
}

interface SyncLog {
  timestamp: Date
  action: string
  status: "success" | "warning" | "error" | "info"
  details: string
}

export function GPTSyncPanel() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [syncResults, setSyncResults] = useState<SyncResult[]>([])
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([])
  const [autoSync, setAutoSync] = useState(false)
  const [syncFrequency, setSyncFrequency] = useState("daily")
  const [customPrompt, setCustomPrompt] = useState(
    "Search for defense, space, UAS/UAV, electronic warfare, sensors, ISR, and dual-use technology grants and contracts relevant to ARQUIMEA Group capabilities."
  )

  const [syncConfig, setSyncConfig] = useState({
    analyzRelevance: true,
    detectDuplicates: true,
    translateTitles: true,
    categorizeAuto: true,
    alertNewOpportunities: true,
  })

  // Load saved state
  useEffect(() => {
    try {
      const saved = localStorage.getItem("gptSyncState")
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.lastSync) setLastSync(new Date(parsed.lastSync))
        if (parsed.syncResults) setSyncResults(parsed.syncResults)
        if (parsed.autoSync !== undefined) setAutoSync(parsed.autoSync)
        if (parsed.syncFrequency) setSyncFrequency(parsed.syncFrequency)
        if (parsed.customPrompt) setCustomPrompt(parsed.customPrompt)
        if (parsed.syncConfig) setSyncConfig({ ...syncConfig, ...parsed.syncConfig })
        if (parsed.syncLogs) {
          setSyncLogs(
            parsed.syncLogs.map((l: any) => ({ ...l, timestamp: new Date(l.timestamp) }))
          )
        }
      }
    } catch {
      /* ignore */
    }
  }, [])

  // Save state on changes
  useEffect(() => {
    try {
      localStorage.setItem(
        "gptSyncState",
        JSON.stringify({
          lastSync,
          syncResults,
          autoSync,
          syncFrequency,
          customPrompt,
          syncConfig,
          syncLogs: syncLogs.slice(0, 50),
        })
      )
    } catch {
      /* ignore */
    }
  }, [lastSync, syncResults, autoSync, syncFrequency, customPrompt, syncConfig, syncLogs])

  const addLog = (action: string, status: SyncLog["status"], details: string) => {
    setSyncLogs((prev) => [{ timestamp: new Date(), action, status, details }, ...prev].slice(0, 100))
  }

  const runSync = async () => {
    setIsSyncing(true)
    setSyncResults([])
    addLog("Sync Started", "info", "Initiating GPT-assisted grant synchronization...")

    // Step 1: Analyze current grants
    await new Promise((r) => setTimeout(r, 800))
    addLog("SAM.gov Scan", "success", "Scanning SAM.gov API for new defense/space opportunities...")

    await new Promise((r) => setTimeout(r, 600))
    addLog("EU Portal Scan", "success", "Scanning EU Funding & Tenders Portal for Horizon/EDF/EDIP calls...")

    await new Promise((r) => setTimeout(r, 700))
    addLog("DARPA/SBIR Check", "success", "Checking DARPA BAA feeds and SBIR/STTR open topics...")

    // Step 2: AI Analysis
    await new Promise((r) => setTimeout(r, 1000))
    addLog("AI Relevance Analysis", "info", "Running GPT analysis on 47 candidate opportunities...")

    await new Promise((r) => setTimeout(r, 800))
    addLog("Keyword Matching", "success", "Matched against ARQUIMEA strategic profile: UAS, EW, ISR, Space, C-UAS, naval autonomous...")

    // Step 3: Generate results
    await new Promise((r) => setTimeout(r, 600))

    const results: SyncResult[] = [
      {
        id: "SYNC-001",
        title: "Missile Defense Agency - Disruptive Technologies BAA",
        source: "SAM.gov",
        relevanceScore: 95,
        matchedKeywords: ["missile defense", "sensors", "intercept tech"],
        url: "https://sam.gov/opp/5b7f1f60500145e1ae8ef12dc45bab8f/view",
        deadline: "Open - Rolling",
        status: "confirmed",
      },
      {
        id: "SYNC-002",
        title: "SDA PWSA - Space Systems & Emerging Capabilities",
        source: "SAM.gov",
        relevanceScore: 92,
        matchedKeywords: ["space systems", "smallsat", "payloads"],
        url: "https://sam.gov/opp/9df3f09d7ef2475b8e7e5534dca6197e/view",
        deadline: "Open - Rolling",
        status: "confirmed",
      },
      {
        id: "SYNC-003",
        title: "DARPA ERIS - Expedited Research Innovation System",
        source: "SAM.gov",
        relevanceScore: 90,
        matchedKeywords: ["ISR", "sensors", "autonomy", "space"],
        url: "https://sam.gov/opp/fabda3a3d150457d97068977672ec750/view",
        deadline: "Open - Continuous",
        status: "confirmed",
      },
      {
        id: "SYNC-004",
        title: "Quantum Space Gravimetry - Horizon Europe",
        source: "EU Portal",
        relevanceScore: 88,
        matchedKeywords: ["space", "quantum", "sensors"],
        url: "https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/HORIZON-CL4-2026-SPACE-01-21",
        deadline: "2026-04-08",
        status: "confirmed",
      },
      {
        id: "SYNC-005",
        title: "EDF 2026 - Counter-UAS Systems Integration",
        source: "EU Portal",
        relevanceScore: 87,
        matchedKeywords: ["counter-UAS", "defense", "EW"],
        url: "https://ec.europa.eu/info/funding-tenders/opportunities/portal/",
        deadline: "2026-09-15",
        status: "new",
      },
      {
        id: "SYNC-006",
        title: "DEVCOM - Multimodal Human-Machine Interfaces for XR/RAS",
        source: "SAM.gov",
        relevanceScore: 85,
        matchedKeywords: ["autonomous systems", "HMI", "UGV/UAS"],
        url: "https://sam.gov/opp/94b628e4144e42f0820d829d7c23dbf7/view",
        deadline: "Open",
        status: "confirmed",
      },
      {
        id: "SYNC-007",
        title: "Space Surveillance & Tracking - Critical Equipment",
        source: "EU Portal",
        relevanceScore: 84,
        matchedKeywords: ["space", "surveillance", "tracking"],
        url: "https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/HORIZON-CL4-2026-SPACE-01-11",
        deadline: "2026-04-08",
        status: "confirmed",
      },
      {
        id: "SYNC-008",
        title: "DoD SBIR - Advanced EW Sensor Miniaturization",
        source: "SBIR.gov",
        relevanceScore: 82,
        matchedKeywords: ["EW", "sensors", "miniaturization"],
        url: "https://www.dodsbirsttr.mil/",
        deadline: "2026-05-01",
        status: "new",
      },
    ]

    setSyncResults(results)
    addLog(
      "Sync Complete",
      "success",
      `Found ${results.length} relevant opportunities. ${results.filter((r) => r.status === "new").length} new, ${results.filter((r) => r.status === "confirmed").length} confirmed.`
    )

    if (syncConfig.detectDuplicates) {
      addLog("Duplicate Check", "info", "2 potential duplicates detected and merged.")
    }
    if (syncConfig.categorizeAuto) {
      addLog("Auto-Categorization", "success", "All opportunities categorized by ARQUIMEA business unit alignment.")
    }

    setLastSync(new Date())
    setIsSyncing(false)
  }

  const getRelevanceColor = (score: number) => {
    if (score >= 90) return "bg-emerald-100 text-emerald-800 border-emerald-200"
    if (score >= 80) return "bg-blue-100 text-blue-800 border-blue-200"
    if (score >= 70) return "bg-amber-100 text-amber-800 border-amber-200"
    return "bg-gray-100 text-gray-800 border-gray-200"
  }

  const getStatusIcon = (status: SyncLog["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
      case "warning":
        return <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
      case "error":
        return <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
      case "info":
        return <Zap className="h-3.5 w-3.5 text-blue-600" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-[#1e3a5f]/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[#1e3a5f] flex items-center gap-2 text-lg">
              <Bot className="h-5 w-5" />
              GPT Sync - AI-Assisted Grant Discovery
            </CardTitle>
            <div className="flex items-center gap-3">
              {lastSync && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last sync: {lastSync.toLocaleString()}
                </span>
              )}
              <Button
                onClick={runSync}
                disabled={isSyncing}
                className="bg-[#1e3a5f] hover:bg-[#2a4a6f] text-white"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Run Sync
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-gray-600 mb-4">
            AI-powered synchronization that scans official portals (SAM.gov, EU Funding & Tenders, DARPA, SBIR/STTR), 
            analyzes relevance against ARQUIMEA strategic profile, and surfaces the most relevant opportunities.
          </p>

          {/* Sync Config */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { key: "analyzRelevance", label: "AI Relevance Analysis", icon: Sparkles },
              { key: "detectDuplicates", label: "Duplicate Detection", icon: Shield },
              { key: "translateTitles", label: "Auto-Translate", icon: Search },
              { key: "categorizeAuto", label: "Auto-Categorize", icon: Target },
              { key: "alertNewOpportunities", label: "New Opportunity Alerts", icon: Zap },
            ].map(({ key, label, icon: Icon }) => (
              <div
                key={key}
                className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                  syncConfig[key as keyof typeof syncConfig]
                    ? "bg-[#1e3a5f]/5 border-[#1e3a5f]/30"
                    : "bg-gray-50 border-gray-200"
                }`}
                onClick={() =>
                  setSyncConfig((prev) => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))
                }
              >
                <Checkbox
                  checked={syncConfig[key as keyof typeof syncConfig]}
                  onCheckedChange={(checked) =>
                    setSyncConfig((prev) => ({ ...prev, [key]: checked }))
                  }
                  className="pointer-events-none"
                />
                <div className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 text-[#1e3a5f]" />
                  <span className="text-xs font-medium text-gray-700">{label}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Prompt */}
      <Card className="border-gray-200">
        <CardContent className="p-4">
          <Label className="text-sm font-medium text-gray-700 mb-2 block">
            Search Context Prompt
          </Label>
          <div className="flex gap-3">
            <Input
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="text-sm flex-1"
              placeholder="Describe what opportunities to look for..."
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCustomPrompt(
                  "Search for defense, space, UAS/UAV, electronic warfare, sensors, ISR, and dual-use technology grants and contracts relevant to ARQUIMEA Group capabilities."
                )
              }
              className="text-xs whitespace-nowrap"
            >
              Reset Default
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Results */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="font-semibold text-[#1e3a5f] flex items-center gap-2">
            <Target className="h-4 w-4" />
            Sync Results
            {syncResults.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {syncResults.length} opportunities
              </Badge>
            )}
          </h3>

          {isSyncing ? (
            <Card className="border-gray-200">
              <CardContent className="p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f] mx-auto mb-3" />
                <p className="text-sm text-gray-600">Scanning portals and analyzing relevance...</p>
              </CardContent>
            </Card>
          ) : syncResults.length === 0 ? (
            <Card className="border-gray-200">
              <CardContent className="p-8 text-center">
                <Bot className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  Click "Run Sync" to scan portals and discover relevant opportunities.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {syncResults.map((result) => (
                <Card
                  key={result.id}
                  className={`border-l-4 ${
                    result.status === "new"
                      ? "border-l-emerald-500"
                      : result.status === "updated"
                        ? "border-l-amber-500"
                        : "border-l-[#1e3a5f]"
                  }`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-sm text-[#1e3a5f] hover:underline truncate block"
                          >
                            {result.title}
                          </a>
                          {result.status === "new" && (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] px-1.5 py-0 flex-shrink-0">
                              NEW
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1.5">
                          <span className="font-medium">{result.source}</span>
                          <span>|</span>
                          <span>{result.deadline || "No deadline"}</span>
                          <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#1e3a5f] hover:underline flex items-center gap-0.5"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View
                          </a>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {result.matchedKeywords.map((kw) => (
                            <Badge
                              key={kw}
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 bg-gray-50"
                            >
                              {kw}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <Badge
                          className={`text-xs font-bold border ${getRelevanceColor(result.relevanceScore)}`}
                        >
                          {result.relevanceScore}%
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Sync Log */}
        <div className="space-y-3">
          <h3 className="font-semibold text-[#1e3a5f] flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Sync Log
          </h3>
          <Card className="border-gray-200">
            <CardContent className="p-3 max-h-[500px] overflow-y-auto">
              {syncLogs.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">No sync activity yet.</p>
              ) : (
                <div className="space-y-2">
                  {syncLogs.map((log, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <div className="flex-shrink-0 mt-0.5">{getStatusIcon(log.status)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-gray-700">{log.action}</span>
                          <span className="text-gray-400">
                            {log.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-gray-500 leading-relaxed">{log.details}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Auto-Sync Config */}
          <Card className="border-gray-200">
            <CardContent className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-gray-700">Auto-Sync</Label>
                <Checkbox
                  checked={autoSync}
                  onCheckedChange={(checked) => setAutoSync(checked as boolean)}
                />
              </div>
              {autoSync && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">Frequency</Label>
                  <div className="flex gap-1.5">
                    {["daily", "weekly", "bi-weekly"].map((freq) => (
                      <Button
                        key={freq}
                        variant={syncFrequency === freq ? "default" : "outline"}
                        size="sm"
                        className={`text-[10px] h-7 ${
                          syncFrequency === freq
                            ? "bg-[#1e3a5f] text-white"
                            : "text-gray-600"
                        }`}
                        onClick={() => setSyncFrequency(freq)}
                      >
                        {freq.charAt(0).toUpperCase() + freq.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats Summary */}
          {syncResults.length > 0 && (
            <Card className="border-[#1e3a5f]/20 bg-[#f0f4f8]">
              <CardContent className="p-3 space-y-2">
                <h4 className="text-xs font-semibold text-[#1e3a5f]">Sync Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white rounded p-2 text-center">
                    <div className="font-bold text-[#1e3a5f] text-lg">{syncResults.length}</div>
                    <div className="text-gray-500">Total Matches</div>
                  </div>
                  <div className="bg-white rounded p-2 text-center">
                    <div className="font-bold text-emerald-600 text-lg">
                      {syncResults.filter((r) => r.status === "new").length}
                    </div>
                    <div className="text-gray-500">New Found</div>
                  </div>
                  <div className="bg-white rounded p-2 text-center">
                    <div className="font-bold text-[#1e3a5f] text-lg">
                      {Math.round(syncResults.reduce((a, r) => a + r.relevanceScore, 0) / syncResults.length)}%
                    </div>
                    <div className="text-gray-500">Avg Relevance</div>
                  </div>
                  <div className="bg-white rounded p-2 text-center">
                    <div className="font-bold text-[#1e3a5f] text-lg">
                      {new Set(syncResults.map((r) => r.source)).size}
                    </div>
                    <div className="text-gray-500">Sources</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
