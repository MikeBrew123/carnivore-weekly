import { motion } from 'framer-motion'

interface ProgressBarProps {
  currentStep: number
  totalSteps: number
  labels: string[]
}

export default function ProgressBar({ currentStep, totalSteps, labels }: ProgressBarProps) {
  const progress = (currentStep / totalSteps) * 100

  return (
    <div className="space-y-3 mb-8">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-dark">
          Step {currentStep} of {totalSteps}
        </h3>
        <p className="text-xs text-gray-500">{labels[currentStep - 1]}</p>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-secondary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="flex justify-between items-center">
        {labels.map((label, i) => (
          <div
            key={i}
            className={`text-xs font-medium ${
              i < currentStep
                ? 'text-primary'
                : i === currentStep - 1
                ? 'text-dark'
                : 'text-gray-400'
            }`}
          >
            {i + 1}
          </div>
        ))}
      </div>
    </div>
  )
}
