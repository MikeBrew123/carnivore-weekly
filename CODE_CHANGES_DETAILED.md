# Detailed Code Changes for Email Bug Fix

## File 1: formStore.ts

### Location
`/Users/mbrew/Developer/carnivore-weekly/calculator2-demo/src/stores/formStore.ts`

### Change on Line 41

```diff
const defaultForm: FormData = {
  // Step 1: Basic
  sex: 'male',
  age: 42,
  heightFeet: 5,
  heightInches: 11,
  weight: 215,

  // Step 2: Activity
  lifestyle: '1.2',
  exercise: '0.1',

  // Step 3: Goals & Diet
  goal: 'lose',
  deficit: 25,
  diet: 'carnivore',
  ratio: '75-25',

  // Step 4: Health (Premium)
- email: 'michael.reynolds@example.com',
+ email: '', // Users must provide their own email during checkout
  firstName: 'Michael',
  medications: 'Metformin 500mg twice daily, Lisinopril 10mg for blood pressure',
  conditions: ['diabetes', 'guthealth', 'inflammation'],
  allergies: 'Shellfish (anaphylaxis), tree nuts',
  avoidFoods: 'Pork (causes bloating and GI distress), chicken thighs (inflammatory response), dairy except butter, seed oils, vegetable oils, peanuts, legumes',

  // Step 5: Preferences (Premium)
  previousDiets: 'Standard American diet for 20 years...',
  carnivoreExperience: 'months',
  selectedProtocol: 'carnivore',
  goals: ['weightloss', 'mental', 'guthealth'],
  additionalNotes: '...',
}
```

**Explanation:** Removes the hardcoded email address and requires users to provide their own email during the checkout process.

---

## File 2: StripePaymentModal.tsx

### Location
`/Users/mbrew/Developer/carnivore-weekly/calculator2-demo/src/components/ui/StripePaymentModal.tsx`

### Change 1: Component Imports (No change - same imports)

### Change 2: State Variables (Lines 20-27)

```diff
export default function StripePaymentModal({
  tierId,
  tierTitle,
  tierPrice,
  onSuccess,
  onCancel,
}: StripePaymentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [discountApplied, setDiscountApplied] = useState<{ code: string; percent: number } | null>(null)
  const [couponError, setCouponError] = useState('')
+ const [userEmail, setUserEmail] = useState('')
+ const [emailError, setEmailError] = useState('')
- const { sessionToken, form } = useFormStore()
+ const { sessionToken, form, setFormField } = useFormStore()
```

**Explanation:** Added state for user email and email errors. Also imported `setFormField` from store to save email.

### Change 3: Email Validation Function (NEW - Lines 42-45)

```typescript
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}
```

**Explanation:** Validates email format using regex pattern. Ensures email has format: something@domain.something

### Change 4: Email Change Handler (NEW - Lines 47-56)

```typescript
const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const email = e.target.value.trim()
  setUserEmail(email)

  if (email && !validateEmail(email)) {
    setEmailError('Please enter a valid email address')
  } else {
    setEmailError('')
  }
}
```

**Explanation:** Handles input changes, validates in real-time, and sets error message if invalid.

### Change 5: Payment Handler (Lines 90-154)

```diff
  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

+   // Validate email before processing
+   if (!userEmail || !validateEmail(userEmail)) {
+     setEmailError('Please enter a valid email address')
+     return
+   }
+
    setIsProcessing(true)

    try {
      const finalPrice = calculateDiscountedPrice()

+     // Update form store with user's email
+     setFormField('email', userEmail)
+
      // If 100% discount (free), skip Stripe and go directly to success
      if (finalPrice === 0) {
        // Show success message
        setError('')
        // Redirect to success page after brief delay
        setTimeout(() => {
          window.location.href = `${window.location.origin}/calculator2-demo.html?payment=success&session=${sessionToken}`
        }, 500)
        return
      }

      // Create Stripe checkout session via our API
      const response = await fetch('https://carnivore-report-api-production.iambrew.workers.dev/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier_id: tierId,
          tier_title: tierTitle,
          amount: finalPrice,
          original_amount: priceMap[tierId] || 999,
          coupon_code: discountApplied?.code || null,
          discount_percent: discountApplied?.percent || 0,
-         customer_email: form.email || 'unknown@example.com',
+         customer_email: userEmail,
          session_token: sessionToken,
          success_url: `${window.location.origin}/calculator2-demo.html?payment=success&session=${sessionToken}`,
          cancel_url: `${window.location.origin}/calculator2-demo.html?payment=cancelled`,
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to create checkout: ${errorText}`)
      }

      const data = await response.json()

      // Redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed')
      setIsProcessing(false)
    }
  }
```

**Key changes:**
- Added email validation at start of handler
- Save user's email to form store
- Use `userEmail` instead of `form.email` for Stripe API call
- Early return if email invalid (prevents Stripe call)

### Change 6: Email Input Field (Lines 313-337)

```diff
          {/* Form */}
          <form onSubmit={handlePayment} className="space-y-4">
-           {/* Email Confirmation */}
-           <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
-             <p className="text-sm text-gray-600 mb-1">Confirmation sent to:</p>
-             <p className="font-semibold text-dark">{form.email || 'your email'}</p>
-           </div>

+           {/* Email Input */}
+           <div>
+             <label className="block text-sm font-semibold text-dark mb-2">
+               Email Address <span className="text-red-600">*</span>
+             </label>
+             <input
+               type="email"
+               value={userEmail}
+               onChange={handleEmailChange}
+               disabled={isProcessing}
+               placeholder="your@email.com"
+               className={`w-full px-4 py-3 rounded-lg border-2 transition focus:outline-none ${
+                 emailError
+                   ? 'border-red-500 bg-red-50 focus:border-red-600 focus:ring-2 focus:ring-red-200'
+                   : 'border-gray-200 bg-gray-50 focus:border-secondary focus:ring-2 focus:ring-secondary/20'
+               } disabled:opacity-50 disabled:cursor-not-allowed`}
+               required
+             />
+             {emailError && (
+               <p className="text-sm text-red-600 mt-1">⚠️ {emailError}</p>
+             )}
+             <p className="text-xs text-gray-500 mt-2">
+               Your receipt and account details will be sent here
+             </p>
+           </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
```

**Changes:**
- Removed read-only email display that showed hardcoded email
- Added full email input field with label and required indicator
- Added dynamic styling (red for errors, normal otherwise)
- Added error message display
- Added helper text about receipt delivery

### Change 7: Submit Button Protection (Line 351)

```diff
              <button
                type="submit"
-               disabled={isProcessing}
+               disabled={isProcessing || !userEmail || emailError !== ''}
                className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-primary to-primary/90 text-accent font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isProcessing ? 'Redirecting...' : 'Pay ' + tierPrice}
              </button>
```

**Explanation:** Button is now disabled until email is entered AND valid.

---

## Summary of Changes

### formStore.ts
- **Lines changed:** 1
- **Lines added:** 0
- **Change type:** Default value modification

### StripePaymentModal.tsx
- **Lines changed:** 5 (state imports, payment handler line, submit button)
- **Lines added:** ~45 (validation function, email handler, email input field)
- **Lines removed:** ~5 (old read-only email display)
- **Net change:** ~50 lines

### Total Impact
- **Files modified:** 2
- **Total lines changed:** ~50
- **Breaking changes:** 0
- **Security improvements:** YES
- **Backwards compatible:** YES

