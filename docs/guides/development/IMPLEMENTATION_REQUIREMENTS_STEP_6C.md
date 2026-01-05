# Step 6c: Implementation Requirements - Submit Button & Progress Bar

**For:** Development Team
**Priority:** CRITICAL BLOCKING ITEMS
**Deadline:** Complete before final testing phase

---

## IMPLEMENTATION #1: SUBMIT BUTTON

### Location
**File:** `/public/calculator-form-rebuild.html`
**Position:** Immediately before `</form>` closing tag (after the "Last Name" input field)

### HTML to Add

```html
            <!-- STEP 4: CONTACT (Premium Section) ends above -->

            <!-- SUBMIT BUTTON -->
            <button type="submit" id="submit-button" class="submit-button">
                Generate My Personalized Report
            </button>

        </form>
```

### CSS to Add

Add this to the existing `<style>` tag in the HTML or to your external stylesheet:

```css
        /* ============================================
           SUBMIT BUTTON STYLES (Step 6)
           ============================================ */

        .submit-button {
            background: #b8860b;
            color: white;
            padding: 14px 32px;
            min-height: 44px;
            font-size: 16px;
            font-weight: 700;
            font-family: 'Merriweather', Georgia, serif;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            width: 100%;
            margin-top: 20px;
            transition: all 0.3s ease;
            text-align: center;
            letter-spacing: 0.5px;
        }

        /* Enabled state (form valid) */
        .submit-button:not(:disabled) {
            background: #b8860b;
            cursor: pointer;
        }

        /* Hover state */
        .submit-button:not(:disabled):hover {
            background: #8b6508;
            box-shadow: 0 4px 12px rgba(184, 134, 11, 0.4);
            transform: translateY(-1px);
        }

        /* Active state (clicking) */
        .submit-button:not(:disabled):active {
            transform: translateY(0);
            box-shadow: 0 2px 6px rgba(184, 134, 11, 0.3);
        }

        /* Focus state (keyboard navigation) */
        .submit-button:focus-visible {
            outline: 3px solid #b8860b;
            outline-offset: 2px;
        }

        /* Disabled state (email invalid or form incomplete) */
        .submit-button:disabled {
            background: #cccccc;
            color: #999999;
            cursor: not-allowed;
            opacity: 0.6;
            box-shadow: none;
        }

        /* Mobile responsive */
        @media (max-width: 768px) {
            .submit-button {
                padding: 13px 24px;
                font-size: 15px;
                margin-top: 20px;
            }
        }

        @media (max-width: 480px) {
            .submit-button {
                padding: 12px 20px;
                font-size: 14px;
                margin-top: 15px;
                width: calc(100% - 2px);
            }
        }
```

### JavaScript to Add

Add this script before the closing `</body>` tag:

```javascript
    <script>
        // ============================================
        // FORM VALIDATION & SUBMIT BUTTON STATE
        // ============================================

        const form = document.getElementById('calculator-form');
        const submitButton = document.getElementById('submit-button');
        const emailInput = document.getElementById('email');

        // Function to validate form
        function validateForm() {
            const requiredFields = form.querySelectorAll('[required]');
            let isValid = true;

            for (let field of requiredFields) {
                if (!field.value || field.value.trim() === '') {
                    isValid = false;
                    break;
                }
            }

            // Email validation
            if (isValid && emailInput && emailInput.value) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                isValid = emailRegex.test(emailInput.value);
            }

            // Update submit button state
            submitButton.disabled = !isValid;
            return isValid;
        }

        // Validate on form input changes
        form.addEventListener('input', validateForm);
        form.addEventListener('change', validateForm);

        // Validate on page load
        document.addEventListener('DOMContentLoaded', validateForm);

        // Form submission handler
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!validateForm()) {
                alert('Please fill in all required fields with valid information.');
                return;
            }

            // Show progress bar (will be implemented in Step 6b)
            showProgressBar();

            // Gather form data
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);

            try {
                // Submit to API
                const response = await fetch('/api/v1/calculator/step/4', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                if (!response.ok) {
                    throw new Error('Form submission failed');
                }

                const result = await response.json();
                const reportToken = result.report_token;

                // Start polling for progress
                pollReportProgress(reportToken);

            } catch (error) {
                console.error('Error submitting form:', error);
                hideProgressBar();
                alert('Error generating report. Please try again.');
            }
        });

        // Placeholder functions (will be implemented in Step 6b)
        function showProgressBar() {
            console.log('Progress bar should appear here');
        }

        function hideProgressBar() {
            console.log('Progress bar should hide here');
        }

        function pollReportProgress(reportToken) {
            console.log('Should start polling for progress with token:', reportToken);
        }
    </script>
```

