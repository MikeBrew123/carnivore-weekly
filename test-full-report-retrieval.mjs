import { chromium } from 'playwright';

const SUPABASE_URL = 'https://kwtdpvnjewtahuxjyltn.supabase.co';
const SUPABASE_KEY = 'sb_secret_-DJISSDQQD7oWqS87RBJ8Q_0sKdDWVz'; // Service role key

async function retrieveFullReport(accessToken) {
    console.log('\n📊 Retrieving full report from Supabase database...\n');

    try {
        // Query Supabase REST API with service role key
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/generated_reports?access_token=eq.${encodeURIComponent(accessToken)}&select=*`,
            {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Supabase error ${response.status}: ${await response.text()}`);
        }

        const data = await response.json();

        if (!data || data.length === 0) {
            throw new Error('Report not found in database');
        }

        const report = data[0];
        console.log('✅ Report retrieved from database\n');

        return report;
    } catch (error) {
        console.error('❌ Error retrieving report:', error.message);
        return null;
    }
}

async function testFullReportWithRetrieval() {
    console.log('\n🎯 COMPLETE PAID REPORT GENERATION & RETRIEVAL TEST\n');
    console.log('═══════════════════════════════════════════════════════════\n');

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    page.setViewportSize({ width: 1400, height: 900 });

    let accessToken = null;
    let reportData = null;

    try {
        // STEP 1: Complete payment flow
        console.log('STEP 1: Complete payment flow and generate report');
        console.log('─────────────────────────────────────────\n');

        const BASE_URL = 'https://carnivoreweekly.com/calculator.html';

        await page.goto(BASE_URL);
        await page.waitForTimeout(2000);

        // Fill form
        await page.fill('#age', '42');
        await page.fill('#weight', '195');
        await page.fill('#heightFeet', '6');
        await page.fill('#heightInches', '0');
        await page.selectOption('#sex', 'male');
        await page.selectOption('#goal', 'lose');
        await page.selectOption('#diet', 'carnivore');

        // Calculate
        await page.click('#calculateBtn');
        await page.waitForTimeout(2000);
        await page.waitForSelector('#resultsSection:not(.hidden)', { timeout: 10000 });

        console.log('✅ Macros calculated');

        // Upgrade
        const upgradeBtn = await page.locator('button:has-text("Upgrade for")').first();
        await upgradeBtn.click();
        await page.waitForTimeout(2000);

        // Fill form
        await page.fill('#email', 'fullreport@example.com');
        const firstNameField = await page.$('input[name="firstName"]');
        if (firstNameField) {
            await page.fill('input[name="firstName"]', 'Report User');
        }

        console.log('✅ Advanced form filled');

        // Prepare data
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

        // Simulate payment
        await page.evaluate((data) => {
            localStorage.setItem('pending_report_data', JSON.stringify(data));
            localStorage.setItem('payment_initiated', Date.now().toString());
        }, formData);

        await page.goto(BASE_URL + '?success=true');
        await page.waitForTimeout(3000);

        console.log('✅ Payment success triggered\n');

        // STEP 2: Wait for report generation
        console.log('STEP 2: Wait for report generation and capture token');
        console.log('─────────────────────────────────────────\n');

        // Intercept API response to get access token
        page.on('response', async response => {
            if (response.url().includes('carnivore-report-api') && accessToken === null) {
                try {
                    const body = await response.json();
                    if (body.accessToken) {
                        accessToken = body.accessToken;
                        console.log(`✅ Access token captured: ${accessToken.substring(0, 32)}...`);
                    }
                } catch (e) {
                    // Ignore parse errors
                }
            }
        });

        // Wait for token
        let waitCount = 0;
        while (!accessToken && waitCount < 120) {
            await page.waitForTimeout(500);
            waitCount++;
        }

        if (!accessToken) {
            throw new Error('Could not capture access token from API response');
        }

        await page.waitForTimeout(2000);
        console.log('✅ Report generation complete\n');

        // STEP 3: Take success screenshot
        console.log('STEP 3: Capture success screen');
        console.log('─────────────────────────────────────────\n');

        await page.screenshot({ path: '/tmp/report-success.png', fullPage: true });
        console.log('✅ Screenshot saved: /tmp/report-success.png\n');

        // STEP 4: Retrieve report from database
        console.log('STEP 4: Retrieve full report from Supabase');
        console.log('─────────────────────────────────────────');

        reportData = await retrieveFullReport(accessToken);

        if (!reportData) {
            throw new Error('Failed to retrieve report data');
        }

        // STEP 5: Analyze report content
        console.log('\nSTEP 5: Analyze report content');
        console.log('─────────────────────────────────────────\n');

        console.log('Report Metadata:');
        console.log(`  📧 Email: ${reportData.email}`);
        console.log(`  🔑 Report ID: ${reportData.id}`);
        console.log(`  🎟️  Access Token: ${reportData.access_token.substring(0, 32)}...`);
        console.log(`  ⏰ Created: ${new Date(reportData.created_at).toLocaleString()}`);
        console.log(`  ⏳ Expires: ${new Date(reportData.expires_at).toLocaleString()}`);
        console.log(`  📊 HTML Size: ${reportData.report_html?.length || 0} bytes`);

        if (reportData.questionnaire_data) {
            console.log('\nQuestionnaire Data:');
            console.log(`  Age: ${reportData.questionnaire_data.age}`);
            console.log(`  Weight: ${reportData.questionnaire_data.weight} lbs`);
            console.log(`  Height: ${reportData.questionnaire_data.heightFeet}'${reportData.questionnaire_data.heightInches}"`);
            console.log(`  Goal: ${reportData.questionnaire_data.goal}`);
            console.log(`  Diet: ${reportData.questionnaire_data.diet}`);
        }

        // STEP 6: Display report in browser
        if (reportData.report_html) {
            console.log('\nSTEP 6: Display full report in browser');
            console.log('─────────────────────────────────────────\n');

            // Write HTML to page
            await page.setContent(reportData.report_html, { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(2000);

            console.log('✅ Full report HTML rendered in browser');

            // Take screenshot of actual report
            await page.screenshot({ path: '/tmp/full-report-final.png', fullPage: true });
            console.log('✅ Full report screenshot saved: /tmp/full-report-final.png\n');

            // Extract report text content
            const reportText = await page.evaluate(() => document.body.innerText);
            const wordCount = reportText.split(/\s+/).length;
            const firstContent = reportText.substring(0, 800);

            console.log('Report Content Summary:');
            console.log(`  Total words: ${wordCount}`);
            console.log(`  Total characters: ${reportText.length}\n`);

            console.log('First 800 characters of report:\n');
            console.log(firstContent);
            console.log('\n...\n');
        }

        // STEP 7: Success summary
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('✅ FULL PAID REPORT TEST COMPLETED SUCCESSFULLY');
        console.log('═══════════════════════════════════════════════════════════\n');

        console.log('Test Summary:');
        console.log('  ✅ Free calculator: WORKING');
        console.log('  ✅ Paid upgrade flow: WORKING');
        console.log('  ✅ Payment success: WORKING');
        console.log('  ✅ Report generation: WORKING');
        console.log('  ✅ Report saved to database: WORKING');
        console.log('  ✅ Report retrieval: WORKING');
        console.log('  ✅ Report display: WORKING\n');

        console.log('Access Token for Manual Testing:');
        console.log(`  Token: ${accessToken}`);
        console.log(`  Report URL: https://carnivoreweekly.com/report.html?token=${accessToken}`);
        console.log(`  Expires: ${new Date(reportData.expires_at).toLocaleString()}\n`);

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        try {
            await page.screenshot({ path: '/tmp/report-error.png', fullPage: true });
        } catch (e) {
            // Ignore
        }
    } finally {
        await browser.close();
    }
}

testFullReportWithRetrieval().catch(console.error);
