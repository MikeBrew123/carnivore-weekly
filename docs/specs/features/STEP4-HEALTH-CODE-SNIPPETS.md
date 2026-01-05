# Step 4 Health Fields - Code Snippets

Complete code for all 5 health fields as implemented.

---

## 1. Medications Textarea

```tsx
<TextArea
  id="medications"
  name="medications"
  label="Current Medications"
  value={data.medications || ''}
  onChange={(e) => handleInputChange('medications', e.target.value)}
  placeholder="e.g., Metformin, Lisinopril, etc."
  rows={4}
  maxLength={5000}
  helpText="Optional - Helps us provide safe dietary recommendations"
/>
```

**Props:**
- id: medications
- name: medications
- type: textarea
- label: "Current Medications"
- placeholder: "e.g., Metformin, Lisinopril, etc."
- rows: 4
- maxLength: 5000
- helpText: "Optional - Helps us provide safe dietary recommendations"
- value: data.medications || ''
- onChange: handleInputChange callback

---

## 2. Health Conditions Checkboxes

```tsx
<CheckboxGroup
  name="conditions"
  label="Health Conditions (select all that apply)"
  options={[
    { value: 'diabetes', label: 'Diabetes' },
    { value: 'heart-disease', label: 'Heart Disease' },
    { value: 'thyroid', label: 'Thyroid Disorder' },
    { value: 'pcos', label: 'PCOS' },
    { value: 'arthritis', label: 'Joint Pain/Arthritis' },
    { value: 'none', label: 'None of the above' },
  ]}
  values={data.conditions || []}
  onChange={(values) => handleInputChange('conditions', values)}
  helpText="Optional - Select all that apply"
/>
```

**Props:**
- name: conditions
- label: "Health Conditions (select all that apply)"
- options: Array of 6 checkbox options
- values: data.conditions || []
- onChange: handleInputChange callback
- helpText: "Optional - Select all that apply"

**Checkbox Options:**
1. diabetes → "Diabetes"
2. heart-disease → "Heart Disease"
3. thyroid → "Thyroid Disorder"
4. pcos → "PCOS"
5. arthritis → "Joint Pain/Arthritis"
6. none → "None of the above"

---

## 3. Other Conditions Text Input

```tsx
<FormField
  id="otherConditions"
  name="otherConditions"
  type="text"
  label="Other Conditions"
  value={data.otherConditions || ''}
  onChange={(e) => handleInputChange('otherConditions', e.target.value)}
  placeholder="Specify others not listed above"
/>
```

**Props:**
- id: otherConditions
- name: otherConditions
- type: text
- label: "Other Conditions"
- placeholder: "Specify others not listed above"
- value: data.otherConditions || ''
- onChange: handleInputChange callback

---

## 4. Symptoms Textarea

```tsx
<TextArea
  id="symptoms"
  name="symptoms"
  label="Current Symptoms"
  value={data.symptoms || ''}
  onChange={(e) => handleInputChange('symptoms', e.target.value)}
  placeholder="e.g., fatigue, brain fog, joint pain, etc."
  rows={4}
  maxLength={5000}
  helpText="Optional - Helps us tailor recommendations"
/>
```

**Props:**
- id: symptoms
- name: symptoms
- type: textarea
- label: "Current Symptoms"
- placeholder: "e.g., fatigue, brain fog, joint pain, etc."
- rows: 4
- maxLength: 5000
- helpText: "Optional - Helps us tailor recommendations"
- value: data.symptoms || ''
- onChange: handleInputChange callback

---

## 5. Other Symptoms Text Input

```tsx
<FormField
  id="otherSymptoms"
  name="otherSymptoms"
  type="text"
  label="Other Symptoms"
  value={data.otherSymptoms || ''}
  onChange={(e) => handleInputChange('otherSymptoms', e.target.value)}
  placeholder="Specify others not listed above"
/>
```

**Props:**
- id: otherSymptoms
- name: otherSymptoms
- type: text
- label: "Other Symptoms"
- placeholder: "Specify others not listed above"
- value: data.otherSymptoms || ''
- onChange: handleInputChange callback

---

## Section Container

All 5 fields are wrapped in this section:

```tsx
{/* SECTION 2: Health & Medical */}
<section className="border-t pt-6">
  <h3 className="text-lg font-semibold text-gray-900 mb-4">🏥 Health & Medical</h3>
  <div className="space-y-6">
    {/* All 5 fields go here */}
  </div>
</section>
```

**Styling:**
- border-t: Top border
- pt-6: Padding top (24px)
- space-y-6: Vertical spacing between fields (24px)

---

## Event Handler

Used by all 5 fields:

```tsx
const handleInputChange = (field: string, value: any) => {
  onDataChange({ ...data, [field]: value })
}
```

This is called with:
- (field='medications', value=string)
- (field='conditions', value=array of strings)
- (field='otherConditions', value=string)
- (field='symptoms', value=string)
- (field='otherSymptoms', value=string)

---

## FormData Type

From `/src/types/form.ts`:

```typescript
// Health Conditions
medications?: string
conditions?: string[]
otherConditions?: string
symptoms?: string
otherSymptoms?: string
```