---

## IMPLEMENTATION #2: PROGRESS BAR UI

### Location
**File:** `/public/calculator-form-rebuild.html`
**Position:** Add immediately after the closing `</div>` of the calculator-container (before existing scripts)

### HTML Structure

```html
    </div><!-- End calculator-container -->

    <!-- PROGRESS BAR & REPORT GENERATION UI -->
    <div class="report-generation-container" id="reportGenerationContainer">

        <!-- Loading Overlay with Progress Bar -->
        <div class="generation-overlay" id="generationOverlay" style="display: none;">
            <div class="generation-modal">

                <div class="generation-header">
                    <h2>Building Your Personalized Report</h2>
                    <p class="generation-subtitle">This takes about 20-30 seconds</p>
                </div>

                <!-- Progress Bar -->
                <div class="progress-wrapper">
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" id="progressBarFill"></div>
                    </div>
                    <div class="progress-percent" id="progressPercent">0%</div>
                </div>

                <!-- Stage Message -->
                <div class="stage-message" id="stageMessage">
                    Preparing your data...
                </div>

                <!-- Elapsed Time -->
                <div class="elapsed-time" id="elapsedTime">
                    Time: 0s
                </div>

                <!-- Navigation Warning -->
                <div class="navigation-warning">
                    <strong>Important:</strong> Please don't refresh, go back, or close this tab
                    while your report is generating.
                </div>

            </div>
        </div>

        <!-- Report Ready State -->
        <div class="report-ready-overlay" id="reportReadyOverlay" style="display: none;">
            <div class="report-ready-modal">

                <div class="report-ready-icon">✓</div>

                <h2>Your Report is Ready!</h2>
                <p>Your personalized carnivore diet protocol has been generated and is ready to view.</p>

                <div class="action-buttons">
                    <button class="btn btn-primary" id="viewReportBtn">
                        View Report
                    </button>
                    <button class="btn btn-secondary" id="downloadReportBtn">
                        Download PDF
                    </button>
                </div>

                <p class="report-expiry">
                    This report will be available for <span id="expiryDays">30</span> days.
                </p>

            </div>
        </div>

    </div>
    <!-- End report-generation-container -->

    <!-- EXISTING SCRIPTS -->
    <script src="validation.js"></script>
    <script>
        // ... existing form script ...
    </script>
```

### CSS Styles

