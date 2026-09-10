import { useRef, useState } from 'react'
import { FormData } from '../../../types/form'
import FormField from '../shared/FormField'
import RadioGroup from '../shared/RadioGroup'
import { imperialToCm } from '../../../lib/calculations'
import { suggestEmailFix } from '../../../lib/emailSuggest'
import { ADULT_MIN_AGE, ADULT_ONLY_MESSAGE } from '../../../lib/calculations'
import { unitSystemOf, switchUnitSystem, cmToFeetInches, kgToLb } from '../../../lib/unitSystem'
import type { UnitSystem } from '../../../lib/unitSystem'

interface Step1PhysicalStatsProps {
  data: FormData
  onDataChange: (data: FormData) => void
  onContinue: () => void
  onFieldChange?: (fieldName: string) => void
  onSetErrors?: (errors: Record<string, string>) => void
  errors: Record<string, string>
}

// Every error key that belongs to the height group. "height" (nothing entered)
// is not the name of any input, which is why it used to render nowhere and a
// failed Continue looked like a dead button (mobile audit 2026-09-10).
const HEIGHT_ERROR_KEYS = ['height', 'heightFeet', 'heightInches', 'heightCm']

const UNIT_OPTIONS: { system: UnitSystem; label: string }[] = [
  { system: 'imperial', label: 'ft / in' },
  { system: 'metric', label: 'cm' },
]

