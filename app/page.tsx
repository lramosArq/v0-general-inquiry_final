"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Globe, Flag, LogOut, Bell, BarChart3, Loader2, Plug, Bot, ThumbsUp, ThumbsDown, UserCheck, Users, Briefcase, X, Calendar, Bookmark, FolderOpen, Save, RotateCcw, Sparkles, Download } from "lucide-react"
import { exportGrantsToExcelXLSX } from "@/lib/excel-export"
import { AlertsPanel } from "@/components/alerts-panel"
import { MarketIntelligence } from "@/components/market-intelligence"
import { APIConnectionsPanel, type APIConfig } from "@/components/api-connections-panel"
import { GPTSyncPanel } from "@/components/gpt-sync-panel"
import { LoginScreen } from "@/components/login-screen"
import { UserService, type User as UserType } from "@/lib/user-service"
import { OpportunityClaimService, type OpportunityClaim } from "@/lib/opportunity-claim-service"
import { TrainingStatsPanel } from "@/components/training-stats-panel"

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
  source: "usa" | "eu" | "spain"
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
  const [apiConfig, setApiConfig] = useState<APIConfig | null>(null)

  // Interest feedback for training
  const [interestFeedback, setInterestFeedback] = useState<Record<string, "interested" | "not_interested">>({})
  const [feedbackStats, setFeedbackStats] = useState({ interested: 0, notInterested: 0 })

  // Opportunity claims
  const [opportunityClaims, setOpportunityClaims] = useState<OpportunityClaim[]>([])
  const [showMyClaimsPanel, setShowMyClaimsPanel] = useState(false)
  const [showTrainingStats, setShowTrainingStats] = useState(false)

  // Search filters
  const [keyword, setKeyword] = useState("")
  const [opportunityNumber, setOpportunityNumber] = useState("")
  const [assistanceListings, setAssistanceListings] = useState("")
  const [sortBy, setSortBy] = useState("posted-desc")
  const [dateRange, setDateRange] = useState("all")

  // Prompt field for natural language search
  const [promptSearch, setPromptSearch] = useState("")

  // Date range filters (Release Date and Close Date separate)
  const [releaseDateFilter, setReleaseDateFilter] = useState({
    startDate: "",
    endDate: "",
  })
  
  const [closeDateFilter, setCloseDateFilter] = useState({
    startDate: "",
    endDate: "",
  })

  // Legacy date range filter (keeping for compatibility)
  const [dateRangeFilter, setDateRangeFilter] = useState({
    enabled: false,
    startDate: "",
    endDate: "",
    dateType: "posted" as "posted" | "close",
  })

  // Region filter (multi-select)
  const [sourceFilter, setSourceFilter] = useState({
    all: true,
    usa: false,
    eu: false,
    spain: false,
    other: false,
  })

  // ORB/Vent filter (ARQUIMEA business units)
  const [orbVentFilter, setOrbVentFilter] = useState({
    all: true,
    arcOthers: false,
    bio: false,
    connect: false,
    defense: false,
    molefy: false,
    nd: false,
    pulsar: false,
    space: false,
    volinga: false,
    none: false,
  })

  // Program / TechMap filter
  const [programFilter, setProgramFilter] = useState({
    all: true,
    program1: false,
    program2: false,
    program3: false,
    others: false,
    none: false,
  })

  // Type filter
  const [typeFilter, setTypeFilter] = useState({
    all: true,
    grant: false,
    contract: false,
    cooperative: false,
    other: false,
  })

  // NAICS filter
  const [naicsFilter, setNaicsFilter] = useState("")

  // Saved searches
  const [savedSearches, setSavedSearches] = useState<Array<{
    id: string
    name: string
    createdAt: string
    filters: {
      keyword: string
      promptSearch: string
      sourceFilter: typeof sourceFilter
      statusFilters: typeof statusFilters
      orbVentFilter: typeof orbVentFilter
      programFilter: typeof programFilter
      typeFilter: typeof typeFilter
      naicsFilter: string
      releaseDateFilter: typeof releaseDateFilter
      closeDateFilter: typeof closeDateFilter
      categoryFilters: typeof categoryFilters
    }
  }>>([])
  const [showSavedSearches, setShowSavedSearches] = useState(false)
  const [saveSearchName, setSaveSearchName] = useState("")
  const [showSaveSearchModal, setShowSaveSearchModal] = useState(false)

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
    cybersecurity: false,
    ai: false,
    space: false,
    defense: false,
  })

  const [agencyFilters, setAgencyFilters] = useState({
    all: true,
    horizon: false,
    digital: false,
  })

  useEffect(() => {
    const initializeUser = async () => {
      const userService = UserService.getInstance()
      const user = userService.getCurrentUser()
      if (user) {
        // LOCAL ALERTS HAVE PRIORITY - they are the source of truth
        const localAlerts = user.alerts || []
        
        // Try to sync local alerts to server (fire and forget)
        if (localAlerts.length > 0) {
          try {
            // Sync all local alerts to server to ensure persistence across sessions
            for (const alert of localAlerts) {
              fetch("/api/shared-data", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "alerts", userId: user.id, action: "add", data: alert }),
              }).catch(() => {})
            }
          } catch {
            // Ignore sync errors - local data is preserved
          }
        }
        
        // Always use local alerts as the source of truth
        setCurrentUser({ ...user, alerts: localAlerts })
      }
      setIsCheckingAuth(false)
    }
    
    initializeUser()

    // Load interest feedback from server first, then localStorage as fallback
    const loadFeedback = async () => {
      try {
        const response = await fetch("/api/shared-data?type=feedback")
        const result = await response.json()
        if (result.success && Object.keys(result.data).length > 0) {
          setInterestFeedback(result.data)
          const interested = Object.values(result.data).filter((v) => v === "interested").length
          const notInterested = Object.values(result.data).filter((v) => v === "not_interested").length
          setFeedbackStats({ interested, notInterested })
          localStorage.setItem("grantInterestFeedback", JSON.stringify(result.data))
          return
        }
      } catch { /* continue to localStorage */ }
      
      // Fallback to localStorage
      try {
        const savedFeedback = localStorage.getItem("grantInterestFeedback")
        if (savedFeedback) {
          const parsed = JSON.parse(savedFeedback)
          setInterestFeedback(parsed)
          const interested = Object.values(parsed).filter((v) => v === "interested").length
          const notInterested = Object.values(parsed).filter((v) => v === "not_interested").length
          setFeedbackStats({ interested, notInterested })
          // Sync to server
          fetch("/api/shared-data", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "feedback", action: "update", data: parsed }),
          }).catch(() => {})
        }
      } catch { /* ignore */ }
    }
    
    loadFeedback()

    // Load and sync opportunity claims
    const initializeClaims = async () => {
      const claimService = OpportunityClaimService.getInstance()
      await claimService.initialize()
      setOpportunityClaims(claimService.getAllClaims())
      
      // Poll for updates every 30 seconds (reduced frequency to avoid UI flicker)
      const pollInterval = setInterval(async () => {
        const freshClaims = await claimService.refreshClaims()
        setOpportunityClaims(freshClaims)
        
        // Refresh feedback from server (but NOT user to avoid re-triggering fetchGrants)
        try {
          const feedbackResponse = await fetch("/api/shared-data?type=feedback")
          const feedbackResult = await feedbackResponse.json()
          if (feedbackResult.success && Object.keys(feedbackResult.data).length > 0) {
            setInterestFeedback(feedbackResult.data)
            const interested = Object.values(feedbackResult.data).filter((v) => v === "interested").length
            const notInterested = Object.values(feedbackResult.data).filter((v) => v === "not_interested").length
            setFeedbackStats({ interested, notInterested })
          }
        } catch { /* ignore */ }
      }, 30000)
      
      return () => clearInterval(pollInterval)
    }
    
    initializeClaims()
  }, [])

  // Track if we've already fetched grants for the current session
  const [hasFetchedGrants, setHasFetchedGrants] = useState(false)
  
  useEffect(() => {
    // Only fetch grants once when user logs in, not on every user object update
    if (currentUser && !hasFetchedGrants) {
      fetchGrants()
      setHasFetchedGrants(true)
    }
    // Reset when user logs out
    if (!currentUser) {
      setHasFetchedGrants(false)
    }
  }, [currentUser, hasFetchedGrants])

  // Apply filters only when grants are loaded initially
  const hasAppliedInitialFilters = useRef(false)
  
  useEffect(() => {
    if (grants.length > 0 && !hasAppliedInitialFilters.current) {
      hasAppliedInitialFilters.current = true
      applyFilters()
    }
  }, [grants.length])

  // Debounced filter application when filter values change
  const filterTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  useEffect(() => {
    // Skip if grants not loaded yet
    if (grants.length === 0 || !hasAppliedInitialFilters.current) return
    
    // Debounce filter changes
    if (filterTimeoutRef.current) {
      clearTimeout(filterTimeoutRef.current)
    }
    
    filterTimeoutRef.current = setTimeout(() => {
      applyFilters()
    }, 150) // 150ms debounce
    
    return () => {
      if (filterTimeoutRef.current) {
        clearTimeout(filterTimeoutRef.current)
      }
    }
  }, [keyword, opportunityNumber, promptSearch, JSON.stringify(sourceFilter), JSON.stringify(statusFilters), JSON.stringify(fundingInstruments), JSON.stringify(categoryFilters), sortBy, JSON.stringify(dateRangeFilter), JSON.stringify(releaseDateFilter), JSON.stringify(closeDateFilter), JSON.stringify(orbVentFilter), JSON.stringify(programFilter), JSON.stringify(typeFilter), naicsFilter])

  // Load saved searches from server on mount
  useEffect(() => {
    const loadSavedSearches = async () => {
      try {
        const response = await fetch("/api/shared-data?type=savedSearches")
        const result = await response.json()
        if (result.success && result.data) {
          setSavedSearches(result.data)
        }
      } catch { /* ignore */ }
    }
    loadSavedSearches()
  }, [])

  // Save current search
  const handleSaveSearch = async () => {
    if (!saveSearchName.trim()) return
    
    const newSearch = {
      id: `search_${Date.now()}`,
      name: saveSearchName.trim(),
      createdAt: new Date().toISOString(),
      filters: {
        keyword,
        promptSearch,
        sourceFilter,
        statusFilters,
        orbVentFilter,
        programFilter,
        typeFilter,
        naicsFilter,
        releaseDateFilter,
        closeDateFilter,
        categoryFilters,
      },
    }
    
    const updatedSearches = [...savedSearches, newSearch]
    setSavedSearches(updatedSearches)
    
    // Sync to server
    try {
      await fetch("/api/shared-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "savedSearches", action: "save", data: updatedSearches }),
      })
    } catch { /* ignore */ }
    
    setSaveSearchName("")
    setShowSaveSearchModal(false)
  }

  // Load a saved search
  const handleLoadSearch = (search: typeof savedSearches[0]) => {
    setKeyword(search.filters.keyword || "")
    setPromptSearch(search.filters.promptSearch || "")
    setSourceFilter(search.filters.sourceFilter || { all: true, usa: false, eu: false, spain: false, other: false })
    setStatusFilters(search.filters.statusFilters || { forecasted: true, open: true, closed: false, archived: false })
    setOrbVentFilter(search.filters.orbVentFilter || { all: true, arcOthers: false, bio: false, connect: false, defense: false, molefy: false, nd: false, pulsar: false, space: false, volinga: false, none: false })
    setProgramFilter(search.filters.programFilter || { all: true, program1: false, program2: false, program3: false, others: false, none: false })
    setTypeFilter(search.filters.typeFilter || { all: true, grant: false, contract: false, cooperative: false, other: false })
    setNaicsFilter(search.filters.naicsFilter || "")
    setReleaseDateFilter(search.filters.releaseDateFilter || { startDate: "", endDate: "" })
    setCloseDateFilter(search.filters.closeDateFilter || { startDate: "", endDate: "" })
    setCategoryFilters(search.filters.categoryFilters || { all: true, horizonEurope: false, digitalEurope: false, cybersecurity: false, ai: false, space: false, defense: false })
    setShowSavedSearches(false)
  }

  // Delete a saved search
  const handleDeleteSearch = async (searchId: string) => {
    const updatedSearches = savedSearches.filter((s) => s.id !== searchId)
    setSavedSearches(updatedSearches)
    
    try {
      await fetch("/api/shared-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "savedSearches", action: "save", data: updatedSearches }),
      })
    } catch { /* ignore */ }
  }

  // Reset all filters
  const handleResetFilters = () => {
    setKeyword("")
    setPromptSearch("")
    setOpportunityNumber("")
    setSourceFilter({ all: true, usa: false, eu: false, spain: false, other: false })
    setStatusFilters({ forecasted: true, open: true, closed: false, archived: false })
    setOrbVentFilter({ all: true, arcOthers: false, bio: false, connect: false, defense: false, molefy: false, nd: false, pulsar: false, space: false, volinga: false, none: false })
    setProgramFilter({ all: true, program1: false, program2: false, program3: false, others: false, none: false })
    setTypeFilter({ all: true, grant: false, contract: false, cooperative: false, other: false })
    setNaicsFilter("")
    setReleaseDateFilter({ startDate: "", endDate: "" })
    setCloseDateFilter({ startDate: "", endDate: "" })
    setDateRangeFilter({ enabled: false, startDate: "", endDate: "", dateType: "posted" })
    setCategoryFilters({ all: true, horizonEurope: false, digitalEurope: false, cybersecurity: false, ai: false, space: false, defense: false })
    setFundingInstruments({ all: true, researchInnovation: false, innovation: false, coordination: false, cascade: false, simpleGrants: false })
  }

  const fetchGrants = async () => {
    setIsLoading(true)
    try {
  
      // Load saved blocklist config
      let blocklist: { ids: string[]; keywords: string[] } | undefined
      try {
        const savedConfig = localStorage.getItem("apiConfig")
        if (savedConfig) {
          const parsed = JSON.parse(savedConfig)
          blocklist = parsed.blocklist
          if (!apiConfig) setApiConfig(parsed)
        }
      } catch { /* ignore */ }

      const response = await fetch("/api/grants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: "all",
          source: "all",
          blocklist,
        }),
      })

      if (response.ok) {
        const result = await response.json()
      const fetchedGrants = result.grants || []
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

  const handleInterestFeedback = (grantId: string, interest: "interested" | "not_interested") => {
    const newFeedback = { ...interestFeedback }
    const grant = grants.find((g) => g.id === grantId)
    
    // Toggle: if same value clicked again, remove feedback
    if (newFeedback[grantId] === interest) {
      delete newFeedback[grantId]
    } else {
      newFeedback[grantId] = interest
    }

    setInterestFeedback(newFeedback)

    // Update stats
    const interested = Object.values(newFeedback).filter((v) => v === "interested").length
    const notInterested = Object.values(newFeedback).filter((v) => v === "not_interested").length
    setFeedbackStats({ interested, notInterested })

    // Persist to localStorage and sync to server
    try {
      localStorage.setItem("grantInterestFeedback", JSON.stringify(newFeedback))
      
      // Sync simple feedback format for other users
      fetch("/api/shared-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "feedback", action: "update", data: newFeedback }),
      }).catch(() => {})
      
      // Send detailed training data for AI learning
      if (currentUser && grant && newFeedback[grantId]) {
        fetch("/api/shared-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "training",
            data: {
              opportunityId: grantId,
              userId: currentUser.id,
              userName: currentUser.name,
              businessUnit: currentUser.businessUnit,
              feedback: interest,
              opportunityData: {
                title: grant.title,
                agency: grant.agency,
                category: grant.category,
                source: grant.source,
                keywords: grant.title.toLowerCase().split(/\s+/).filter((w: string) => w.length > 4),
              },
            },
          }),
        }).catch(() => {})
      }
    } catch { /* ignore */ }
  }

  const applyFilters = () => {
    let filtered = [...grants]

    // Source filter
    if (!sourceFilter.all) {
      const enabledSources: string[] = []
      if (sourceFilter.usa) enabledSources.push("usa")
      if (sourceFilter.eu) enabledSources.push("eu")
      if (sourceFilter.spain) enabledSources.push("spain")
      if (enabledSources.length > 0) {
        filtered = filtered.filter((g) => enabledSources.includes(g.source))
      }
    }

    // Prompt search (natural language - searches across all text fields)
    if (promptSearch) {
      const searchTerms = promptSearch.toLowerCase().split(/\s+/).filter((t) => t.length > 2)
      filtered = filtered.filter((g) => {
        const searchableText = `${g.title} ${g.description || ""} ${g.agency} ${g.category || ""}`.toLowerCase()
        return searchTerms.some((term) => searchableText.includes(term))
      })
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
        const idLower = (g.opportunityNumber || "").toLowerCase()
        const agencyLower = (g.agency || "").toLowerCase()
        const catLower = (g.category || "").toLowerCase()
        const descLower = (g.description || "").toLowerCase()

        // EU-only categories: only match EU-sourced grants
        if (categoryFilters.horizonEurope && g.source === "eu" &&
          (titleLower.includes("horizon") || idLower.includes("horizon") || catLower.includes("horizon")))
          return true
        if (categoryFilters.digitalEurope && g.source === "eu" &&
          (titleLower.includes("digital") || idLower.includes("digital") || catLower.includes("digital")))
          return true

        // Cross-source categories
        if (categoryFilters.cybersecurity &&
          (titleLower.includes("cyber") || catLower.includes("cyber") || descLower.includes("cybersecurity")))
          return true
        if (categoryFilters.ai &&
          (titleLower.includes("artificial intelligence") || titleLower.includes(" ai ") || catLower.includes("ai") || catLower.includes("artificial")))
          return true
        if (categoryFilters.space &&
          (titleLower.includes("space") || titleLower.includes("satellite") || titleLower.includes("gravimetry") || catLower.includes("space")))
          return true
        if (categoryFilters.defense &&
          (titleLower.includes("defense") || titleLower.includes("darpa") || titleLower.includes("c5isr") ||
            titleLower.includes("cmoss") || titleLower.includes("cmff") || titleLower.includes("missile") ||
            titleLower.includes("devcom") || agencyLower.includes("defense") || agencyLower.includes("darpa") ||
            catLower.includes("defense") || catLower.includes("military")))
          return true

        return false
      })
    }

    // Date range filter (legacy)
    if (dateRangeFilter.enabled && (dateRangeFilter.startDate || dateRangeFilter.endDate)) {
      filtered = filtered.filter((g) => {
        const dateToCheck = dateRangeFilter.dateType === "posted" ? g.postedDate : g.closeDate
        if (!dateToCheck) return true // Keep grants without dates
        
        const grantDate = new Date(dateToCheck).getTime()
        
        if (dateRangeFilter.startDate && dateRangeFilter.endDate) {
          const startMs = new Date(dateRangeFilter.startDate).getTime()
          const endMs = new Date(dateRangeFilter.endDate).getTime() + (24 * 60 * 60 * 1000 - 1) // End of day
          return grantDate >= startMs && grantDate <= endMs
        } else if (dateRangeFilter.startDate) {
          const startMs = new Date(dateRangeFilter.startDate).getTime()
          return grantDate >= startMs
        } else if (dateRangeFilter.endDate) {
          const endMs = new Date(dateRangeFilter.endDate).getTime() + (24 * 60 * 60 * 1000 - 1)
          return grantDate <= endMs
        }
        return true
      })
    }

    // Release Date filter (new separate filter)
    if (releaseDateFilter.startDate || releaseDateFilter.endDate) {
      filtered = filtered.filter((g) => {
        if (!g.postedDate) return true
        const grantDate = new Date(g.postedDate).getTime()
        
        if (releaseDateFilter.startDate && releaseDateFilter.endDate) {
          const startMs = new Date(releaseDateFilter.startDate).getTime()
          const endMs = new Date(releaseDateFilter.endDate).getTime() + (24 * 60 * 60 * 1000 - 1)
          return grantDate >= startMs && grantDate <= endMs
        } else if (releaseDateFilter.startDate) {
          return grantDate >= new Date(releaseDateFilter.startDate).getTime()
        } else if (releaseDateFilter.endDate) {
          return grantDate <= new Date(releaseDateFilter.endDate).getTime() + (24 * 60 * 60 * 1000 - 1)
        }
        return true
      })
    }

    // Close Date filter (new separate filter)
    if (closeDateFilter.startDate || closeDateFilter.endDate) {
      filtered = filtered.filter((g) => {
        if (!g.closeDate) return true
        const grantDate = new Date(g.closeDate).getTime()
        
        if (closeDateFilter.startDate && closeDateFilter.endDate) {
          const startMs = new Date(closeDateFilter.startDate).getTime()
          const endMs = new Date(closeDateFilter.endDate).getTime() + (24 * 60 * 60 * 1000 - 1)
          return grantDate >= startMs && grantDate <= endMs
        } else if (closeDateFilter.startDate) {
          return grantDate >= new Date(closeDateFilter.startDate).getTime()
        } else if (closeDateFilter.endDate) {
          return grantDate <= new Date(closeDateFilter.endDate).getTime() + (24 * 60 * 60 * 1000 - 1)
        }
        return true
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
    if (sourceFilter.spain) sources.push("spain")

    const categories: string[] = []
    if (categoryFilters.all) categories.push("all")
    if (categoryFilters.horizonEurope) categories.push("horizonEurope")
    if (categoryFilters.digitalEurope) categories.push("digitalEurope")

    if (categoryFilters.cybersecurity) categories.push("cybersecurity")
    if (categoryFilters.ai) categories.push("ai")
    if (categoryFilters.space) categories.push("space")
    if (categoryFilters.defense) categories.push("defense")

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
    setShowMyClaimsPanel(false)
    setGrants([])
    setFilteredGrants([])
  }

  // Handle claiming/releasing an opportunity
  const handleClaimOpportunity = async (opportunityId: string) => {
    if (!currentUser) return
    
    const claimService = OpportunityClaimService.getInstance()
    
    // Refresh claims from server first
    const freshClaims = await claimService.refreshClaims()
    const existingClaim = freshClaims.find(c => c.opportunityId === opportunityId)
    
    if (existingClaim && existingClaim.claimedBy.id === currentUser.id) {
      // Release the claim
      const result = await claimService.releaseOpportunity(opportunityId, currentUser.id)
      if (result.success) {
        setOpportunityClaims(claimService.getAllClaims())
      }
    } else if (!existingClaim) {
      // Claim the opportunity
      const result = await claimService.claimOpportunity(opportunityId, {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        businessUnit: currentUser.businessUnit,
      })
      if (result.success) {
        setOpportunityClaims(claimService.getAllClaims())
      }
    } else {
      // Another user claimed it, refresh UI
      setOpportunityClaims(freshClaims)
    }
  }

  // Get claim info for an opportunity
  const getClaimInfo = (opportunityId: string): OpportunityClaim | null => {
    return opportunityClaims.find(c => c.opportunityId === opportunityId) || null
  }

  // Get user's claimed opportunities
  const getUserClaims = (): OpportunityClaim[] => {
    if (!currentUser) return []
    return opportunityClaims.filter(c => c.claimedBy.id === currentUser.id)
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
                onClick={() => setShowMyClaimsPanel(!showMyClaimsPanel)}
                className={`text-white hover:bg-white/10 ${showMyClaimsPanel ? "bg-white/20" : ""}`}
              >
                <Briefcase className="h-4 w-4 mr-2" />
                Mis Oportunidades ({getUserClaims().length})
              </Button>
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
              <TabsTrigger
                value="connections"
                className="text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10 rounded-none border-b-2 border-transparent data-[state=active]:border-white px-6 py-3"
              >
                <Plug className="h-4 w-4 mr-2" />
                API Connections
              </TabsTrigger>
              <TabsTrigger
                value="gpt-sync"
                className="text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10 rounded-none border-b-2 border-transparent data-[state=active]:border-white px-6 py-3"
              >
                <Bot className="h-4 w-4 mr-2" />
                GPT Sync
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

        {activeTab === "gpt-sync" ? (
          <GPTSyncPanel
            onGrantsFound={(newGrants) => {
              setGrants((prev) => {
                const existingIds = new Set(prev.map((g) => g.id))
                const unique = newGrants.filter((g: any) => !existingIds.has(g.id))
                return [...unique, ...prev]
              })
            }}
          />
        ) : activeTab === "connections" ? (
          <APIConnectionsPanel
            onConfigSave={(config) => setApiConfig(config)}
            onRefresh={fetchGrants}
          />
            ) : activeTab === "intelligence" ? (
              <MarketIntelligence 
                grants={grants} 
                onCategoryClick={(category, keywords) => {
                  // Set the keyword filter to the first keyword of the category
                  setKeyword(keywords[0] || category.toLowerCase())
                  // Switch to grants tab
                  setActiveTab("grants")
                }}
              />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Filters Sidebar */}
            <div className="lg:col-span-1">
              <Card className="border-[#d1d5db]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-[#1e3a5f] text-lg">Filters</h2>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowSaveSearchModal(true)}
                        className="h-7 px-2 text-xs"
                        title="Save Search"
                      >
                        <Save className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowSavedSearches(!showSavedSearches)}
                        className="h-7 px-2 text-xs"
                        title="Saved Searches"
                      >
                        <FolderOpen className="h-3 w-3" />
                        {savedSearches.length > 0 && (
                          <span className="ml-1 bg-blue-100 text-blue-700 rounded-full px-1.5 text-xs">{savedSearches.length}</span>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleResetFilters}
                        className="h-7 px-2 text-xs"
                        title="Reset Filters"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Save Search Modal */}
                  {showSaveSearchModal && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="text-sm font-medium text-blue-800 mb-2">Save Current Search</h4>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Search name..."
                          value={saveSearchName}
                          onChange={(e) => setSaveSearchName(e.target.value)}
                          className="text-sm h-8"
                        />
                        <Button size="sm" onClick={handleSaveSearch} disabled={!saveSearchName.trim()} className="h-8">
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowSaveSearchModal(false)} className="h-8">
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Saved Searches List */}
                  {showSavedSearches && savedSearches.length > 0 && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                        <Bookmark className="h-3 w-3" /> Saved Searches
                      </h4>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {savedSearches.map((search) => (
                          <div key={search.id} className="flex items-center justify-between p-2 bg-white rounded border hover:bg-gray-50">
                            <button
                              onClick={() => handleLoadSearch(search)}
                              className="text-sm text-left flex-1 text-blue-600 hover:underline"
                            >
                              {search.name}
                            </button>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-400">{new Date(search.createdAt).toLocaleDateString()}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteSearch(search.id)}
                                className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Prompt Field */}
                  <div className="mb-6">
                    <h3 className="font-medium text-sm mb-2 text-gray-700 flex items-center gap-1">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      Prompt
                    </h3>
                    <textarea
                      placeholder="Describe in natural language the type of funding opportunity you want to find..."
                      value={promptSearch}
                      onChange={(e) => setPromptSearch(e.target.value)}
                      className="w-full text-sm p-2 border rounded-md resize-none h-20 focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                    />
                  </div>

                  {/* Keywords Field */}
                  <div className="mb-6">
                    <h3 className="font-medium text-sm mb-2 text-gray-700">Keywords</h3>
                    <Input
                      placeholder="Enter keywords..."
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      className="text-sm"
                    />
                  </div>

                  {/* Region Filter */}
                  <div className="mb-6">
                    <h3 className="font-medium text-sm mb-2 text-gray-700">Region</h3>
                    <div className="space-y-2">
                      {[
                        { key: "all", label: "All Regions", icon: Globe },
                        { key: "usa", label: "US (Grants.gov)", icon: Flag },
                        { key: "eu", label: "Europe (Funding & Tenders)", icon: Globe },
                        { key: "spain", label: "Spain (Subvenciones)", icon: Flag },
                        { key: "other", label: "Other", icon: Globe },
                      ].map(({ key, label, icon: Icon }) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Checkbox
                            id={`source-${key}`}
                            checked={sourceFilter[key as keyof typeof sourceFilter]}
                            onCheckedChange={(checked) => {
                              // Reset category filters when source changes to avoid cross-source categories
                              setCategoryFilters({
                                all: true,
                                horizonEurope: false,
                                digitalEurope: false,
                                cybersecurity: false,
                                ai: false,
                                space: false,
                                defense: false,
                              })
                              if (key === "all") {
                                setSourceFilter({ all: true, usa: false, eu: false, spain: false })
                              } else {
                                setSourceFilter((prev) => ({
                                  all: false,
                                  usa: key === "usa" ? !!checked : prev.usa && key !== "usa" ? prev.usa : false,
                                  eu: key === "eu" ? !!checked : prev.eu && key !== "eu" ? prev.eu : false,
                                  spain: key === "spain" ? !!checked : prev.spain && key !== "spain" ? prev.spain : false,
                                }))
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

                  {/* Release Date Filter */}
                  <div className="mb-6">
                    <h3 className="font-medium text-sm mb-2 text-gray-700 flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Release Date
                    </h3>
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <Label htmlFor="release-start-date" className="text-xs text-gray-500">From:</Label>
                        <Input
                          type="date"
                          id="release-start-date"
                          value={releaseDateFilter.startDate}
                          onChange={(e) => setReleaseDateFilter((prev) => ({ ...prev, startDate: e.target.value }))}
                          className="text-sm h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="release-end-date" className="text-xs text-gray-500">To:</Label>
                        <Input
                          type="date"
                          id="release-end-date"
                          value={releaseDateFilter.endDate}
                          onChange={(e) => setReleaseDateFilter((prev) => ({ ...prev, endDate: e.target.value }))}
                          className="text-sm h-8"
                        />
                      </div>
                      {(releaseDateFilter.startDate || releaseDateFilter.endDate) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setReleaseDateFilter({ startDate: "", endDate: "" })}
                          className="text-xs h-6 w-full text-gray-500"
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Close Date Filter */}
                  <div className="mb-6">
                    <h3 className="font-medium text-sm mb-2 text-gray-700 flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Close Date
                    </h3>
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <Label htmlFor="close-start-date" className="text-xs text-gray-500">From:</Label>
                        <Input
                          type="date"
                          id="close-start-date"
                          value={closeDateFilter.startDate}
                          onChange={(e) => setCloseDateFilter((prev) => ({ ...prev, startDate: e.target.value }))}
                          className="text-sm h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="close-end-date" className="text-xs text-gray-500">To:</Label>
                        <Input
                          type="date"
                          id="close-end-date"
                          value={closeDateFilter.endDate}
                          onChange={(e) => setCloseDateFilter((prev) => ({ ...prev, endDate: e.target.value }))}
                          className="text-sm h-8"
                        />
                      </div>
                      {(closeDateFilter.startDate || closeDateFilter.endDate) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setCloseDateFilter({ startDate: "", endDate: "" })}
                          className="text-xs h-6 w-full text-gray-500"
                        >
                          Clear
                        </Button>
                      )}
                      {/* Hint about closed opportunities */}
                      <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded mt-2">
                        Enable &quot;Closed&quot; status filter to see past opportunities
                      </div>
                    </div>
                  </div>

                  {/* Category Filter */}
                  <div className="mb-6">
                    <h3 className="font-medium text-sm mb-2 text-gray-700">Category</h3>
                    <div className="space-y-2">
                      {[
                        { key: "all", label: "All Categories", sources: ["all", "usa", "eu", "spain"] },
                        { key: "horizonEurope", label: "Horizon Europe", sources: ["all", "eu"] },
                        { key: "digitalEurope", label: "Digital Europe", sources: ["all", "eu"] },
                        { key: "cybersecurity", label: "Cybersecurity", sources: ["all", "usa", "eu", "spain"] },
                        { key: "ai", label: "Artificial Intelligence", sources: ["all", "usa", "eu", "spain"] },
                        { key: "space", label: "Space", sources: ["all", "usa", "eu", "spain"] },
                        { key: "defense", label: "Defense", sources: ["all", "usa", "eu", "spain"] },
                      ]
                        .filter(({ sources: s }) => {
                          if (sourceFilter.all) return s.includes("all")
                          if (sourceFilter.usa) return s.includes("usa")
                          if (sourceFilter.eu) return s.includes("eu")
                          if (sourceFilter.spain) return s.includes("spain")
                          return true
                        })
                        .map(({ key, label }) => (
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
                                  cybersecurity: false,
                                  ai: false,
                                  space: false,
                                  defense: false,
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

                  {/* ORB/Vent Filter (ARQUIMEA Business Units) */}
                  <div className="mb-6">
                    <h3 className="font-medium text-sm mb-2 text-gray-700">ORB/Vent</h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {[
                        { key: "all", label: "All" },
                        { key: "arcOthers", label: "ARC-OTHERS" },
                        { key: "bio", label: "BIO" },
                        { key: "connect", label: "CONNECT" },
                        { key: "defense", label: "DEFENSE" },
                        { key: "molefy", label: "MOLEFY" },
                        { key: "nd", label: "ND" },
                        { key: "pulsar", label: "PULSAR" },
                        { key: "space", label: "SPACE" },
                        { key: "volinga", label: "VOLINGA" },
                        { key: "none", label: "None" },
                      ].map(({ key, label }) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Checkbox
                            id={`orb-${key}`}
                            checked={orbVentFilter[key as keyof typeof orbVentFilter]}
                            onCheckedChange={(checked) => {
                              if (key === "all") {
                                setOrbVentFilter({
                                  all: true,
                                  arcOthers: false, bio: false, connect: false, defense: false,
                                  molefy: false, nd: false, pulsar: false, space: false, volinga: false, none: false,
                                })
                              } else {
                                setOrbVentFilter((prev) => ({
                                  ...prev,
                                  all: false,
                                  [key]: !!checked,
                                }))
                              }
                            }}
                          />
                          <Label htmlFor={`orb-${key}`} className="text-sm cursor-pointer">
                            {label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Program / TechMap Filter */}
                  <div className="mb-6">
                    <h3 className="font-medium text-sm mb-2 text-gray-700">Program / TechMap</h3>
                    <div className="space-y-2">
                      {[
                        { key: "all", label: "All" },
                        { key: "program1", label: "Program 1" },
                        { key: "program2", label: "Program 2" },
                        { key: "program3", label: "Program 3" },
                        { key: "others", label: "Others" },
                        { key: "none", label: "None" },
                      ].map(({ key, label }) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Checkbox
                            id={`program-${key}`}
                            checked={programFilter[key as keyof typeof programFilter]}
                            onCheckedChange={(checked) => {
                              if (key === "all") {
                                setProgramFilter({
                                  all: true,
                                  program1: false, program2: false, program3: false, others: false, none: false,
                                })
                              } else {
                                setProgramFilter((prev) => ({
                                  ...prev,
                                  all: false,
                                  [key]: !!checked,
                                }))
                              }
                            }}
                          />
                          <Label htmlFor={`program-${key}`} className="text-sm cursor-pointer">
                            {label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Type Filter */}
                  <div className="mb-6">
                    <h3 className="font-medium text-sm mb-2 text-gray-700">Type</h3>
                    <div className="space-y-2">
                      {[
                        { key: "all", label: "All Types" },
                        { key: "grant", label: "Grant" },
                        { key: "contract", label: "Contract" },
                        { key: "cooperative", label: "Cooperative Agreement" },
                        { key: "other", label: "Other" },
                      ].map(({ key, label }) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Checkbox
                            id={`type-${key}`}
                            checked={typeFilter[key as keyof typeof typeFilter]}
                            onCheckedChange={(checked) => {
                              if (key === "all") {
                                setTypeFilter({
                                  all: true,
                                  grant: false, contract: false, cooperative: false, other: false,
                                })
                              } else {
                                setTypeFilter((prev) => ({
                                  ...prev,
                                  all: false,
                                  [key]: !!checked,
                                }))
                              }
                            }}
                          />
                          <Label htmlFor={`type-${key}`} className="text-sm cursor-pointer">
                            {label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* NAICS Filter */}
                  <div className="mb-6">
                    <h3 className="font-medium text-sm mb-2 text-gray-700">NAICS Code</h3>
                    <Input
                      placeholder="Enter NAICS code..."
                      value={naicsFilter}
                      onChange={(e) => setNaicsFilter(e.target.value)}
                      className="text-sm"
                    />
                    <p className="text-xs text-gray-400 mt-1">Optional: filter by industry code</p>
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
                      <div className="flex items-center gap-4">
                        <h2 className="font-semibold text-[#1e3a5f]">
                          {isLoading ? "Loading..." : `${filteredGrants.length} Opportunities Found`}
                        </h2>
                {(feedbackStats.interested > 0 || feedbackStats.notInterested > 0) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTrainingStats(true)}
                    className="flex items-center gap-2 text-xs h-7 bg-purple-50 border-purple-200 hover:bg-purple-100"
                  >
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 py-0">
                      <ThumbsUp className="h-3 w-3 mr-1" /> {feedbackStats.interested}
                    </Badge>
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 py-0">
                      <ThumbsDown className="h-3 w-3 mr-1" /> {feedbackStats.notInterested}
                    </Badge>
                    <span className="text-purple-700 font-medium">Training Memory</span>
                  </Button>
                )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => exportGrantsToExcelXLSX(filteredGrants)}
                          disabled={filteredGrants.length === 0 || isLoading}
                          className="flex items-center gap-1 text-xs h-8"
                        >
                          <Download className="h-3 w-3" />
                          Excel
                        </Button>
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
                            <th className="text-left p-3">Control</th>
                            <th className="text-left p-3">Opportunity Number</th>
                            <th className="text-left p-3">Title & Description</th>
                            <th className="text-left p-3">Agency</th>
                            <th className="text-left p-3">Status</th>
                            <th className="text-left p-3">Open Date</th>
                            <th className="text-left p-3">Close Date</th>
                            <th className="text-left p-3">Source</th>
                            <th className="text-left p-3">Training</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {paginatedGrants.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="text-center py-8 text-gray-500">
                                No grants found matching your criteria
                              </td>
                            </tr>
                          ) : (
                            paginatedGrants.map((grant) => {
                              const claimInfo = getClaimInfo(grant.id)
                              const isClaimedByMe = claimInfo?.claimedBy.id === currentUser?.id
                              const isClaimedByOther = claimInfo && !isClaimedByMe
                              
                              return (
                              <tr key={grant.id} className={`hover:bg-gray-50 ${isClaimedByMe ? "bg-emerald-50" : isClaimedByOther ? "bg-amber-50" : ""}`}>
                                <td className="p-3">
                                  <div className="flex flex-col items-center gap-1">
                                    <Checkbox
                                      id={`claim-${grant.id}`}
                                      checked={!!claimInfo}
                                      disabled={isClaimedByOther}
                                      onCheckedChange={() => handleClaimOpportunity(grant.id)}
                                      className={isClaimedByMe ? "border-emerald-600 data-[state=checked]:bg-emerald-600" : isClaimedByOther ? "border-amber-600 data-[state=checked]:bg-amber-600" : ""}
                                    />
                                    {claimInfo && (
                                      <div className="text-[10px] text-center max-w-[80px]">
                                        {isClaimedByMe ? (
                                          <span className="text-emerald-700 font-medium">Tu control</span>
                                        ) : (
                                          <span className="text-amber-700" title={claimInfo.claimedBy.email}>
                                            {claimInfo.claimedBy.name.split(" ")[0]}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </td>
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
                                        : grant.source === "spain"
                                          ? "bg-red-50 text-red-700 border-red-200"
                                          : "bg-yellow-50 text-yellow-700 border-yellow-200"
                                    }
                                  >
                                    {grant.source === "usa" ? "USA" : grant.source === "spain" ? "ES" : "EU"}
                                  </Badge>
                                </td>
                                <td className="p-3">
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant={interestFeedback[grant.id] === "interested" ? "default" : "outline"}
                                      className={`h-7 w-7 p-0 ${
                                        interestFeedback[grant.id] === "interested"
                                          ? "bg-green-600 hover:bg-green-700 text-white"
                                          : "hover:bg-green-50 hover:text-green-600 hover:border-green-300"
                                      }`}
                                      onClick={() => handleInterestFeedback(grant.id, "interested")}
                                      title="Mark as Interested - Train AI"
                                    >
                                      <ThumbsUp className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant={interestFeedback[grant.id] === "not_interested" ? "default" : "outline"}
                                      className={`h-7 w-7 p-0 ${
                                        interestFeedback[grant.id] === "not_interested"
                                          ? "bg-red-600 hover:bg-red-700 text-white"
                                          : "hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                                      }`}
                                      onClick={() => handleInterestFeedback(grant.id, "not_interested")}
                                      title="Mark as Not Interested - Train AI"
                                    >
                                      <ThumbsDown className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            )})
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

      {/* Training Stats Panel */}
      <TrainingStatsPanel isOpen={showTrainingStats} onClose={() => setShowTrainingStats(false)} />

      {/* My Claims Panel */}
      {showMyClaimsPanel && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
          <div className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-[#1e3a5f] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                <h2 className="font-semibold">Mis Oportunidades en Control</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMyClaimsPanel(false)}
                className="text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="p-4 space-y-4">
              {getUserClaims().length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>No tienes oportunidades en control</p>
                  <p className="text-sm mt-2">Selecciona la casilla de control en cualquier oportunidad para tomarla</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600">
                    Tienes <span className="font-semibold text-emerald-600">{getUserClaims().length}</span> oportunidades bajo tu control.
                    Otros usuarios veran que estas trabajando en ellas.
                  </p>
                  
                  {getUserClaims().map((claim) => {
                    const grant = grants.find(g => g.id === claim.opportunityId)
                    return (
                      <Card key={claim.opportunityId} className="border-emerald-200 bg-emerald-50/50">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <a
                                href={grant?.url || "#"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-[#1e3a5f] hover:underline text-sm"
                              >
                                {grant?.title || "Oportunidad no encontrada"}
                              </a>
                              <p className="text-xs text-gray-500 mt-1 font-mono">
                                {grant?.opportunityNumber || claim.opportunityId}
                              </p>
                              {grant && (
                                <div className="flex gap-2 mt-2">
                                  <Badge variant="outline" className="text-xs">
                                    {grant.agency}
                                  </Badge>
                                  <Badge
                                    className={
                                      grant.status === "Open"
                                        ? "bg-green-100 text-green-800 text-xs"
                                        : "bg-gray-100 text-gray-800 text-xs"
                                    }
                                  >
                                    {grant.status}
                                  </Badge>
                                </div>
                              )}
                              <p className="text-xs text-gray-400 mt-2">
                                Control tomado: {new Date(claim.claimedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleClaimOpportunity(claim.opportunityId)}
                              className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                            >
                              Liberar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </>
              )}
              
              {/* Show all claims from other users */}
              {opportunityClaims.filter(c => c.claimedBy.id !== currentUser?.id).length > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Oportunidades de otros usuarios
                  </h3>
                  <div className="space-y-2">
                    {opportunityClaims.filter(c => c.claimedBy.id !== currentUser?.id).map((claim) => {
                      const grant = grants.find(g => g.id === claim.opportunityId)
                      return (
                        <div key={claim.opportunityId} className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                          <p className="text-sm font-medium text-gray-800 line-clamp-1">
                            {grant?.title || claim.opportunityId}
                          </p>
                          <p className="text-xs text-amber-700 mt-1">
                            Controlado por: <span className="font-medium">{claim.claimedBy.name}</span>
                            <span className="text-amber-600 ml-1">({claim.claimedBy.businessUnit})</span>
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