```css
        /* ============================================
           PROGRESS BAR & REPORT GENERATION UI (Step 6)
           ============================================ */

        .report-generation-container {
            position: relative;
        }

        /* Overlay Styling */
        .generation-overlay,
        .report-ready-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }

        /* Modal Styling */
        .generation-modal,
        .report-ready-modal {
            background: white;
            border-radius: 12px;
            padding: 40px 24px;
            max-width: 500px;
            width: 90%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideIn {
            from {
                transform: translateY(-30px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }

        /* Generation Header */
        .generation-header {
            text-align: center;
            margin-bottom: 30px;
        }

        .generation-header h2 {
            font-size: 24px;
            font-weight: 600;
            margin: 0 0 10px 0;
            color: #1a1a1a;
            font-family: 'Merriweather', Georgia, serif;
        }

        .generation-subtitle {
            font-size: 14px;
            color: #666;
            margin: 0;
            font-family: 'Merriweather', Georgia, serif;
        }

        /* Progress Bar Container */
        .progress-wrapper {
            margin-bottom: 20px;
            position: relative;
        }

        .progress-bar-container {
            background: #e8e8e8;
            height: 8px;
            border-radius: 10px;
            overflow: hidden;
            position: relative;
            margin-bottom: 20px;
        }

        .progress-bar-fill {
            background: linear-gradient(90deg, #ffd700 0%, #ffed4e 100%);
            height: 100%;
            width: 0%;
            border-radius: 10px;
            transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
            position: relative;
        }

        .progress-bar-fill::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            bottom: 0;
            right: 0;
            background: linear-gradient(
                90deg,
                transparent 0%,
                rgba(255, 255, 255, 0.3) 50%,
                transparent 100%
            );
            animation: shimmer 2s infinite;
        }

        @keyframes shimmer {
            0% {
                transform: translateX(-100%);
            }
            100% {
                transform: translateX(100%);
            }
        }

        .progress-percent {
            position: absolute;
            top: -25px;
            right: 0;
            font-size: 14px;
            font-weight: 600;
            color: #ffd700;
            font-family: 'Merriweather', Georgia, serif;
        }

        /* Stage Message */
        .stage-message {
            text-align: center;
            font-size: 16px;
            font-weight: 500;
            color: #1a1a1a;
            margin: 20px 0;
            min-height: 24px;
            font-family: 'Merriweather', Georgia, serif;
        }

        /* Elapsed Time */
        .elapsed-time {
            text-align: center;
            font-size: 12px;
            color: #999;
            margin: 10px 0 20px 0;
            font-family: 'Merriweather', Georgia, serif;
        }

        /* Navigation Warning */
        .navigation-warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 12px 16px;
            border-radius: 4px;
            font-size: 13px;
            color: #333;
            margin-top: 20px;
            font-family: 'Merriweather', Georgia, serif;
        }

        .navigation-warning strong {
            display: block;
            margin-bottom: 4px;
            font-weight: 700;
        }

        /* Report Ready State */
        .report-ready-icon {
            font-size: 60px;
            color: #28a745;
            text-align: center;
            margin-bottom: 20px;
            animation: slideDown 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        @keyframes slideDown {
            0% {
                transform: translateY(-30px);
                opacity: 0;
            }
            100% {
                transform: translateY(0);
                opacity: 1;
            }
        }

        .report-ready-modal h2 {
            font-size: 24px;
            font-weight: 600;
            margin: 0 0 10px 0;
            color: #1a1a1a;
            font-family: 'Merriweather', Georgia, serif;
        }

        .report-ready-modal p {
            font-size: 14px;
            color: #666;
            margin: 0 0 30px 0;
            font-family: 'Merriweather', Georgia, serif;
        }

        /* Action Buttons */
        .action-buttons {
            display: flex;
            gap: 12px;
            margin-bottom: 20px;
        }

        .btn {
            flex: 1;
            padding: 12px 20px;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            font-family: 'Merriweather', Georgia, serif;
        }

        .btn-primary {
            background: #ffd700;
            color: #1a1a1a;
        }

        .btn-primary:hover {
            background: #ffed4e;
            box-shadow: 0 4px 12px rgba(255, 215, 0, 0.4);
        }

        .btn-secondary {
            background: #e8e8e8;
            color: #1a1a1a;
        }

        .btn-secondary:hover {
            background: #d4d4d4;
        }

        .report-expiry {
            font-size: 12px;
            color: #999;
            margin: 0;
            text-align: center;
            font-family: 'Merriweather', Georgia, serif;
        }

        /* Mobile Responsive */
        @media (max-width: 375px) {
            .generation-modal,
            .report-ready-modal {
                width: 95%;
                padding: 30px 16px;
            }

            .generation-header h2,
            .report-ready-modal h2 {
                font-size: 20px;
            }

            .generation-subtitle {
                font-size: 12px;
            }

            .progress-bar-container {
                height: 6px;
            }

            .action-buttons {
                flex-direction: column;
                gap: 10px;
            }

            .btn {
                width: 100%;
            }
        }
```

### JavaScript Handler

