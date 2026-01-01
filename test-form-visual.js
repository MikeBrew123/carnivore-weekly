const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
        console.log('Testing paid-questionnaire form...\n');

        await page.goto('http://localhost:8000/public/paid-questionnaire.html', {
            waitUntil: 'domcontentloaded'
        });
        await page.waitForTimeout(1000);

        // Check form visibility
        const formExists = await page.locator('#paidQuestionnaireForm').count() > 0;
        console.log(`Form element exists: ${formExists ? 'YES' : 'NO'}`);

        // Get all form sections
        const sections = await page.locator('.form-section').count();
        console.log(`Form sections found: ${sections}`);

        // List section headings
        const headings = await page.locator('.form-section h3').allTextContents();
        console.log('\nForm Section Headings:');
        headings.forEach((h, i) => {
            console.log(`  ${i + 1}. ${h}`);
        });

        // Check for Goals section specifically
        const goalsSection = await page.locator('text="Your Goals & Priorities"').count();
        console.log(`\nGoals section visible: ${goalsSection > 0 ? 'YES' : 'NO'}`);

        // Check for submit button
        const submitBtn = await page.locator('button:has-text("Generate My Protocol")').count();
        console.log(`Submit button visible: ${submitBtn > 0 ? 'YES' : 'NO'}`);

        // Get page height to see if content is cut off
        const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
        const windowHeight = await page.evaluate(() => window.innerHeight);
        console.log(`\nPage height: ${bodyHeight}px`);
        console.log(`Window height: ${windowHeight}px`);
        console.log(`Needs scrolling: ${bodyHeight > windowHeight ? 'YES' : 'NO'}`);

        // Check form data extraction
        console.log('\nTesting form data extraction...');
        const allInputs = await page.locator('input, textarea, select').count();
        console.log(`Total form inputs/fields: ${allInputs}`);

        console.log('\n✅ Form structure verification complete');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await browser.close();
    }
})();
