export interface ScanProgressStage {
  step: number
  progress: number
  title: string
  description: string
}

export const SCAN_PIPELINE_STAGES: ScanProgressStage[] = [
  {
    step: 1,
    progress: 15,
    title: 'Initializing Sandbox & TLS Handshake',
    description: 'Establishing isolated socket connection and inspecting cipher suites...',
  },
  {
    step: 2,
    progress: 38,
    title: 'URL Intelligence & Domain Reputation',
    description: 'Querying WHOIS records, registrar age, DNS sinkholes, and homoglyphs...',
  },
  {
    step: 3,
    progress: 68,
    title: 'Multi-Agent Semantic Threat Analysis',
    description: 'Dispatching lexical heuristics, credential form inspection, and urgency scoring...',
  },
  {
    step: 4,
    progress: 88,
    title: 'Synthesizing Bilingual Advisories',
    description: 'Compiling English and Urdu containment protocols and risk scores...',
  },
  {
    step: 5,
    progress: 100,
    title: 'Intelligence Assessment Ready',
    description: 'Finalizing audit verdict and generating forensic telemetry...',
  },
]

/**
 * Simulates a realistic progression through the 5 SIFTRIX analysis stages.
 * Returns a cancel function to clear active timers if the scan completes early.
 */
export function simulateScanProgress(
  onProgress: (stage: ScanProgressStage) => void,
  onComplete?: () => void
): () => void {
  const timeouts: ReturnType<typeof setTimeout>[] = []

  let currentDelay = 0
  const stageDelays = [150, 400, 500, 450, 300]

  SCAN_PIPELINE_STAGES.forEach((stage, idx) => {
    currentDelay += stageDelays[idx]
    const timeout = setTimeout(() => {
      onProgress(stage)
      if (idx === SCAN_PIPELINE_STAGES.length - 1) {
        onComplete?.()
      }
    }, currentDelay)
    timeouts.push(timeout)
  })

  return () => {
    timeouts.forEach(clearTimeout)
  }
}
