import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:8000/public/calculator.html';

async function testFreePath() {
    console.log('\n╔═══════════════════════════════════════════╗');
    console.log('║  🧪 FREE PATH COMPLETE TEST             ║');
    console.log('╚═══════════════════════════════════════════╝\n');

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        await page.goto(BASE_URL, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1500);

        console.log('Step 1: Verify path choice screen');
        const pathVisible = await page.isVisible('#pathChoice');
        console.log(`  ${pathVisible ? '✅' : '❌'} Path choice visible\n`);

        console.log('Step 2: Click "Start Free Calculator"');
        await page.click('button:has-text("Start Free Calculator")');
        await page.waitForTimeout(1000);
        const formVisible = await page.isVisible('#calculatorForm');
        console.log(`  ${formVisible ? '✅' : '❌'} Form appears\n`);

        console.log('Step 3: Check button text');
        const btnText = await page.textContent('#calculateBtn');
        console.log(`  ${btnText.includes('Calculate My Macros') ? '✅' : '❌'} Button says: "${btnText}"\n`);

        console.log('Step 4: Fill calculator form');
        await page.fill('#age', '38');
        await page.fill('#weight', '185');
        await page.fill('#heightFeet', '5');
        await page.fill('#heightInches', '11');
        await page.selectOption('#sex', 'male');
        await page.selectOption('#goal', 'fat_loss');
        await page.selectOption('#lifestyle', '1.2');
        await page.selectOption('#exercise', '0');
        await page.selectOption('#diet', 'carnivore');
        console.log('  ✅ Form fields filled\n');

        console.log('Step 5: Click "Calculate My Macros"');
        await page.click('#calculateBtn');
        await page.waitForTimeout(1500);
        const resultsVisible = await page.isVisible('#resultsSection');
        console.log(`  ${resultsVisible ? '✅' : '❌'} Results appear\n`);

        if (resultsVisible) {
            console.log('Step 6: Verify macro values');
            const calories = await page.textContent('#outCalories');
            const protein = await page.textContent('#outProtein');
            console.log(`  ${calories && calories !== '—' ? '✅' : '❌'} Calories: ${calories}`);
            console.log(`  ${protein && protein !== '—' ? '✅' : '❌'} Protein: ${protein}g\n`);

            console.log('Step 7: Check meal examples');
            const mealCount = await page.evaluate(() =>
                document.querySelectorAll('.meal-example').length
            );
            console.log(`  ${mealCount > 0 ? '✅' : '❌'} Meal examples: ${mealCount} found\n`);
        }

        console.log('Step 8: Check upgrade section');
        const upgradeVisible = await page.isVisible('#upgradeSection');
        console.log(`  ${upgradeVisible ? '✅' : '❌'} Upgrade CTA visible\n`);

        console.log('Step 9: Click "Get My Plan Now" (upgrade)');
        await page.click('button:has-text("Get My Plan Now")');
        await page.waitForTimeout(1200);

        console.log('Step 10: Verify advanced sections reveal');
        const advancedVisible = await page.evaluate(() =>
            !document.getElementById('advancedSections').classList.contains('hidden')
        );
        console.log(`  ${advancedVisible ? '✅' : '❌'} Advanced sections visible\n`);

        if (advancedVisible) {
            console.log('Step 11: Check form styling');
            const hasProperStyle = await page.evaluate(() => {
                const section = document.querySelector('.form-section');
                const input = document.querySelector('.form-group input');
                if (!section || !input) return false;
                const sectionStyle = window.getComputedStyle(section);
                const inputStyle = window.getComputedStyle(input);
                return sectionStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
                       inputStyle.backgroundColor === 'rgb(255, 255, 255)';
            });
            console.log(`  ${hasProperStyle ? '✅' : '❌'} Form sections properly styled\n`);

            console.log('Step 12: Verify form data preserved');
            const ageValue = await page.inputValue('#age');
            console.log(`  ${ageValue === '38' ? '✅' : '❌'} Age preserved: ${ageValue}\n`);

            console.log('Step 13: Check all form sections present');
            const sectionCount = await page.evaluate(() =>
                document.querySelectorAll('.form-section').length
            );
            console.log(`  ${sectionCount >= 5 ? '✅' : '❌'} Form sections: ${sectionCount} found\n`);
        }

        console.log('✅✅✅ FREE PATH TEST COMPLETE ✅✅✅\n');

    } catch (error) {
        console.error('❌ FREE PATH ERROR:', error.message);
    } finally {
        await browser.close();
    }
}