```javascript
    <script>
        // ============================================
        // PROGRESS BAR MANAGEMENT
        // ============================================

        const POLL_INTERVAL_MS = 2000; // 2 seconds
        const API_BASE_URL = '/api/v1/calculator';

        // Show progress bar UI
        function showProgressBar() {
            document.getElementById('generationOverlay').style.display = 'flex';
        }

        // Hide progress bar UI
        function hideProgressBar() {
            document.getElementById('generationOverlay').style.display = 'none';
        }

        // Update progress bar
        function updateProgressBar(percent, stageName, elapsedSeconds) {
            const fill = document.getElementById('progressBarFill');
            const percentLabel = document.getElementById('progressPercent');
            const stageMessage = document.getElementById('stageMessage');
            const elapsedTime = document.getElementById('elapsedTime');

            fill.style.width = `${percent}%`;
            percentLabel.innerText = `${percent}%`;
            stageMessage.innerText = stageName || 'Preparing your data...';
            elapsedTime.innerText = `Time: ${elapsedSeconds}s`;
        }

        // Show report ready modal
        function showReportReady(reportToken, expiryDays = 30) {
            hideProgressBar();

            document.getElementById('expiryDays').innerText = expiryDays;
            document.getElementById('reportReadyOverlay').style.display = 'flex';

            // Wire up action buttons
            document.getElementById('viewReportBtn').onclick = () => {
                window.location.href = `/report/${reportToken}`;
            };

            document.getElementById('downloadReportBtn').onclick = () => {
                window.location.href = `${API_BASE_URL}/report/${reportToken}/download`;
            };
        }

        // Show error modal
        function showError(errorMessage) {
            hideProgressBar();
            alert(`Error generating report: ${errorMessage}`);
        }

        // Poll for report progress
        async function pollReportProgress(reportToken) {
            showProgressBar();

            let pollCount = 0;
            const maxPolls = 120; // 240 seconds max (4 minutes)
            const startTime = Date.now();

            const pollInterval = setInterval(async () => {
                pollCount++;

                // Safety: Stop polling after max attempts
                if (pollCount > maxPolls) {
                    clearInterval(pollInterval);
                    showError('Report generation timed out. Please try again.');
                    return;
                }

                try {
                    const response = await fetch(
                        `${API_BASE_URL}/report/${reportToken}/status`
                    );

                    if (!response.ok) {
                        throw new Error(`Status check failed: ${response.status}`);
                    }

                    const status = await response.json();
                    const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);

                    // Update UI
                    updateProgressBar(
                        status.progress_percent,
                        status.stage_name,
                        elapsedSeconds
                    );

                    // Handle completion
                    if (status.status === 'completed') {
                        clearInterval(pollInterval);
                        showReportReady(reportToken, status.expiry_days || 30);
                    }

                    // Handle error
                    if (status.status === 'error') {
                        clearInterval(pollInterval);
                        showError(status.error_message);
                    }

                } catch (error) {
                    console.error('Polling error:', error);
                    clearInterval(pollInterval);
                    showError('Failed to check report status.');
                }
            }, POLL_INTERVAL_MS);
        }
    </script>
```

---

## TESTING CHECKLIST

### Submit Button Testing
- [ ] Button visible below email field on desktop
- [ ] Button full width on mobile
- [ ] Button disabled when email is empty
- [ ] Button enabled when email is valid
- [ ] Hover state darkens button
- [ ] Focus outline visible on Tab key
- [ ] Button click triggers form submission
- [ ] Height is 44px minimum (touch target)
- [ ] Text is readable and centered

### Progress Bar Testing
- [ ] Overlay appears on form submit
- [ ] Progress bar starts at 0%
- [ ] Progress bar fills to 100% over time
- [ ] Stage message updates correctly
- [ ] Elapsed time counter increments
- [ ] Shimmer animation plays smoothly
- [ ] No jank or jumpy animations
- [ ] Progress bar responsive on 375px
- [ ] Progress bar responsive on 1400px

### Success Modal Testing
- [ ] Modal appears when progress reaches 100%
- [ ] Checkmark icon displays
- [ ] "Your Report is Ready!" message displays
- [ ] "View Report" button works
- [ ] "Download PDF" button works
- [ ] Expiry message displays correctly

### Accessibility Testing
- [ ] Button has proper focus indicator
- [ ] Can tab to button and activate with Enter
- [ ] Progress bar has aria-live region (for screen readers)
- [ ] All text is readable
- [ ] Color contrast is adequate

---

## BROWSER COMPATIBILITY

Test on:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile Safari (iOS 14+)
- Chrome Mobile (Android)

---

## PERFORMANCE REQUIREMENTS

- Progress bar animation smooth (60fps)
- No layout shift during progress bar display
- Shimmer animation doesn't block interactions
- Polling doesn't cause excessive CPU usage
- CSS animations use GPU acceleration (transform, opacity)

---

## API ENDPOINTS NEEDED

These endpoints must be implemented for the progress bar to work:

### 1. Form Submission
```
POST /api/v1/calculator/step/4
Request: FormData with all calculator fields
Response: { report_token: "string", job_id: "string" }
```

### 2. Progress Status Check
```
GET /api/v1/calculator/report/{report_token}/status
Response: {
  status: "generating|completed|error",
  progress_percent: 0-100,
  stage_name: "string",
  elapsed_seconds: number,
  error_message?: "string"
}
```

### 3. View Report
```
GET /report/{report_token}
Response: HTML report page
```

### 4. Download Report
```
GET /api/v1/calculator/report/{report_token}/download
Response: PDF file download
```

---

## TIMELINE

1. **Day 1:** Implement submit button HTML/CSS
2. **Day 2:** Test submit button in all states
3. **Day 3:** Implement progress bar HTML/CSS
4. **Day 4:** Implement progress bar JavaScript
5. **Day 5:** Create API endpoints
6. **Day 6:** E2E testing and bug fixes
7. **Day 7:** Casey's visual validation with screenshots

---

**Status:** Ready for implementation
**Questions:** Contact Jordan or Casey