All optional (no required fields).

---

## Component Imports

At top of Step4HealthProfile.tsx:

```tsx
import { FormData } from '../../../types/form'
import FormField from '../shared/FormField'
import TextArea from '../shared/TextArea'
import CheckboxGroup from '../shared/CheckboxGroup'
import SelectField from '../shared/SelectField'
```

---

## HTML Output (Expected)

### Medications Field
```html
<div class="w-full">
  <label class="block text-sm font-medium text-gray-700 mb-2">
    Current Medications
  </label>
  <textarea
    id="medications"
    name="medications"
    maxlength="5000"
    rows="4"
    class="w-full px-4 py-2.5 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none border-gray-300 bg-white"
    placeholder="e.g., Metformin, Lisinopril, etc."
  ></textarea>
  <p class="mt-1 text-sm text-gray-500">
    Optional - Helps us provide safe dietary recommendations
  </p>
</div>
```

### Conditions Checkboxes
```html
<fieldset class="w-full">
  <legend class="block text-sm font-medium text-gray-700 mb-3">
    Health Conditions (select all that apply)
  </legend>
  <div class="space-y-2">
    <!-- 6 checkbox inputs with labels -->
  </div>
  <p class="mt-2 text-sm text-gray-500">
    Optional - Select all that apply
  </p>
</fieldset>
```

### Symptoms Field
```html
<div class="w-full">
  <label class="block text-sm font-medium text-gray-700 mb-2">
    Current Symptoms
  </label>
  <textarea
    id="symptoms"
    name="symptoms"
    maxlength="5000"
    rows="4"
    class="w-full px-4 py-2.5 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none border-gray-300 bg-white"
    placeholder="e.g., fatigue, brain fog, joint pain, etc."
  ></textarea>
  <p class="mt-1 text-sm text-gray-500">
    Optional - Helps us tailor recommendations
  </p>
</div>
```

---

## Tailwind Classes Used

### Textareas
- `w-full` - Full width
- `px-4 py-2.5` - Horizontal and vertical padding
- `border rounded-lg` - Border and rounded corners
- `text-base` - Standard text size
- `focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent` - Focus state
- `transition-colors` - Smooth color transitions
- `resize-none` - Disable resize (handled with resize handle visible)
- `border-gray-300 bg-white` - Normal state colors
- `${error ? 'border-red-500 bg-red-50' : ''}` - Error state (if needed)

### FormFields
- Same as textareas, single-line version

### Checkboxes
- `w-4 h-4` - 20px checkbox size
- `text-blue-600` - Blue when selected
- `border-gray-300 rounded` - Gray border
- `focus:ring-2 focus:ring-blue-500` - Focus ring
- Label has `cursor-pointer` and full-width click target

### Spacing
- `space-y-6` - 24px between fields
- `mb-4` - 16px margin below title
- `mb-3` - 12px margin below legend
- `mt-1` - 4px margin above help text
- `mt-2` - 8px margin above help text

---

## Responsive Behavior

All components use:
- `w-full` for full width at all breakpoints
- Flexible padding/height (not fixed)
- Stack vertically on all sizes
- No media queries needed (mobile-first Tailwind)

Works at:
- 320px (mobile minimum)
- 375px (target mobile)
- 768px (tablet)
- 1400px (desktop)
- 2560px+ (ultra-wide)

---

## Testing Values

For manual testing:

**Medications:**
```
Metformin 500mg twice daily
Lisinopril 10mg once daily
Vitamin D3 2000IU daily
```

**Conditions:**
Check: Diabetes, Thyroid Disorder

**Other Conditions:**
```
Sleep apnea
```

**Symptoms:**
```
Fatigue in afternoons
Brain fog after meals
Joint pain in knees
```

**Other Symptoms:**
```
Occasional headaches
```

---

## API Integration

These fields submit to FormData:

```typescript
interface FormData {
  medications?: string          // User text
  conditions?: string[]         // Array of selected values
  otherConditions?: string      // User text
  symptoms?: string             // User text
  otherSymptoms?: string        // User text
}
```

When form submits, all 5 fields are included in the POST payload.

---

## No Backend Required

These are **frontend-only** fields. No validation or processing occurs in Step 4 itself. The form just captures the data and passes it forward.

---

## Character Limits

- **Medications:** Max 5000 (browser enforced)
- **Conditions:** No limit (array of options)
- **Other Conditions:** No limit (single text field)
- **Symptoms:** Max 5000 (browser enforced)
- **Other Symptoms:** No limit (single text field)

Note: Max limits are not enforced, just specified. Browser textarea respects maxLength. Users can type/paste but nothing gets cut off in the middle of a character.

---

## Ready to Deploy

All code is:
- ✅ Type-safe
- ✅ Accessible
- ✅ Responsive
- ✅ Tested in build
- ✅ Ready for visual validation

---

## Questions?

See other documentation files:
- STEP4-HEALTH-FIELDS-FOR-CASEY.md (visual testing guide)
- STEP4-HEALTH-FIELDS-IMPLEMENTATION.md (technical details)
- STEP4-HEALTH-QUICK-REFERENCE.md (quick lookup)
