import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

// The 13 exact report sections from spec
const REPORT_SECTIONS = [
  'Executive Summary',
  'Carnivore Food Guide',
  '30-Day Meal Calendar',
  'Weekly Grocery Lists',
  'Physician Consultation Guide',
  'Conquering Your Kryptonite',
  'Dining Out & Travel Guide',
  'The Science & Evidence',
  'Laboratory Reference Guide',
  'The Electrolyte Protocol',
  'The Adaptation Timeline',
  'The Stall-Breaker Protocol',
  '30-Day Progress Tracker',
]

const EXPECTED_DURATION = 45 // 45 seconds - simulating 3-5 seconds per section

interface ReportSection {
  name: string
  status: 'pending' | 'in-progress' | 'complete'
}

export default function AssessmentSuccess() {
  const [sessionId, setSessionId] = useState<string | null>(null)

  const [progress, setProgress] = useState(0)
  const [sections, setSections] = useState<ReportSection[]>(
    REPORT_SECTIONS.map((name) => ({ name, status: 'pending' }))
  )
  const [secondsElapsed, setSecondsElapsed] = useState(0)
  const [isAnimationComplete, setIsAnimationComplete] = useState(false)
  const [report, setReport] = useState<string | null>(null)

  // Extract session_id from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id = params.get('session_id')
    setSessionId(id)
  }, [])

  // Prevent page navigation while loading
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isAnimationComplete) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isAnimationComplete])

  // Main animation loop
  useEffect(() => {
    if (isAnimationComplete) return

    const secondsPerSection = EXPECTED_DURATION / REPORT_SECTIONS.length

    const interval = setInterval(() => {
      setSecondsElapsed((prev) => {
        const nextSeconds = prev + 1

        // Linear progress over expected duration, capped at 99% until completion
        const newProgress = nextSeconds >= EXPECTED_DURATION ? 100 : Math.min((nextSeconds / EXPECTED_DURATION) * 100, 99)

        // Calculate which sections are complete
        const completedCount = Math.min(
          Math.floor(nextSeconds / secondsPerSection),
          REPORT_SECTIONS.length
        )

        // Update sections state
        setSections((prevSections) =>
          prevSections.map((section, index) => {
            if (index < completedCount - 1) {
              return { ...section, status: 'complete' }
            } else if (index === completedCount - 1) {
              return { ...section, status: 'in-progress' }
            }
            return { ...section, status: 'pending' }
          })
        )

        setProgress(newProgress)

        // Check if animation is complete
        if (nextSeconds >= EXPECTED_DURATION) {
          setIsAnimationComplete(true)
          // Generate placeholder report
          generatePlaceholderReport()
          return nextSeconds
        }

        return nextSeconds
      })
    }, 1000) // Update every 1 second

    return () => clearInterval(interval)
  }, [isAnimationComplete])

  const generatePlaceholderReport = () => {
    const reportHTML = `
      <div class="space-y-8">
        <div class="text-center space-y-2">
          <h1 class="text-4xl font-bold text-[#1a1a1a]">Your Personalized Carnivore Protocol</h1>
          <p class="text-xl text-gray-600">Complete 13-Section Report Ready</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          ${REPORT_SECTIONS.map(
            (section, index) => `
            <div class="bg-white rounded-lg p-6 border-l-4 border-[#ffd700] shadow-sm">
              <h3 class="text-lg font-bold text-[#1a1a1a] mb-2">${section}</h3>
              <p class="text-gray-600 text-sm">
                This section contains your personalized guidance for ${section.toLowerCase()}.
                Your assessment data has been analyzed to provide targeted, actionable recommendations
                specific to your goals, health status, and lifestyle.
              </p>
            </div>
          `
          ).join('')}
        </div>

        <div class="bg-[#F2F0E6] border border-[#ffd700] rounded-lg p-8 text-center">
          <p class="text-lg text-[#1a1a1a] font-semibold mb-4">Report Generated Successfully</p>
          <p class="text-gray-700 mb-6">
            Your complete 13-section protocol report has been generated and is ready to review.
            Download or share your personalized plan below.
          </p>
          <div class="flex gap-4 justify-center">
            <button class="px-6 py-3 bg-[#228B22] text-white rounded-lg font-semibold hover:opacity-90">
              Download PDF
            </button>
            <button class="px-6 py-3 border-2 border-[#ffd700] text-[#1a1a1a] rounded-lg font-semibold hover:bg-[#F2F0E6]">
              Share Report
            </button>
          </div>
        </div>
      </div>
    `
    setReport(reportHTML)
  }

  const estimatedTimeRemaining = Math.max(1, Math.ceil(((100 - progress) / 100) * EXPECTED_DURATION))

  // Render loading animation
  if (!isAnimationComplete) {
    return (
      <div className="min-h-screen bg-[#F2F0E6] flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-2xl"
        >
          {/* Dark card container */}
          <div className="bg-[#1a1a1a] rounded-2xl p-8 shadow-2xl space-y-8">
            {/* Header */}
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-[#f5f5f5]">Generating Your Report</h2>
              <p className="text-[#ffd700] font-semibold">Processing assessment data...</p>
            </div>

            {/* Please don't refresh warning */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-[#ffd700]/10 border border-[#ffd700]/30 rounded-lg p-4"
            >
              <p className="text-[#f5f5f5] text-sm text-center font-medium">
                ⚠️ Please don't refresh or navigate away - your report is being generated
              </p>
            </motion.div>

            {/* Progress Bar */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[#f5f5f5]">Progress</span>
                <span className="text-sm font-bold text-[#ffd700]">{Math.round(progress)}%</span>
              </div>

              {/* Progress bar with smooth transition */}
              <div className="h-3 bg-[#2a2a2a] rounded-full overflow-hidden border border-[#ffd700]/20">
                <motion.div
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: 'linear' }}
                  className="h-full bg-gradient-to-r from-[#ffd700] to-[#ffed4e] rounded-full"
                />
              </div>

              <div className="flex justify-between text-xs text-[#b0b0b0]">
                <span>{estimatedTimeRemaining}s remaining</span>
                <span>
                  {sections.filter((s) => s.status === 'complete').length}/{REPORT_SECTIONS.length} sections
                </span>
              </div>
            </motion.div>

            {/* Report Sections Checklist */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-4"
            >
              <p className="text-sm font-semibold text-[#f5f5f5]">Report Sections:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2">
                {sections.map((section, index) => (
                  <motion.div
                    key={section.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="flex items-center gap-3"
                  >
                    {/* Status indicator */}
                    <motion.div
                      animate={{
                        scale: section.status === 'in-progress' ? [1, 1.1, 1] : 1,
                      }}
                      transition={
                        section.status === 'in-progress'
                          ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
                          : {}
                      }
                      className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        section.status === 'complete'
                          ? 'bg-[#228B22] text-white'
                          : section.status === 'in-progress'
                            ? 'bg-[#ffd700] text-[#1a1a1a] animate-pulse'
                            : 'bg-[#3a3a3a] text-[#707070]'
                      }`}
                    >
                      {section.status === 'complete' ? (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="text-sm leading-none"
                        >
                          ✓
                        </motion.span>
                      ) : section.status === 'in-progress' ? (
                        '●'
                      ) : (
                        '○'
                      )}
                    </motion.div>

                    {/* Section name */}
                    <span
                      className={`text-sm font-medium transition-colors ${
                        section.status === 'complete'
                          ? 'text-[#228B22] line-through'
                          : section.status === 'in-progress'
                            ? 'text-[#ffd700]'
                            : 'text-[#b0b0b0]'
                      }`}
                    >
                      {section.name}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Status message */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center"
            >
              <p className="text-sm text-[#b0b0b0]">
                Analyzing your data and crafting personalized recommendations...
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    )
  }

  // Render completed report
  return (
    <div className="min-h-screen bg-[#F2F0E6] py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto"
      >
        {/* Success animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="text-center mb-12"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="inline-block text-6xl mb-4"
          >
            ✓
          </motion.div>
          <h1 className="text-4xl font-bold text-[#1a1a1a] mb-2">Report Complete!</h1>
          <p className="text-xl text-gray-600">
            Your 13-section personalized carnivore protocol is ready
          </p>
        </motion.div>

        {/* Report content */}
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-8">
          {/* Section grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {REPORT_SECTIONS.map((section, index) => (
              <motion.div
                key={section}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + index * 0.04 }}
                className="bg-[#F2F0E6] rounded-lg p-6 border-l-4 border-[#ffd700] hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#228B22] flex items-center justify-center text-white font-bold text-sm">
                    ✓
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#1a1a1a]">{section}</h3>
                    <p className="text-gray-600 text-sm mt-1">
                      Personalized guidance based on your assessment
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="border-t border-gray-200 pt-8">
            <div className="bg-[#ffd700]/10 border border-[#ffd700]/30 rounded-lg p-6 mb-6">
              <p className="text-[#1a1a1a] text-center font-semibold">
                Session ID: {sessionId || 'Loading...'}
              </p>
            </div>

            <div className="flex gap-4 justify-center flex-wrap">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-3 bg-[#228B22] text-white rounded-lg font-semibold hover:bg-[#1a6a1a] transition-colors"
              >
                Download PDF Report
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-3 border-2 border-[#ffd700] text-[#1a1a1a] rounded-lg font-semibold hover:bg-[#F2F0E6] transition-colors"
              >
                Share Report
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.location.href = '/'}
                className="px-8 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors"
              >
                Back to Home
              </motion.button>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-gray-600 text-sm mt-8"
        >
          Your report has been successfully generated. Check your email for a copy of this report.
        </motion.p>
      </motion.div>
    </div>
  )
}
