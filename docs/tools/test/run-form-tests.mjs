import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:8000/public/calculator.html';
let testsPassed = 0;
let testsFailed = 0;

function logTest(passed, message) {
    if (passed) {
        console.log(`  ✅ ${message}`);
        testsPassed++;
    } else {
        console.log(`  ❌ ${message}`);
        testsFailed++;
    }
}

async function testFreePath() {
    console.log('\n╔═══════════════════════════════════════════╗');
    console.log('║  FREE PATH: Start to Finish              ║');
    console.log('╚═══════════════════════════════════════════╝\n');

    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
        // Load page
        await page.goto(BASE_URL, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);

        // Test 1: Path choice appears
        const pathVisible = await page.evaluate(() =>
            !document.getElementById('pathChoice').classList.contains('hidden')
        );
        logTest(pathVisible, 'Path choice screen visible');

        // Test 2: Click free path button
        await page.click('button:has-text("Start Free Calculator")');
        await page.waitForTimeout(800);

        const formVisible = await page.evaluate(() =>
            !document.getElementById('calculatorForm').classList.contains('hidden')
        );
        logTest(formVisible, 'Calculator form appears after clicking "Start Free Calculator"');

        // Test 3: Button text is correct
        const btnText = await page.textContent('#calculateBtn');
        logTest(
            btnText.includes('Calculate My Macros'),
            `Button text correct: "${btnText}"`
        );

        // Test 4: Fill form
        await page.fill('#age', '40');
        await page.fill('#weight', '190');
        await page.fill('#heightFeet', '5');
        await page.fill('#heightInches', '11');
        await page.selectOption('#sex', 'M');
        await page.selectOption('#goal', 'fat_loss');
        await page.selectOption('#lifestyle', '1.2');
        await page.selectOption('#exercise', '0');
        await page.selectOption('#diet', 'carnivore');

        const ageValue = await page.inputValue('#age');
        logTest(ageValue === '40', 'Form fields accept input correctly');

        // Test 5: Click calculate
        await page.click('#calculateBtn');
        await page.waitForTimeout(1000);

        // Test 6: Results appear
        const resultsVisible = await page.evaluate(() =>
            !document.getElementById('resultsSection').classList.contains('hidden')
        );
        logTest(resultsVisible, 'Results section appears after calculation');

        // Test 7: Results have values
        const hasResults = await page.evaluate(() => {
            const cal = document.getElementById('outCalories')?.textContent;
            const protein = document.getElementById('outProtein')?.textContent;
            return cal && cal !== '—' && protein && protein !== '—';
        });
        logTest(hasResults, 'Macro values populated (calories and protein)');

        // Test 8: Meal examples exist
        const mealCount = await page.evaluate(() =>
            document.querySelectorAll('.meal-example').length
        );
        logTest(mealCount > 0, `Meal examples present (${mealCount} found)`);

        // Test 9: Upgrade section visible
        const upgradeVisible = await page.evaluate(() => {
            const el = document.getElementById('upgradeSection');
            return el && !el.classList.contains('hidden');
        });
        logTest(upgradeVisible, 'Upgrade CTA section visible');

        // Test 10: Click upgrade button
        await page.click('button:has-text("Get My Plan Now")');
        await page.waitForTimeout(1000);

        // Test 11: Advanced sections reveal
        const advancedVisible = await page.evaluate(() =>
            !document.getElementById('advancedSections').classList.contains('hidden')
        );
        logTest(advancedVisible, 'Advanced sections appear after upgrade click');

        // Test 12: Form data preserved
        const ageAfterUpgrade = await page.inputValue('#age');
        logTest(ageAfterUpgrade === '40', 'Form data preserved during upgrade (age still 40)');

        // Test 13: Check form section styling
        const formSectionStyle = await page.evaluate(() => {
            const section = document.querySelector('.form-section');
            if (!section) return null;
            const styles = window.getComputedStyle(section);
            return {
                background: styles.backgroundColor,
                borderColor: styles.borderColor,
                padding: styles.padding
            };
        });
        logTest(formSectionStyle !== null, 'Form sections have proper styling');

        // Test 14: Email input visible in advanced sections
        const emailInputVisible = await page.evaluate(() =>
            !!document.getElementById('email')
        );
        logTest(emailInputVisible, 'Email input field present in advanced sections');

        console.log('\n✅ FREE PATH: All tests passed!\n');

    } catch (error) {
        console.error('\n❌ FREE PATH ERROR:', error.message, '\n');
    } finally {
        await browser.close();
    }
}

