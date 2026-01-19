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

  // Validation helpers for green glow state
  const isAgeValid = () => {
    const age = Number(data.age)
    return data.age !== undefined && data.age !== '' && age >= 14 && age <= 99 && !errors.age
  }

  const isWeightValid = () => {
    const weight = Number(data.weight)
    return data.weight !== undefined && data.weight !== '' && weight >= 80 && weight <= 500 && !errors.weight
  }

  const isWeightKgValid = () => {
    const kg = Number(data.weightKg)
    return data.weightKg !== undefined && data.weightKg !== '' && kg >= 36 && kg <= 227 && !errors.weightKg
  }

  const isHeightFeetValid = () => {
    return data.heightFeet !== undefined && data.heightFeet !== '' && !errors.heightFeet
  }

  const isHeightInchesValid = () => {
    const inches = Number(data.heightInches)
    return typeof data.heightInches === 'number' && inches >= 0 && inches <= 11 && !errors.heightInches
  }

  const isHeightCmValid = () => {
    const cm = Number(data.heightCm)
    return data.heightCm !== undefined && data.heightCm !== '' && cm >= 90 && cm <= 250 && !errors.heightCm
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
    // Weight validation - depends on unit system
    if (data.heightCm) {
      // Metric mode - validate kg
      if (!data.weightKg || data.weightKg < 36 || data.weightKg > 227) newErrors.weightKg = 'Weight must be between 36 and 227 kg'
    } else {
      // Imperial mode - validate lbs
      if (!data.weight || data.weight < 80 || data.weight > 500) newErrors.weight = 'Weight must be between 80 and 500 lbs'
    }

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
    <div className="space-y-10">
      <div className="mb-10">
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

      {/* Age - Wider input */}
      <div style={{ maxWidth: '280px', marginTop: '8px' }}>
        <FormField
          id="age"
          name="age"
          type="number"
          label="Age"
          value={data.age || ''}
          onChange={(e) => handleInputChange('age', parseInt(e.target.value) || '')}
          onBlur={validateAge}
          error={errors.age}
          isValid={isAgeValid()}
          placeholder="e.g., 35"
          min={14}
          max={99}
          required
        />
      </div>

      {/* Height - Label and Unit Toggle inline */}
      <div style={{ marginTop: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <label style={{
            fontFamily: "'Merriweather', Georgia, serif",
            fontSize: '16px',
            color: '#FFFFFF',
            fontWeight: '500',
          }}>
            Height<span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
          </label>

          {/* Unit Toggle - inline with label */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              type="button"
              onClick={() => {
                // ATOMIC RESET: Clear metric fields when switching to imperial
                onDataChange({ ...data, heightCm: undefined, weightKg: undefined, heightFeet: undefined, heightInches: undefined })
              }}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '500',
                fontFamily: "'Merriweather', Georgia, serif",
                transition: 'all 0.2s',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: data.heightCm === undefined ? '#ffd700' : '#333',
                color: data.heightCm === undefined ? '#1a1a1a' : '#888'
              }}
            >
              ft / in
            </button>
            <button
              type="button"
              onClick={() => {
                // ATOMIC RESET: Clear imperial fields when switching to metric
                // Set heightCm to 0 (sentinel) to trigger metric mode, user must enter actual value
                onDataChange({ ...data, heightFeet: undefined, heightInches: undefined, weight: undefined, heightCm: 0, weightKg: undefined })
              }}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '500',
                fontFamily: "'Merriweather', Georgia, serif",
                transition: 'all 0.2s',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: data.heightCm !== undefined ? '#ffd700' : '#333',
                color: data.heightCm !== undefined ? '#1a1a1a' : '#888'
              }}
            >
              cm
            </button>
          </div>
        </div>

        {data.heightCm === undefined ? (
          // Imperial (Feet & Inches) - Side by side with inline styles
          <div style={{ display: 'flex', gap: '24px' }}>
            <div style={{ flex: 1 }}>
              <FormField
                id="heightFeet"
                name="heightFeet"
                type="number"
                label="Feet"
                value={data.heightFeet || ''}
                onChange={(e) => handleInputChange('heightFeet', parseInt(e.target.value) || '')}
                onBlur={validateHeightFeet}
                error={errors.heightFeet}
                isValid={isHeightFeetValid()}
                placeholder="5"
                min={3}
                max={8}
                required
              />
            </div>
            <div style={{ flex: 1 }}>
              <FormField
                id="heightInches"
                name="heightInches"
                type="number"
                label="Inches"
                value={data.heightInches ?? ''}
                onChange={(e) => handleInputChange('heightInches', parseInt(e.target.value) || 0)}
                onBlur={validateHeightInches}
                error={errors.heightInches}
                isValid={isHeightInchesValid()}
                placeholder="10"
                min={0}
                max={11}
                required
              />
            </div>
          </div>
        ) : (
          // Metric (Centimeters) - Full width
          <div style={{ maxWidth: '280px' }}>
            <FormField
              id="heightCm"
              name="heightCm"
              type="number"
              label="Centimeters"
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
              isValid={isHeightCmValid()}
              placeholder="178"
              min={90}
              max={250}
              required
            />
          </div>
        )}
      </div>

      {/* Weight - switches between lbs/kg based on height unit */}
      <div style={{ maxWidth: '280px', marginTop: '8px' }}>
        {data.heightCm === undefined ? (
          // Imperial - pounds
          <FormField
            id="weight"
            name="weight"
            type="number"
            label="Weight (lbs)"
            value={data.weight || ''}
            onChange={(e) => handleInputChange('weight', parseInt(e.target.value) || '')}
            onBlur={validateWeight}
            error={errors.weight}
            isValid={isWeightValid()}
            placeholder="e.g., 200"
            min={80}
            max={500}
            required
          />
        ) : (
          // Metric - kilograms
          <FormField
            id="weightKg"
            name="weightKg"
            type="number"
            label="Weight (kg)"
            value={data.weightKg || ''}
            onChange={(e) => {
              const kg = parseInt(e.target.value) || ''
              handleInputChange('weightKg', kg)
              // Auto-convert to lbs for internal calculations
              if (kg) {
                handleInputChange('weight', Math.round(Number(kg) * 2.205))
              }
            }}
            error={errors.weightKg}
            isValid={isWeightKgValid()}
            placeholder="e.g., 90"
            min={36}
            max={227}
            required
          />
        )}
      </div>

      {/* Continue Button */}
      <div style={{ paddingTop: '32px', marginTop: '16px' }}>
        <button
          onClick={handleContinue}
          style={{
            width: '100%',
            backgroundColor: '#ffd700',
            color: '#1a120b',
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '18px',
            fontWeight: '600',
            padding: '16px 24px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.15s ease-out',
            boxShadow: '0 4px 14px rgba(255, 215, 0, 0.25)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#e6c200';
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.01)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 215, 0, 0.35)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ffd700';
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(255, 215, 0, 0.25)';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(0.98)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.01)';
          }}
        >
          Continue to Next Step
        </button>
      </div>
    </div>
  )
}
