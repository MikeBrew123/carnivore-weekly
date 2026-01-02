import { chromium } from 'playwright';

const BASE_URL = 'https://carnivoreweekly.com/calculator.html';

async function testPaymentWithErrorCapture() {
    console.log('\n🧪 TESTING PAYMENT SUCCESS WITH ERROR CAPTURE\n');

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Capture console messages and errors
    let apiError = null;
    let apiResponse = null;

    page.on('console', msg => {
        console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
        if (msg.text().includes('Report generation error')) {
            apiError = msg.text();
        }
    });

    try {
        // Complete paid flow form
        console.log('STEP 1: Fill and calculate form');
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

        console.log('✅ Calculated macros');

        // Click upgrade
        const upgradeBtn = await page.locator('button:has-text("Upgrade for")').first();
        await upgradeBtn.click();
        await page.waitForTimeout(2000);

        console.log('✅ Advanced form revealed');

        // Fill advanced form
        await page.fill('#email', 'testuser@example.com');

        // Intercept fetch to see actual API response
        page.on('response', async response => {
            if (response.url().includes('carnivore-report-api')) {
                try {
                    const body = await response.json();
                    apiResponse = body;
                    console.log('\n[API Response Captured]:');
                    console.log(JSON.stringify(body, null, 2));
                } catch (e) {
                    console.log('[API Response - text]:');
                    const text = await response.text();
                    console.log(text);
                }
            }
        });

        // Prepare form data in localStorage
        console.log('\nSTEP 2: Prepare form data');
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

        console.log('✅ Form data prepared:');
        console.log(`   - Email: ${formData.email}`);
        console.log(`   - Age: ${formData.age}`);

        // Simulate payment success
        console.log('\nSTEP 3: Simulate payment success');
        await page.evaluate((data) => {
            localStorage.setItem('pending_report_data', JSON.stringify(data));
            localStorage.setItem('payment_initiated', Date.now().toString());
        }, formData);

        await page.goto(BASE_URL + '?success=true');
        await page.waitForTimeout(3000);

        console.log('✅ Navigated to payment success');

        // Wait for progress and API call
        console.log('\nSTEP 4: Wait for report generation');
        await page.waitForTimeout(60000); // Wait up to 60 seconds

        // Check what's on the page
        const pageContent = await page.content();
        const hasSuccessMsg = pageContent.includes('success') || pageContent.includes('✅');
        const hasErrorMsg = pageContent.includes('Something Went Wrong') || pageContent.includes('Error');

        console.log(`\nFinal State:`);
        console.log(`  Success message found: ${hasSuccessMsg}`);
        console.log(`  Error message found: ${hasErrorMsg}`);

        // Capture screenshot
        await page.screenshot({ path: '/tmp/payment-error-capture.png', fullPage: true });
        console.log('\n✅ Screenshot saved: /tmp/payment-error-capture.png');

        if (apiResponse) {
            console.log('\n📊 API Response was:');
            console.log(JSON.stringify(apiResponse, null, 2));
        }

        if (apiError) {
            console.log('\n❌ API Error:');
            console.log(apiError);
        }

    } catch (error) {
        console.error('\n❌ TEST ERROR:', error.message);
    } finally {
        await browser.close();
    }
}

testPaymentWithErrorCapture().catch(console.error);
