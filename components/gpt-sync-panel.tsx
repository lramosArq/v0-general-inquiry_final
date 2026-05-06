"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
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
  Rocket,
  Cpu,
  Radio,
  Microscope,
  Plane,
  Ship,
  Brain,
  Compass,
  Activity,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  Plus,
  Save,
  Trash2,
  Edit3,
  Bell,
  BellOff,
  X,
  Globe,
  Flag,
  Filter,
} from "lucide-react"

// Custom user-defined searches
interface CustomSearch {
  id: string
  name: string
  prompt: string
  keywords: string[]
  alertsEnabled: boolean
  createdAt: Date
  lastRun: Date | null
  resultsCount: number
}

// ARQUIMEA Programs with specialized prompts, keywords, and EXCLUSION keywords
// Based on NewTek program descriptions document
export const ARQUIMEA_PROGRAMS = [
  {
    id: "arqeos-missiles",
    name: "ARQEOS Missiles",
    icon: Rocket,
    color: "bg-red-500",
    prompt: "Search for grants and contracts related to long-range loitering strike systems, subsonic cruise missiles, turbojet propulsion, modular warhead systems, AI-assisted targeting, hybrid drone-missile platforms. Focus on munition systems NOT surveillance.",
    keywords: ["cruise missile", "turbojet propulsion", "warhead", "strike system", "loitering strike", "subsonic missile", "tactical missile", "munition system", "guided munition"],
    excludeKeywords: ["HIV", "health", "medical", "education", "training program", "workforce", "prevention", "counseling", "nutrition", "social service", "housing", "community"],
  },
  {
    id: "canarysat",
    name: "BeetleSat Constellation",
    icon: Satellite,
    color: "bg-blue-500",
    prompt: "Search for grants related to LEO satellite constellations, Ka-band connectivity, deployable expandable antennas, inter-satellite links (ISL), high-throughput satellites, low-latency communications, cellular backhaul, and satellite mass production.",
    keywords: ["satellite constellation", "LEO satellite", "Ka-band", "inter-satellite link", "ISL", "high-throughput satellite", "satellite integration", "deployable antenna", "Tbps"],
    excludeKeywords: ["HIV", "health", "medical", "education", "agriculture", "food", "housing", "social"],
  },
  {
    id: "biotechnology",
    name: "ARQUIMEA Biotechnology",
    icon: Microscope,
    color: "bg-green-500",
    prompt: "Search for grants related to ALS therapeutics, Alzheimer's treatment, wearable biosensors, microbiology platforms, antibiotic discovery from extremophiles, AI-driven drug discovery, postbiotics, microbiota-brain axis, and soil remediation.",
    keywords: ["ALS therapeutic", "Alzheimer treatment", "biosensor", "extremophile", "antibiotic discovery", "microbiome", "postbiotic", "organoid", "metagenome"],
    excludeKeywords: ["missile", "munition", "weapon", "satellite", "UAV", "drone strike"],
  },
  {
    id: "deeparq",
    name: "DeepArq Autonomy Platform",
    icon: Brain,
    color: "bg-purple-500",
    prompt: "Search for grants related to UAV autonomy software, AI pilot systems, autonomous behaviors, target tracking and recognition, tactical edge computing, Autonomy Operating System, swarm coordination, and human-in-the-loop supervision for uncrewed systems.",
    keywords: ["UAV autonomy", "AI pilot", "autonomous UAV", "target tracking", "swarm coordination", "tactical edge", "UAS software", "autonomy stack", "mission control UAV"],
    excludeKeywords: ["HIV", "health", "medical", "education", "agriculture", "housing", "social service"],
  },
  {
    id: "hw-sw-subsystems",
    name: "HW-SW Subsystems for Secure Autonomy",
    icon: Cpu,
    color: "bg-indigo-500",
    prompt: "Search for grants related to ITAR-free autonomous systems, non-ITAR sensor fusion, real-time mission planning, resilient communication frameworks, supply chain security for defense, and cross-platform autonomous architectures.",
    keywords: ["ITAR-free", "non-ITAR", "sensor fusion UAV", "mission planning", "resilient communication", "autonomous architecture", "supply chain security"],
    excludeKeywords: ["HIV", "health", "medical", "education", "agriculture", "housing"],
  },
  {
    id: "pulsar-propulsion",
    name: "PULSAR HRI Actuation",
    icon: Zap,
    color: "bg-yellow-500",
    prompt: "Search for grants related to high-bandwidth torque-dense motors, QDD actuators, legged robotics, collaborative robots, wearable robotics, PMSM motors, human-robot interaction, and robotic actuation systems.",
    keywords: ["torque-dense motor", "QDD actuator", "legged robot", "collaborative robot", "wearable robot", "PMSM motor", "human-robot interaction", "robotic actuation"],
    excludeKeywords: ["HIV", "health services", "education", "agriculture", "housing", "social"],
  },
  {
    id: "space-mechanisms",
    name: "Space Mechanisms & Actuators",
    icon: Satellite,
    color: "bg-cyan-500",
    prompt: "Search for grants related to space-qualified mechanisms, pyrotechnic-free actuators, Hold-Down Release Mechanisms (HDRM), non-explosive release, rotary actuators for space, antenna deployment, solar array deployment, and ITAR-free space components.",
    keywords: ["space mechanism", "HDRM", "release mechanism", "pyrotechnic-free", "space actuator", "deployment mechanism", "solar array deployment", "antenna deployment space"],
    excludeKeywords: ["HIV", "health", "medical", "education", "agriculture", "housing"],
  },
  {
    id: "molefy-pharma",
    name: "Molefy Pharma",
    icon: Activity,
    color: "bg-pink-500",
    prompt: "Search for grants related to ALS drug development, TDP-43 modulation, TTBK1 inhibitors, frontotemporal dementia, small-molecule neurodegenerative drugs, GMP drug production, and Phase I clinical trials for neurodegeneration.",
    keywords: ["TDP-43", "TTBK1", "ALS drug", "frontotemporal dementia", "neurodegenerative drug", "GMP production", "Phase I clinical", "orphan drug"],
    excludeKeywords: ["missile", "munition", "weapon", "satellite", "UAV"],
  },
  {
    id: "propellantless-propulsion",
    name: "Propellantless Space Propulsion",
    icon: Compass,
    color: "bg-orange-500",
    prompt: "Search for grants related to propellantless propulsion, piezoelectric thrust generation, resonant piezoelectric excitation, attitude control without propellant, delta-v without propellant, and advanced space propulsion research.",
    keywords: ["propellantless propulsion", "piezoelectric thrust", "resonant excitation", "attitude control satellite", "delta-v propulsion", "electric propulsion space"],
    excludeKeywords: ["HIV", "health", "medical", "education", "agriculture", "housing"],
  },
  {
    id: "naval-loitering",
    name: "Naval Loitering Systems",
    icon: Ship,
    color: "bg-slate-500",
    prompt: "Search for grants related to autonomous kamikaze vessels, suicide surface craft, loitering unmanned submarines, hybrid surface-subsurface drones, naval swarm systems, and asymmetric naval strike capability.",
    keywords: ["naval loitering", "kamikaze vessel", "autonomous submarine", "USV strike", "maritime swarm", "surface subsurface drone", "naval autonomous strike"],
    excludeKeywords: ["HIV", "health", "medical", "education", "fishing", "marine biology", "ocean conservation"],
  },
  {
    id: "qslam-family",
    name: "Q-SLAM Loitering Munitions",
    icon: Target,
    color: "bg-red-600",
    prompt: "Search ONLY for grants specifically related to loitering munitions, kamikaze drones, one-way attack drones, man-portable loitering weapons, tactical loitering attack, switchblade-type munitions, and expendable attack UAVs.",
    keywords: ["loitering munition", "kamikaze drone", "one-way attack", "expendable UAV", "switchblade", "tactical loitering", "man-portable munition", "precision strike UAV"],
    excludeKeywords: ["HIV", "health", "medical", "education", "surveillance only", "reconnaissance only", "agriculture", "housing"],
  },
  {
    id: "comms-payloads",
    name: "High Data Rate Communications",
    icon: Radio,
    color: "bg-teal-500",
    prompt: "Search for grants related to high data rate communication payloads, satellite communication systems, secure tactical data links, MANET communications, Software Defined Radios, anti-jamming communication, and spectrum management.",
    keywords: ["high data rate", "communication payload", "satellite comms", "MANET", "SDR", "anti-jamming", "spectrum management", "tactical datalink"],
    excludeKeywords: ["HIV", "health", "medical", "education", "agriculture", "housing"],
  },
  {
    id: "neuromorphic-perception",
    name: "Neuromorphic Perception Systems",
    icon: Brain,
    color: "bg-violet-500",
    prompt: "Search for grants related to neuromorphic computing, event-based sensors, brain-inspired processing, low-latency perception, energy-efficient edge AI for defense, and multi-modal sensing systems.",
    keywords: ["neuromorphic computing", "event-based sensor", "brain-inspired", "spiking neural", "edge perception", "low-latency AI", "situational awareness sensor"],
    excludeKeywords: ["HIV", "health service", "education program", "workforce", "housing", "agriculture"],
  },
  {
    id: "pulsar-hri",
    name: "PULSAR HRI Robotics",
    icon: Cpu,
    color: "bg-amber-500",
    prompt: "Search for grants related to high-bandwidth actuators, torque-dense motors, quasi-direct-drive actuators, legged robotics, collaborative robotics, wearable robotics, and human-robot interaction systems.",
    keywords: ["torque-dense motor", "QDD actuator", "legged robot", "collaborative robot", "wearable robot", "HRI actuator", "PMSM motor"],
    excludeKeywords: ["HIV", "health service", "education", "agriculture", "housing"],
  },
  {
    id: "satellite-denied-nav",
    name: "Satellite-Denied Navigation",
    icon: Compass,
    color: "bg-emerald-500",
    prompt: "Search for grants related to GPS-denied navigation, alternative PNT solutions, inertial navigation systems (INS), magnetic anomaly mapping, celestial navigation, quantum inertial sensors, and terrain-based navigation.",
    keywords: ["GPS-denied", "PNT solution", "inertial navigation", "INS", "celestial navigation", "quantum inertial", "terrain navigation", "magnetic navigation"],
    excludeKeywords: ["HIV", "health service", "education", "housing", "agriculture"],
  },
  {
    id: "trustworthy-ai",
    name: "Trustworthy AI for Autonomy",
    icon: Shield,
    color: "bg-blue-600",
    prompt: "Search for grants related to safe autonomous UAV systems, AI decision-making for defense, adaptive mission planning, collision avoidance, human-machine teaming, and fail-safe mechanisms for GPS-denied environments.",
    keywords: ["trustworthy autonomy", "safe AI UAV", "mission planning AI", "collision avoidance UAV", "human-machine teaming", "fail-safe autonomous"],
    excludeKeywords: ["HIV", "health service", "education", "housing", "agriculture", "food safety"],
  },
  {
    id: "sdr-communications",
    name: "Software Defined Radios (SDR)",
    icon: Radio,
    color: "bg-indigo-600",
    prompt: "Search for grants related to software defined radios for tactical communications, MANET networks, anti-jamming technology, dynamic spectrum management, and electronic warfare resilience.",
    keywords: ["software defined radio", "SDR tactical", "MANET network", "anti-jamming comms", "spectrum management", "electronic warfare comms", "tactical waveform"],
    excludeKeywords: ["HIV", "health service", "education", "housing", "agriculture"],
  },
  {
    id: "edge-ai-satellites",
    name: "Edge AI for Satellites",
    icon: Satellite,
    color: "bg-purple-600",
    prompt: "Search for grants related to onboard satellite AI processing, edge computing in space, real-time satellite image processing, anomaly detection in orbit, and autonomous satellite mission optimization.",
    keywords: ["edge AI satellite", "onboard processing satellite", "satellite AI", "space edge computing", "autonomous satellite", "orbital AI"],
    excludeKeywords: ["HIV", "health service", "education", "housing", "agriculture"],
  },
  {
    id: "thermo-structural",
    name: "Satellite Thermo-Structural Solutions",
    icon: Satellite,
    color: "bg-gray-500",
    prompt: "Search for grants related to satellite thermal management, embedded heat pipes, composite structural panels, thermal-structural integration, and satellite platform thermal architecture.",
    keywords: ["satellite thermal", "heat pipe satellite", "composite panel space", "thermal-structural", "satellite platform thermal"],
    excludeKeywords: ["HIV", "health service", "education", "housing", "agriculture"],
  },
  {
    id: "uncharted-therapeutics",
    name: "Uncharted Therapeutics",
    icon: Microscope,
    color: "bg-rose-500",
    prompt: "Search for grants related to generative AI for drug discovery, de novo molecular design, AI-driven therapeutic development, computational chemistry for drugs, and accelerated drug development pipelines.",
    keywords: ["generative AI drug", "de novo molecular", "AI drug discovery", "computational chemistry", "molecular design AI", "therapeutic AI"],
    excludeKeywords: ["missile", "munition", "weapon", "satellite", "UAV strike"],
  },
  {
    id: "volinga",
    name: "Volinga 3D/Radiance Fields",
    icon: Sparkles,
    color: "bg-fuchsia-500",
    prompt: "Search for grants related to neural rendering technology, 3D Gaussian Splatting, radiance fields for virtual production, real-time 3D environments, and photorealistic rendering for media.",
    keywords: ["neural rendering", "3D Gaussian Splatting", "3DGS", "radiance field", "virtual production", "photorealistic 3D", "nvol"],
    excludeKeywords: ["HIV", "health service", "agriculture", "housing", "weapon"],
  },
  {
    id: "zen-biometrics",
    name: "Zen Biometrics",
    icon: Activity,
    color: "bg-lime-500",
    prompt: "Search for grants related to continuous cortisol monitoring, stress biomarker sensors, microneedle wearable technology, preventive mental healthcare monitoring, and Addison's disease cortisol tracking.",
    keywords: ["cortisol monitoring", "stress biomarker", "microneedle wearable", "mental health sensor", "Addison disease", "cortisol wearable"],
    excludeKeywords: ["missile", "munition", "weapon", "satellite", "UAV"],
  },
  {
    id: "locomotion-defense",
    name: "Locomotion Systems for Defense",
    icon: Plane,
    color: "bg-stone-500",
    prompt: "Search for grants related to defense locomotion systems, autonomous ground vehicles, robotic locomotion platforms, all-terrain military mobility, and tactical ground robotics.",
    keywords: ["defense locomotion", "ground robot", "tactical mobility", "all-terrain robot", "military ground vehicle", "robotic locomotion defense"],
    excludeKeywords: ["HIV", "health service", "education", "housing", "agriculture", "food"],
  },
  {
    id: "post-quantum-crypto",
    name: "Post-Quantum Cryptography",
    icon: Shield,
    color: "bg-cyan-600",
    prompt: "Search for grants related to post-quantum cryptography, FrodoKEM, MAYO digital signatures, RISC-V cryptographic coprocessors, crypto-agile architectures, and quantum-resistant algorithms.",
    keywords: ["post-quantum cryptography", "FrodoKEM", "MAYO signature", "RISC-V crypto", "crypto-agile", "quantum-resistant", "lattice cryptography", "PQC"],
    excludeKeywords: ["HIV", "health service", "education", "housing", "agriculture"],
  },
  {
    id: "optical-phased-arrays",
    name: "Optical Phased Arrays & Photonics",
    icon: Radio,
    color: "bg-sky-500",
    prompt: "Search for grants related to optical phased arrays, integrated photonic technology, inter-satellite optical communication, fiber optic gyroscopes, and photonic integrated circuits for space.",
    keywords: ["optical phased array", "OPA", "photonic integrated", "inter-satellite optical", "fiber optic gyroscope", "FOG", "MIOC", "PIC space"],
    excludeKeywords: ["HIV", "health service", "education", "housing", "agriculture"],
  },
  {
    id: "quantum-sensing",
    name: "Quantum Sensing & Navigation",
    icon: Compass,
    color: "bg-violet-600",
    prompt: "Search for grants related to quantum sensors for navigation, NV-center magnetometers, quantum magnetic navigation, quantum gyroscopy, and diamond NV sensors for defense.",
    keywords: ["quantum sensor navigation", "NV-center", "quantum magnetometer", "quantum gyroscope", "diamond NV", "quantum inertial sensor"],
    excludeKeywords: ["HIV", "health service", "education", "housing", "agriculture"],
  },
  {
    id: "sar-3d-reconstruction",
    name: "SAR 3D Reconstruction & Neural Rendering",
    icon: Sparkles,
    color: "bg-indigo-400",
    prompt: "Search for grants related to SAR inverse rendering, synthetic aperture radar 3D reconstruction, novel view synthesis from radar, and neural radiance fields for SAR imagery.",
    keywords: ["SAR reconstruction", "SAR inverse rendering", "synthetic aperture 3D", "novel view synthesis SAR", "neural rendering SAR", "radar 3D"],
    excludeKeywords: ["HIV", "health service", "education", "housing", "agriculture"],
  },
  {
    id: "electrochemical-biosensors",
    name: "Electrochemical Biosensors",
    icon: Activity,
    color: "bg-teal-600",
    prompt: "Search for grants related to electrochemical biosensors, aptamer sensors, osmium redox probes, microneedle electrochemical systems, and wearable biosensor diagnostics.",
    keywords: ["electrochemical biosensor", "aptamer sensor", "osmium redox", "microneedle electrochemical", "wearable biosensor", "point-of-care electrochemical"],
    excludeKeywords: ["missile", "munition", "weapon", "satellite constellation", "UAV strike"],
  },
  {
    id: "peptide-therapeutics",
    name: "Peptide Therapeutics & ERK Inhibitors",
    icon: Microscope,
    color: "bg-rose-600",
    prompt: "Search for grants related to peptide-based therapeutics, ERK pathway inhibitors, intracellular peptide delivery, tumor spheroid models, and mimetic antitumor peptides.",
    keywords: ["peptide therapeutic", "ERK inhibitor", "intracellular peptide", "tumor spheroid", "mimetic peptide", "antitumor peptide", "NanoBRET"],
    excludeKeywords: ["missile", "munition", "weapon", "satellite", "UAV strike"],
  },
  {
    id: "soil-bioremediation",
    name: "Soil Bioremediation & Microbiome",
    icon: Microscope,
    color: "bg-green-600",
    prompt: "Search for grants related to burnt soil bioremediation, bacterial consortium for soil restoration, contaminant degradation, and environmental microbiology for ecosystem recovery.",
    keywords: ["soil bioremediation", "bacterial consortium", "soil microbiome", "contaminant degradation", "burnt soil restoration", "environmental microbiology"],
    excludeKeywords: ["missile", "munition", "weapon", "satellite", "UAV"],
  },
  {
    id: "exoskeletons-robotics",
    name: "Exoskeletons & Assisted Locomotion",
    icon: Cpu,
    color: "bg-amber-600",
    prompt: "Search for grants related to powered exoskeletons, assisted locomotion systems, lower limb exoskeletons, metabolic efficiency wearables, and human augmentation robotics.",
    keywords: ["powered exoskeleton", "assisted locomotion", "lower limb exo", "wearable robot exo", "human augmentation", "metabolic efficiency robot"],
    excludeKeywords: ["HIV", "health service program", "education program", "agriculture", "housing"],
  },
  {
    id: "electric-motors-drives",
    name: "Electric Motors & High-Speed Drives",
    icon: Zap,
    color: "bg-yellow-600",
    prompt: "Search for grants related to high-speed electric motors, high-current motor drivers, segmented motors, Vernier electric machines, and integrated traction drive systems.",
    keywords: ["high-speed motor", "motor driver high-current", "segmented motor", "Vernier machine", "traction drive", "PMSM development"],
    excludeKeywords: ["HIV", "health service", "education", "agriculture", "housing"],
  },
  {
    id: "event-based-vision",
    name: "Event-Based Vision & SLAM",
    icon: Brain,
    color: "bg-purple-400",
    prompt: "Search for grants related to event-based cameras for navigation, visual SLAM with aerial images, VIO systems, polarimetric navigation, and neuromorphic vision for autonomous systems.",
    keywords: ["event-based camera", "visual SLAM aerial", "VIO navigation", "polarimetric navigation", "neuromorphic vision", "event-based SLAM"],
    excludeKeywords: ["HIV", "health service", "education", "agriculture", "housing"],
  },
  {
    id: "quantum-ml",
    name: "Quantum Machine Learning",
    icon: Brain,
    color: "bg-pink-600",
    prompt: "Search for grants related to quantum machine learning, quantum transformers, quantum reservoir computing, and hybrid quantum-classical computing for defense applications.",
    keywords: ["quantum machine learning", "quantum transformer", "quantum reservoir", "hybrid quantum-classical", "quantum algorithm ML"],
    excludeKeywords: ["HIV", "health service", "education", "agriculture", "housing"],
  },
  {
    id: "digital-twin-robotics",
    name: "Digital Twin for Robotics",
    icon: Cpu,
    color: "bg-slate-600",
    prompt: "Search for grants related to robotic digital twins, power consumption simulation, kinematic chain characterization, and robotic simulation platforms for efficiency evaluation.",
    keywords: ["robotic digital twin", "robot simulation", "kinematic chain model", "power simulation robot", "robot controller simulation"],
    excludeKeywords: ["HIV", "health service", "education", "agriculture", "housing"],
  },
  {
    id: "gut-microbiome",
    name: "Gut Microbiome & Postbiotics",
    icon: Activity,
    color: "bg-lime-600",
    prompt: "Search for grants related to gut microbiome modulation, postbiotics research, intestinal epithelial models, Caco-2 cell studies, and microbiome therapeutics development.",
    keywords: ["gut microbiome", "postbiotic", "Caco-2", "intestinal barrier", "colonic fermentation", "microbiome therapeutic"],
    excludeKeywords: ["missile", "munition", "weapon", "satellite", "UAV strike"],
  },
]