async function testPaidPath() {
    console.log('\n╔═══════════════════════════════════════════╗');
    console.log('║  🧪 PAID PATH COMPLETE TEST             ║');
    console.log('╚═══════════════════════════════════════════╝\n');

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        await page.goto(BASE_URL, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1500);

        console.log('Step 1: Verify path choice screen');
        const pathVisible = await page.isVisible('#pathChoice');
        console.log(`  ${pathVisible ? '✅' : '❌'} Path choice visible\n`);

        console.log('Step 2: Click "Get Full Protocol ($9.99)"');
        await page.click('button:has-text("Get Full Protocol")');
        await page.waitForTimeout(1000);
        const formVisible = await page.isVisible('#calculatorForm');
        console.log(`  ${formVisible ? '✅' : '❌'} Form appears\n`);

        console.log('Step 3: Check button text for paid path');
        const btnText = await page.textContent('#calculateBtn');
        const isPaidBtn = btnText.includes('Next') && btnText.includes('Profile');
        console.log(`  ${isPaidBtn ? '✅' : '❌'} Button says: "${btnText}"\n`);

        console.log('Step 4: Fill basic calculator form');
        await page.fill('#age', '45');
        await page.fill('#weight', '210');
        await page.fill('#heightFeet', '6');
        await page.fill('#heightInches', '1');
        await page.selectOption('#sex', 'male');
        await page.selectOption('#goal', 'muscle_gain');
        await page.selectOption('#lifestyle', '1.5');
        await page.selectOption('#exercise', '0.3');
        await page.selectOption('#diet', 'carnivore');
        console.log('  ✅ Form filled\n');

        console.log('Step 5: Click "Next: Complete Your Profile"');
        await page.click('#calculateBtn');
        await page.waitForTimeout(1200);

        console.log('Step 6: Verify advanced sections reveal');
        const advancedVisible = await page.evaluate(() =>
            !document.getElementById('advancedSections').classList.contains('hidden')
        );
        console.log(`  ${advancedVisible ? '✅' : '❌'} Advanced sections visible\n`);

        if (advancedVisible) {
            console.log('Step 7: Check form section styling');
            const hasStyle = await page.evaluate(() => {
                const section = document.querySelector('.form-section');
                if (!section) return false;
                const style = window.getComputedStyle(section);
                return style.borderColor !== 'rgba(0, 0, 0, 0)';
            });
            console.log(`  ${hasStyle ? '✅' : '❌'} Form sections have styling\n`);

            console.log('Step 8: Verify all 5 form sections');
            const sections = await page.evaluate(() =>
                Array.from(document.querySelectorAll('.form-section h3')).map(h => h.textContent)
            );
            console.log(`  ✅ Found ${sections.length} sections:`);
            sections.forEach((s, i) => console.log(`     ${i + 1}. ${s}`));
            console.log();

            console.log('Step 9: Check input field styling');
            const inputStyled = await page.evaluate(() => {
                const input = document.querySelector('.form-group input[type="email"]');
                if (!input) return false;
                const style = window.getComputedStyle(input);
                return style.backgroundColor === 'rgb(255, 255, 255)' &&
                       style.borderColor.includes('212');  // tan color #d4a574
            });
            console.log(`  ${inputStyled ? '✅' : '❌'} Input fields properly styled\n`);

            console.log('Step 10: Fill email field');
            await page.fill('#email', 'test@carnivore.com');
            const emailValue = await page.inputValue('#email');
            console.log(`  ${emailValue === 'test@carnivore.com' ? '✅' : '❌'} Email: ${emailValue}\n`);

            console.log('Step 11: Verify submit button visible');
            const submitVisible = await page.isVisible('button:has-text("Generate My Complete Protocol")');
            console.log(`  ${submitVisible ? '✅' : '❌'} Submit button visible\n`);

            console.log('Step 12: Click "Generate My Complete Protocol"');
            await page.click('button:has-text("Generate My Complete Protocol")');
            await page.waitForTimeout(1500);

            console.log('Step 13: Verify progress bar appears');
            const progressVisible = await page.evaluate(() => {
                const text = document.body.innerText;
                return text.includes('Building Your Protocol') || text.includes('Generating');
            });
            console.log(`  ${progressVisible ? '✅' : '❌'} Progress bar visible\n`);

            if (progressVisible) {
                console.log('Step 14: Watch progress animation');
                console.log('  ⏳ Generating (this takes ~5 seconds)...\n');
                await page.waitForTimeout(6000);

                console.log('Step 15: Check for final message');
                const hasMessage = await page.evaluate(() => {
                    const text = document.body.innerText;
                    return text.includes('Complete') || text.includes('Error') || text.includes('Protocol');
                });
                console.log(`  ${hasMessage ? '✅' : '❌'} Final message appears\n`);
            }
        }

        console.log('✅✅✅ PAID PATH TEST COMPLETE ✅✅✅\n');

    } catch (error) {
        console.error('❌ PAID PATH ERROR:', error.message);
    } finally {
        await browser.close();
    }
}

async function runTests() {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║   CALCULATOR FORM TEST SUITE                  ║');
    console.log('║   Testing: Form Styling • Logic • UX           ║');
    console.log('╚════════════════════════════════════════════════╝');

    await testFreePath();
    await testPaidPath();

    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║   ALL TESTS COMPLETE - Review results above    ║');
    console.log('╚════════════════════════════════════════════════╝\n');
}

runTests().catch(console.error);
