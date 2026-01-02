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

async function testCompleteFormReport() {
    console.log('\n🎯 COMPLETE FORM WITH ALL FIELDS - LIVE BROWSER VIEW\n');
    console.log('═══════════════════════════════════════════════════════════\n');

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    page.setViewportSize({ width: 1400, height: 900 });

    let accessToken = null;
    let reportData = null;

    try {
        // STEP 1: Fill COMPLETE form with all fields
        console.log('STEP 1: Filling COMPLETE form with all fields...');
        const BASE_URL = 'https://carnivoreweekly.com/calculator.html';

        await page.goto(BASE_URL);
        await page.waitForTimeout(2000);

        // ===== BASIC FORM FIELDS =====
        console.log('  - Basic info (sex, age, height, weight)');
        await page.selectOption('#sex', 'female');
        await page.fill('#age', '38');
        await page.fill('#heightFeet', '5');
        await page.fill('#heightInches', '6');
        await page.fill('#weight', '165');

        console.log('  - Lifestyle & exercise');
        await page.selectOption('#lifestyle', '1.4');  // Standing job
        await page.selectOption('#exercise', '0.3');   // 4-5x/week, intense

        console.log('  - Goals & diet');
        await page.selectOption('#goal', 'lose');
        await page.fill('#deficit', '20');
        await page.selectOption('#diet', 'carnivore');
        await page.waitForTimeout(500); // Wait for diet options to update

        // Set diet-specific options - only fill visible fields
        try {
            const ratioVisible = await page.isVisible('#ratio');
            if (ratioVisible) {
                await page.selectOption('#ratio', '70-30');
            }
        } catch (e) {}

        try {
            const proteinVisible = await page.isVisible('#proteinMin');
            if (proteinVisible) {
                await page.selectOption('#proteinMin', '1.6');
            }
        } catch (e) {}

        try {
            const netCarbsVisible = await page.isVisible('#netCarbs');
            if (netCarbsVisible) {
                await page.fill('#netCarbs', '20');
            }
        } catch (e) {}

        console.log('✅ Basic form completely filled\n');

        // Calculate macros
        console.log('STEP 2: Calculate macros...');
        await page.click('#calculateBtn');
        await page.waitForTimeout(2000);
        await page.waitForSelector('#resultsSection:not(.hidden)', { timeout: 10000 });
        console.log('✅ Macros calculated\n');

        // Upgrade to paid
        console.log('STEP 3: Upgrade to paid version...');
        const upgradeBtn = await page.locator('button:has-text("Upgrade for")').first();
        await upgradeBtn.click();
        await page.waitForTimeout(2000);
        console.log('✅ Advanced form revealed\n');

        // ===== ADVANCED FORM FIELDS =====
        console.log('STEP 4: Filling ALL advanced form fields...\n');

        console.log('  - Contact & demographics');
        await page.fill('#email', 'complete.form@example.com');
        await page.fill('input[name="firstName"]', 'Sarah');

        console.log('  - Medical history');
        await page.fill('textarea[name="medications"]', 'Metformin for prediabetes, levothyroxine for hypothyroidism, vitamin D3 supplement');

        console.log('  - Health conditions (checking multiple)');
        await page.check('#diabetes');
        await page.check('#thyroid');
        await page.check('#inflammation');

        console.log('  - Allergies & intolerances');
        await page.fill('textarea[name="allergies"]', 'Shellfish allergy (mild), slightly lactose intolerant');

        console.log('  - Food preferences');
        await page.fill('textarea[name="avoidFoods"]', 'Don\'t like organ meats, prefer ground beef over steak, can\'t digest dairy well');

        console.log('  - Diet history');
        await page.fill('textarea[name="previousDiets"]', 'Keto for 8 months (lost 20lbs but plateaued), low-carb for 2 years (sustained weight loss)');

        console.log('  - Carnivore experience');
        await page.selectOption('select[name="carnivoreExperience"]', 'months');

        console.log('  - Protocol preference');
        await page.selectOption('select[name="selectedProtocol"]', 'carnivore');

        console.log('  - Health goals (checking multiple)');
        await page.check('#weightloss');
        await page.check('#energy');
        await page.check('#guthealth');

        console.log('  - Additional notes');
        await page.fill('textarea[name="additionalNotes"]', 'Work long hours with unpredictable schedule, travel frequently for business. Need flexible meal prep options. Recently had blood work showing improved lipid profile. Want to maintain muscle while losing remaining 15lbs.');

        console.log('\n✅ ALL advanced form fields completely filled\n');

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
                ratio: document.getElementById('ratio').value,
                proteinMin: document.getElementById('proteinMin').value,
                netCarbs: document.getElementById('netCarbs').value,
                email: document.getElementById('email').value,
                firstName: document.querySelector('input[name="firstName"]')?.value,
                medications: document.querySelector('textarea[name="medications"]')?.value,
                conditions: Array.from(document.querySelectorAll('input[name="conditions"]:checked')).map(cb => cb.value),
                allergies: document.querySelector('textarea[name="allergies"]')?.value,
                avoidFoods: document.querySelector('textarea[name="avoidFoods"]')?.value,
                previousDiets: document.querySelector('textarea[name="previousDiets"]')?.value,
                carnivoreExperience: document.querySelector('select[name="carnivoreExperience"]')?.value,
                selectedProtocol: document.querySelector('select[name="selectedProtocol"]')?.value,
                goals: Array.from(document.querySelectorAll('input[name="goals"]:checked')).map(cb => cb.value),
                additionalNotes: document.querySelector('textarea[name="additionalNotes"]')?.value,
                path_choice: 'paid'
            };
        });

        console.log('Collected form data:');
        console.log(`  ✅ Age: ${formData.age}`);
        console.log(`  ✅ Weight: ${formData.weight} lbs`);
        console.log(`  ✅ Height: ${formData.heightFeet}'${formData.heightInches}"`);
        console.log(`  ✅ Conditions: ${formData.conditions.join(', ')}`);
        console.log(`  ✅ Goals: ${formData.goals.join(', ')}`);
        console.log(`  ✅ Additional notes: "${formData.additionalNotes.substring(0, 50)}..."\n`);

        // Simulate payment
        await page.evaluate((data) => {
            localStorage.setItem('pending_report_data', JSON.stringify(data));
            localStorage.setItem('payment_initiated', Date.now().toString());
        }, formData);

        await page.goto(BASE_URL + '?success=true');
        await page.waitForTimeout(3000);

        console.log('STEP 5: Payment success triggered\n');

        // Wait for report generation
        console.log('STEP 6: Waiting for report generation...\n');

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

        // Retrieve report
        console.log('STEP 7: Retrieving full personalized report...\n');

        reportData = await retrieveFullReport(accessToken);
        if (!reportData) {
            throw new Error('Failed to retrieve report');
        }

        console.log('✅ Report retrieved\n');

        // Display report
        console.log('STEP 8: Displaying personalized report in browser...\n');
        console.log('═══════════════════════════════════════════════════════════\n');
        console.log('📊 REPORT DETAILS:');
        console.log(`  Name: Sarah`);
        console.log(`  Email: complete.form@example.com`);
        console.log(`  Age: 38 | Weight: 165 lbs | Height: 5'6"`);
        console.log(`  Goal: Fat loss (-20% deficit)`);
        console.log(`  Conditions: Diabetes, Thyroid, Inflammation`);
        console.log(`  Goals: Weight loss, Energy, Gut health`);
        console.log(`  Experience: Less than 6 months of carnivore`);
        console.log(`  Word Count: ${reportData.report_html.split(/\s+/).length} words`);
        console.log(`  Generated: ${new Date(reportData.created_at).toLocaleString()}`);
        console.log(`  Expires: ${new Date(reportData.expires_at).toLocaleString()}`);
        console.log('\n═══════════════════════════════════════════════════════════\n');
        console.log('✅ Report displayed in browser window.');
        console.log('⏳ Browser will stay open. Close it when done.\n');

        if (reportData.report_html) {
            // Display the report
            await page.setContent(reportData.report_html, { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(1000);

            // Keep browser open indefinitely
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

testCompleteFormReport().catch(console.error);
