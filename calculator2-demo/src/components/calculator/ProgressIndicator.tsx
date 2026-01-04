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
    <div className="w-full mb-8">
      {/* Step numbers */}
      <div className="flex items-center justify-between mb-3">
        {stepLabels.map((label, index) => {
          const stepNumber = index + 1
          const isActive = stepNumber === currentStep
          const isComplete = stepNumber < currentStep

          const circleBackgroundColor = isActive ? '#ffd700' : isComplete ? '#228B22' : '#333'
          const circleTextColor = isActive ? '#1a120b' : '#f5f5f5'
          const labelColor = isActive ? '#ffd700' : isComplete ? '#228B22' : '#a0a0a0'

          return (
            <div key={index} className="flex-1">
              {/* Step circle */}
              <div className="flex items-center">
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: '600',
                    fontFamily: "'Playfair Display', Georgia, serif",
                    backgroundColor: circleBackgroundColor,
                    color: circleTextColor,
                    transition: 'all 0.2s'
                  }}
                >
                  {isComplete ? '✓' : stepNumber}
                </div>

                {/* Line connector */}
                {index < stepLabels.length - 1 && (
                  <div
                    style={{
                      flex: 1,
                      height: '2px',
                      margin: '0 8px',
                      borderRadius: '4px',
                      backgroundColor: stepNumber < currentStep ? '#ffd700' : '#333',
                      transition: 'background-color 0.3s'
                    }}
                  />
                )}
              </div>

              {/* Label */}
              <p
                style={{
                  marginTop: '8px',
                  fontSize: '12px',
                  fontWeight: '500',
                  textAlign: 'center',
                  color: labelColor,
                  fontFamily: "'Merriweather', Georgia, serif",
                  transition: 'color 0.2s'
                }}
              >
                {label}
              </p>
            </div>
          )
        })}
      </div>

      {/* Progress bar */}
      <div style={{ width: '100%', height: '4px', backgroundColor: '#333', borderRadius: '12px', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            backgroundColor: '#ffd700',
            transition: 'width 0.3s ease-out',
            width: `${(currentStep / totalSteps) * 100}%`,
            borderRadius: '12px'
          }}
        />
      </div>
    </div>
  )
}