export default function Step1PhysicalStats({
  data,
  onDataChange,
  onContinue,
  onFieldChange,
  onSetErrors,
  errors,
}: Step1PhysicalStatsProps) {
  // Offered when the typed domain is one character off a common provider.
  // Advisory only: the user can ignore it and continue.
  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null)
  const formRef = useRef<HTMLDivElement>(null)

  const unitSystem = unitSystemOf(data)
  const isMetric = unitSystem === 'metric'
  const heightError = HEIGHT_ERROR_KEYS.map((key) => errors[key]).find(Boolean)

  const handleInputChange = (field: string, value: any) => {
    // Any edit invalidates a standing suggestion, otherwise a stale
    // "did you mean" hangs around after the address is already fixed.
    if (field === 'email') setEmailSuggestion(null)
    const updated = { ...data, [field]: value }
    onDataChange(updated)
    // Clear error for this field if it has a value
    if (value !== '' && value !== undefined && value !== null && onFieldChange) {
      onFieldChange(field)
    }
  }

  // Removes several error keys in ONE write. onFieldChange drops a single key
  // from the errors object captured at render, so two calls in one event would
  // put the first key straight back.
  const clearErrors = (keys: string[]) => {
    if (!onSetErrors || !keys.some((key) => errors[key])) return
    const next = { ...errors }
    keys.forEach((key) => delete next[key])
    onSetErrors(next)
  }

  const handleHeightChange = (patch: Record<string, unknown>, hasValue: boolean) => {
    onDataChange({ ...data, ...patch } as FormData)
    if (hasValue) clearErrors(HEIGHT_ERROR_KEYS)
  }

  const handleUnitSwitch = (target: UnitSystem) => {
    // Re-selecting the active system does nothing. It used to wipe the height.
    if (target === unitSystem) return
    // Converts height and weight; see lib/unitSystem.ts.
    onDataChange(switchUnitSystem(data, target))
    // Any standing message names the other system's fields and units.
    clearErrors([...HEIGHT_ERROR_KEYS, 'weight', 'weightKg'])
  }

  // Validate age on blur (range 18-99: the calculator is an adult product)
  const validateAge = () => {
    if (data.age !== undefined && data.age !== '') {
      const age = Number(data.age)
      if (age < ADULT_MIN_AGE || age > 99) {
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
    return data.age !== undefined && data.age !== '' && age >= ADULT_MIN_AGE && age <= 99 && !errors.age
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
    return data.heightFeet !== undefined && data.heightFeet !== '' && !errors.heightFeet && !errors.height
  }

  const isHeightInchesValid = () => {
    const inches = Number(data.heightInches)
    return typeof data.heightInches === 'number' && inches >= 0 && inches <= 11 && !errors.heightInches && !errors.height
  }

  const isHeightCmValid = () => {
    const cm = Number(data.heightCm)
    return data.heightCm !== undefined && data.heightCm !== '' && cm >= 90 && cm <= 250 && !errors.heightCm && !errors.height
  }

  // Red border, aria-invalid, and a pointer to the group's error message.
  // The message itself renders once, under the whole height row.
  const heightFieldA11y = (invalid: boolean) => ({
    'aria-invalid': invalid || undefined,
    'aria-describedby': heightError ? 'height-error' : undefined,
    style: invalid ? { border: '1px solid #ef4444' } : undefined,
  })

  // Some webviews drop smooth programmatic scrolls (see CalculatorApp's
  // scrollToAnchor). Snap only if nothing moved and the user has not scrolled.
  const bringIntoView = (el: HTMLElement) => {
    const startY = window.scrollY
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => {
      const rect = el.getBoundingClientRect()
      const offScreen = rect.top < 0 || rect.bottom > window.innerHeight
      if (offScreen && Math.abs(window.scrollY - startY) < 4) el.scrollIntoView({ block: 'center' })
    }, 700)
  }

  // Continue sits below the form, so a failed tap used to leave the first
  // problem off-screen with nothing moving. Focus the first invalid control in
  // screen order and bring it (with its message) into view.
  const focusFirstError = (errs: Record<string, string>) => {
    const root = formRef.current
    if (!root) return
    const heightFieldId = errs.heightInches && !errs.height ? 'heightInches' : isMetric ? 'heightCm' : 'heightFeet'
    const order: { keys: string[]; selector: string; scrollId?: string }[] = [
      { keys: ['email'], selector: '#email' },
      { keys: ['sex'], selector: 'input[name="sex"]' },
      { keys: ['age'], selector: '#age' },
      { keys: HEIGHT_ERROR_KEYS, selector: `#${heightFieldId}`, scrollId: 'height-group' },
      { keys: ['weight', 'weightKg'], selector: isMetric ? '#weightKg' : '#weight' },
    ]
    const first = order.find(({ keys }) => keys.some((key) => errs[key]))
    const field = first && root.querySelector<HTMLElement>(first.selector)
    if (!first || !field) return
    field.focus({ preventScroll: true })
    const target = (first.scrollId && root.querySelector<HTMLElement>(`#${first.scrollId}`)) || field
    // After React paints the message, so it lands on screen with the field.
    requestAnimationFrame(() => bringIntoView(target))
  }

  const handleContinue = () => {
    console.log('[Step1] Continue clicked. Current data:', data)

    // Validate required fields
    const newErrors: Record<string, string> = {}

    if (!data.email) newErrors.email = 'Email is required to continue'
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) newErrors.email = 'Please enter a valid email'
    if (!data.sex) newErrors.sex = 'Please select your sex'
    if (!data.age || data.age > 99) newErrors.age = 'Age must be between 18 and 99'
    else if (data.age < ADULT_MIN_AGE) newErrors.age = ADULT_ONLY_MESSAGE
    // Height, checked against the system on screen. In metric mode the imperial
    // fields are derived from cm, so checking them there reported errors against
    // inputs the reader cannot see.
    if (isMetric) {
      if (!data.heightCm) newErrors.height = 'Please enter your height'
      else if (data.heightCm < 90 || data.heightCm > 250) newErrors.heightCm = 'Height must be between 90 and 250 cm'
    } else if (!data.heightFeet) {
      newErrors.height = 'Please enter your height'
    } else if (typeof data.heightInches === 'number' && (data.heightInches < 0 || data.heightInches > 11)) {
      newErrors.heightInches = 'Inches must be between 0 and 11'
    }
    // Weight, in the unit on screen (metric mode includes the toggle's 0
    // sentinel and a cleared cm field, both falsy but still metric)
    if (isMetric) {
      if (!data.weightKg || data.weightKg < 36 || data.weightKg > 227) newErrors.weightKg = 'Weight must be between 36 and 227 kg'
    } else {
      if (!data.weight || data.weight < 80 || data.weight > 500) newErrors.weight = 'Weight must be between 80 and 500 lbs'
    }

    console.log('[Step1] Validation errors:', newErrors)

    if (Object.keys(newErrors).length > 0) {
      console.log('[Step1] Validation failed, showing errors')
      onSetErrors?.(newErrors)
      focusFirstError(newErrors)
      return
    }

    console.log('[Step1] Validation passed, calling onContinue()')
    onContinue()
  }

  return (
    <div className="space-y-10" ref={formRef}>
      <div className="mb-10">
        <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '28px', color: '#ffd700', fontWeight: '600', marginBottom: '8px' }}>Let's Start with Your Basics</h2>
        <p style={{ fontFamily: "'Merriweather', Georgia, serif", fontSize: '18px', color: '#f5f5f5' }}>These measurements help us calculate your personalized macros.</p>
      </div>

      {/* Email */}
      <div style={{ maxWidth: '400px' }}>
        <FormField
          id="email"
          name="email"
          type="email"
          label="Email"
          value={data.email || ''}
          onChange={(e) => handleInputChange('email', e.target.value)}
          // Read the event target, not data.email: the prop lags a tick behind
          // the keystroke, so a fast type-then-tab would check a stale value.
          onBlur={(e) => setEmailSuggestion(suggestEmailFix(e.target.value))}
          error={errors.email}
          placeholder="you@email.com"
          required
          // Describes what actually happens: subscribeCore() enrols every
          // calculator finisher in a 30-day starter series AND the weekly list,
          // and send_newsletter.py holds the weekly back until the series
          // finishes. The old copy mentioned only the weekly email, so the
          // starter series arrived unannounced (audit 2026-09-10).
          helpText="Enter your email to continue. Your results appear here in the calculator. Using it also signs you up for free emails matched to the diet you choose, usually a short starter series followed by the related weekly newsletter. Unsubscribe anytime."
        />
        {emailSuggestion && (
          <div
            role="status"
            style={{
              marginTop: '8px', fontFamily: "'Merriweather', Georgia, serif",
              fontSize: '14px', color: '#ffd700',
            }}
          >
            Did you mean{' '}
            <button
              type="button"
              onClick={() => {
                handleInputChange('email', emailSuggestion)
                setEmailSuggestion(null)
              }}
              style={{
                background: 'none', border: 'none', padding: 0,
                color: '#ffd700', font: 'inherit', textDecoration: 'underline',
                cursor: 'pointer',
              }}
            >
              {emailSuggestion}
            </button>
            ?
          </div>
        )}
      </div>

      {/* Sex */}
      <RadioGroup
        name="sex"
        label="Biological Sex"
        options={[
          { value: 'male', label: 'Male' },
          { value: 'female', label: 'Female' },
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
          min={ADULT_MIN_AGE}
          max={99}
          required
          helpText="This calculator is designed for adults 18 and over."
        />
      </div>

      {/* Height: one group, so the unit control, the inputs and the error belong together */}
      <div id="height-group" role="group" aria-labelledby="height-label" style={{ marginTop: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
          <span id="height-label" style={{
            fontFamily: "'Merriweather', Georgia, serif",
            fontSize: '16px',
            color: '#FFFFFF',
            fontWeight: '500',
          }}>
            Height<span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
          </span>

          {/* Unit control: switches height AND weight, converting what was entered */}
          <div
            role="group"
            aria-label="Measurement units"
            style={{
              display: 'inline-flex',
              flexShrink: 0,
              gap: '2px',
              padding: '3px',
              backgroundColor: '#0f0f0f',
              border: '1px solid #333',
              borderRadius: '10px',
            }}
          >
            {UNIT_OPTIONS.map(({ system, label }) => {
              const active = unitSystem === system
              return (
                <button
                  key={system}
                  type="button"
                  aria-pressed={active}
                  onClick={() => handleUnitSwitch(system)}
                  style={{
                    minHeight: '44px',
                    minWidth: '64px',
                    padding: '0 16px',
                    border: 'none',
                    borderRadius: '8px',
                    fontFamily: "'Merriweather', Georgia, serif",
                    fontSize: '15px',
                    fontWeight: 600,
                    lineHeight: 1,
                    cursor: 'pointer',
                    transition: 'background-color 0.2s, color 0.2s, box-shadow 0.2s',
                    backgroundColor: active ? '#ffd700' : 'transparent',
                    color: active ? '#1a120b' : '#d4d4d4',
                    boxShadow: active ? '0 2px 8px rgba(255, 215, 0, 0.25)' : 'none',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {!isMetric ? (
          // Imperial (Feet & Inches) - Side by side with inline styles
          <div style={{ display: 'flex', gap: '24px' }}>
            <div style={{ flex: 1 }}>
              <FormField
                id="heightFeet"
                name="heightFeet"
                type="number"
                label="Feet"
                value={data.heightFeet || ''}
                onChange={(e) => {
                  const feet = parseInt(e.target.value) || ''
                  // Inches default to 0 once feet is set, so "5 ft" alone is a height
                  const patch = feet !== '' && typeof data.heightInches !== 'number'
                    ? { heightFeet: feet, heightInches: 0 }
                    : { heightFeet: feet }
                  handleHeightChange(patch, feet !== '')
                }}
                onBlur={validateHeightFeet}
                isValid={isHeightFeetValid()}
                placeholder="ft"
                min={3}
                max={8}
                required
                {...heightFieldA11y(Boolean(errors.height || errors.heightFeet))}
              />
            </div>
            <div style={{ flex: 1 }}>
              <FormField
                id="heightInches"
                name="heightInches"
                type="number"
                label="Inches"
                value={data.heightInches ?? ''}
                onChange={(e) => handleHeightChange({ heightInches: parseInt(e.target.value) || 0 }, true)}
                onBlur={validateHeightInches}
                isValid={isHeightInchesValid()}
                placeholder="in"
                min={0}
                max={11}
                required
                {...heightFieldA11y(Boolean(errors.height || errors.heightInches))}
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
                // Build ONE update per keystroke. Multiple handleInputChange
                // calls each spread the same stale `data` prop, so the later
                // calls clobber the cm value just typed (users could never
                // enter metric height).
                const cm = parseInt(e.target.value)
                handleHeightChange(
                  cm
                    // Auto-convert to imperial for internal use
                    ? { heightCm: cm, ...cmToFeetInches(cm) }
                    // 0 is the metric-mode-but-empty sentinel (same as the unit
                    // control). Drop the derived imperial values too so
                    // validation can't pass on stale height.
                    : { heightCm: 0, heightFeet: undefined, heightInches: undefined },
                  Boolean(cm)
                )
              }}
              onBlur={validateHeightCm}
              isValid={isHeightCmValid()}
              placeholder="cm"
              min={90}
              max={250}
              required
              {...heightFieldA11y(Boolean(errors.height || errors.heightCm))}
            />
          </div>
        )}

        {heightError && (
          <p id="height-error" className="text-red-500 text-sm mt-1.5" style={{ fontFamily: "'Merriweather', Georgia, serif" }}>
            {heightError}
          </p>
        )}
      </div>

      {/* Weight - switches between lbs/kg based on height unit */}
      <div style={{ maxWidth: '280px', marginTop: '8px' }}>
        {!isMetric ? (
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
            placeholder="lbs"
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
              // ONE update per keystroke — a second handleInputChange call
              // spreads stale `data` and clobbers the kg value just typed
              const kg = parseInt(e.target.value) || undefined
              onDataChange({
                ...data,
                weightKg: kg,
                // Auto-convert to lbs for internal calculations
                weight: kg ? kgToLb(kg) : undefined,
              })
              if (kg) onFieldChange?.('weightKg')
            }}
            error={errors.weightKg}
            isValid={isWeightKgValid()}
            placeholder="kg"
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
