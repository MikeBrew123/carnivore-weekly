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

          return (
            <div key={index} className="flex-1">
              {/* Step circle */}
              <div className="flex items-center">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                    transition-colors
                    ${isActive ? 'bg-blue-600 text-white' : ''}
                    ${isComplete ? 'bg-green-500 text-white' : ''}
                    ${!isActive && !isComplete ? 'bg-gray-200 text-gray-600' : ''}
                  `}
                >
                  {isComplete ? '✓' : stepNumber}
                </div>

                {/* Line connector */}
                {index < stepLabels.length - 1 && (
                  <div
                    className={`
                      flex-1 h-1 mx-2 rounded
                      ${stepNumber < currentStep ? 'bg-green-500' : 'bg-gray-200'}
                    `}
                  />
                )}
              </div>

              {/* Label */}
              <p className={`
                mt-2 text-xs font-medium text-center
                ${isActive ? 'text-blue-600' : ''}
                ${isComplete ? 'text-green-600' : ''}
                ${!isActive && !isComplete ? 'text-gray-500' : ''}
              `}>
                {label}
              </p>
            </div>
          )
        })}
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 transition-all duration-300"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>
    </div>
  )
}
