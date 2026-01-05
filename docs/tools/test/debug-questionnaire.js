const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
        console.log('Loading questionnaire page...\n');
        await page.goto('http://localhost:8000/public/questionnaire.html', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);

        // Check which step is visible
        const stepData = await page.evaluate(() => {
            const steps = [];
            
            // Get all form steps
            document.querySelectorAll('.form-step').forEach(step => {
                const dataStep = step.getAttribute('data-step');
                const isVisible = step.style.display !== 'none' && getComputedStyle(step).display !== 'none';
                const firstHeading = step.querySelector('h3')?.textContent || 'No heading';
                const hasEmail = step.innerHTML.includes('email');
                const hasHealth = step.innerHTML.includes('Health') || step.innerHTML.includes('health');
                
                steps.push({
                    dataStep: dataStep,
                    visible: isVisible,
                    firstHeading: firstHeading,
                    hasEmail: hasEmail,
                    hasHealth: hasHealth
                });
            });
            
            return steps;
        });

        console.log('='.repeat(70));
        console.log('QUESTIONNAIRE FORM STEP ANALYSIS');
        console.log('='.repeat(70) + '\n');

        stepData.forEach((step, idx) => {
            console.log('Step ' + step.dataStep + ':');
            console.log('  Heading: ' + step.firstHeading);
            console.log('  Visible: ' + (step.visible ? '✅ YES' : '❌ NO'));
            console.log('  Has Email: ' + (step.hasEmail ? 'YES' : 'NO'));
            console.log('  Has Health: ' + (step.hasHealth ? 'YES' : 'NO'));
            console.log('');
        });

        // Check which step the UI thinks is current
        const currentStepUI = await page.locator('#currentStep').textContent();
        console.log('Current Step per UI: ' + currentStepUI);

        // List all visible form sections
        const visibleSections = await page.evaluate(() => {
            const sections = [];
            document.querySelectorAll('.form-step:not([style*="display:none"]) .form-section h3').forEach(h3 => {
                sections.push(h3.textContent);
            });
            return sections;
        });

        console.log('\nVisible Section Headings:');
        visibleSections.forEach(section => {
            console.log('  - ' + section);
        });

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await browser.close();
    }
})();
