import { chromium } from 'playwright';

const BASE_URL = 'https://carnivoreweekly.com/calculator.html';

async function testFreeFlow() {
    console.log('\n🧪 TESTING FREE FLOW - START TO FINISH\n');
    console.log('═══════════════════════════════════════════════════════════\n');

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    page.setViewportSize({ width: 1400, height: 900 });

    try {
        // TEST 1: Page loads with calculator visible
        console.log('TEST 1: Page loads with calculator visible');
        console.log('─────────────────────────────────────────');
        await page.goto(BASE_URL);
        await page.waitForTimeout(2000);

        const calcFormVisible = await page.isVisible('#calculatorForm');
        const pathChoiceExists = await page.$('#pathChoice');

        console.log(`✅ Calculator form visible: ${calcFormVisible}`);
        console.log(`✅ Path choice removed: ${pathChoiceExists === null}`);

        if (!calcFormVisible) {
            throw new Error('Calculator form not visible!');
        }

        // TEST 2: Fill basic form with test data
        console.log('\nTEST 2: Fill basic form and calculate');
        console.log('─────────────────────────────────────────');

        await page.fill('#age', '35');
        await page.fill('#weight', '180');
        await page.fill('#heightFeet', '5');
        await page.fill('#heightInches', '10');
        await page.selectOption('#sex', 'male');
        await page.selectOption('#goal', 'lose');
        await page.selectOption('#diet', 'carnivore');

        console.log('✅ Filled: Age=35, Weight=180, Height=5\'10", Sex=Male, Goal=Loss, Diet=Carnivore');

        // TEST 3: Click calculate
        console.log('\nTEST 3: Click "Calculate My Macros"');
        console.log('─────────────────────────────────────────');

        await page.click('#calculateBtn');
        await page.waitForTimeout(2000);

        // Wait for results section to be visible (hidden class removed)
        await page.waitForSelector('#resultsSection:not(.hidden)', { timeout: 10000 });

        const resultsVisible = await page.isVisible('#resultsSection');
        console.log(`✅ Results section visible: ${resultsVisible}`);

        if (!resultsVisible) {
            throw new Error('Results section not visible after calculate!');
        }

        // TEST 4: Verify results content
        console.log('\nTEST 4: Verify results displayed');
        console.log('─────────────────────────────────────────');

        const caloriesText = await page.textContent('#outCalories');
        const proteinText = await page.textContent('#outProtein');
        const fatText = await page.textContent('#outFat');
        const carbsText = await page.textContent('#outCarbs');

        console.log(`✅ Calories: ${caloriesText ? caloriesText.trim() : 'N/A'}`);
        console.log(`✅ Protein: ${proteinText ? proteinText.trim() : 'N/A'}`);
        console.log(`✅ Fat: ${fatText ? fatText.trim() : 'N/A'}`);
        console.log(`✅ Carbs: ${carbsText ? carbsText.trim() : 'N/A'}`);

        // TEST 5: Check two buttons present
        console.log('\nTEST 5: Verify Free & Upgrade buttons');
        console.log('─────────────────────────────────────────');

        const freeBtn = await page.locator('button:has-text("Build Free Report")').first();
        const upgradeBtn = await page.locator('button:has-text("Upgrade for")').first();

        const freeBtnVisible = await freeBtn.isVisible();
        const upgradeBtnVisible = await upgradeBtn.isVisible();

        console.log(`✅ "Build Free Report" button visible: ${freeBtnVisible}`);
        console.log(`✅ "Upgrade for $9.99" button visible: ${upgradeBtnVisible}`);

        if (!freeBtnVisible || !upgradeBtnVisible) {
            throw new Error('Results buttons missing!');
        }

        // TEST 6: Click "Build Free Report"
        console.log('\nTEST 6: Click "Build Free Report" button');
        console.log('─────────────────────────────────────────');

        const btnText = await freeBtn.textContent();
        console.log(`Button text: "${btnText.trim()}"`);

        await freeBtn.click();
        console.log('✅ Clicked "Build Free Report"');

        // TEST 7: Wait for report generation to complete
        console.log('\nTEST 7: Wait for report generation');
        console.log('─────────────────────────────────────────');

        // Wait for the report to be generated (the submitBasicReport function will process it)
        await page.waitForTimeout(5000);

        // Check if meal examples are shown (indicating results)
        const mealExamplesVisible = await page.isVisible('#mealExamples');
        console.log(`✅ Meal examples visible: ${mealExamplesVisible}`);

        // TEST 8: Take full page screenshot
        console.log('\nTEST 8: Capture final report screen');
        console.log('─────────────────────────────────────────');

        await page.screenshot({ path: '/tmp/free-flow-final.png', fullPage: true });
        console.log('✅ Full page screenshot saved: /tmp/free-flow-final.png');

        // TEST 9: Verify page content after report generation
        console.log('\nTEST 9: Verify final report content');
        console.log('─────────────────────────────────────────');

        const pageTitle = await page.title();
        const heading = await page.textContent('h1, h2');
        console.log(`✅ Page title: "${pageTitle}"`);
        console.log(`✅ Page heading: "${heading ? heading.substring(0, 100) : 'N/A'}"`);

        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('✅ FREE FLOW TEST COMPLETED SUCCESSFULLY');
        console.log('═══════════════════════════════════════════════════════════\n');

        return { success: true, type: 'free' };

    } catch (error) {
        console.error('\n❌ FREE FLOW TEST FAILED:', error.message);
        try {
            await page.screenshot({ path: '/tmp/free-flow-error.png', fullPage: true });
            console.error('Error screenshot saved: /tmp/free-flow-error.png');
        } catch (e) {
            // Ignore screenshot errors
        }
        return { success: false, type: 'free', error: error.message };
    } finally {
        await browser.close();
    }
}

testFreeFlow().then(result => {
    process.exit(result.success ? 0 : 1);
}).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
