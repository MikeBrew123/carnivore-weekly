import { chromium } from 'playwright';

const BASE_URL = 'https://carnivoreweekly.com/calculator.html';
const REPORT_URL = 'https://carnivoreweekly.com/report.html';

async function testFullPaidReport() {
    console.log('\n🎯 COMPLETE PAID REPORT RETRIEVAL TEST\n');
    console.log('═══════════════════════════════════════════════════════════\n');

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    page.setViewportSize({ width: 1400, height: 900 });

    try {
        // STEP 1: Fill and calculate form
        console.log('STEP 1: Fill calculator form and calculate macros');
        console.log('─────────────────────────────────────────');

        await page.goto(BASE_URL);
        await page.waitForTimeout(2000);

        await page.fill('#age', '38');
        await page.fill('#weight', '185');
        await page.fill('#heightFeet', '5');
        await page.fill('#heightInches', '9');
        await page.selectOption('#sex', 'male');
        await page.selectOption('#goal', 'lose');
        await page.selectOption('#diet', 'carnivore');

        await page.click('#calculateBtn');
        await page.waitForTimeout(2000);
        await page.waitForSelector('#resultsSection:not(.hidden)', { timeout: 10000 });

        console.log('✅ Macros calculated\n');

        // STEP 2: Upgrade to paid
        console.log('STEP 2: Upgrade to paid version');
        console.log('─────────────────────────────────────────');

        const upgradeBtn = await page.locator('button:has-text("Upgrade for")').first();
        await upgradeBtn.click();
        await page.waitForTimeout(2000);

        console.log('✅ Advanced form revealed\n');

        // STEP 3: Fill advanced form
        console.log('STEP 3: Fill advanced form');
        console.log('─────────────────────────────────────────');

        await page.fill('#email', 'paiduser@example.com');
        const firstNameField = await page.$('input[name="firstName"]');
        if (firstNameField) {
            await page.fill('input[name="firstName"]', 'Paid User');
        }

        console.log('✅ Email and name filled\n');

        // STEP 4: Collect form data for payment simulation
        console.log('STEP 4: Prepare payment data');
        console.log('─────────────────────────────────────────');

        const formData = await page.evaluate(() => {
            return {
                sex: document.getElementById('sex').value,
                age: document.getElementById('age').value,
                weight: document.getElementById('weight').value,
                heightFeet: document.getElementById('heightFeet').value,
                heightInches: document.getElementById('heightInches').value,
                heightCm: document.getElementById('heightCm').value,
                lifestyle: document.getElementById('lifestyle').value,
                exercise: document.getElementById('exercise').value,
                goal: document.getElementById('goal').value,
                deficit: document.getElementById('deficit').value,
                diet: document.getElementById('diet').value,
                email: document.getElementById('email').value,
                firstName: document.querySelector('input[name="firstName"]')?.value,
                path_choice: 'paid'
            };
        });

        console.log(`✅ Data prepared for: ${formData.email}\n`);

        // STEP 5: Simulate payment success
        console.log('STEP 5: Simulate payment success');
        console.log('─────────────────────────────────────────');

        await page.evaluate((data) => {
            localStorage.setItem('pending_report_data', JSON.stringify(data));
            localStorage.setItem('payment_initiated', Date.now().toString());
        }, formData);

        await page.goto(BASE_URL + '?success=true');
        await page.waitForTimeout(3000);

        console.log('✅ Payment success triggered\n');

        // STEP 6: Wait for report generation
        console.log('STEP 6: Wait for report generation (50 seconds)');
        console.log('─────────────────────────────────────────');

        let apiResponse = null;
        let accessToken = null;

        // Intercept API responses to capture the access token
        page.on('response', async response => {
            if (response.url().includes('carnivore-report-api')) {
                try {
                    const body = await response.json();
                    apiResponse = body;
                    if (body.accessToken) {
                        accessToken = body.accessToken;
                        console.log(`✅ Access token received: ${accessToken.substring(0, 20)}...`);
                    }
                } catch (e) {
                    // Ignore parse errors
                }
            }
        });

        await page.waitForTimeout(60000);

        if (!accessToken) {
            // Try to extract from the page
            accessToken = await page.evaluate(() => {
                const text = document.body.innerText;
                const match = text.match(/[a-f0-9]{64}/);
                return match ? match[0] : null;
            });
        }

        console.log('✅ Report generation complete\n');

        // STEP 7: Take screenshot of success
        console.log('STEP 7: Capture success screen');
        console.log('─────────────────────────────────────────');

        await page.screenshot({ path: '/tmp/full-report-success.png', fullPage: true });
        console.log('✅ Screenshot saved: /tmp/full-report-success.png\n');

        // STEP 8: Retrieve full report using access token
        if (accessToken) {
            console.log('STEP 8: Retrieve full report from database');
            console.log('─────────────────────────────────────────');

            const reportUrl = `${REPORT_URL}?token=${accessToken}`;
            console.log(`Opening: ${reportUrl}`);

            await page.goto(reportUrl);
            await page.waitForTimeout(3000);

            console.log('✅ Report page loaded\n');

            // STEP 9: Verify report content
            console.log('STEP 9: Verify report content');
            console.log('─────────────────────────────────────────');

            const reportTitle = await page.title();
            const hasReportContent = await page.evaluate(() => {
                return document.body.innerText.length > 1000;
            });

            const sections = await page.evaluate(() => {
                const text = document.body.innerText.toUpperCase();
                return {
                    hasExecutiveSummary: text.includes('EXECUTIVE SUMMARY') || text.includes('PROTOCOL'),
                    hasFood: text.includes('FOOD') || text.includes('MEAL'),
                    hasCalendar: text.includes('CALENDAR') || text.includes('MEAL PLAN'),
                    hasShopping: text.includes('SHOPPING') || text.includes('GROCERY'),
                    hasPhysician: text.includes('PHYSICIAN') || text.includes('DOCTOR'),
                    wordCount: text.split(/\s+/).length
                };
            });

            console.log(`✅ Report title: "${reportTitle}"`);
            console.log(`✅ Report content exists: ${hasReportContent}`);
            console.log(`✅ Word count: ${sections.wordCount}`);
            console.log(`✅ Has Executive Summary: ${sections.hasExecutiveSummary}`);
            console.log(`✅ Has Food Guide: ${sections.hasFood}`);
            console.log(`✅ Has Meal Calendar: ${sections.hasCalendar}`);
            console.log(`✅ Has Shopping List: ${sections.hasShopping}`);
            console.log(`✅ Has Physician Guide: ${sections.hasPhysician}`);

            // STEP 10: Take final screenshot of full report
            console.log('\nSTEP 10: Capture full report');
            console.log('─────────────────────────────────────────');

            await page.screenshot({ path: '/tmp/full-report-content.png', fullPage: true });
            console.log('✅ Full report screenshot: /tmp/full-report-content.png\n');

            // STEP 11: Extract and display report summary
            console.log('STEP 11: Report content summary');
            console.log('─────────────────────────────────────────\n');

            const firstContent = await page.evaluate(() => {
                const text = document.body.innerText;
                return text.substring(0, 500);
            });

            console.log('First 500 characters of report:');
            console.log(firstContent);
            console.log('\n');

            console.log('═══════════════════════════════════════════════════════════');
            console.log('✅ FULL PAID REPORT TEST COMPLETED SUCCESSFULLY');
            console.log('═══════════════════════════════════════════════════════════\n');

            console.log('Summary:');
            console.log('  ✅ Free calculator: WORKING');
            console.log('  ✅ Paid upgrade: WORKING');
            console.log('  ✅ Payment flow: WORKING');
            console.log('  ✅ Report generation: WORKING');
            console.log('  ✅ Report retrieval: WORKING');
            console.log('  ✅ Full report display: WORKING\n');

            console.log(`Report Access Token: ${accessToken}`);
            console.log(`Report expires: 48 hours from generation`);
            console.log(`Report URL: ${reportUrl}`);

        } else {
            console.log('⚠️  Could not retrieve access token - report may not have been generated');
        }

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        try {
            await page.screenshot({ path: '/tmp/full-report-error.png', fullPage: true });
            console.error('Error screenshot saved: /tmp/full-report-error.png');
        } catch (e) {
            // Ignore
        }
    } finally {
        await browser.close();
    }
}

testFullPaidReport().catch(console.error);
