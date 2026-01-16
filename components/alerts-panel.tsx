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
import { Bell, Plus, Trash2, Mail, Loader2, Send } from "lucide-react"

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

  const userService = UserService.getInstance()

  const handleCreateAlert = async () => {
    if (!alertName.trim()) {
      setMessage({ type: "error", text: "Please enter an alert name" })
      return
    }

    setIsLoading(true)
    setMessage({ type: "", text: "" })

    try {
      const result = await userService.addAlert(user.id, {
        name: alertName,
        filters: currentFilters,
        emailNotifications,
        frequency,
      })

      if (result.success) {
        const updatedUser = userService.getCurrentUser()
        if (updatedUser) {
          onUserUpdate(updatedUser)
        }
        setMessage({ type: "success", text: "Alert created successfully!" })
        setTimeout(() => {
          setIsCreateModalOpen(false)
          setAlertName("")
          setMessage({ type: "", text: "" })
        }, 1000)
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
      const updatedUser = userService.getCurrentUser()
      if (updatedUser) {
        onUserUpdate(updatedUser)
      }
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

        return true
      })

      if (matchingGrants.length === 0) {
        setMessage({ type: "error", text: "No grants match this alert's filters" })
        setIsSendingAlert(null)
        return
      }

      // Send email via API
      const response = await fetch("/api/send-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: user.email,
          alertName: alert.name,
          grants: matchingGrants.slice(0, 10), // Limit to 10 grants per email
          frequency: alert.frequency,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setMessage({ type: "success", text: `Alert sent to ${user.email}!` })

        // Update last triggered
        await userService.updateAlert(user.id, alert.id, { lastTriggered: new Date().toISOString() })
        const updatedUser = userService.getCurrentUser()
        if (updatedUser) {
          onUserUpdate(updatedUser)
        }
      } else {
        setMessage({ type: "error", text: result.error || "Failed to send alert" })
      }
    } catch (error) {
      console.error("[v0] Error sending alert:", error)
      setMessage({ type: "error", text: "Failed to send alert email" })
    } finally {
      setIsSendingAlert(null)
      setTimeout(() => setMessage({ type: "", text: "" }), 3000)
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
                    </div>
                    <p className="text-sm text-gray-500 mb-2">{getFilterSummary(alert.filters)}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>Created: {new Date(alert.createdAt).toLocaleDateString()}</span>
                      {alert.lastTriggered && (
                        <span>Last sent: {new Date(alert.lastTriggered).toLocaleDateString()}</span>
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

            <div className="flex items-center space-x-2">
              <Checkbox
                id="email-notifications"
                checked={emailNotifications}
                onCheckedChange={(checked) => setEmailNotifications(checked as boolean)}
              />
              <Label htmlFor="email-notifications" className="text-sm">
                Send email notifications to {user.email}
              </Label>
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
