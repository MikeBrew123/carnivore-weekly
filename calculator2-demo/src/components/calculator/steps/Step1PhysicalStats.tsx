import { FormData } from '../../../types/form'
import FormField from '../shared/FormField'
import RadioGroup from '../shared/RadioGroup'
import { imperialToCm } from '../../../lib/calculations'

interface Step1PhysicalStatsProps {
  data: FormData
  onDataChange: (data: FormData) => void
  onContinue: () => void
  onFieldChange?: (fieldName: string) => void
  errors: Record<string, string>
}

export default function Step1PhysicalStats({
  data,
  onDataChange,
  onContinue,
  onFieldChange,
  errors,
}: Step1PhysicalStatsProps) {
  const handleInputChange = (field: string, value: any) => {
    const updated = { ...data, [field]: value }
    // Auto-default inches to 0 when feet is set
    if (field === 'heightFeet' && typeof updated.heightInches !== 'number') {
      updated.heightInches = 0
    }
    onDataChange(updated)
    // Clear error for this field if it has a value
    if (value !== '' && value !== undefined && value !== null && onFieldChange) {
      onFieldChange(field)
    }
  }

  // Validate age on blur (range 14-99)
  const validateAge = () => {
    if (data.age !== undefined && data.age !== '') {
      const age = Number(data.age)
      if (age < 14 || age > 99) {
        console.log('[Step1] Age validation failed on blur:', age)
      } else if (errors.age) {
        onFieldChange?.('age')
      }
    }
  }

  // Validate weight on blur (range 80-500)
  const validateWeight = () => {
    if (data.weight !== undefined && data.weight !== '') {
      const weight = Number(data.weight)
      if (weight < 80 || weight > 500) {
        console.log('[Step1] Weight validation failed on blur:', weight)
      } else if (errors.weight) {
        onFieldChange?.('weight')
      }
    }
  }

  // Validate feet on blur
  const validateHeightFeet = () => {
    if (data.heightFeet !== undefined && data.heightFeet !== '') {
      if (errors.heightFeet) {
        onFieldChange?.('heightFeet')
      }
    }
  }

  // Validate inches on blur (range 0-11)
  const validateHeightInches = () => {
    if (typeof data.heightInches === 'number') {
      const inches = data.heightInches
      if (inches < 0 || inches > 11) {
        console.log('[Step1] Inches validation failed on blur:', inches)
      } else if (errors.heightInches) {
        onFieldChange?.('heightInches')
      }
    }
  }

  // Validate cm on blur (range 90-250)
  const validateHeightCm = () => {
    if (data.heightCm !== undefined && data.heightCm !== '') {
      const cm = Number(data.heightCm)
      if (cm < 90 || cm > 250) {
        console.log('[Step1] CM validation failed on blur:', cm)
      } else if (errors.heightCm) {
        onFieldChange?.('heightCm')
      }
    }
  }

  const handleContinue = () => {
    console.log('[Step1] Continue clicked. Current data:', data)

    // Validate required fields
    const newErrors: Record<string, string> = {}

    if (!data.sex) newErrors.sex = 'Please select your sex'
    if (!data.age || data.age < 14 || data.age > 99) newErrors.age = 'Age must be between 14 and 99'
    if (!data.heightFeet && !data.heightCm) newErrors.height = 'Please enter your height'
    if (data.heightFeet && typeof data.heightInches === 'number' && (data.heightInches < 0 || data.heightInches > 11)) {
      newErrors.heightInches = 'Inches must be between 0 and 11'
    }
    if (data.heightCm && (data.heightCm < 90 || data.heightCm > 250)) {
      newErrors.heightCm = 'Height must be between 90 and 250 cm'
    }
    if (!data.weight || data.weight < 80 || data.weight > 500) newErrors.weight = 'Weight must be between 80 and 500 lbs'

    console.log('[Step1] Validation errors:', newErrors)

    if (Object.keys(newErrors).length > 0) {
      // Validation failed - errors will be displayed
      console.log('[Step1] Validation failed, showing errors')
      Object.entries(newErrors).forEach(([key, msg]) => {
        errors[key] = msg
      })
      return
    }

    console.log('[Step1] Validation passed, calling onContinue()')
    onContinue()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '28px', color: '#ffd700', fontWeight: '600', marginBottom: '8px' }}>Let's Start with Your Basics</h2>
        <p style={{ fontFamily: "'Merriweather', Georgia, serif", fontSize: '18px', color: '#f5f5f5' }}>These measurements help us calculate your personalized macros.</p>
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
        onBlur={validateAge}
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
            onClick={() => {
              console.log('[Step1] Feet & Inches clicked, current data:', data)
              onDataChange({ ...data, heightCm: undefined, heightFeet: data.heightFeet || 6, heightInches: data.heightInches ?? 0 })
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              fontFamily: "'Merriweather', Georgia, serif",
              transition: 'all 0.2s',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: !data.heightCm ? '#ffd700' : '#333',
              color: !data.heightCm ? '#1a1a1a' : '#a0a0a0'
            }}
          >
            Feet & Inches
          </button>
          <button
            type="button"
            onClick={() => {
              console.log('[Step1] Centimeters clicked, current data:', data)
              onDataChange({ ...data, heightFeet: undefined, heightInches: undefined, heightCm: data.heightCm || 180 })
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              fontFamily: "'Merriweather', Georgia, serif",
              transition: 'all 0.2s',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: data.heightCm ? '#ffd700' : '#333',
              color: data.heightCm ? '#1a1a1a' : '#a0a0a0'
            }}
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
              onBlur={validateHeightFeet}
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
              onBlur={validateHeightInches}
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
            onBlur={validateHeightCm}
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
        onBlur={validateWeight}
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
          style={{
            flex: 1,
            backgroundColor: '#ffd700',
            color: '#1a120b',
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '18px',
            fontWeight: '600',
            padding: '16px 24px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: 'none'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#e6c200';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ffd700';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          Continue to Next Step
        </button>
      </div>
    </div>
  )
}
