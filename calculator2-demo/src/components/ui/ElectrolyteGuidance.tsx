import { motion } from 'framer-motion'

export default function ElectrolyteGuidance() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="space-y-6"
    >
      <div>
        <h3 className="text-xl font-display font-bold text-dark mb-2">
          ⚡ Electrolyte Targets (Critical for Success)
        </h3>
        <p className="text-sm text-gray-600">
          Most carnivore beginners underestimate electrolytes. Getting these right prevents headaches, cramps, and fatigue.
        </p>
      </div>

      {/* Electrolyte Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sodium */}
        <div className="bg-white rounded-lg p-8 border-2 border-secondary/20">
          <div className="text-center mb-4">
            <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-3">Sodium</p>
            <p className="text-4xl font-bold text-primary">5000</p>
            <p className="text-sm text-gray-500">mg/day</p>
          </div>
          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">2-3 tsp salt</p>
            <p className="text-xs text-gray-600 leading-relaxed">
              Salt your food generously. Essential for carnivore, not optional.
            </p>
          </div>
        </div>

        {/* Potassium */}
        <div className="bg-white rounded-lg p-8 border-2 border-secondary/20">
          <div className="text-center mb-4">
            <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-3">Potassium</p>
            <p className="text-4xl font-bold text-primary">2,600 / 3,400</p>
            <p className="text-sm text-gray-500">mg/day (women / men)</p>
          </div>
          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">From food</p>
            <p className="text-xs text-gray-600 leading-relaxed">
              The 2019 National Academies adequate intakes, not ceilings. Beef, fish, and eggs provide most of it.
            </p>
          </div>
        </div>

        {/* Magnesium */}
        <div className="bg-white rounded-lg p-8 border-2 border-secondary/20">
          <div className="text-center mb-4">
            <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-3">Magnesium</p>
            <p className="text-4xl font-bold text-primary">400</p>
            <p className="text-sm text-gray-500">mg/day</p>
          </div>
          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">Supplement recommended</p>
            <p className="text-xs text-gray-600 leading-relaxed">
              Magnesium glycinate or citrate. Take at night for better sleep.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Tips */}
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-dark mb-3">🎯 Easy Wins</h4>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold">✓</span>
            <span><strong>Salt your food generously</strong> – at every meal</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold">✓</span>
            <span><strong>Drink bone broth</strong> – natural electrolytes + collagen</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold">✓</span>
            <span><strong>Eat fatty fish</strong> – salmon and sardines are excellent</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold">✓</span>
            <span><strong>Get a magnesium supplement</strong> – magnesium glycinate, 200-400mg at night</span>
          </li>
        </ul>
      </div>

      {/* If You Feel Bad */}
      <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
        <h4 className="font-semibold text-dark mb-3">💡 Feeling Bad? Here's Why</h4>
        <div className="space-y-3 text-sm text-gray-700">
          <div>
            <p className="font-semibold text-dark mb-1">Headaches or fatigue?</p>
            <p>Add more salt first. This fixes 80% of "keto flu" symptoms.</p>
          </div>
          <div>
            <p className="font-semibold text-dark mb-1">Muscle cramps?</p>
            <p>Magnesium deficiency. Take a supplement at night.</p>
          </div>
          <div>
            <p className="font-semibold text-dark mb-1">Feeling weak or dizzy?</p>
            <p>Either not enough salt or not eating enough food overall. Increase both.</p>
          </div>
        </div>
      </div>

      {/* LMNT Recommendation */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-6 rounded-lg border-2 border-primary/30">
        <h4 className="font-display font-semibold text-dark mb-2">⚡ The Easy Button (Optional)</h4>
        <p className="text-sm text-gray-700 mb-3">
          <strong>LMNT</strong> electrolyte packets are specifically formulated for low-carb diets. Zero sugar, optimal ratios, tastes great. Used by athletes and carnivores worldwide.
        </p>
        <a
          href="https://elementallabs.refr.cc/default/u/michelbrew"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-primary text-accent px-4 py-2 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          Try LMNT - Get Free Sample Pack →
        </a>
        <p className="text-xs text-gray-600 mt-2 opacity-75">
          Affiliate link – Supports this free calculator
        </p>
      </div>
    </motion.div>
  )
}
