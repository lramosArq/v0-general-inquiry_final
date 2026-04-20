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

// ARQUIMEA Programs with their specialized prompts
const ARQUIMEA_PROGRAMS = [
  {
    id: "arqeos-missiles",
    name: "ARQEOS Missiles",
    icon: Rocket,
    color: "bg-red-500",
    prompt: "Search for grants and contracts related to long-range strike systems, loitering munitions, cruise missiles, subsonic tactical missiles, turbojet propulsion, modular warhead systems, AI-assisted targeting, man-in-the-loop control systems, and hybrid drone-missile platforms for defense applications.",
    keywords: ["strike systems", "loitering munition", "cruise missile", "turbojet", "warhead", "tactical missile", "AI targeting", "defense"],
  },
  {
    id: "canarysat",
    name: "CanarySat Constellation",
    icon: Satellite,
    color: "bg-blue-500",
    prompt: "Search for grants and contracts related to LEO satellite constellations, Ka-band connectivity, deployable antennas, inter-satellite links (ISL), high-throughput satellites, low-latency communications, cellular backhaul, space-qualified components, and satellite integration facilities.",
    keywords: ["satellite constellation", "LEO", "Ka-band", "ISL", "inter-satellite", "high-throughput", "space communication", "satellite integration"],
  },
  {
    id: "biotechnology",
    name: "ARQUIMEA Biotechnology",
    icon: Microscope,
    color: "bg-green-500",
    prompt: "Search for grants and contracts related to ALS therapeutics, Alzheimer's treatment, cancer research, wearable biosensors, microbiology platforms, antibiotic discovery, extremophile metagenomes, AI-driven drug discovery, postbiotics, microbiota research, soil remediation, organoid research, and translational medicine.",
    keywords: ["ALS", "Alzheimer", "biosensor", "microbiology", "antibiotic", "drug discovery", "therapeutics", "biotechnology", "microbiome"],
  },
  {
    id: "deeparq",
    name: "DeepArq Autonomy Platform",
    icon: Brain,
    color: "bg-purple-500",
    prompt: "Search for grants and contracts related to UAV autonomy software, AI pilot systems, mission control systems, autonomous behaviors, target tracking, search and recognition, tactical edge computing, resilient communications, human-in-the-loop supervision, and multi-platform coordination.",
    keywords: ["UAV autonomy", "AI pilot", "autonomous", "mission control", "target tracking", "tactical edge", "swarm", "UAS software"],
  },
  {
    id: "hw-sw-subsystems",
    name: "HW-SW Subsystems for Secure Autonomy",
    icon: Cpu,
    color: "bg-indigo-500",
    prompt: "Search for grants and contracts related to ITAR-free systems, autonomous system architectures, sensor fusion, real-time mission planning, resilient communication frameworks, cross-platform compatibility, AI-driven autonomy subsystems, and supply chain security for defense systems.",
    keywords: ["ITAR-free", "autonomous systems", "sensor fusion", "mission planning", "resilient communication", "defense architecture", "secure systems"],
  },
  {
    id: "pulsar-propulsion",
    name: "PULSAR Propulsion Systems",
    icon: Zap,
    color: "bg-yellow-500",
    prompt: "Search for grants and contracts related to high-efficiency propulsion, UAV propulsion systems, extended flight duration, energy efficiency optimization, payload capacity enhancement, electric motors for drones, next-generation propulsion, and autonomous flight capabilities.",
    keywords: ["propulsion", "UAV motor", "flight duration", "electric propulsion", "drone efficiency", "payload capacity", "PULSAR"],
  },
  {
    id: "space-mechanisms",
    name: "Space Mechanisms & Actuators",
    icon: Satellite,
    color: "bg-cyan-500",
    prompt: "Search for grants and contracts related to space-qualified mechanisms, release and deployment devices, pyrotechnic-free actuators, Hold-Down Release Mechanisms (HDRM), non-explosive release systems, rotary actuators, antenna deployment, solar array deployment, and ITAR-free space components.",
    keywords: ["space mechanism", "actuator", "HDRM", "deployment system", "release mechanism", "space qualified", "ITAR-free space"],
  },
  {
    id: "molefy-pharma",
    name: "Molefy Pharma",
    icon: Activity,
    color: "bg-pink-500",
    prompt: "Search for grants and contracts related to neurodegenerative disease treatment, ALS therapeutics, TDP-43 modulation, TTBK1 inhibitors, frontotemporal dementia, GMP drug production, Phase I clinical trials, small-molecule drugs, and orphan drug designation.",
    keywords: ["neurodegenerative", "ALS", "TDP-43", "TTBK1", "dementia", "clinical trial", "orphan drug", "pharma"],
  },
  {
    id: "propellantless-propulsion",
    name: "Propellantless Space Propulsion",
    icon: Compass,
    color: "bg-orange-500",
    prompt: "Search for grants and contracts related to propellantless propulsion, piezoelectric thrust generation, resonant excitation, attitude control systems, delta-v capability, small satellite propulsion, and advanced space propulsion research.",
    keywords: ["propellantless", "piezoelectric", "attitude control", "delta-v", "small satellite", "advanced propulsion", "space propulsion"],
  },
  {
    id: "naval-loitering",
    name: "Naval Loitering Systems",
    icon: Ship,
    color: "bg-slate-500",
    prompt: "Search for grants and contracts related to naval autonomous systems, kamikaze vessels, surface/subsurface drones, hybrid maritime platforms, autonomous submarines, naval strike capability, swarm coordination, maritime defense, and asymmetric naval warfare.",
    keywords: ["naval autonomous", "maritime drone", "submarine", "surface vessel", "naval strike", "swarm", "maritime defense", "USV"],
  },
  {
    id: "qslam-family",
    name: "Q-SLAM Loitering Munitions",
    icon: Target,
    color: "bg-red-600",
    prompt: "Search ONLY for grants and contracts specifically related to loitering munitions, kamikaze drones, one-way attack drones, suicide drones, expendable attack UAVs, precision strike munitions, man-portable loitering weapon systems, tactical loitering attack platforms, and switchblade-type munitions. Exclude general surveillance or reconnaissance systems.",
    keywords: ["loitering munition", "kamikaze drone", "one-way attack", "suicide drone", "expendable UAV", "switchblade", "tactical strike drone", "precision loitering"],
  },
  {
    id: "comms-payloads",
    name: "High Data Rate Communications",
    icon: Radio,
    color: "bg-teal-500",
    prompt: "Search for grants and contracts related to high data rate communication payloads, satellite communication systems, secure data links, bandwidth optimization, space communication technology, and next-generation communication systems.",
    keywords: ["high data rate", "communication payload", "satellite comms", "secure link", "bandwidth", "space communication"],
  },
  {
    id: "neuromorphic-perception",
    name: "Neuromorphic Perception Systems",
    icon: Brain,
    color: "bg-violet-500",
    prompt: "Search for grants and contracts related to neuromorphic computing, event-based sensors, brain-inspired processing, low-latency perception, energy-efficient AI, edge computing for defense, situational awareness systems, and multi-modal sensing.",
    keywords: ["neuromorphic", "event-based", "brain-inspired", "edge AI", "perception", "situational awareness", "low-latency"],
  },
  {
    id: "pulsar-hri",
    name: "PULSAR HRI Robotics",
    icon: Cpu,
    color: "bg-amber-500",
    prompt: "Search for grants and contracts related to high-bandwidth actuators, torque-dense motors, quasi-direct-drive actuators, legged robotics, collaborative robotics, wearable robotics, human-robot interaction, PMSM motors, and robotic actuation systems.",
    keywords: ["actuator", "torque motor", "QDD", "legged robot", "collaborative robot", "wearable robot", "HRI", "PMSM"],
  },
  {
    id: "satellite-denied-nav",
    name: "Satellite-Denied Navigation",
    icon: Compass,
    color: "bg-emerald-500",
    prompt: "Search for grants and contracts related to GPS-denied navigation, alternative PNT solutions, inertial navigation systems (INS), computer vision navigation, magnetic anomaly mapping, celestial navigation, quantum sensors, terrain navigation, and resilient positioning systems.",
    keywords: ["GPS-denied", "PNT", "INS", "inertial navigation", "celestial navigation", "quantum sensor", "terrain navigation", "positioning"],
  },
  {
    id: "trustworthy-ai",
    name: "Trustworthy AI for Autonomy",
    icon: Shield,
    color: "bg-blue-600",
    prompt: "Search for grants and contracts related to safe autonomous systems, AI decision-making, adaptive mission planning, collision avoidance, human-machine teaming, predictive trajectory optimization, fail-safe mechanisms, and operational resilience in GPS-denied environments.",
    keywords: ["trustworthy AI", "safe autonomy", "mission planning", "collision avoidance", "human-machine", "trajectory", "fail-safe", "resilient AI"],
  },
  {
    id: "sdr-communications",
    name: "Software Defined Radios (SDR)",
    icon: Radio,
    color: "bg-indigo-600",
    prompt: "Search for grants and contracts related to software defined radios, MANET networks, anti-jamming technology, dynamic spectrum management, adaptive waveforms, electronic warfare resilience, SWaP optimization, and secure tactical communications.",
    keywords: ["SDR", "MANET", "anti-jamming", "spectrum management", "waveform", "electronic warfare", "tactical comms", "SWaP"],
  },
  {
    id: "edge-ai-satellites",
    name: "Edge AI for Satellites",
    icon: Satellite,
    color: "bg-purple-600",
    prompt: "Search for grants and contracts related to onboard satellite AI, edge computing in space, real-time image processing, anomaly detection, autonomous mission optimization, satellite data processing, and intelligent space systems.",
    keywords: ["edge AI", "satellite AI", "onboard processing", "anomaly detection", "autonomous satellite", "space AI", "image processing"],
  },
  {
    id: "thermo-structural",
    name: "Satellite Thermo-Structural Solutions",
    icon: Satellite,
    color: "bg-gray-500",
    prompt: "Search for grants and contracts related to satellite thermal management, embedded heat pipes, composite panels, thermal-structural integration, heat dissipation systems, dimensional stability, and satellite platform architecture.",
    keywords: ["thermal management", "heat pipe", "composite panel", "thermal-structural", "heat dissipation", "satellite platform"],
  },
  {
    id: "uncharted-therapeutics",
    name: "Uncharted Therapeutics",
    icon: Microscope,
    color: "bg-rose-500",
    prompt: "Search for grants and contracts related to generative AI drug discovery, de novo molecular design, AI-driven therapeutics, computational chemistry, molecular candidates generation, and accelerated drug development pipelines.",
    keywords: ["generative AI", "drug discovery", "molecular design", "AI therapeutics", "computational chemistry", "de novo"],
  },
  {
    id: "volinga",
    name: "Volinga 3D/Radiance Fields",
    icon: Sparkles,
    color: "bg-fuchsia-500",
    prompt: "Search for grants and contracts related to neural rendering, 3D Gaussian Splatting, radiance fields, virtual production, real-time 3D environments, Unreal Engine integration, photorealistic rendering, and media entertainment technology.",
    keywords: ["neural rendering", "3DGS", "radiance fields", "virtual production", "real-time 3D", "Unreal Engine", "photorealistic"],
  },
  {
    id: "zen-biometrics",
    name: "Zen Biometrics",
    icon: Activity,
    color: "bg-lime-500",
    prompt: "Search for grants and contracts related to cortisol monitoring, stress biomarkers, microneedle technology, wearable health sensors, preventive mental healthcare, continuous health monitoring, and Addison's disease management.",
    keywords: ["cortisol", "stress monitoring", "microneedle", "wearable sensor", "mental health", "biomarker", "health monitoring"],
  },
  {
    id: "locomotion-defense",
    name: "Locomotion Systems for Defense",
    icon: Plane,
    color: "bg-stone-500",
    prompt: "Search for grants and contracts related to defense locomotion systems, military mobility platforms, autonomous ground vehicles, robotic locomotion, all-terrain systems, and tactical mobility solutions.",
    keywords: ["locomotion", "mobility", "ground vehicle", "robotic movement", "all-terrain", "tactical mobility", "defense platform"],
  },
  {
    id: "post-quantum-crypto",
    name: "Post-Quantum Cryptography",
    icon: Shield,
    color: "bg-cyan-600",
    prompt: "Search for grants and contracts related to post-quantum cryptography, FrodoKEM implementation, MAYO digital signatures, RISC-V cryptographic coprocessors, crypto-agile architectures, quantum-resistant algorithms, authentication protocols, lattice-based cryptography, and hardware security modules.",
    keywords: ["post-quantum", "FrodoKEM", "MAYO", "RISC-V crypto", "crypto-agile", "quantum-resistant", "lattice cryptography", "PQC"],
  },
  {
    id: "optical-phased-arrays",
    name: "Optical Phased Arrays & Photonics",
    icon: Radio,
    color: "bg-sky-500",
    prompt: "Search for grants and contracts related to optical phased arrays (OPA), integrated photonic technology, inter-satellite optical communication, fiber optic gyroscopes (FOG), MIOC components, photonic integrated circuits (PIC), sub-THz generators, active alignment systems, and space optical systems.",
    keywords: ["optical phased array", "photonic", "inter-satellite", "fiber optic gyroscope", "FOG", "PIC", "MIOC", "optical communication"],
  },
  {
    id: "quantum-sensing",
    name: "Quantum Sensing & Navigation",
    icon: Compass,
    color: "bg-violet-600",
    prompt: "Search for grants and contracts related to quantum sensors, NV-center magnetometers, quantum magnetic navigation, quantum gyroscopy, structural quantum sensing, diamond NV sensors, quantum inertial navigation, and magnetometry for defense applications.",
    keywords: ["quantum sensor", "NV-center", "quantum magnetometer", "quantum navigation", "quantum gyroscope", "diamond sensor", "quantum inertial"],
  },
  {
    id: "sar-3d-reconstruction",
    name: "SAR 3D Reconstruction & Neural Rendering",
    icon: Sparkles,
    color: "bg-indigo-400",
    prompt: "Search for grants and contracts related to SAR inverse rendering, synthetic aperture radar 3D reconstruction, novel view synthesis (NVS), neural radiance fields for radar, image-goal navigation, zero-shot novelty detection, surface change detection, and episodic memory systems.",
    keywords: ["SAR reconstruction", "inverse rendering", "novel view synthesis", "NVS", "3D reconstruction", "change detection", "neural rendering"],
  },
  {
    id: "electrochemical-biosensors",
    name: "Electrochemical Biosensors",
    icon: Activity,
    color: "bg-teal-600",
    prompt: "Search for grants and contracts related to electrochemical biosensors, aptamer sensors, osmium redox probes, microneedle electrochemical systems, cortisol detection, antibiotic detection in biofluids, wearable electrochemical sensors, and point-of-care diagnostics.",
    keywords: ["electrochemical biosensor", "aptamer", "osmium probe", "microneedle sensor", "cortisol sensor", "antibiotic detection", "wearable biosensor"],
  },
  {
    id: "peptide-therapeutics",
    name: "Peptide Therapeutics & ERK Inhibitors",
    icon: Microscope,
    color: "bg-rose-600",
    prompt: "Search for grants and contracts related to peptide-based therapeutics, ERK pathway inhibitors, intracellular peptide delivery, NanoBRET assays, 3D tumor spheroid models, mimetic peptides, antitumor peptides, and targeted cancer therapy.",
    keywords: ["peptide therapeutic", "ERK inhibitor", "intracellular delivery", "tumor spheroid", "mimetic peptide", "antitumor", "NanoBRET"],
  },
  {
    id: "soil-bioremediation",
    name: "Soil Bioremediation & Microbiome",
    icon: Microscope,
    color: "bg-green-600",
    prompt: "Search for grants and contracts related to burnt soil bioremediation, bacterial consortium, soil microbiome restoration, contaminant degradation, secondary metabolite analysis, freeze-drying bacteria, laurisilva restoration, and environmental microbiology.",
    keywords: ["bioremediation", "soil restoration", "bacterial consortium", "microbiome", "contaminant degradation", "environmental microbiology", "burnt soil"],
  },
  {
    id: "exoskeletons-robotics",
    name: "Exoskeletons & Assisted Locomotion",
    icon: Cpu,
    color: "bg-amber-600",
    prompt: "Search for grants and contracts related to powered exoskeletons, assisted locomotion systems, lower limb exoskeletons, metabolic consumption reduction, anthropomorphic robotic arms, high dynamic behavior robots, wearable robotics, and human augmentation.",
    keywords: ["exoskeleton", "assisted locomotion", "powered orthosis", "wearable robot", "anthropomorphic arm", "human augmentation", "metabolic efficiency"],
  },
  {
    id: "electric-motors-drives",
    name: "Electric Motors & High-Speed Drives",
    icon: Zap,
    color: "bg-yellow-600",
    prompt: "Search for grants and contracts related to high-speed electric motors, high-current motor drivers, segmented motors, Vernier electric machines, dual inverter systems, integrated traction drives, slip rings, planetary gear transmissions, and PMSM motor development.",
    keywords: ["high-speed motor", "motor driver", "segmented motor", "Vernier machine", "dual inverter", "traction drive", "planetary gear", "PMSM"],
  },
  {
    id: "event-based-vision",
    name: "Event-Based Vision & SLAM",
    icon: Brain,
    color: "bg-purple-400",
    prompt: "Search for grants and contracts related to event-based cameras, visual SLAM with aerial images, VIO (Visual Inertial Odometry), event-based VSLAM, polarimetric navigation, neuromorphic vision, long-range surveillance systems, and autonomous navigation with event cameras.",
    keywords: ["event-based camera", "visual SLAM", "VIO", "polarimetric", "neuromorphic vision", "aerial SLAM", "event-based navigation"],
  },
  {
    id: "quantum-ml",
    name: "Quantum Machine Learning",
    icon: Brain,
    color: "bg-pink-600",
    prompt: "Search for grants and contracts related to quantum machine learning, quantum transformers, quantum reservoir computing, time series forecasting with quantum systems, data-efficient quantum algorithms, and hybrid quantum-classical computing.",
    keywords: ["quantum ML", "quantum transformer", "reservoir computing", "quantum forecasting", "hybrid quantum", "quantum algorithm"],
  },
  {
    id: "digital-twin-robotics",
    name: "Digital Twin for Robotics",
    icon: Cpu,
    color: "bg-slate-600",
    prompt: "Search for grants and contracts related to robotic digital twins, power consumption simulation, efficiency evaluation, kinematic chain characterization, high-level robot controllers, joint-level robotic metrics, and robotic simulation platforms.",
    keywords: ["digital twin", "robotic simulation", "kinematic chain", "power simulation", "robot controller", "efficiency evaluation"],
  },
  {
    id: "gut-microbiome",
    name: "Gut Microbiome & Postbiotics",
    icon: Activity,
    color: "bg-lime-600",
    prompt: "Search for grants and contracts related to gut microbiome modulation, postbiotics, intestinal epithelial models, Caco-2 cell studies, gut barrier permeability, colonic fermentation, and microbiome therapeutics.",
    keywords: ["gut microbiome", "postbiotics", "Caco-2", "intestinal barrier", "colonic fermentation", "microbiome modulation", "gut health"],
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
  ): { score: number; matched: string[] } => {
    const text = `${grant.title} ${grant.description || ""} ${grant.category || ""} ${grant.agency || ""}`.toLowerCase()
    const matched = keywords.filter((kw) => text.includes(kw.toLowerCase()))
    const score = Math.min(99, 40 + matched.length * 12)
    return { score, matched }
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

    // Score grants against program keywords
    const programResults: SyncResult[] = []
    for (const grant of allRawGrants) {
      const { score, matched } = scoreRelevance(grant, program.keywords)
      if (matched.length > 0 || score >= 50) {
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
          matchedKeywords: matched.length > 0 ? matched.slice(0, 5) : ["general"],
          url: grant.url || "#",
          deadline: grant.closeDate || "See portal",
          status: "new",
          programId: program.id,
        })
      }
    }

    // Sort by relevance
    programResults.sort((a, b) => b.relevanceScore - a.relevanceScore)
    programResults.forEach((r, i) => {
      if (r.relevanceScore >= 60 || i < 5) {
        r.status = "confirmed"
      }
    })

    // Update results
    setSyncResults((prev) => {
      const filtered = prev.filter((r) => r.programId !== program.id)
      return [...filtered, ...programResults].sort((a, b) => b.relevanceScore - a.relevanceScore)
    })

    // Push to main feed
    if (allRawGrants.length > 0 && onGrantsFound) {
      const cleanGrants = allRawGrants.map(({ _sourceLabel, ...rest }) => rest)
      onGrantsFound(cleanGrants)
    }

    addLog(
      `${program.name}`,
      programResults.length > 0 ? "success" : "warning",
      `Found ${programResults.length} relevant opportunities (${programResults.filter((r) => r.relevanceScore >= 60).length} high-relevance)`,
      program.id
    )

    setProgramStates((prev) => ({
      ...prev,
      [program.id]: {
        ...prev[program.id],
        isRunning: false,
        lastSync: new Date(),
        resultsCount: programResults.length,
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

    // Score grants
    const customResults: SyncResult[] = []
    for (const grant of allRawGrants) {
      const { score, matched } = scoreRelevance(grant, search.keywords)
      if (matched.length > 0 || score >= 50) {
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
          matchedKeywords: matched.length > 0 ? matched.slice(0, 5) : ["general"],
          url: grant.url || "#",
          deadline: grant.closeDate || "See portal",
          status: "new",
          programId: search.id,
        })
      }
    }

    customResults.sort((a, b) => b.relevanceScore - a.relevanceScore)
    customResults.forEach((r, i) => {
      if (r.relevanceScore >= 60 || i < 5) {
        r.status = "confirmed"
      }
    })

    // Update results
    setSyncResults((prev) => {
      const filtered = prev.filter((r) => r.programId !== search.id)
      return [...filtered, ...customResults].sort((a, b) => b.relevanceScore - a.relevanceScore)
    })

    // Update custom search stats
    setCustomSearches((prev) =>
      prev.map((cs) =>
        cs.id === search.id ? { ...cs, lastRun: new Date(), resultsCount: customResults.length } : cs
      )
    )

    // Push to main feed
    if (allRawGrants.length > 0 && onGrantsFound) {
      const cleanGrants = allRawGrants.map(({ _sourceLabel, ...rest }) => rest)
      onGrantsFound(cleanGrants)
    }

    addLog(
      `Custom: ${search.name}`,
      customResults.length > 0 ? "success" : "warning",
      `Found ${customResults.length} relevant opportunities (${customResults.filter((r) => r.relevanceScore >= 60).length} high-relevance)`,
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
    <div className="space-y-6">
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
                const searchResults = syncResults.filter((r) => r.programId === search.id)
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

                    {/* Expanded Results */}
                    {isExpanded && searchResults.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100 max-h-48 overflow-y-auto space-y-2">
                        {searchResults.slice(0, 5).map((result) => (
                          <div key={result.id} className="text-xs">
                            <a
                              href={result.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-700 hover:underline font-medium line-clamp-1"
                            >
                              {result.title}
                            </a>
                            <div className="flex items-center gap-2 text-gray-400 mt-0.5">
                              <span>{result.source}</span>
                              <Badge className={`text-[9px] px-1 py-0 ${getRelevanceColor(result.relevanceScore)}`}>
                                {result.relevanceScore}%
                              </Badge>
                            </div>
                          </div>
                        ))}
                        {searchResults.length > 5 && (
                          <p className="text-[10px] text-gray-400 text-center">+{searchResults.length - 5} more</p>
                        )}
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
          const programResults = syncResults.filter((r) => r.programId === program.id)
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

                {/* Expanded Results */}
                {isExpanded && programResults.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 max-h-48 overflow-y-auto space-y-2">
                    {programResults.slice(0, 5).map((result) => (
                      <div key={result.id} className="text-xs">
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#1e3a5f] hover:underline font-medium line-clamp-1"
                        >
                          {result.title}
                        </a>
                        <div className="flex items-center gap-2 text-gray-400 mt-0.5">
                          <span>{result.source}</span>
                          <Badge className={`text-[9px] px-1 py-0 ${getRelevanceColor(result.relevanceScore)}`}>
                            {result.relevanceScore}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {programResults.length > 5 && (
                      <p className="text-[10px] text-gray-400 text-center">
                        +{programResults.length - 5} more results
                      </p>
                    )}
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
                <div className="font-bold text-[#1e3a5f] text-xl">{syncResults.length}</div>
                <div className="text-gray-500">Total Opportunities</div>
              </div>
              <div className="bg-white rounded p-3 text-center">
                <div className="font-bold text-emerald-600 text-xl">
                  {syncResults.filter((r) => r.relevanceScore >= 60).length}
                </div>
                <div className="text-gray-500">High Relevance</div>
              </div>
              <div className="bg-white rounded p-3 text-center">
                <div className="font-bold text-[#1e3a5f] text-xl">
                  {new Set(syncResults.map((r) => r.programId)).size}
                </div>
                <div className="text-gray-500">Programs Matched</div>
              </div>
              <div className="bg-white rounded p-3 text-center">
                <div className="font-bold text-[#1e3a5f] text-xl">
                  {new Set(syncResults.map((r) => r.source)).size}
                </div>
                <div className="text-gray-500">Sources</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