interface SyncResult {
  id: string
  title: string
  source: string
  relevanceScore: number
  matchedKeywords: string[]
  url: string
  deadline?: string
  status: "new" | "updated" | "confirmed"
  programId?: string
}

interface SyncLog {
  timestamp: Date
  action: string
  status: "success" | "warning" | "error" | "info"
  details: string
  programId?: string
}

interface ProgramSyncState {
  isRunning: boolean
  lastSync: Date | null
  resultsCount: number
  enabled: boolean
}

interface GPTSyncPanelProps {
  onGrantsFound?: (grants: any[]) => void
}

export function GPTSyncPanel({ onGrantsFound }: GPTSyncPanelProps) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [activeProgramId, setActiveProgramId] = useState<string | null>(null)
  const [syncResults, setSyncResults] = useState<SyncResult[]>([])
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([])
  const [expandedPrograms, setExpandedPrograms] = useState<Set<string>>(new Set())
  
  // Filters for results display
  const [sourceFilter, setSourceFilter] = useState({
    all: true,
    usa: false,
    eu: false,
    spain: false,
  })
  const [statusFilter, setStatusFilter] = useState({
    all: true,
    new: false,
    confirmed: false,
  })
  const [programStates, setProgramStates] = useState<Record<string, ProgramSyncState>>(() => {
    const initial: Record<string, ProgramSyncState> = {}
    ARQUIMEA_PROGRAMS.forEach((p) => {
      initial[p.id] = { isRunning: false, lastSync: null, resultsCount: 0, enabled: true }
    })
    return initial
  })

  // Custom Search State
  const [customSearches, setCustomSearches] = useState<CustomSearch[]>([])
  const [isCreatingCustom, setIsCreatingCustom] = useState(false)
  const [editingCustomId, setEditingCustomId] = useState<string | null>(null)
  const [customForm, setCustomForm] = useState({
    name: "",
    prompt: "",
    keywordsText: "",
    alertsEnabled: true,
  })
  const [customSyncStates, setCustomSyncStates] = useState<Record<string, { isRunning: boolean; lastRun: Date | null }>>({})
  const [expandedCustomSearches, setExpandedCustomSearches] = useState<Set<string>>(new Set())

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
      const saved = localStorage.getItem("gptSyncStateV2")
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.syncResults) setSyncResults(parsed.syncResults)
        if (parsed.programStates) {
          setProgramStates((prev) => {
            const merged = { ...prev }
            Object.keys(parsed.programStates).forEach((k) => {
              if (merged[k]) {
                merged[k] = {
                  ...merged[k],
                  ...parsed.programStates[k],
                  lastSync: parsed.programStates[k].lastSync ? new Date(parsed.programStates[k].lastSync) : null,
                }
              }
            })
            return merged
          })
        }
        if (parsed.syncConfig) setSyncConfig({ ...syncConfig, ...parsed.syncConfig })
        if (parsed.syncLogs) {
          setSyncLogs(
            parsed.syncLogs.map((l: any) => ({ ...l, timestamp: new Date(l.timestamp) }))
          )
        }
        // Load custom searches
        if (parsed.customSearches) {
          setCustomSearches(
            parsed.customSearches.map((cs: any) => ({
              ...cs,
              createdAt: new Date(cs.createdAt),
              lastRun: cs.lastRun ? new Date(cs.lastRun) : null,
            }))
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
        "gptSyncStateV2",
        JSON.stringify({
          syncResults,
          programStates,
          syncConfig,
          syncLogs: syncLogs.slice(0, 100),
          customSearches,
        })
      )
    } catch {
      /* ignore */
    }
  }, [syncResults, programStates, syncConfig, syncLogs, customSearches])

  const addLog = (action: string, status: SyncLog["status"], details: string, programId?: string) => {
    setSyncLogs((prev) => [{ timestamp: new Date(), action, status, details, programId }, ...prev].slice(0, 200))
  }

  const scoreRelevance = (
    grant: { title: string; description?: string; category?: string; agency?: string },
    keywords: string[],
    excludeKeywords?: string[],
  ): { score: number; matched: string[]; excluded: boolean } => {
    const title = (grant.title || "").toLowerCase()
    const description = (grant.description || "").toLowerCase()
    const category = (grant.category || "").toLowerCase()
    const agency = (grant.agency || "").toLowerCase()
    const fullText = `${title} ${description} ${category} ${agency}`
    
    // FIRST: Check exclusion keywords - if found, immediately reject
    if (excludeKeywords && excludeKeywords.length > 0) {
      for (const exKw of excludeKeywords) {
        const exKwLower = exKw.toLowerCase()
        // Check title first (strongest signal of irrelevance)
        if (title.includes(exKwLower)) {
          return { score: 0, matched: [], excluded: true }
        }
        // Check description for medical/health exclusions
        if (description.includes(exKwLower)) {
          // Some exclusions are absolute (HIV, health services)
          const absoluteExclusions = ["hiv", "aids", "prevention program", "health service", "counseling", "nutrition program"]
          if (absoluteExclusions.some(ae => exKwLower.includes(ae) || ae.includes(exKwLower))) {
            return { score: 0, matched: [], excluded: true }
          }
        }
      }
    }
    
    const matched: string[] = []
    let score = 0
    
    // Check each keyword with weighted scoring - require more specific matches
    for (const kw of keywords) {
      const kwLower = kw.toLowerCase()
      
      // Higher weight for title matches (most relevant)
      if (title.includes(kwLower)) {
        matched.push(kw)
        score += 25  // Increased from 20
      }
      // Medium weight for description matches
      else if (description.includes(kwLower)) {
        matched.push(kw)
        score += 15  // Increased from 12
      }
      // Lower weight for category/agency matches
      else if (category.includes(kwLower) || agency.includes(kwLower)) {
        matched.push(kw)
        score += 8
      }
    }
    
    // Require at least 2 keyword matches for defense/military programs
    // This prevents false positives from single generic matches
    if (matched.length < 2) {
      score = Math.min(score, 20)  // Cap low-match scores
    }
    
    // Bonus for multiple keyword matches (compound relevance)
    if (matched.length >= 3) score += 20
    if (matched.length >= 5) score += 15
    
    // Additional check: penalize if description contains clear non-relevant content
    const nonRelevantIndicators = [
      "hiv prevention", "aids prevention", "health education", "community health",
      "workforce development", "job training", "social services", "housing assistance",
      "food assistance", "nutrition education", "substance abuse", "mental health counseling"
    ]
    
    for (const indicator of nonRelevantIndicators) {
      if (fullText.includes(indicator)) {
        return { score: 0, matched: [], excluded: true }
      }
    }
    
    // Cap score at 99
    score = Math.min(99, score)
    
    // Only return score if we have at least one keyword match
    if (matched.length === 0) {
      score = 0
    }
    
    return { score, matched, excluded: false }
  }

  const runProgramSync = async (program: typeof ARQUIMEA_PROGRAMS[0]) => {
    setProgramStates((prev) => ({ ...prev, [program.id]: { ...prev[program.id], isRunning: true } }))
    setActiveProgramId(program.id)
    
    addLog(`${program.name}`, "info", `Starting AI-powered scan with specialized prompt...`, program.id)

    const allRawGrants: any[] = []
    const grantIds = new Set<string>()

    const sources: Array<{ name: string; sourceFilter: string }> = [
      { name: "USA (Grants.gov + SAM.gov)", sourceFilter: "usa" },
      { name: "EU Funding & Tenders Portal", sourceFilter: "eu" },
      { name: "Spain (BDNS, CDTI, AEI, PRTR)", sourceFilter: "spain" },
    ]

    for (const src of sources) {
      try {
        // Broad fetch
        const res = await fetch("/api/grants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: src.sourceFilter }),
        })
        const data = await res.json()
        if (data.success && data.data?.length > 0) {
          for (const grant of data.data) {
            if (!grantIds.has(grant.id)) {
              grantIds.add(grant.id)
              allRawGrants.push({ ...grant, _sourceLabel: src.sourceFilter })
            }
          }
        }

        // Keyword searches specific to program
        const searchTerms = program.keywords.slice(0, 5)
        for (const term of searchTerms) {
          try {
            const kwRes = await fetch("/api/grants", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ keyword: term, source: src.sourceFilter }),
            })
            const kwData = await kwRes.json()
            if (kwData.success && kwData.data?.length > 0) {
              for (const grant of kwData.data) {
                if (!grantIds.has(grant.id)) {
                  grantIds.add(grant.id)
                  allRawGrants.push({ ...grant, _sourceLabel: src.sourceFilter })
                }
              }
            }
          } catch {
            // Continue
          }
        }
      } catch (error) {
        addLog(`${program.name}`, "warning", `${src.name} connection issue`, program.id)
      }
    }

    // Score grants against program keywords - STRICT filtering for ARQUIMEA relevance
  const programResults: SyncResult[] = []
  const MIN_SCORE_THRESHOLD = 35  // Increased threshold for stricter filtering
  const MIN_KEYWORDS_MATCH = 2    // Require at least 2 keyword matches
  
  for (const grant of allRawGrants) {
  // Pass excludeKeywords from program definition for strict filtering
  const { score, matched, excluded } = scoreRelevance(grant, program.keywords, (program as any).excludeKeywords)
  
  // Skip if excluded by exclusion keywords
  if (excluded) continue
  
  // Only include if score meets threshold AND has keyword matches
  if (score >= MIN_SCORE_THRESHOLD && matched.length >= MIN_KEYWORDS_MATCH) {
        const srcLabel = grant._sourceLabel
        programResults.push({
          id: grant.id,
          title: grant.title,
          source: srcLabel === "usa"
            ? (grant.agency?.toLowerCase().includes("sam") ? "SAM.gov" : "Grants.gov")
            : srcLabel === "spain"
              ? (grant.agency || grant.portal || "Spain Portal")
              : "EU Portal",
          relevanceScore: score,
          matchedKeywords: matched.slice(0, 5),
          url: grant.url || "#",
          deadline: grant.closeDate || "See portal",
          status: "new",
          programId: program.id,
        })
      }
    }

    // Sort by relevance and mark high-relevance items
    programResults.sort((a, b) => b.relevanceScore - a.relevanceScore)
    
    // Only keep top results to avoid noise
    const maxResults = 20
    const filteredResults = programResults.slice(0, maxResults)
    
    filteredResults.forEach((r) => {
      // Mark as confirmed only if score is high enough
      if (r.relevanceScore >= 50) {
        r.status = "confirmed"
      }
    })

    // Update results with filtered set
    setSyncResults((prev) => {
      const filtered = prev.filter((r) => r.programId !== program.id)
      return [...filtered, ...filteredResults].sort((a, b) => b.relevanceScore - a.relevanceScore)
    })

    // Push only relevant grants to main feed
    if (filteredResults.length > 0 && onGrantsFound) {
      const relevantGrantIds = new Set(filteredResults.map(r => r.id))
      const relevantGrants = allRawGrants
        .filter(g => relevantGrantIds.has(g.id))
        .map(({ _sourceLabel, ...rest }) => rest)
      onGrantsFound(relevantGrants)
    }

    addLog(
      `${program.name}`,
      filteredResults.length > 0 ? "success" : "warning",
      `Found ${filteredResults.length} relevant opportunities (${filteredResults.filter((r) => r.relevanceScore >= 50).length} high-relevance)`,
      program.id
    )

    setProgramStates((prev) => ({
      ...prev,
      [program.id]: {
        ...prev[program.id],
        isRunning: false,
        lastSync: new Date(),
        resultsCount: filteredResults.length,
      },
    }))
    setActiveProgramId(null)
  }

  const runAllProgramsSync = async () => {
    setIsSyncing(true)
    setSyncLogs([])
    addLog("Master Sync", "info", `Starting sync for ${ARQUIMEA_PROGRAMS.filter((p) => programStates[p.id]?.enabled).length} enabled programs...`)

    for (const program of ARQUIMEA_PROGRAMS) {
      if (programStates[program.id]?.enabled) {
        await runProgramSync(program)
        // Small delay between programs
        await new Promise((r) => setTimeout(r, 500))
      }
    }

    addLog("Master Sync", "success", `Completed sync for all programs. Total: ${syncResults.length} opportunities found.`)
    setIsSyncing(false)
  }

  const toggleProgramEnabled = (programId: string) => {
    setProgramStates((prev) => ({
      ...prev,
      [programId]: { ...prev[programId], enabled: !prev[programId]?.enabled },
    }))
  }

  // Custom Search Functions
  const saveCustomSearch = () => {
    const keywords = customForm.keywordsText
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0)

    if (!customForm.name || !customForm.prompt || keywords.length === 0) {
      addLog("Custom Search", "error", "Please fill in all fields: name, prompt, and at least one keyword.")
      return
    }

    if (editingCustomId) {
      // Update existing
      setCustomSearches((prev) =>
        prev.map((cs) =>
          cs.id === editingCustomId
            ? {
                ...cs,
                name: customForm.name,
                prompt: customForm.prompt,
                keywords,
                alertsEnabled: customForm.alertsEnabled,
              }
            : cs
        )
      )
      addLog("Custom Search", "success", `Updated custom search: ${customForm.name}`)
    } else {
      // Create new
      const newSearch: CustomSearch = {
        id: `custom-${Date.now()}`,
        name: customForm.name,
        prompt: customForm.prompt,
        keywords,
        alertsEnabled: customForm.alertsEnabled,
        createdAt: new Date(),
        lastRun: null,
        resultsCount: 0,
      }
      setCustomSearches((prev) => [newSearch, ...prev])
      addLog("Custom Search", "success", `Created new custom search: ${customForm.name}`)
    }

    // Reset form
    setCustomForm({ name: "", prompt: "", keywordsText: "", alertsEnabled: true })
    setIsCreatingCustom(false)
    setEditingCustomId(null)
  }

  const editCustomSearch = (search: CustomSearch) => {
    setCustomForm({
      name: search.name,
      prompt: search.prompt,
      keywordsText: search.keywords.join(", "),
      alertsEnabled: search.alertsEnabled,
    })
    setEditingCustomId(search.id)
    setIsCreatingCustom(true)
  }

  const deleteCustomSearch = (id: string) => {
    setCustomSearches((prev) => prev.filter((cs) => cs.id !== id))
    setSyncResults((prev) => prev.filter((r) => r.programId !== id))
    addLog("Custom Search", "info", "Custom search deleted")
  }

  const toggleCustomAlerts = (id: string) => {
    setCustomSearches((prev) =>
      prev.map((cs) => (cs.id === id ? { ...cs, alertsEnabled: !cs.alertsEnabled } : cs))
    )
  }

  const runCustomSearchSync = async (search: CustomSearch) => {
    setCustomSyncStates((prev) => ({ ...prev, [search.id]: { isRunning: true, lastRun: prev[search.id]?.lastRun || null } }))
    setActiveProgramId(search.id)

    addLog(`Custom: ${search.name}`, "info", `Starting custom search with prompt...`, search.id)

    const allRawGrants: any[] = []
    const grantIds = new Set<string>()

    const sources: Array<{ name: string; sourceFilter: string }> = [
      { name: "USA (Grants.gov + SAM.gov)", sourceFilter: "usa" },
      { name: "EU Funding & Tenders Portal", sourceFilter: "eu" },
      { name: "Spain (BDNS, CDTI, AEI, PRTR)", sourceFilter: "spain" },
    ]

    for (const src of sources) {
      try {
        const res = await fetch("/api/grants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: src.sourceFilter }),
        })
        const data = await res.json()
        if (data.success && data.data?.length > 0) {
          for (const grant of data.data) {
            if (!grantIds.has(grant.id)) {
              grantIds.add(grant.id)
              allRawGrants.push({ ...grant, _sourceLabel: src.sourceFilter })
            }
          }
        }

        // Keyword searches
        const searchTerms = search.keywords.slice(0, 5)
        for (const term of searchTerms) {
          try {
            const kwRes = await fetch("/api/grants", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ keyword: term, source: src.sourceFilter }),
            })
            const kwData = await kwRes.json()
            if (kwData.success && kwData.data?.length > 0) {
              for (const grant of kwData.data) {
                if (!grantIds.has(grant.id)) {
                  grantIds.add(grant.id)
                  allRawGrants.push({ ...grant, _sourceLabel: src.sourceFilter })
                }
              }
            }
          } catch {
            // Continue
          }
        }
      } catch (error) {
        addLog(`Custom: ${search.name}`, "warning", `${src.name} connection issue`, search.id)
      }
    }

    // Score grants - STRICT filtering
  const customResults: SyncResult[] = []
  const MIN_SCORE = 35  // Increased for stricter filtering
  const MIN_MATCHES = 2  // Require at least 2 keyword matches
  
  for (const grant of allRawGrants) {
  const { score, matched, excluded } = scoreRelevance(grant, search.keywords)
  
  // Skip if excluded
  if (excluded) continue
  
  // Only include if meets thresholds
  if (score >= MIN_SCORE && matched.length >= MIN_MATCHES) {
        const srcLabel = grant._sourceLabel
        customResults.push({
          id: grant.id,
          title: grant.title,
          source: srcLabel === "usa"
            ? (grant.agency?.toLowerCase().includes("sam") ? "SAM.gov" : "Grants.gov")
            : srcLabel === "spain"
              ? (grant.agency || grant.portal || "Spain Portal")
              : "EU Portal",
          relevanceScore: score,
          matchedKeywords: matched.slice(0, 5),
          url: grant.url || "#",
          deadline: grant.closeDate || "See portal",
          status: "new",
          programId: search.id,
        })
      }
    }

    // Sort and limit results
    customResults.sort((a, b) => b.relevanceScore - a.relevanceScore)
    const filteredCustomResults = customResults.slice(0, 20)
    
    filteredCustomResults.forEach((r) => {
      if (r.relevanceScore >= 50) {
        r.status = "confirmed"
      }
    })

    // Update results
    setSyncResults((prev) => {
      const filtered = prev.filter((r) => r.programId !== search.id)
      return [...filtered, ...filteredCustomResults].sort((a, b) => b.relevanceScore - a.relevanceScore)
    })

    // Update custom search stats
    setCustomSearches((prev) =>
      prev.map((cs) =>
        cs.id === search.id ? { ...cs, lastRun: new Date(), resultsCount: filteredCustomResults.length } : cs
      )
    )

    // Push to main feed - only relevant grants
    if (filteredCustomResults.length > 0 && onGrantsFound) {
      const relevantGrantIds = new Set(filteredCustomResults.map(r => r.id))
      const relevantGrants = allRawGrants
        .filter(g => relevantGrantIds.has(g.id))
        .map(({ _sourceLabel, ...rest }) => rest)
      onGrantsFound(relevantGrants)
    }

    addLog(
      `Custom: ${search.name}`,
      filteredCustomResults.length > 0 ? "success" : "warning",
      `Found ${filteredCustomResults.length} relevant opportunities (${filteredCustomResults.filter((r) => r.relevanceScore >= 50).length} high-relevance)`,
      search.id
    )

    setCustomSyncStates((prev) => ({ ...prev, [search.id]: { isRunning: false, lastRun: new Date() } }))
    setActiveProgramId(null)
  }

  const toggleCustomExpanded = (id: string) => {
    setExpandedCustomSearches((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleProgramExpanded = (programId: string) => {
    setExpandedPrograms((prev) => {
      const next = new Set(prev)
      if (next.has(programId)) {
        next.delete(programId)
      } else {
        next.add(programId)
      }
      return next
    })
  }
  
  // Filter results based on source and status filters
  const filterResults = (results: SyncResult[]) => {
    return results.filter((result) => {
      // Source filter
      let sourceMatch = sourceFilter.all
      if (!sourceFilter.all) {
        const sourceLower = result.source.toLowerCase()
        if (sourceFilter.usa && (sourceLower.includes("grants.gov") || sourceLower.includes("sam.gov") || sourceLower.includes("usa"))) {
          sourceMatch = true
        }
        if (sourceFilter.eu && (sourceLower.includes("eu") || sourceLower.includes("horizon") || sourceLower.includes("europe"))) {
          sourceMatch = true
        }
        if (sourceFilter.spain && (sourceLower.includes("spain") || sourceLower.includes("españa") || sourceLower.includes("cdti"))) {
          sourceMatch = true
        }
      }
      
      // Status filter
      let statusMatch = statusFilter.all
      if (!statusFilter.all) {
        if (statusFilter.new && result.status === "new") statusMatch = true
        if (statusFilter.confirmed && result.status === "confirmed") statusMatch = true
      }
      
      return sourceMatch && statusMatch
    })
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

  const enabledCount = ARQUIMEA_PROGRAMS.filter((p) => programStates[p.id]?.enabled).length

  return (
    <div className="flex gap-6">
      {/* Sidebar Filters */}
      <div className="w-64 flex-shrink-0">
        <Card className="sticky top-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filter Results
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-6">
            {/* Source Filter */}
            <div>
              <h3 className="font-medium text-sm mb-2 text-gray-700">Source</h3>
              <div className="space-y-2">
                {[
                  { key: "all", label: "All Sources", icon: Globe },
                  { key: "usa", label: "USA (Grants.gov / SAM.gov)", icon: Flag },
                  { key: "eu", label: "EU (Horizon / Tenders)", icon: Globe },
                  { key: "spain", label: "Spain (CDTI / Portals)", icon: Flag },
                ].map(({ key, label, icon: Icon }) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`gpt-source-${key}`}
                      checked={sourceFilter[key as keyof typeof sourceFilter]}
                      onCheckedChange={(checked) => {
                        if (key === "all") {
                          setSourceFilter({ all: true, usa: false, eu: false, spain: false })
                        } else {
                          setSourceFilter((prev) => ({
                            all: false,
                            usa: key === "usa" ? !!checked : prev.usa,
                            eu: key === "eu" ? !!checked : prev.eu,
                            spain: key === "spain" ? !!checked : prev.spain,
                          }))
                        }
                      }}
                    />
                    <Label htmlFor={`gpt-source-${key}`} className="text-sm flex items-center gap-1 cursor-pointer">
                      <Icon className="h-3 w-3" />
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <h3 className="font-medium text-sm mb-2 text-gray-700">Status</h3>
              <div className="space-y-2">
                {[
                  { key: "all", label: "All Status" },
                  { key: "new", label: "New" },
                  { key: "confirmed", label: "Confirmed (High Relevance)" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`gpt-status-${key}`}
                      checked={statusFilter[key as keyof typeof statusFilter]}
                      onCheckedChange={(checked) => {
                        if (key === "all") {
                          setStatusFilter({ all: true, new: false, confirmed: false })
                        } else {
                          setStatusFilter((prev) => ({
                            all: false,
                            new: key === "new" ? !!checked : prev.new,
                            confirmed: key === "confirmed" ? !!checked : prev.confirmed,
                          }))
                        }
                      }}
                    />
                    <Label htmlFor={`gpt-status-${key}`} className="text-sm cursor-pointer">
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Results Summary */}
            <div className="pt-4 border-t">
              <h3 className="font-medium text-sm mb-2 text-gray-700">Results Summary</h3>
              <div className="space-y-1 text-xs text-gray-600">
                <p>Total: <span className="font-semibold">{syncResults.length}</span> opportunities</p>
                <p>Filtered: <span className="font-semibold">{filterResults(syncResults).length}</span> showing</p>
                <p>High Relevance: <span className="font-semibold text-emerald-600">{syncResults.filter(r => r.status === "confirmed").length}</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-6">
      {/* Header Card */}
      <Card className="border-[#1e3a5f]/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[#1e3a5f] flex items-center gap-2 text-lg">
              <Bot className="h-5 w-5" />
              GPT Sync - ARQUIMEA Programs Grant Discovery
            </CardTitle>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-xs">
                {enabledCount} programs enabled
              </Badge>
              <Button
                onClick={runAllProgramsSync}
                disabled={isSyncing}
                className="bg-[#1e3a5f] hover:bg-[#2a4a6f] text-white"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Syncing All...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync All Programs
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-gray-600 mb-4">
            AI-powered synchronization with specialized prompts for each ARQUIMEA program. Each GPT agent scans 
            SAM.gov, EU Funding & Tenders, and Spain portals using program-specific keywords to find the most relevant opportunities.
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

      {/* Custom Search Module */}
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-emerald-800 flex items-center gap-2 text-lg">
              <Search className="h-5 w-5" />
              Custom Grant Search
            </CardTitle>
            <div className="flex items-center gap-2">
              {customSearches.length > 0 && (
                <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-800">
                  {customSearches.length} saved searches
                </Badge>
              )}
              {!isCreatingCustom && (
                <Button
                  onClick={() => {
                    setIsCreatingCustom(true)
                    setEditingCustomId(null)
                    setCustomForm({ name: "", prompt: "", keywordsText: "", alertsEnabled: true })
                  }}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  New Search
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-gray-600 mb-4">
            Create your own custom grant search with personalized prompts and keywords. Save searches to run them again or enable alerts for new opportunities.
          </p>

          {/* Create/Edit Form */}
          {isCreatingCustom && (
            <div className="border border-emerald-200 rounded-lg p-4 mb-4 bg-white">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-emerald-800">
                  {editingCustomId ? "Edit Custom Search" : "Create New Custom Search"}
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsCreatingCustom(false)
                    setEditingCustomId(null)
                    setCustomForm({ name: "", prompt: "", keywordsText: "", alertsEnabled: true })
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="custom-name" className="text-sm font-medium text-gray-700">
                    Search Name
                  </Label>
                  <Input
                    id="custom-name"
                    placeholder="e.g., Quantum Computing R&D"
                    value={customForm.name}
                    onChange={(e) => setCustomForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="custom-prompt" className="text-sm font-medium text-gray-700">
                    Search Prompt
                  </Label>
                  <Textarea
                    id="custom-prompt"
                    placeholder="Describe what you're looking for... e.g., Search for grants and contracts related to quantum computing hardware, superconducting qubits, error correction, quantum algorithms, and quantum machine learning applications."
                    value={customForm.prompt}
                    onChange={(e) => setCustomForm((prev) => ({ ...prev, prompt: e.target.value }))}
                    className="mt-1 min-h-[100px]"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Be specific about technologies, applications, and domains you want to find.
                  </p>
                </div>

                <div>
                  <Label htmlFor="custom-keywords" className="text-sm font-medium text-gray-700">
                    Keywords (comma-separated)
                  </Label>
                  <Input
                    id="custom-keywords"
                    placeholder="e.g., quantum computing, superconducting, qubit, error correction"
                    value={customForm.keywordsText}
                    onChange={(e) => setCustomForm((prev) => ({ ...prev, keywordsText: e.target.value }))}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    These keywords will be used to search and score relevance of opportunities.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="custom-alerts"
                    checked={customForm.alertsEnabled}
                    onCheckedChange={(checked) =>
                      setCustomForm((prev) => ({ ...prev, alertsEnabled: !!checked }))
                    }
                  />
                  <Label htmlFor="custom-alerts" className="text-sm text-gray-700 cursor-pointer">
                    Enable alerts for new opportunities matching this search
                  </Label>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreatingCustom(false)
                      setEditingCustomId(null)
                      setCustomForm({ name: "", prompt: "", keywordsText: "", alertsEnabled: true })
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={saveCustomSearch} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Save className="h-4 w-4 mr-1" />
                    {editingCustomId ? "Update Search" : "Save Search"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Saved Custom Searches */}
          {customSearches.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {customSearches.map((search) => {
                const syncState = customSyncStates[search.id]
                const allSearchResults = syncResults.filter((r) => r.programId === search.id)
                const searchResults = filterResults(allSearchResults)
                const isExpanded = expandedCustomSearches.has(search.id)

                return (
                  <div
                    key={search.id}
                    className={`border rounded-lg p-3 bg-white transition-all ${
                      activeProgramId === search.id ? "ring-2 ring-emerald-400" : "border-gray-200"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded bg-emerald-500">
                          <Search className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <h4 className="font-medium text-sm text-gray-800">{search.name}</h4>
                          {search.lastRun && (
                            <span className="text-[10px] text-gray-400">
                              Last run: {search.lastRun.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => toggleCustomAlerts(search.id)}
                          title={search.alertsEnabled ? "Disable alerts" : "Enable alerts"}
                        >
                          {search.alertsEnabled ? (
                            <Bell className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <BellOff className="h-3.5 w-3.5 text-gray-400" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => editCustomSearch(search)}
                        >
                          <Edit3 className="h-3.5 w-3.5 text-gray-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 hover:text-red-600"
                          onClick={() => deleteCustomSearch(search.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Prompt preview */}
                    <p className="text-[10px] text-gray-500 mb-2 line-clamp-2">{search.prompt.slice(0, 100)}...</p>

                    {/* Keywords */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {search.keywords.slice(0, 4).map((kw) => (
                        <Badge key={kw} variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-200">
                          {kw}
                        </Badge>
                      ))}
                      {search.keywords.length > 4 && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-gray-50">
                          +{search.keywords.length - 4}
                        </Badge>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 border-emerald-200 hover:bg-emerald-50"
                        disabled={syncState?.isRunning || isSyncing}
                        onClick={() => runCustomSearchSync(search)}
                      >
                        {syncState?.isRunning ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Searching...
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3 mr-1" />
                            Run Search
                          </>
                        )}
                      </Button>

                      {searchResults.length > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs h-7"
                          onClick={() => toggleCustomExpanded(search.id)}
                        >
                          <Badge className="bg-emerald-600 text-white text-[10px] mr-1">
                            {searchResults.length}
                          </Badge>
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </Button>
                      )}
                    </div>

                    {/* Expanded Results - Show ALL */}
                    {isExpanded && searchResults.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100 max-h-[400px] overflow-y-auto space-y-2">
                        {searchResults.map((result, idx) => (
                          <div key={result.id} className="text-xs border-b border-gray-50 pb-2 last:border-0">
                            <div className="flex items-start gap-2">
                              <span className="text-gray-400 font-mono text-[10px] w-4">{idx + 1}</span>
                              <div className="flex-1">
                                <a
                                  href={result.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-700 hover:underline font-medium block"
                                >
                                  {result.title}
                                </a>
                                <div className="flex items-center gap-2 text-gray-400 mt-1">
                                  <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                                    {result.source}
                                  </Badge>
                                  <Badge className={`text-[9px] px-1 py-0 ${getRelevanceColor(result.relevanceScore)}`}>
                                    {result.relevanceScore}%
                                  </Badge>
                                  {result.deadline && result.deadline !== "See portal" && (
                                    <span className="text-[10px]">Deadline: {result.deadline}</span>
                                  )}
                                </div>
                                {result.matchedKeywords.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {result.matchedKeywords.map((kw) => (
                                      <span key={kw} className="text-[9px] text-emerald-600 bg-emerald-50 px-1 rounded">
                                        {kw}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {customSearches.length === 0 && !isCreatingCustom && (
            <div className="text-center py-6 border-2 border-dashed border-emerald-200 rounded-lg">
              <Search className="h-8 w-8 text-emerald-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No custom searches yet.</p>
              <p className="text-xs text-gray-400">Click "New Search" to create your first custom grant search.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Programs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ARQUIMEA_PROGRAMS.map((program) => {
          const state = programStates[program.id]
          const allProgramResults = syncResults.filter((r) => r.programId === program.id)
          const programResults = filterResults(allProgramResults)
          const isExpanded = expandedPrograms.has(program.id)
          const Icon = program.icon

          return (
            <Card
              key={program.id}
              className={`border transition-all ${
                state?.enabled ? "border-[#1e3a5f]/20" : "border-gray-200 opacity-60"
              } ${activeProgramId === program.id ? "ring-2 ring-[#1e3a5f]/40" : ""}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded ${program.color}`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm text-[#1e3a5f]">{program.name}</h3>
                      {state?.lastSync && (
                        <span className="text-[10px] text-gray-400">
                          Last: {state.lastSync.toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Checkbox
                      checked={state?.enabled ?? true}
                      onCheckedChange={() => toggleProgramEnabled(program.id)}
                      className="h-4 w-4"
                    />
                  </div>
                </div>

                {/* Program Prompt Preview */}
                <p className="text-[10px] text-gray-500 mb-3 line-clamp-2">
                  {program.prompt.slice(0, 120)}...
                </p>

                {/* Keywords */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {program.keywords.slice(0, 4).map((kw) => (
                    <Badge key={kw} variant="outline" className="text-[9px] px-1.5 py-0">
                      {kw}
                    </Badge>
                  ))}
                  {program.keywords.length > 4 && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-gray-50">
                      +{program.keywords.length - 4}
                    </Badge>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7"
                    disabled={!state?.enabled || state?.isRunning || isSyncing}
                    onClick={() => runProgramSync(program)}
                  >
                    {state?.isRunning ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3 mr-1" />
                        Run Sync
                      </>
                    )}
                  </Button>

                  {programResults.length > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-7"
                      onClick={() => toggleProgramExpanded(program.id)}
                    >
                      <Badge className="bg-[#1e3a5f] text-white text-[10px] mr-1">
                        {programResults.length}
                      </Badge>
                      {isExpanded ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                </div>

                {/* Expanded Results - Show ALL */}
                {isExpanded && programResults.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 max-h-[400px] overflow-y-auto space-y-2">
                    {programResults.map((result, idx) => (
                      <div key={result.id} className="text-xs border-b border-gray-50 pb-2 last:border-0">
                        <div className="flex items-start gap-2">
                          <span className="text-gray-400 font-mono text-[10px] w-4">{idx + 1}</span>
                          <div className="flex-1">
                            <a
                              href={result.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#1e3a5f] hover:underline font-medium block"
                            >
                              {result.title}
                            </a>
                            <div className="flex items-center gap-2 text-gray-400 mt-1">
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                                {result.source}
                              </Badge>
                              <Badge className={`text-[9px] px-1 py-0 ${getRelevanceColor(result.relevanceScore)}`}>
                                {result.relevanceScore}%
                              </Badge>
                              {result.deadline && result.deadline !== "See portal" && (
                                <span className="text-[10px]">Deadline: {result.deadline}</span>
                              )}
                            </div>
                            {result.matchedKeywords.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {result.matchedKeywords.map((kw) => (
                                  <span key={kw} className="text-[9px] text-emerald-600 bg-emerald-50 px-1 rounded">
                                    {kw}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Sync Log */}
      <Card className="border-gray-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-[#1e3a5f] flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Sync Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 max-h-64 overflow-y-auto">
          {syncLogs.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">No sync activity yet. Click "Sync All Programs" to start.</p>
          ) : (
            <div className="space-y-2">
              {syncLogs.slice(0, 30).map((log, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <div className="flex-shrink-0 mt-0.5">{getStatusIcon(log.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-gray-700">{log.action}</span>
                      <span className="text-gray-400">{log.timestamp.toLocaleTimeString()}</span>
                    </div>
                    <p className="text-gray-500 leading-relaxed">{log.details}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {syncResults.length > 0 && (
        <Card className="border-[#1e3a5f]/20 bg-[#f0f4f8]">
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold text-[#1e3a5f] mb-3">Overall Sync Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-white rounded p-3 text-center">
                <div className="font-bold text-[#1e3a5f] text-xl">{filterResults(syncResults).length}</div>
                <div className="text-gray-500">Showing</div>
              </div>
              <div className="bg-white rounded p-3 text-center">
                <div className="font-bold text-emerald-600 text-xl">
                  {filterResults(syncResults).filter((r) => r.relevanceScore >= 50).length}
                </div>
                <div className="text-gray-500">High Relevance</div>
              </div>
              <div className="bg-white rounded p-3 text-center">
                <div className="font-bold text-[#1e3a5f] text-xl">
                  {new Set(filterResults(syncResults).map((r) => r.programId)).size}
                </div>
                <div className="text-gray-500">Programs Matched</div>
              </div>
              <div className="bg-white rounded p-3 text-center">
                <div className="font-bold text-[#1e3a5f] text-xl">
                  {new Set(filterResults(syncResults).map((r) => r.source)).size}
                </div>
                <div className="text-gray-500">Sources</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  )
}
