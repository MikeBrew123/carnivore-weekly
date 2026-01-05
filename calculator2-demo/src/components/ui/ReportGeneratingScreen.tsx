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

const EXPECTED_DURATION = 50 // 50 seconds duration for the progress animation

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

    // Calculate seconds per section for smooth progression
    const secondsPerSection = EXPECTED_DURATION / REPORT_SECTIONS.length // ~3.85 seconds per section

    const interval = setInterval(() => {
      setSecondsElapsed((prev) => {
        const nextSeconds = prev + 1

        // Linear progress over expected duration, capped at 98% until completion
        const newProgress = Math.min((nextSeconds / EXPECTED_DURATION) * 100, 98)

        // Calculate sections completed based on elapsed time
        // Each section should complete smoothly as time progresses
        const sectionsComplete = Math.min(
          Math.floor(nextSeconds / secondsPerSection),
          REPORT_SECTIONS.length - 1
        )

        setCompletedSections(sectionsComplete)
        setProgress(newProgress)

        return nextSeconds
      })
    }, 1000) // Update every 1 second - cleaner math

    return () => clearInterval(interval)
  }, [isComplete])

  const estimatedTimeRemaining = Math.max(1, Math.ceil(((100 - progress) / 100) * EXPECTED_DURATION))

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        // Cream background page (matches FormContainer)
        backgroundColor: '#F2F0E6',
        minHeight: '100vh',
        padding: '40px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Centered container with max-width matching FormContainer approach */}
      <div style={{ maxWidth: '600px', width: '100%' }}>
        {/* Dark card background with gold accents - brand aesthetic */}
        <div
          style={{
            backgroundColor: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '12px',
            padding: '2rem',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          }}
        >
          {/* Header - Gold title in Playfair Display serif font */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            style={{ textAlign: 'center', marginBottom: '2rem' }}
          >
            <h2
              style={{
                // Brand: Gold color (#ffd700) in Playfair Display (serif heading font)
                color: '#ffd700',
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: '32px',
                fontWeight: 700,
                margin: '0 0 0.5rem 0',
                letterSpacing: '-0.5px',
              }}
            >
              Generating Your Protocol
            </h2>
            <p
              style={{
                // Brand: Light tan text on dark background for readability
                color: '#d4a574',
                fontFamily: "'Merriweather', Georgia, serif",
                fontSize: '14px',
                margin: 0,
                fontWeight: 400,
              }}
            >
              Creating your personalized 13-section carnivore protocol...
            </p>
          </motion.div>

          {/* Progress Section */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            style={{ marginBottom: '2rem' }}
          >
            {/* Progress Label and Percentage */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                marginBottom: '0.75rem',
              }}
            >
              <span
                style={{
                  // Brand: Merriweather serif, light tan text
                  color: '#d4a574',
                  fontFamily: "'Merriweather', Georgia, serif",
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Progress
              </span>
              <span
                style={{
                  // Brand: Gold accent for percentage
                  color: '#ffd700',
                  fontFamily: "'Merriweather', Georgia, serif",
                  fontSize: '14px',
                  fontWeight: 700,
                }}
              >
                {Math.round(progress)}%
              </span>
            </div>

            {/* Progress Bar - Gold fill on dark track (brand aesthetic) */}
            <div
              style={{
                height: '8px',
                backgroundColor: '#333',
                borderRadius: '4px',
                overflow: 'hidden',
                marginBottom: '0.75rem',
              }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
                style={{
                  // Brand: Gold progress bar (#ffd700) - premium feel
                  height: '100%',
                  background: 'linear-gradient(90deg, #ffd700 0%, #ffed4e 100%)',
                  borderRadius: '4px',
                  boxShadow: '0 0 8px rgba(255, 215, 0, 0.4)',
                }}
              />
            </div>

            {/* Time and Section Info */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
              }}
            >
              <span style={{ color: '#999' }}>
                Estimated time remaining: {estimatedTimeRemaining}s
              </span>
              <span style={{ color: '#999' }}>
                {completedSections} of {REPORT_SECTIONS.length} sections
              </span>
            </div>
          </motion.div>

          {/* Report Sections Grid */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{
              marginBottom: '1.5rem',
              padding: '1.5rem',
              backgroundColor: 'rgba(255, 215, 0, 0.05)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 215, 0, 0.1)',
            }}
          >
            <p
              style={{
                // Section label - tan accent color with serif
                color: '#d4a574',
                fontFamily: "'Merriweather', Georgia, serif",
                fontSize: '12px',
                fontWeight: 700,
                margin: '0 0 1rem 0',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Report Sections Being Generated:
            </p>

            {/* 2-column grid layout for sections */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
              }}
            >
              {REPORT_SECTIONS.map((section, index) => (
                <motion.div
                  key={section}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  {/* Section Status Indicator Circle */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{
                      scale: index < completedSections ? 1 : 0.8,
                    }}
                    style={{
                      // Brand color states:
                      // Completed: Gold (#ffd700) with checkmark
                      // Current: Gold with rotating spinner
                      // Pending: Dark gray (#444)
                      flexShrink: 0,
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '12px',
                      backgroundColor:
                        index < completedSections
                          ? '#ffd700' // Completed: Gold background
                          : index === completedSections
                            ? '#ffd700' // Current: Gold background (spinner animates)
                            : '#444', // Pending: Dark gray
                      color:
                        index < completedSections
                          ? '#1a1a1a' // Completed: Dark text on gold
                          : index === completedSections
                            ? '#1a1a1a' // Current: Dark spinner
                            : '#999', // Pending: Gray text
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {index < completedSections ? (
                      // Completed section: Gold checkmark
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        style={{ fontSize: '14px', lineHeight: 1 }}
                      >
                        ✓
                      </motion.span>
                    ) : index === completedSections ? (
                      // Current section: Rotating spinner on gold background
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        style={{
                          width: '10px',
                          height: '10px',
                          borderWidth: '2px',
                          borderStyle: 'solid',
                          borderColor: 'transparent transparent #1a1a1a transparent',
                          borderRadius: '50%',
                        }}
                      />
                    ) : (
                      // Pending section: Numbered indicator
                      <span style={{ fontSize: '11px' }}>{index + 1}</span>
                    )}
                  </motion.div>

                  {/* Section Name Text */}
                  <span
                    style={{
                      // Brand typography: Merriweather serif
                      fontFamily: "'Merriweather', Georgia, serif",
                      fontSize: '12px',
                      fontWeight: index < completedSections ? 400 : 500,
                      color: index < completedSections ? '#999' : '#d4a574',
                      textDecoration: index < completedSections ? 'line-through' : 'none',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {section}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Encouraging Message - Premium feel */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{
              textAlign: 'center',
              padding: '1rem 0',
            }}
          >
            <p
              style={{
                // Brand: Light tan text with serif
                color: '#d4a574',
                fontFamily: "'Merriweather', Georgia, serif",
                fontSize: '13px',
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              Our AI is analyzing your health data and crafting personalized recommendations...
            </p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
