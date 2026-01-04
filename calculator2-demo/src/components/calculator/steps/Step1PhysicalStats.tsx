import { FormData } from '../../../types/form'
import FormField from '../shared/FormField'
import RadioGroup from '../shared/RadioGroup'
import { imperialToCm } from '../../../lib/calculations'

interface Step1PhysicalStatsProps {
  data: FormData
  onDataChange: (data: FormData) => void
  onContinue: () => void
  errors: Record<string, string>
}

export default function Step1PhysicalStats({
  data,
  onDataChange,
  onContinue,
  errors,
}: Step1PhysicalStatsProps) {
  const handleInputChange = (field: string, value: any) => {
    onDataChange({ ...data, [field]: value })
  }

  const handleContinue = () => {
    // Validate required fields
    const newErrors: Record<string, string> = {}

    if (!data.sex) newErrors.sex = 'Please select your sex'
    if (!data.age || data.age < 14 || data.age > 99) newErrors.age = 'Age must be between 14 and 99'
    if (!data.heightFeet && !data.heightCm) newErrors.height = 'Please enter your height'
    if (data.heightFeet && (!data.heightInches || data.heightInches < 0 || data.heightInches > 11)) {
      newErrors.heightInches = 'Inches must be between 0 and 11'
    }
    if (data.heightCm && (data.heightCm < 90 || data.heightCm > 250)) {
      newErrors.heightCm = 'Height must be between 90 and 250 cm'
    }
    if (!data.weight || data.weight < 80 || data.weight > 500) newErrors.weight = 'Weight must be between 80 and 500 lbs'

    if (Object.keys(newErrors).length > 0) {
      // Validation failed - errors will be displayed
      Object.entries(newErrors).forEach(([key, msg]) => {
        errors[key] = msg
      })
      return
    }

    onContinue()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Let's Start with Your Basics</h2>
        <p className="text-gray-600">These measurements help us calculate your personalized macros.</p>
      </div>

      {/* Sex */}
      <RadioGroup
        name="sex"
        label="Biological Sex"
        options={[
          { value: 'male', label: 'Male', description: 'Uses male metabolic equations' },
          { value: 'female', label: 'Female', description: 'Uses female metabolic equations' },
        ]}
        value={data.sex || ''}
        onChange={(value) => handleInputChange('sex', value)}
        error={errors.sex}
        required
      />

      {/* Age */}
      <FormField
        id="age"
        name="age"
        type="number"
        label="Age"
        value={data.age || ''}
        onChange={(e) => handleInputChange('age', parseInt(e.target.value) || '')}
        error={errors.age}
        placeholder="e.g., 35"
        min={14}
        max={99}
        required
      />

      {/* Height */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleInputChange('heightCm', undefined)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              data.heightFeet ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Feet & Inches
          </button>
          <button
            type="button"
            onClick={() => handleInputChange('heightFeet', undefined)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              data.heightCm ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Centimeters
          </button>
        </div>

        {!data.heightCm ? (
          // Imperial (Feet & Inches)
          <div className="grid grid-cols-2 gap-4">
            <FormField
              id="heightFeet"
              name="heightFeet"
              type="number"
              label="Height (Feet)"
              value={data.heightFeet || ''}
              onChange={(e) => handleInputChange('heightFeet', parseInt(e.target.value) || '')}
              error={errors.heightFeet}
              placeholder="5"
              min={3}
              max={8}
              required
            />
            <FormField
              id="heightInches"
              name="heightInches"
              type="number"
              label="Inches"
              value={data.heightInches || ''}
              onChange={(e) => handleInputChange('heightInches', parseInt(e.target.value) || 0)}
              error={errors.heightInches}
              placeholder="10"
              min={0}
              max={11}
              required
            />
          </div>
        ) : (
          // Metric (Centimeters)
          <FormField
            id="heightCm"
            name="heightCm"
            type="number"
            label="Height (Centimeters)"
            value={data.heightCm || ''}
            onChange={(e) => {
              const cm = parseInt(e.target.value)
              handleInputChange('heightCm', cm || '')
              // Auto-convert to imperial for internal use if needed
              if (cm) {
                const { feet, inches } = (() => {
                  const totalInches = cm / 2.54
                  return {
                    feet: Math.floor(totalInches / 12),
                    inches: Math.round(totalInches % 12)
                  }
                })()
                handleInputChange('heightFeet', feet)
                handleInputChange('heightInches', inches)
              }
            }}
            error={errors.heightCm}
            placeholder="178"
            min={90}
            max={250}
            required
          />
        )}
      </div>

      {/* Weight */}
      <FormField
        id="weight"
        name="weight"
        type="number"
        label="Weight (lbs)"
        value={data.weight || ''}
        onChange={(e) => handleInputChange('weight', parseInt(e.target.value) || '')}
        error={errors.weight}
        placeholder="e.g., 200"
        min={80}
        max={500}
        required
      />

      {/* Continue Button */}
      <div className="pt-6 flex gap-3">
        <button
          onClick={handleContinue}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors"
        >
          Continue to Next Step
        </button>
      </div>
    </div>
  )
}
