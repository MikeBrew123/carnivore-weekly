import { motion } from 'framer-motion'
import { MacroResults } from '../../types/form'

interface MealExamplesProps {
  macros: MacroResults
  diet: string
}

export default function MealExamples({ macros, diet }: MealExamplesProps) {
  const calculatePortions = () => {
    const { calories, protein } = macros

    // For 3-meal structure (more practical for beginners)
    const caloriesPer3Meal = Math.round(calories / 3)

    // Calorie approximations:
    // - 1 large egg: ~70 calories, ~6g protein
    // - 1 strip bacon: ~40-45 calories, ~3g protein
    // - 1 burger patty (2-3oz, 80/20 beef): ~200-250 calories, ~15-18g protein
    // - 1oz steak (ribeye, with fat): ~90-100 calories, ~6g protein

    // BREAKFAST: Eggs + Bacon (aim for variety, not oversized)
    // Start with reasonable eggs (4-8), fill rest with bacon
    let breakfastEggs: number
    let breakfastBaconStrips: number

    if (caloriesPer3Meal < 800) {
      breakfastEggs = 4
      breakfastBaconStrips = 4
    } else if (caloriesPer3Meal < 1200) {
      breakfastEggs = 5
      breakfastBaconStrips = 6
    } else if (caloriesPer3Meal < 1600) {
      breakfastEggs = 6
      breakfastBaconStrips = 8
    } else {
      breakfastEggs = Math.min(8, 4 + Math.round(caloriesPer3Meal / 250)) // Cap at 8 eggs
      breakfastBaconStrips = Math.round((caloriesPer3Meal - breakfastEggs * 70) / 42)
    }

    // LUNCH: Burger patties
    // Each patty is ~2-3oz and ~220 calories, ~17g protein
    let lunchPatties: number
    if (caloriesPer3Meal < 800) {
      lunchPatties = 2
    } else if (caloriesPer3Meal < 1200) {
      lunchPatties = 3
    } else if (caloriesPer3Meal < 1600) {
      lunchPatties = 4
    } else {
      lunchPatties = Math.round(caloriesPer3Meal / 220)
    }

    // DINNER: Steak/Salmon
    // ~95 calories per oz (fatty cuts with butter)
    let dinnerOz: number
    if (caloriesPer3Meal < 800) {
      dinnerOz = 8
    } else if (caloriesPer3Meal < 1200) {
      dinnerOz = 12
    } else if (caloriesPer3Meal < 1600) {
      dinnerOz = 15
    } else {
      dinnerOz = Math.round(caloriesPer3Meal / 95)
    }

    return {
      calories3Meal: caloriesPer3Meal,
      breakfastEggs: Math.min(8, Math.max(4, breakfastEggs)),
      breakfastBaconStrips: Math.max(4, breakfastBaconStrips),
      lunchPatties: Math.max(2, lunchPatties),
      dinnerOz: Math.max(6, Math.min(32, dinnerOz)), // Cap at reasonable amounts
    }
  }

  const portions = calculatePortions()

  if (diet === 'carnivore') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-6"
      >
        <div>
          <h3 className="text-xl font-display font-bold text-dark mb-2">
            🥩 What This Looks Like on Your Plate
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Three simple meals that are easy to cook and actually delicious
          </p>
        </div>

        {/* Three Meal Example */}
        <div className="space-y-4">
          <div className="bg-secondary/5 border-l-4 border-primary p-4 rounded-lg">
            <p className="font-semibold text-dark mb-3">
              ☀️ Breakfast ({portions.calories3Meal} calories)
            </p>
            <ul className="space-y-2 text-sm text-gray-700 ml-4">
              <li>
                <strong>{portions.breakfastEggs} Large Eggs</strong> – scrambled or fried in butter
              </li>
              <li>
                <strong>{portions.breakfastBaconStrips} Strips of Bacon</strong> – crispy on the side
              </li>
              <li>
                <strong>1-2 tbsp Butter</strong> – to cook and add calories
              </li>
            </ul>
            <p className="text-xs text-gray-500 italic mt-3">
              Quick, filling, and gets you full for the entire morning. Salt to taste.
            </p>
          </div>

          <div className="bg-secondary/5 border-l-4 border-primary p-4 rounded-lg">
            <p className="font-semibold text-dark mb-3">
              🍔 Lunch ({portions.calories3Meal} calories)
            </p>
            <ul className="space-y-2 text-sm text-gray-700 ml-4">
              <li>
                <strong>{portions.lunchPatties} Beef Burger Patties</strong> – each 2-3oz (80/20 ground beef), cooked in butter
              </li>
              <li>
                <strong>Melted Cheese</strong> – cheddar, american, or brie (1-2 slices per patty)
              </li>
              <li>
                <strong>Optional: Mayo or Fatty Sauce</strong> – to add flavor and calories
              </li>
            </ul>
            <p className="text-xs text-gray-500 italic mt-3">
              Cook 10-12 patties on Sunday for easy weekday lunches. No bun needed.
            </p>
          </div>

          <div className="bg-secondary/5 border-l-4 border-primary p-4 rounded-lg">
            <p className="font-semibold text-dark mb-3">
              🥩 Dinner ({portions.calories3Meal} calories)
            </p>
            <ul className="space-y-2 text-sm text-gray-700 ml-4">
              <li>
                <strong>{portions.dinnerOz}oz Steak or Salmon</strong> – ribeye, ny strip, or salmon fillet cooked in butter
              </li>
              <li>
                <strong>2-3 tbsp Butter or Fatty Sauce</strong> – garlic butter or compound butter
              </li>
              <li>
                <strong>Sea Salt & Pepper</strong> – to taste
              </li>
            </ul>
            <p className="text-xs text-gray-500 italic mt-3">
              Your chance to enjoy something nice. Pick a cut you love, cook it perfectly.
            </p>
          </div>

          <div className="bg-primary/10 p-4 rounded-lg border border-primary/30">
            <p className="text-sm text-dark">
              <strong>💡 The Beauty:</strong> These aren't complicated. You're cooking one thing per meal, nothing fancy. Breakfast takes 5 minutes. Lunch reheats from Sunday prep. Dinner is just a steak you'd normally make anyway – just without the sides.
            </p>
          </div>
        </div>

        {/* Common Mistakes */}
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <h4 className="font-semibold text-dark mb-3">⚠️ Keys to Success</h4>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>
              <strong>Use fatty cuts:</strong> 80/20 ground beef, ribeye, salmon. Lean meat isn't satiating.
            </li>
            <li>
              <strong>Add butter:</strong> Cook IN butter, add extra butter to meals. Don't skip the fat.
            </li>
            <li>
              <strong>Salt generously:</strong> More than you think. Your body needs it on this diet.
            </li>
            <li>
              <strong>Drink water:</strong> Carnivore can be dehydrating. Keep water nearby, especially at first.
            </li>
          </ul>
        </div>
      </motion.div>
    )
  }

  // Keto/Low-carb example
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="space-y-4"
    >
      <h3 className="text-xl font-display font-bold text-dark mb-4">
        🥗 What This Looks Like on Your Plate
      </h3>

      <div className="bg-secondary/5 border-l-4 border-primary p-4 rounded-lg space-y-3">
        <p className="text-sm">
          <strong>Breakfast:</strong> 3-4 eggs (any style) + 1/2 avocado + butter
        </p>
        <p className="text-sm">
          <strong>Lunch:</strong> Chicken thighs or fatty fish + mixed greens + olive oil dressing
        </p>
        <p className="text-sm">
          <strong>Dinner:</strong> Salmon or beef steak + roasted broccoli cooked in butter
        </p>
        <p className="text-sm">
          <strong>Snack (optional):</strong> Cheese, macadamia nuts, or pork rinds
        </p>
      </div>

      <div className="bg-primary/10 p-4 rounded-lg border border-primary/30">
        <p className="text-sm text-dark">
          <strong>Key difference:</strong> Keto includes low-carb vegetables. Use your carbs on veggies (fiber doesn't count), not grains or sugar.
        </p>
      </div>
    </motion.div>
  )
}
