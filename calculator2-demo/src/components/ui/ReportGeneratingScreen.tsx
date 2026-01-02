import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

const REPORT_SECTIONS = [
  'Quick Start Protocol',
  'Macronutrient Targets',
  '30-Day Meal Plan',
  'Weekly Shopping Lists',
  'Food Quality Standards',
  'Supplement Recommendations',
  'Lab Work & Testing',
  'Common Issues & Solutions',
  'Doctor Conversation Guide',
  'Tracking & Metrics',
  'Adaptation Timeline',
  'Obstacle Protocol',
  'Community Resources',
]

const EXPECTED_DURATION = 50000 // 50 seconds to be safe

interface ReportGeneratingScreenProps {
  isComplete?: boolean
}

export default function ReportGeneratingScreen({ isComplete = false }: ReportGeneratingScreenProps) {
  const [progress, setProgress] = useState(0)
  const [completedSections, setCompletedSections] = useState<number>(0)
  const [secondsElapsed, setSecondsElapsed] = useState(0)

  useEffect(() => {
    if (isComplete) {
      setProgress(100)
      setCompletedSections(REPORT_SECTIONS.length)
      return
    }

    const interval = setInterval(() => {
      setSecondsElapsed((prev) => {
        const next = prev + 1
        // Progress increases slowly over 50 seconds, with some randomness to look natural
        // Caps out at 98% until completion
        const baseProgress = (next / EXPECTED_DURATION) * 100
        const randomBump = Math.random() * 2
        const newProgress = Math.min(baseProgress + randomBump, 98)

        // Update completed sections based on progress
        const sectionsComplete = Math.floor((newProgress / 100) * REPORT_SECTIONS.length)
        setCompletedSections(Math.min(sectionsComplete, REPORT_SECTIONS.length - 1))
        setProgress(newProgress)

        return next
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isComplete])

  const estimatedTimeRemaining = Math.max(1, Math.ceil(((100 - progress) / 100) * EXPECTED_DURATION / 1000))

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8 py-12"
    >
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-display font-bold text-dark">
          Generating Your Protocol
        </h2>
        <p className="text-gray-600">
          Creating your personalized 13-section carnivore protocol...
        </p>
      </div>

      {/* Progress Bar */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <div className="flex items-end justify-between">
          <span className="text-sm font-semibold text-dark">Progress</span>
          <span className="text-sm font-semibold text-primary">{Math.round(progress)}%</span>
        </div>

        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
            className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
          />
        </div>

        <div className="flex justify-between text-xs text-gray-500">
          <span>Estimated time remaining: {estimatedTimeRemaining}s</span>
          <span>{completedSections} of {REPORT_SECTIONS.length} sections</span>
        </div>
      </motion.div>

      {/* Report Sections */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-lg p-6 border border-primary/20"
      >
        <p className="text-sm font-semibold text-dark mb-4">Report Sections Being Generated:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {REPORT_SECTIONS.map((section, index) => (
            <motion.div
              key={section}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-3"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{
                  scale: index < completedSections ? 1 : 0.8,
                }}
                className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm ${
                  index < completedSections
                    ? 'bg-green-500 text-white'
                    : index === completedSections
                      ? 'bg-primary text-white animate-pulse'
                      : 'bg-gray-300 text-gray-500'
                }`}
              >
                {index < completedSections ? (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-lg"
                  >
                    ✓
                  </motion.span>
                ) : index === completedSections ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-3 h-3 border-2 border-transparent border-t-white rounded-full"
                  />
                ) : (
                  index + 1
                )}
              </motion.div>
              <span
                className={`text-sm font-medium ${
                  index < completedSections ? 'text-green-600 line-through' : 'text-dark'
                }`}
              >
                {section}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Encouraging Message */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center"
      >
        <p className="text-sm text-gray-600">
          🧬 Our AI is analyzing your health data and crafting personalized recommendations...
        </p>
      </motion.div>
    </motion.div>
  )
}
