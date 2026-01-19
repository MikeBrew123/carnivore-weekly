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
      style={{
        backgroundColor: '#1a1a1a',
        borderRadius: '12px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        border: '1px solid #333',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
      }}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", color: '#ffd700', textAlign: 'center', marginBottom: '16px', fontSize: '20px', fontWeight: '600' }}>Your Macros Preview</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <motion.div style={{ backgroundColor: '#0f0f0f', borderRadius: '8px', padding: '16px', textAlign: 'center', border: '1px solid #333' }} variants={itemVariants}>
          <p style={{ fontSize: '12px', color: '#a0a0a0', marginBottom: '8px', fontFamily: "'Merriweather', Georgia, serif" }}>Daily Calories</p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffd700', fontFamily: "'Playfair Display', Georgia, serif" }}>{macros.calories}</p>
          <p style={{ fontSize: '12px', color: '#666', marginTop: '4px', fontFamily: "'Merriweather', Georgia, serif" }}>kcal</p>
        </motion.div>

        <motion.div style={{ backgroundColor: '#0f0f0f', borderRadius: '8px', padding: '16px', textAlign: 'center', border: '1px solid #333' }} variants={itemVariants}>
          <p style={{ fontSize: '12px', color: '#a0a0a0', marginBottom: '8px', fontFamily: "'Merriweather', Georgia, serif" }}>Maintenance</p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffd700', fontFamily: "'Playfair Display', Georgia, serif" }}>{macros.tdee}</p>
          <p style={{ fontSize: '12px', color: '#666', marginTop: '4px', fontFamily: "'Merriweather', Georgia, serif" }}>TDEE</p>
        </motion.div>

        <motion.div style={{ backgroundColor: '#0f0f0f', borderRadius: '8px', padding: '16px', textAlign: 'center', border: '1px solid #333', borderLeft: '4px solid #22c55e' }} variants={itemVariants}>
          <p style={{ fontSize: '12px', color: '#a0a0a0', marginBottom: '8px', fontFamily: "'Merriweather', Georgia, serif" }}>🥩 Protein</p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#22c55e', fontFamily: "'Playfair Display', Georgia, serif" }}>{macros.protein}g</p>
        </motion.div>

        <motion.div style={{ backgroundColor: '#0f0f0f', borderRadius: '8px', padding: '16px', textAlign: 'center', border: '1px solid #333', borderLeft: '4px solid #f59e0b' }} variants={itemVariants}>
          <p style={{ fontSize: '12px', color: '#a0a0a0', marginBottom: '8px', fontFamily: "'Merriweather', Georgia, serif" }}>🧈 Fat</p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b', fontFamily: "'Playfair Display', Georgia, serif" }}>{macros.fat}g</p>
        </motion.div>

        <motion.div style={{ backgroundColor: '#0f0f0f', borderRadius: '8px', padding: '16px', textAlign: 'center', border: '1px solid #333' }} variants={itemVariants}>
          <p style={{ fontSize: '12px', color: '#a0a0a0', marginBottom: '8px', fontFamily: "'Merriweather', Georgia, serif" }}>Carbs</p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffd700', fontFamily: "'Playfair Display', Georgia, serif" }}>{macros.carbs}g</p>
        </motion.div>

        <motion.div style={{ backgroundColor: '#0f0f0f', borderRadius: '8px', padding: '16px', textAlign: 'center', border: '1px solid #333' }} variants={itemVariants}>
          <p style={{ fontSize: '12px', color: '#a0a0a0', marginBottom: '8px', fontFamily: "'Merriweather', Georgia, serif" }}>Macro Split</p>
          <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffd700', fontFamily: "'Playfair Display', Georgia, serif" }}>
            {macros.calories > 0 ? Math.round((macros.fat * 9 / macros.calories) * 100) : 0}%
          </p>
          <p style={{ fontSize: '12px', color: '#666', fontFamily: "'Merriweather', Georgia, serif" }}>fat</p>
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
