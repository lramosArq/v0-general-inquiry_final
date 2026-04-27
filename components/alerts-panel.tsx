"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserService, type User, type UserAlert } from "@/lib/user-service"
import { ARQUIMEA_PROGRAMS } from "@/components/gpt-sync-panel"
import { Bell, Plus, Trash2, Mail, Loader2, Send, Bot } from "lucide-react"

interface AlertsPanelProps {
  user: User
  onUserUpdate: (user: User) => void
  currentFilters: {
    keyword: string
    sources: string[]
    statuses: string[]
    categories: string[]
    fundingInstruments: string[]
  }
  grants: any[]
}

export function AlertsPanel({ user, onUserUpdate, currentFilters, grants }: AlertsPanelProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSendingAlert, setIsSendingAlert] = useState<string | null>(null)
  const [alertName, setAlertName] = useState("")
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [frequency, setFrequency] = useState<"immediate" | "daily" | "weekly">("daily")
  const [message, setMessage] = useState({ type: "", text: "" })
  const [customEmail, setCustomEmail] = useState(user.email)
  const [useCustomEmail, setUseCustomEmail] = useState(false)
  const [testMode, setTestMode] = useState(true) // Enable test mode by default
  const [testEmail, setTestEmail] = useState("")
  const [isSendingTest, setIsSendingTest] = useState(false)
  const [selectedGptPrograms, setSelectedGptPrograms] = useState<string[]>([])
  const [useGptSyncFilter, setUseGptSyncFilter] = useState(false)

  const userService = UserService.getInstance()

  const handleCreateAlert = async () => {
    if (!alertName.trim()) {
      setMessage({ type: "error", text: "Please enter an alert name" })
      return
    }

    setIsLoading(true)
    setMessage({ type: "", text: "" })

    try {
      const targetEmail = useCustomEmail && customEmail ? customEmail : user.email
      const filtersWithGpt = {
        ...currentFilters,
        gptSyncPrograms: useGptSyncFilter ? selectedGptPrograms : undefined,
      }
      const result = await userService.addAlert(user.id, {
        name: alertName,
        filters: filtersWithGpt,
        emailNotifications,
        frequency,
        customEmail: useCustomEmail ? customEmail : undefined,
      })

      if (result.success) {
        console.log("[v0] Alert created successfully:", result.alert?.id)
        
        // Fetch the latest alerts from server to confirm save
        try {
          const response = await fetch(`/api/shared-data?type=alerts&userId=${user.id}`)
          const serverResult = await response.json()
          console.log("[v0] Server alerts after creation:", serverResult.data?.length)
          
          if (serverResult.success && serverResult.data) {
            const updatedUser = { ...user, alerts: serverResult.data }
            localStorage.setItem("arquimea_current_user", JSON.stringify(updatedUser))
            onUserUpdate(updatedUser)
          } else {
            const updatedUser = userService.getCurrentUser()
            if (updatedUser) {
              onUserUpdate(updatedUser)
            }
          }
        } catch (e) {
          const updatedUser = userService.getCurrentUser()
          if (updatedUser) {
            onUserUpdate(updatedUser)
          }
        }
        
        setMessage({ type: "success", text: "Alerta creada y guardada en memoria!" })
        setTimeout(() => {
          setIsCreateModalOpen(false)
          setAlertName("")
          setSelectedGptPrograms([])
          setUseGptSyncFilter(false)
          setMessage({ type: "", text: "" })
        }, 1500)
      } else {
        setMessage({ type: "error", text: result.message })
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to create alert" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteAlert = async (alertId: string) => {
    const result = await userService.deleteAlert(user.id, alertId)
    if (result.success) {
      console.log("[v0] Alert deleted:", alertId)
      
      // Fetch the latest alerts from server to confirm deletion
      try {
        const response = await fetch(`/api/shared-data?type=alerts&userId=${user.id}`)
        const serverResult = await response.json()
        
        if (serverResult.success && serverResult.data) {
          const updatedUser = { ...user, alerts: serverResult.data }
          localStorage.setItem("arquimea_current_user", JSON.stringify(updatedUser))
          onUserUpdate(updatedUser)
          return
        }
      } catch { /* fallback to local */ }
      
      const updatedUser = userService.getCurrentUser()
      if (updatedUser) {
        onUserUpdate(updatedUser)
      }
    }
  }

  // Send test email function - uses same endpoint as alerts for consistent formatting
  const handleSendTestEmail = async () => {
    const targetEmail = testEmail || user.email
    if (!targetEmail) {
      setMessage({ type: "error", text: "Please enter an email address" })
      return
    }

    setIsSendingTest(true)
    setMessage({ type: "", text: "" })

    try {
      // Get sample grants for test - use real grants data with all fields
      const sampleGrants = grants.slice(0, 5).map(g => ({
        id: g.id,
        title: g.title || "Sample Grant",
        agency: g.agency || "Sample Agency", 
        opportunityNumber: g.opportunityNumber || g.id,
        status: g.status || "Open",
        closeDate: g.closeDate || "2026-12-31",
        postedDate: g.postedDate,
        awardCeiling: g.awardCeiling,
        fundingInstrument: g.fundingInstrument,
        category: g.category,
        description: g.description,
        source: g.source || "usa",
        url: g.url || "#"
      }))

      if (sampleGrants.length === 0) {
        sampleGrants.push({
          id: "test-001",
          title: "Test Grant Opportunity - Horizon Europe Research",
          agency: "European Commission",
          opportunityNumber: "HORIZON-TEST-2026",
          status: "Open",
          closeDate: "2026-12-31",
          postedDate: "2026-01-15",
          awardCeiling: 500000,
          fundingInstrument: "Grant",
          category: "Research & Innovation",
          description: "This is a test grant to verify your email alert system is working correctly. Real alerts will contain actual grant opportunities matching your filters.",
          source: "eu",
          url: "https://ec.europa.eu/info/funding-tenders"
        })
      }

      // Use the same send-alert endpoint for consistent email formatting
      const response = await fetch("/api/send-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: targetEmail,
          alertName: "Test Alert",
          grants: sampleGrants,
          frequency: "immediate"
        }),
      })

      const result = await response.json()

      if (result.success) {
        const successMsg = result.demoMode 
          ? `Email de prueba enviado a ${targetEmail} (modo demo)`
          : `Email de prueba enviado a ${targetEmail}!`
        setMessage({ type: "success", text: successMsg })
      } else {
        setMessage({ type: "error", text: result.error || result.message || "Failed to send test email" })
      }
    } catch (error) {
      console.error("[v0] Test email error:", error)
      setMessage({ type: "error", text: "Failed to send test email" })
    } finally {
      setIsSendingTest(false)
    }
  }

  const handleToggleEmailNotifications = async (alertId: string, enabled: boolean) => {
    const result = await userService.updateAlert(user.id, alertId, { emailNotifications: enabled })
    if (result.success) {
      const updatedUser = userService.getCurrentUser()
      if (updatedUser) {
        onUserUpdate(updatedUser)
      }
    }
  }

  const handleSendAlertNow = async (alert: UserAlert) => {
    setIsSendingAlert(alert.id)

    try {
      // Filter grants based on alert filters
      const matchingGrants = grants.filter((grant) => {
        // Keyword filter
        if (alert.filters.keyword && alert.filters.keyword !== "all") {
          const keyword = alert.filters.keyword.toLowerCase()
          if (!grant.title.toLowerCase().includes(keyword) && !grant.description?.toLowerCase().includes(keyword)) {
            return false
          }
        }

        // Source filter
        if (alert.filters.sources.length > 0 && !alert.filters.sources.includes("all")) {
          if (!alert.filters.sources.includes(grant.source)) {
            return false
          }
        }

        // Category filter
        if (alert.filters.categories.length > 0 && !alert.filters.categories.includes("all")) {
          const matchesCategory = alert.filters.categories.some((cat) => {
            const titleLower = grant.title.toLowerCase()
            const idLower = grant.opportunityNumber?.toLowerCase() || ""

            switch (cat) {
              case "horizonEurope":
                return titleLower.includes("horizon") || idLower.includes("horizon")
              case "digitalEurope":
                return titleLower.includes("digital") || idLower.includes("digital")
              case "space":
                return titleLower.includes("space") || titleLower.includes("satellite")
              case "cybersecurity":
                return titleLower.includes("cyber")
              case "ai":
                return titleLower.includes("artificial intelligence") || titleLower.includes(" ai ")
              case "biotech":
                return (
                  titleLower.includes("biotech") ||
                  titleLower.includes("als") ||
                  titleLower.includes("neurodegenerative")
                )
              case "nasa":
                return titleLower.includes("nasa") || grant.agency?.includes("NASA")
              default:
                return false
            }
          })
          if (!matchesCategory) return false
        }

        // GPT Sync Programs filter - filter by program keywords
        if (alert.filters.gptSyncPrograms && alert.filters.gptSyncPrograms.length > 0) {
          const selectedPrograms = alert.filters.gptSyncPrograms
            .map(id => ARQUIMEA_PROGRAMS.find(p => p.id === id))
            .filter(Boolean)
          
          // Get all keywords from selected programs
          const allKeywords = selectedPrograms.flatMap(p => p!.keywords)
          
          // Check if grant matches any keyword
          const grantText = `${grant.title} ${grant.description || ""} ${grant.category || ""} ${grant.agency || ""}`.toLowerCase()
          const matchesGptKeyword = allKeywords.some(kw => grantText.includes(kw.toLowerCase()))
          
          if (!matchesGptKeyword) return false
        }

        return true
      })

      if (matchingGrants.length === 0) {
        setMessage({ type: "error", text: "No grants match this alert's filters" })
        setIsSendingAlert(null)
        return
      }

      // Send email via API - use custom email if defined
      const targetEmail = (alert as any).customEmail || user.email
      const response = await fetch("/api/send-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: targetEmail,
          alertName: alert.name,
          grants: matchingGrants.slice(0, 10), // Limit to 10 grants per email
          frequency: alert.frequency,
        }),
      })

      const result = await response.json()

      if (result.success) {
        // Show appropriate message based on demo mode
        const successMsg = result.demoMode 
          ? `Alerta enviada a ${targetEmail} (modo demo - email simulado)`
          : `Alerta enviada a ${targetEmail}!`
        setMessage({ type: "success", text: successMsg })

        // Update last triggered
        await userService.updateAlert(user.id, alert.id, { lastTriggered: new Date().toISOString() })
        const updatedUser = userService.getCurrentUser()
        if (updatedUser) {
          onUserUpdate(updatedUser)
        }
      } else {
        console.error("[v0] Send alert error:", result)
        let errorMsg = result.error || "Failed to send alert"
        setMessage({ type: "error", text: errorMsg })
      }
    } catch (error) {
      console.error("[v0] Error sending alert:", error)
      setMessage({ type: "error", text: "Error al enviar la alerta por email" })
    } finally {
      setIsSendingAlert(null)
      setTimeout(() => setMessage({ type: "", text: "" }), 8000) // Show error longer for test mode messages
    }
  }

  const getFilterSummary = (filters: UserAlert["filters"]) => {
    const parts = []
    if (filters.keyword && filters.keyword !== "all") {
      parts.push(`"${filters.keyword}"`)
    }
    if (filters.sources.length > 0 && !filters.sources.includes("all")) {
      parts.push(filters.sources.join(", ").toUpperCase())
    }
    if (filters.categories.length > 0 && !filters.categories.includes("all")) {
      parts.push(filters.categories.join(", "))
    }
    if (filters.gptSyncPrograms && filters.gptSyncPrograms.length > 0) {
      const programNames = filters.gptSyncPrograms
        .map(id => ARQUIMEA_PROGRAMS.find(p => p.id === id)?.name || id)
        .slice(0, 3)
      const suffix = filters.gptSyncPrograms.length > 3 ? ` +${filters.gptSyncPrograms.length - 3}` : ""
      parts.push(`GPT: ${programNames.join(", ")}${suffix}`)
    }
    return parts.length > 0 ? parts.join(" | ") : "All grants"
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[#1e3a5f] flex items-center gap-2">
          <Bell className="h-5 w-5" />
          My Alerts ({user.alerts.length})
        </h3>
        <Button size="sm" onClick={() => setIsCreateModalOpen(true)} className="bg-[#1e3a5f] hover:bg-[#2d4a6f]">
          <Plus className="h-4 w-4 mr-1" />
          New Alert
        </Button>
      </div>

      {/* Test Email Section */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-blue-800 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Test Email Alerts
            </h4>
            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
              Test Mode
            </Badge>
          </div>
          <p className="text-sm text-blue-700 mb-3">
            Send a test email to verify your alerts are working. This bypasses Resend domain restrictions.
          </p>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Enter your email (e.g., lramos@arquimea.com)"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="flex-1 bg-white"
            />
            <Button
              onClick={handleSendTestEmail}
              disabled={isSendingTest}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSendingTest ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1" />
                  Send Test
                </>
              )}
            </Button>
          </div>
          {!testEmail && (
            <p className="text-xs text-blue-600 mt-2">
              Leave empty to send to your account email: {user.email}
            </p>
          )}
        </CardContent>
      </Card>

      {message.text && (
        <div
          className={`p-3 rounded-md text-sm ${
            message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {user.alerts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-gray-500">
            <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="mb-2">No alerts configured</p>
            <p className="text-sm">Create an alert to receive notifications when new grants match your criteria.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {user.alerts.map((alert) => (
            <Card key={alert.id} className="border-[#e5e7eb]">
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-[#1e3a5f]">{alert.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {alert.frequency}
                      </Badge>
                      {alert.filters.gptSyncPrograms && alert.filters.gptSyncPrograms.length > 0 && (
                        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                          <Bot className="h-3 w-3 mr-1" />
                          {alert.filters.gptSyncPrograms.length} GPT
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mb-2">{getFilterSummary(alert.filters)}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>Created: {new Date(alert.createdAt).toLocaleDateString()}</span>
                      {alert.lastTriggered && (
                        <span>Last sent: {new Date(alert.lastTriggered).toLocaleDateString()}</span>
                      )}
                      {(alert as any).customEmail && (
                        <span className="flex items-center gap-1 text-blue-600">
                          <Mail className="h-3 w-3" />
                          {(alert as any).customEmail}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 mr-2">
                      <Switch
                        checked={alert.emailNotifications}
                        onCheckedChange={(checked) => handleToggleEmailNotifications(alert.id, checked)}
                      />
                      <Mail className={`h-4 w-4 ${alert.emailNotifications ? "text-[#1e3a5f]" : "text-gray-300"}`} />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSendAlertNow(alert)}
                      disabled={isSendingAlert === alert.id || !alert.emailNotifications}
                      title="Send alert now"
                    >
                      {isSendingAlert === alert.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteAlert(alert.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Alert Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-[#1e3a5f]">Create New Alert</DialogTitle>
            <DialogDescription>
              Save your current search filters as an alert to receive notifications.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="alert-name">Alert Name</Label>
              <Input
                id="alert-name"
                placeholder="e.g., Space Technology Grants"
                value={alertName}
                onChange={(e) => setAlertName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Current Filters</Label>
              <div className="p-3 bg-gray-50 rounded-md text-sm">
                <div className="space-y-1">
                  <p>
                    <strong>Keyword:</strong> {currentFilters.keyword || "All"}
                  </p>
                  <p>
                    <strong>Sources:</strong>{" "}
                    {currentFilters.sources.length > 0 ? currentFilters.sources.join(", ") : "All"}
                  </p>
                  <p>
                    <strong>Categories:</strong>{" "}
                    {currentFilters.categories.length > 0 ? currentFilters.categories.join(", ") : "All"}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">Email Frequency</Label>
              <Select value={frequency} onValueChange={(v: any) => setFrequency(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate (as grants are found)</SelectItem>
                  <SelectItem value="daily">Daily digest</SelectItem>
                  <SelectItem value="weekly">Weekly summary</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* GPT Sync Programs Filter */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="use-gpt-sync-filter"
                  checked={useGptSyncFilter}
                  onCheckedChange={(checked) => {
                    setUseGptSyncFilter(checked as boolean)
                    if (!checked) setSelectedGptPrograms([])
                  }}
                />
                <Label htmlFor="use-gpt-sync-filter" className="text-sm flex items-center gap-2">
                  <Bot className="h-4 w-4 text-purple-600" />
                  Filter by GPT Sync Programs (ARQUIMEA)
                </Label>
              </div>

              {useGptSyncFilter && (
                <div className="ml-6 space-y-2">
                  <p className="text-xs text-gray-500 mb-2">
                    Select the programs to receive alerts only for opportunities matching those keywords:
                  </p>
                  <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1 bg-gray-50">
                    {ARQUIMEA_PROGRAMS.map((program) => {
                      const Icon = program.icon
                      return (
                        <div key={program.id} className="flex items-center space-x-2 py-1">
                          <Checkbox
                            id={`gpt-program-${program.id}`}
                            checked={selectedGptPrograms.includes(program.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedGptPrograms((prev) => [...prev, program.id])
                              } else {
                                setSelectedGptPrograms((prev) => prev.filter((id) => id !== program.id))
                              }
                            }}
                          />
                          <Label
                            htmlFor={`gpt-program-${program.id}`}
                            className="text-xs flex items-center gap-2 cursor-pointer"
                          >
                            <span className={`${program.color} p-1 rounded text-white`}>
                              <Icon className="h-3 w-3" />
                            </span>
                            {program.name}
                          </Label>
                        </div>
                      )
                    })}
                  </div>
                  {selectedGptPrograms.length > 0 && (
                    <p className="text-xs text-purple-600">
                      {selectedGptPrograms.length} program(s) selected
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="email-notifications"
                  checked={emailNotifications}
                  onCheckedChange={(checked) => setEmailNotifications(checked as boolean)}
                />
                <Label htmlFor="email-notifications" className="text-sm">
                  Send email notifications
                </Label>
              </div>

              {emailNotifications && (
                <div className="ml-6 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="use-custom-email"
                      checked={useCustomEmail}
                      onCheckedChange={(checked) => setUseCustomEmail(checked as boolean)}
                    />
                    <Label htmlFor="use-custom-email" className="text-sm">
                      Use a different email address
                    </Label>
                  </div>

                  {useCustomEmail ? (
                    <div className="space-y-1">
                      <Label htmlFor="custom-email" className="text-xs text-gray-500">
                        Send alerts to:
                      </Label>
                      <Input
                        id="custom-email"
                        type="email"
                        placeholder="your@email.com"
                        value={customEmail}
                        onChange={(e) => setCustomEmail(e.target.value)}
                        className="h-9"
                      />
                      <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded mt-1">
                        Note: With Resend free tier, emails can only be sent to the verified email address in your Resend account. 
                        To send to other addresses, verify a custom domain in Resend.
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      Alerts will be sent to: <strong>{user.email}</strong>
                    </p>
                  )}
                </div>
              )}
            </div>

            {message.text && (
              <p className={`text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
                {message.text}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAlert} disabled={isLoading} className="bg-[#1e3a5f] hover:bg-[#2d4a6f]">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Bell className="mr-2 h-4 w-4" />
                  Create Alert
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
