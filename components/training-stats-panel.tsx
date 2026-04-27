"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Brain, TrendingUp, Users, Building2, Globe, Tag, RefreshCw, X, BarChart3 } from "lucide-react"

interface TrainingStats {
  totalFeedbacks: number
  interestedCount: number
  notInterestedCount: number
  byUser: Record<string, { interested: number; notInterested: number }>
  byCategory: Record<string, { interested: number; notInterested: number }>
  bySource: Record<string, { interested: number; notInterested: number }>
  byAgency: Record<string, { interested: number; notInterested: number }>
  topKeywords: Record<string, number>
  lastTrainingUpdate: string
}

interface TrainingStatsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function TrainingStatsPanel({ isOpen, onClose }: TrainingStatsPanelProps) {
  const [stats, setStats] = useState<TrainingStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchStats = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/shared-data?type=trainingStats")
      const result = await response.json()
      if (result.success) {
        setStats(result.data)
      }
    } catch (error) {
      console.error("Error fetching training stats:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchStats()
    }
  }, [isOpen])

  if (!isOpen) return null

  const getTopItems = (data: Record<string, { interested: number; notInterested: number }>, limit = 5) => {
    return Object.entries(data)
      .sort((a, b) => (b[1].interested + b[1].notInterested) - (a[1].interested + a[1].notInterested))
      .slice(0, limit)
  }

  const getTopKeywords = (keywords: Record<string, number>, limit = 10) => {
    return Object.entries(keywords)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
      <div className="w-full max-w-2xl bg-white h-full overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-gradient-to-r from-purple-700 to-indigo-700 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            <h2 className="font-semibold">Training Memory - AI Learning Stats</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchStats}
              disabled={isLoading}
              className="text-white hover:bg-white/10"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {!stats || stats.totalFeedbacks === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Brain className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No Training Data Yet</p>
              <p className="text-sm mt-2">
                Use the thumbs up/down buttons on opportunities to train the AI on your preferences.
              </p>
            </div>
          ) : (
            <>
              {/* Overview Stats */}
              <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
                <CardContent className="p-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-3xl font-bold text-purple-700">{stats.totalFeedbacks}</p>
                      <p className="text-xs text-gray-600">Total Feedbacks</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-green-600">{stats.interestedCount}</p>
                      <p className="text-xs text-gray-600">Interested</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-red-600">{stats.notInterestedCount}</p>
                      <p className="text-xs text-gray-600">Not Interested</p>
                    </div>
                  </div>
                  <p className="text-xs text-center text-gray-500 mt-3">
                    Last updated: {new Date(stats.lastTrainingUpdate).toLocaleString()}
                  </p>
                </CardContent>
              </Card>

              {/* By User */}
              {Object.keys(stats.byUser).length > 0 && (
                <Card>
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      Feedback by User
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="space-y-2">
                      {getTopItems(stats.byUser).map(([name, data]) => (
                        <div key={name} className="flex items-center justify-between text-sm">
                          <span className="font-medium truncate max-w-[200px]">{name}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">
                              +{data.interested}
                            </Badge>
                            <Badge variant="outline" className="bg-red-50 text-red-700 text-xs">
                              -{data.notInterested}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* By Category */}
              {Object.keys(stats.byCategory).length > 0 && (
                <Card>
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Tag className="h-4 w-4 text-orange-600" />
                      Preferences by Category
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="space-y-2">
                      {getTopItems(stats.byCategory).map(([category, data]) => {
                        const total = data.interested + data.notInterested
                        const interestRatio = total > 0 ? (data.interested / total) * 100 : 0
                        return (
                          <div key={category} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="truncate max-w-[250px]">{category}</span>
                              <span className="text-xs text-gray-500">{interestRatio.toFixed(0)}% interest</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-green-500 to-green-400"
                                style={{ width: `${interestRatio}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* By Source */}
              {Object.keys(stats.bySource).length > 0 && (
                <Card>
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Globe className="h-4 w-4 text-indigo-600" />
                      Preferences by Source
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="flex flex-wrap gap-2">
                      {getTopItems(stats.bySource, 10).map(([source, data]) => {
                        const total = data.interested + data.notInterested
                        const isPositive = data.interested > data.notInterested
                        return (
                          <Badge
                            key={source}
                            variant="outline"
                            className={isPositive ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}
                          >
                            {source.toUpperCase()} ({data.interested}/{total})
                          </Badge>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* By Agency */}
              {Object.keys(stats.byAgency).length > 0 && (
                <Card>
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-teal-600" />
                      Top Agencies by Interest
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="space-y-2">
                      {getTopItems(stats.byAgency)
                        .filter(([_, data]) => data.interested > 0)
                        .map(([agency, data]) => (
                          <div key={agency} className="flex items-center justify-between text-sm">
                            <span className="truncate max-w-[300px] text-gray-700">{agency}</span>
                            <Badge className="bg-green-100 text-green-800">
                              {data.interested} interested
                            </Badge>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Top Keywords */}
              {Object.keys(stats.topKeywords).length > 0 && (
                <Card>
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-purple-600" />
                      Learned Keywords (from Interested)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="flex flex-wrap gap-2">
                      {getTopKeywords(stats.topKeywords, 15).map(([keyword, count]) => (
                        <Badge
                          key={keyword}
                          variant="outline"
                          className="bg-purple-50 border-purple-200 text-purple-700"
                        >
                          {keyword} ({count})
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                      These keywords appear frequently in opportunities marked as interesting.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Training Info */}
              <Card className="border-gray-200 bg-gray-50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <BarChart3 className="h-5 w-5 text-gray-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">How Training Works</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Every time you mark an opportunity as interested or not interested, the system learns your
                        preferences. This data is shared across all users to improve recommendations and filtering
                        for the entire organization.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
