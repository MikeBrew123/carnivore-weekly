/**
 * CRITICAL HOTFIX: Step 4 Form Data Persistence
 *
 * This patch fixes the silent report generation failure by:
 * 1. Creating cw_assessment_sessions after payment verification
 * 2. Migrating form_data from calculator_sessions_v2
 * 3. Fixing payment status enum check ('success' -> 'completed')
 * 4. Returning assessment_id to frontend
 *
 * Location: /Users/mbrew/Developer/carnivore-weekly/api/calculator-api.js
 *
 * PATCH INSTRUCTIONS:
 * 1. Find line 648 (after calculator_sessions_v2 update succeeds)
 * 2. Insert INSERTION_1 before line 650 (before "// Create report record")
 * 3. Find line 754 (payment status check)
 * 4. Replace with LINE_754_REPLACEMENT
 * 5. Find line 690 (success response)
 * 6. Add assessment_id to response (see LINE_690_UPDATE)
 */

// ===== INSERTION 1 (Insert after line 648) =====
// Location: Before "// Create report record" comment
// This creates the missing assessment session record

const insertion1 = `
      // [HOTFIX] Create cw_assessment_sessions entry for Step 4 submission
      // Purpose: Bridge calculator_sessions_v2 to cw_assessment_sessions
      // This ensures Step 4 can find and merge form_data
      let assessment_id = null;
      const assessmentResponse = await fetch(
        \`\${env.SUPABASE_URL}/rest/v1/cw_assessment_sessions\`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': \`Bearer \${env.SUPABASE_SERVICE_ROLE_KEY}\`,
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({
            email: session.email || 'unknown@carnivoreweekly.com',
            first_name: session.first_name || 'Carnivore User',
            form_data: session.form_data || {},  // Migrate Steps 1-3 data
            payment_status: 'completed',
            stripe_session_id: session.stripe_payment_intent_id,
            stripe_payment_intent_id: session.stripe_payment_intent_id,
          }),
        }
      );

      if (assessmentResponse.ok) {
        const assessmentSessions = await assessmentResponse.json();
        if (assessmentSessions && assessmentSessions.length > 0) {
          assessment_id = assessmentSessions[0].id;
          console.log('[handleVerifyPayment] Created cw_assessment_sessions:', assessment_id);
        }
      } else {
        // Log but don't fail - assessment can be created on Step 4 submission
        const errorText = await assessmentResponse.text();
        console.warn('[handleVerifyPayment] Failed to create assessment session:', errorText);
      }
`;

// ===== REPLACEMENT FOR LINE 754 =====
// Location: Step 4 payment status check
// Change from: if (session.payment_status !== 'pending' && session.payment_status !== 'success')
// Change to:

const line754Replacement = `    // Verify payment was completed (allow pending for free tier, completed for paid)
    if (session.payment_status !== 'pending' && session.payment_status !== 'completed') {
      console.error('[handleStep4Submission] Payment not completed, status:', session.payment_status);
      return createErrorResponse('PAYMENT_REQUIRED', 'Payment required to access step 4', 403);
    }`;

// ===== UPDATE FOR LINE 690 SUCCESS RESPONSE =====
// Location: handleVerifyPayment success response
// Add assessment_id to the response object

const line690Update = `      return createSuccessResponse({
        session_token,
        is_premium: true,
        payment_status: 'completed',
        access_token: accessToken,
        assessment_id: assessment_id,  // NEW: Assessment session ID for Step 4
        expires_at: expiresAt.toISOString(),
        message: 'Payment verified. Report generation started.',
      }, 200);`;

// ===== OPTIONAL: Frontend Update for Step4 Handler =====
// Location: calculator2-demo/src/components/calculator/CalculatorApp.tsx
// The frontend Step4 handler needs to receive assessment_id from payment verification

const step4HandlerUpdate = `
// In the payment success handler, store the assessment_id from verification response
const paymentVerifyResponse = await fetch(
  'https://carnivore-report-api-production.iambrew.workers.dev/api/v1/calculator/payment/verify',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_token: sessionToken,
      stripe_payment_intent_id: paymentIntentId,
    }),
  }
);

const paymentData = await paymentVerifyResponse.json();
// Store assessment_id from response
const assessmentId = paymentData.assessment_id;

// Then in handleStep4Submit, use assessmentId instead of stripeSessionId
const response = await fetch(
  'https://carnivore-report-api-production.iambrew.workers.dev/api/v1/calculator/step/4',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      assessment_id: assessmentId,  // Use the ID from payment verification
      data: formData,
    }),
  }
);
`;

// ===== VERIFICATION STEPS =====
// After applying the patch, verify the fix with these steps:

const verificationSteps = `
1. Database Verification:

   SELECT COUNT(*) as assessment_sessions_created
   FROM public.cw_assessment_sessions
   WHERE payment_status = 'completed'
   AND created_at > NOW() - INTERVAL '1 hour';

   Expected: > 0 (confirms sessions are being created)

2. Form Data Integrity Check:

   SELECT
     cas.id,
     cas.email,
     cas.form_data ->> 'weight' as weight,
     cas.form_data ->> 'age' as age,
     cas.form_data ->> 'sex' as sex,
     jsonb_array_length(jsonb_object_keys(cas.form_data)::jsonb[]) as fields_count
   FROM public.cw_assessment_sessions cas
   WHERE payment_status = 'completed'
   ORDER BY created_at DESC
   LIMIT 5;

   Expected: weight, age, sex should NOT be null (data properly migrated)

3. Integration Test:
   - Create new user session
   - Complete Steps 1-2 with full data: weight=180, age=30, sex=male, etc.
   - Complete payment
   - Verify payment response includes assessment_id
   - Complete Step 4 submission
   - Verify form_data includes Steps 1-2 data + Step 4 health profile
   - Verify macros are CALCULATED (not defaults)

4. Audit Trail:

   SELECT * FROM public.v_assessment_data_audit
   WHERE assessment_id = 'YOUR_TEST_SESSION_ID';

   Expected: data_quality = 'COMPLETE', all form keys present
`;

module.exports = {
  insertion1,
  line754Replacement,
  line690Update,
  step4HandlerUpdate,
  verificationSteps,
};
