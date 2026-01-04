import { FormData, MacroResults } from '../../../types/form'
import { calculateBMR, calculateMacros } from '../../../lib/calculations'

interface Step3FreeResultsProps {
  data: FormData
  macros: MacroResults | null
  onUpgrade: () => void
  onBack: () => void
}

export default function Step3FreeResults({
  data,
  macros,
  onUpgrade,
  onBack,
}: Step3FreeResultsProps) {
  if (!macros) {
    return (
      <div className="space-y-6">
        <p className="text-gray-600">Loading your results...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Results Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Personalized Carnivore Macros</h2>
        <p className="text-gray-600">Based on your profile and goals</p>
      </div>

      {/* Profile Summary */}
      <div className="bg-gray-50 rounded-lg p-6 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-700">Sex:</span>
          <span className="font-medium text-gray-900 capitalize">{data.sex}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-700">Age:</span>
          <span className="font-medium text-gray-900">{data.age} years</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-700">Height:</span>
          <span className="font-medium text-gray-900">
            {data.heightFeet ? `${data.heightFeet}'${data.heightInches}"` : `${data.heightCm}cm`}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-700">Weight:</span>
          <span className="font-medium text-gray-900">{data.weight} lbs</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-700">Activity Level:</span>
          <span className="font-medium text-gray-900 capitalize">{data.lifestyle}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-700">Goal:</span>
          <span className="font-medium text-gray-900 capitalize">{data.goal}</span>
        </div>
      </div>

      {/* Macro Results */}
      <div className="grid grid-cols-2 gap-4">
        {/* Calories */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 text-center">
          <p className="text-sm text-gray-600 mb-1">Daily Calories</p>
          <p className="text-4xl font-bold text-blue-600 mb-1">{macros.calories}</p>
          <p className="text-xs text-gray-500">kcal</p>
        </div>

        {/* TDEE */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 text-center">
          <p className="text-sm text-gray-600 mb-1">Maintenance Calories</p>
          <p className="text-4xl font-bold text-purple-600 mb-1">{macros.tdee}</p>
          <p className="text-xs text-gray-500">TDEE</p>
        </div>

        {/* Protein */}
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-6 text-center">
          <p className="text-sm text-gray-600 mb-1">Protein</p>
          <p className="text-4xl font-bold text-red-600 mb-1">{macros.protein}</p>
          <p className="text-xs text-gray-500">g per day</p>
        </div>

        {/* Fat */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 text-center">
          <p className="text-sm text-gray-600 mb-1">Fat</p>
          <p className="text-4xl font-bold text-orange-600 mb-1">{macros.fat}</p>
          <p className="text-xs text-gray-500">g per day</p>
        </div>
      </div>

      {/* What This Looks Like */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-3">What This Looks Like in Food</h3>
        <p className="text-sm text-gray-700 mb-3">
          To hit your macro targets, aim for approximately:
        </p>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>• <strong>{(macros.protein / 25).toFixed(1)} lbs of ground beef</strong> (80/20 blend)</li>
          <li>• <strong>OR {(macros.protein / 30).toFixed(1)} lbs of ribeye steak</strong></li>
          <li>• <strong>OR {(macros.protein / 20).toFixed(1)} lbs of organs</strong> (liver, kidney) + fatty cuts</li>
        </ul>
      </div>

      {/* Free Results Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">📊 These Are Your Free Results</h3>
        <p className="text-sm text-blue-800 mb-4">
          Your macros are calculated using industry-standard formulas (Mifflin-St Jeor equation).
          This gives you a solid starting point!
        </p>
        <p className="text-sm text-blue-800">
          💎 <strong>Upgrade for personalized guidance:</strong> Get meal plans, electrolyte recommendations,
          supplements specific to your health conditions, and more.
        </p>
      </div>

      {/* Upgrade CTA */}
      <div className="pt-6 flex flex-col gap-3">
        <button
          onClick={onUpgrade}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold py-4 rounded-lg transition-all"
        >
          ⭐ Upgrade for Full Personalized Protocol
        </button>
        <p className="text-xs text-gray-500 text-center">
          Unlock AI-powered personalization, meal plans, and detailed guidance
        </p>
      </div>

      {/* Back Button */}
      <button
        onClick={onBack}
        className="w-full bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium py-3 rounded-lg transition-colors"
      >
        Back
      </button>
    </div>
  )
}
