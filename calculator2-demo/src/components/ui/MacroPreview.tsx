import { MacroResults } from '../../types/form'
import { motion } from 'framer-motion'

interface MacroPreviewProps {
  macros: MacroResults | null
  loading?: boolean
}

export default function MacroPreview({ macros, loading }: MacroPreviewProps) {
  if (!macros) return null

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  }

  return (
    <motion.div
      className="bg-white rounded-lg shadow-lg p-6 space-y-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <h3 className="font-semibold text-dark text-center mb-4">Your Macros Preview</h3>

      <div className="grid grid-cols-2 gap-3">
        <motion.div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 text-center" variants={itemVariants}>
          <p className="text-xs text-gray-600 mb-1">Daily Calories</p>
          <p className="text-2xl font-bold text-primary">{macros.calories}</p>
          <p className="text-xs text-gray-500 mt-1">kcal</p>
        </motion.div>

        <motion.div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 text-center" variants={itemVariants}>
          <p className="text-xs text-gray-600 mb-1">Maintenance</p>
          <p className="text-2xl font-bold text-primary">{macros.tdee}</p>
          <p className="text-xs text-gray-500 mt-1">TDEE</p>
        </motion.div>

        <motion.div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 text-center" variants={itemVariants}>
          <p className="text-xs text-gray-600 mb-1">Protein</p>
          <p className="text-2xl font-bold text-primary">{macros.protein}g</p>
        </motion.div>

        <motion.div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 text-center" variants={itemVariants}>
          <p className="text-xs text-gray-600 mb-1">Fat</p>
          <p className="text-2xl font-bold text-primary">{macros.fat}g</p>
        </motion.div>

        <motion.div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 text-center" variants={itemVariants}>
          <p className="text-xs text-gray-600 mb-1">Carbs</p>
          <p className="text-2xl font-bold text-primary">{macros.carbs}g</p>
        </motion.div>

        <motion.div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 text-center" variants={itemVariants}>
          <p className="text-xs text-gray-600 mb-1">Macro Split</p>
          <p className="text-sm font-bold text-primary">
            {Math.round((macros.fat * 9 / macros.calories) * 100)}%
          </p>
          <p className="text-xs text-gray-500">fat</p>
        </motion.div>
      </div>

      {loading && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      )}
    </motion.div>
  )
}
