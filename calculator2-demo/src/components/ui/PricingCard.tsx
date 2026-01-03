import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

interface PricingCardProps {
  title: string
  price: string
  description?: string
  features: string[]
  popular?: boolean
  onClick: () => void
}

export default function PricingCard({
  title,
  price,
  description,
  features,
  popular = false,
  onClick,
}: PricingCardProps) {
  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClick()
  }

  return (
    <div
      onClick={handleCardClick}
      onPointerUp={handleCardClick}
      style={{ pointerEvents: 'auto', cursor: 'pointer' }}
      className={`rounded-xl p-6 transition-all relative z-30 ${
        popular
          ? 'bg-gradient-to-br from-primary to-primary/90 text-white border-2 border-secondary shadow-2xl'
          : 'bg-white border-2 border-gray-200 hover:border-secondary text-dark'
      }`}
    >
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        style={{ pointerEvents: 'none' }}
      >
        {popular && (
          <div className="bg-secondary text-primary text-xs font-bold px-3 py-1 rounded-full w-fit mb-4">
            Most Popular
          </div>
        )}

        <h3 className="text-xl font-bold mb-2">{title}</h3>

        {description && (
          <p className={`text-sm mb-4 ${popular ? 'text-white/80' : 'text-gray-600'}`}>
            {description}
          </p>
        )}

        <div className="mb-6">
          <span className="text-4xl font-bold">{price}</span>
          {price !== 'Free' && <span className={`text-sm ml-2 ${popular ? 'text-white/80' : 'text-gray-600'}`}>one-time</span>}
        </div>

        <ul className="space-y-3 mb-6">
          {features.map((feature, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <Check className="w-5 h-5 flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={handleCardClick}
          style={{ pointerEvents: 'auto' }}
          className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
            popular
              ? 'bg-secondary text-primary hover:bg-secondary/90'
              : 'bg-primary text-accent hover:bg-primary/90'
          }`}
        >
          Choose Plan
        </button>
      </motion.div>
    </div>
  )
}
