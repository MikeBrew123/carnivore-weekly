import { chromium } from 'playwright';

const SUPABASE_URL = 'https://kwtdpvnjewtahuxjyltn.supabase.co';
const SUPABASE_KEY = 'sb_secret_-DJISSDQQD7oWqS87RBJ8Q_0sKdDWVz';

async function retrieveFullReport(accessToken) {
    try {
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
            throw new Error(`Supabase error ${response.status}`);
        }

        const data = await response.json();
        if (!data || data.length === 0) {
            throw new Error('Report not found');
        }

        return data[0];
    } catch (error) {
        console.error('Error retrieving report:', error.message);
        return null;
    }
}

async function testViewFullReport() {
    console.log('\n🎯 COMPLETE PAID REPORT - LIVE BROWSER VIEW\n');
    console.log('═══════════════════════════════════════════════════════════\n');

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    page.setViewportSize({ width: 1400, height: 900 });

    let accessToken = null;
    let reportData = null;

    try {
        // STEP 1: Complete payment flow
        console.log('STEP 1: Going through payment flow...');
        const BASE_URL = 'https://carnivoreweekly.com/calculator.html';

        await page.goto(BASE_URL);
        await page.waitForTimeout(2000);

        // Fill form
        await page.fill('#age', '45');
        await page.fill('#weight', '200');
        await page.fill('#heightFeet', '5');
        await page.fill('#heightInches', '11');
        await page.selectOption('#sex', 'male');
        await page.selectOption('#goal', 'lose');
        await page.selectOption('#diet', 'carnivore');

        // Calculate
        await page.click('#calculateBtn');
        await page.waitForTimeout(2000);
        await page.waitForSelector('#resultsSection:not(.hidden)', { timeout: 10000 });

        console.log('✅ Macros calculated\n');

        // Upgrade
        const upgradeBtn = await page.locator('button:has-text("Upgrade for")').first();
        await upgradeBtn.click();
        await page.waitForTimeout(2000);

        // Fill advanced form
        await page.fill('#email', 'viewreport@example.com');
        const firstNameField = await page.$('input[name="firstName"]');
        if (firstNameField) {
            await page.fill('input[name="firstName"]', 'Report Viewer');
        }

        console.log('✅ Advanced form filled\n');

        // Prepare and simulate payment
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

        await page.evaluate((data) => {
            localStorage.setItem('pending_report_data', JSON.stringify(data));
            localStorage.setItem('payment_initiated', Date.now().toString());
        }, formData);

        await page.goto(BASE_URL + '?success=true');
        await page.waitForTimeout(3000);

        console.log('✅ Payment success triggered\n');

        // STEP 2: Wait for report generation
        console.log('STEP 2: Waiting for report generation (monitoring API response)...\n');

        page.on('response', async response => {
            if (response.url().includes('carnivore-report-api') && accessToken === null) {
                try {
                    const body = await response.json();
                    if (body.accessToken) {
                        accessToken = body.accessToken;
                        console.log(`✅ Access token captured: ${accessToken.substring(0, 32)}...`);
                    }
                } catch (e) {
                    // Ignore
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
            throw new Error('Could not capture access token');
        }

        await page.waitForTimeout(2000);
        console.log('✅ Report generation complete\n');

        // STEP 3: Retrieve report from database
        console.log('STEP 3: Retrieving full report from database...\n');

        reportData = await retrieveFullReport(accessToken);
        if (!reportData) {
            throw new Error('Failed to retrieve report');
        }

        console.log('✅ Report retrieved\n');

        // STEP 4: Display report in browser
        console.log('STEP 4: Displaying full report in browser window...\n');
        console.log('═══════════════════════════════════════════════════════════\n');
        console.log('Report is now displayed in your browser.');
        console.log(`Email: ${reportData.email}`);
        console.log(`Generated: ${new Date(reportData.created_at).toLocaleString()}`);
        console.log(`Expires: ${new Date(reportData.expires_at).toLocaleString()}`);
        console.log(`Word Count: ${reportData.report_html.split(/\s+/).length}`);
        console.log('\n(Browser window will stay open. Close it when you\'re done viewing.)\n');
        console.log('═══════════════════════════════════════════════════════════\n');

        if (reportData.report_html) {
            // Display the report in the browser
            await page.setContent(reportData.report_html, { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(1000);

            // Keep browser open indefinitely until user closes it
            console.log('✅ Report displayed. Keeping browser open...');
            console.log('⏳ Browser will stay open until you close it manually.\n');

            // Keep the script running
            await new Promise(() => {
                // This never resolves, keeping the browser open
            });
        }

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.log('\nClosing browser in 10 seconds...');
        await page.waitForTimeout(10000);
        await browser.close();
    }
}

testViewFullReport().catch(console.error);
