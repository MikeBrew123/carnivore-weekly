interface ProgressIndicatorProps {
  currentStep: number
  totalSteps: number
  stepLabels: string[]
}

export default function ProgressIndicator({
  currentStep,
  totalSteps,
  stepLabels,
}: ProgressIndicatorProps) {
  return (
    <div style={{ width: '100%', marginBottom: '32px' }}>
      {/* Horizontal breadcrumb progress */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        position: 'relative'
      }}>
        {/* Background line connecting dots */}
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '0',
          right: '0',
          height: '2px',
          backgroundColor: '#333',
          zIndex: 0
        }} />

        {stepLabels.map((label, index) => {
          const stepNumber = index + 1
          const isActive = stepNumber === currentStep
          const isComplete = stepNumber < currentStep
          const isStep4 = stepNumber === 4

          let dotBg = '#444'  // Default (future steps)
          let dotRing = 'none'

          if (isComplete) {
            dotBg = '#228B22'  // Green for completed
          } else if (isActive) {
            dotBg = '#ffd700'  // Gold fill for current
            dotRing = '3px solid #ffd700'
          }

          // Step 4 gets amber tint when locked (not active, not complete)
          const labelColor = isActive ? '#ffd700' : isComplete ? '#228B22' : (isStep4 ? 'rgba(245, 158, 11, 0.8)' : '#999')

          return (
            <div
              key={index}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: 1,
                zIndex: 1,
                position: 'relative'
              }}
            >
              {/* Dot */}
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: dotBg,
                  border: dotRing,
                  transition: 'all 0.3s ease',
                  marginBottom: '12px'
                }}
              />

              {/* Label underneath dot */}
              <p
                style={{
                  fontSize: '11px',
                  fontWeight: '500',
                  textAlign: 'center',
                  color: labelColor,
                  fontFamily: "'Merriweather', Georgia, serif",
                  margin: '0',
                  transition: 'color 0.3s ease',
                  lineHeight: '1.2',
                  maxWidth: '85px'
                }}
              >
                {isStep4 ? '🔒 ' : ''}{label}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