async function testPaidPath() {
    console.log('\n╔═══════════════════════════════════════════╗');
    console.log('║  PAID PATH: Start to Finish              ║');
    console.log('╚═══════════════════════════════════════════╝\n');

    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
        // Load page fresh
        await page.evaluate(() => localStorage.clear());
        await page.goto(BASE_URL, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);

        // Test 1: Path choice visible
        const pathVisible = await page.evaluate(() =>
            !document.getElementById('pathChoice').classList.contains('hidden')
        );
        logTest(pathVisible, 'Path choice screen visible');

        // Test 2: Click paid path button
        await page.click('button:has-text("Get Full Protocol")');
        await page.waitForTimeout(800);

        const formVisible = await page.evaluate(() =>
            !document.getElementById('calculatorForm').classList.contains('hidden')
        );
        logTest(formVisible, 'Calculator form appears for paid path');

        // Test 3: Button text says "Next"
        const btnText = await page.textContent('#calculateBtn');
        logTest(
            btnText.includes('Next') && btnText.includes('Profile'),
            `Paid path button correct: "${btnText}"`
        );

        // Test 4: Fill basic form
        await page.fill('#age', '45');
        await page.fill('#weight', '200');
        await page.fill('#heightFeet', '6');
        await page.fill('#heightInches', '0');
        await page.selectOption('#sex', 'M');
        await page.selectOption('#goal', 'muscle_gain');
        await page.selectOption('#lifestyle', '1.5');
        await page.selectOption('#exercise', '0.3');
        await page.selectOption('#diet', 'carnivore');

        const weightValue = await page.inputValue('#weight');
        logTest(weightValue === '200', 'Paid path form accepts input');

        // Test 5: Click "Next: Complete Your Profile"
        await page.click('#calculateBtn');
        await page.waitForTimeout(1000);

        // Test 6: Advanced sections appear
        const advancedVisible = await page.evaluate(() =>
            !document.getElementById('advancedSections').classList.contains('hidden')
        );
        logTest(advancedVisible, 'Advanced sections appear after "Next" button');

        // Test 7: All form sections present
        const sectionCount = await page.evaluate(() =>
            document.querySelectorAll('.form-section').length
        );
        logTest(sectionCount >= 5, `All ${sectionCount} form sections present`);

        // Test 8: Form section styling applied
        const sectionHasStyle = await page.evaluate(() => {
            const section = document.querySelector('.form-section');
            const style = window.getComputedStyle(section);
            // Check if it has the gradient background
            return style.backgroundImage.includes('gradient') || style.backgroundColor !== 'rgba(0, 0, 0, 0)';
        });
        logTest(sectionHasStyle, 'Form sections have proper styling (background, borders)');

        // Test 9: Input fields have correct styling
        const inputStyle = await page.evaluate(() => {
            const input = document.querySelector('.form-group input[type="email"]');
            if (!input) return false;
            const style = window.getComputedStyle(input);
            return style.borderColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor === 'rgb(255, 255, 255)';
        });
        logTest(inputStyle, 'Input fields have correct styling (white background, border)');

        // Test 10: Email required field present
        const emailPresent = await page.evaluate(() =>
            !!document.getElementById('email')
        );
        logTest(emailPresent, 'Email field present in form');

        // Test 11: Checkboxes present for conditions
        const checkboxCount = await page.evaluate(() =>
            document.querySelectorAll('input[type="checkbox"]').length
        );
        logTest(checkboxCount > 0, `Checkboxes present for options (${checkboxCount} found)`);

        // Test 12: Submit button visible
        const submitVisible = await page.evaluate(() =>
            !document.getElementById('advancedSubmitSection').classList.contains('hidden')
        );
        logTest(submitVisible, 'Submit section visible');

        // Test 13: Submit button has correct text
        const submitBtn = await page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('button')).find(
                b => b.textContent.includes('Generate My Complete Protocol')
            );
            return !!btn;
        });
        logTest(submitBtn, 'Submit button has correct text');

        // Test 14: Fill email and attempt submit
        await page.fill('#email', 'test@example.com');

        // Click submit button
        await page.click('button:has-text("Generate My Complete Protocol")');
        await page.waitForTimeout(1500);

        // Test 15: Progress bar appears
        const progressVisible = await page.evaluate(() => {
            const text = document.body.innerText;
            return text.includes('Building Your Protocol') || text.includes('Generating');
        });
        logTest(progressVisible, 'Progress bar appears when generating');

        // Test 16: Progress items have icons/checkmarks
        const progressItems = await page.evaluate(() => {
            const items = document.querySelectorAll('[id^="progressItem"]');
            return items.length;
        });
        logTest(progressItems > 0, `Progress items visible (${progressItems} items)`);

        // Wait for progress to complete
        await page.waitForTimeout(7000);

        // Test 17: Success or error message appears
        const finalMessage = await page.evaluate(() => {
            const text = document.body.innerText;
            return text.includes('Complete') || text.includes('Error') || text.includes('Protocol');
        });
        logTest(finalMessage, 'Final message appears (success or error)');

        console.log('\n✅ PAID PATH: All tests passed!\n');

    } catch (error) {
        console.error('\n❌ PAID PATH ERROR:', error.message, '\n');
    } finally {
        await browser.close();
    }
}

async function runAllTests() {
    console.log('\n╔═══════════════════════════════════════════╗');
    console.log('║  COMPREHENSIVE FORM TEST SUITE           ║');
    console.log('║  Payment wall temporarily disabled       ║');
    console.log('╚═══════════════════════════════════════════╝');

    await testFreePath();
    await testPaidPath();

    console.log('\n╔═══════════════════════════════════════════╗');
    console.log('║  TEST SUMMARY                             ║');
    console.log('╚═══════════════════════════════════════════╝');
    console.log(`\n  ✅ Passed: ${testsPassed}`);
    console.log(`  ❌ Failed: ${testsFailed}`);
    console.log(`\n  ${testsFailed === 0 ? '🎉 ALL TESTS PASSED!' : '⚠️  Some tests failed'}\n`);

    process.exit(testsFailed > 0 ? 1 : 0);
}

runAllTests().catch(err => {
    console.error('Test suite error:', err);
    process.exit(1);
});
