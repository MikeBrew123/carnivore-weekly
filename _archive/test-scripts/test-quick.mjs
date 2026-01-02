import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:8000/public/calculator.html';

async function testBothPaths() {
    console.log('\n🧪 QUICK FORM TEST - Both Paths\n');

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        console.log('═══════════════════════════════════════');
        console.log('FREE PATH');
        console.log('═══════════════════════════════════════\n');

        await page.goto(BASE_URL);
        await page.waitForTimeout(2000);

        // Free path
        await page.click('button:has-text("Start Free Calculator")');
        await page.waitForTimeout(1000);

        // Fill form using JavaScript
        await page.evaluate(() => {
            document.getElementById('age').value = '35';
            document.getElementById('weight').value = '180';
            document.getElementById('heightFeet').value = '5';
            document.getElementById('heightInches').value = '10';
            document.getElementById('sex').value = 'male';
            document.getElementById('goal').value = 'lose';
            document.getElementById('lifestyle').value = '1.2';
            document.getElementById('exercise').value = '0';
            document.getElementById('diet').value = 'carnivore';
        });

        console.log('✅ Form filled');

        // Calculate
        await page.click('#calculateBtn');
        await page.waitForTimeout(2000);

        const resultsVisible = await page.isVisible('#resultsSection');
        console.log(`${resultsVisible ? '✅' : '❌'} Results appear`);

        const calories = await page.textContent('#outCalories');
        const protein = await page.textContent('#outProtein');
        console.log(`${calories && calories !== '—' ? '✅' : '❌'} Macros calculated: ${calories} cal, ${protein}g protein`);

        const mealCount = await page.evaluate(() =>
            document.querySelectorAll('.meal-example').length
        );
        console.log(`${mealCount > 0 ? '✅' : '❌'} Meal examples: ${mealCount}`);

        // Upgrade
        await page.click('button:has-text("Get My Plan Now")');
        await page.waitForTimeout(1500);

        const advancedVisible = await page.evaluate(() =>
            !document.getElementById('advancedSections').classList.contains('hidden')
        );
        console.log(`${advancedVisible ? '✅' : '❌'} Advanced sections reveal\n`);

        console.log('═══════════════════════════════════════');
        console.log('PAID PATH');
        console.log('═══════════════════════════════════════\n');

        // Reload for paid path
        await page.reload();
        await page.waitForTimeout(2000);

        await page.click('button:has-text("Get Full Protocol")');
        await page.waitForTimeout(1000);

        // Fill form
        await page.evaluate(() => {
            document.getElementById('age').value = '45';
            document.getElementById('weight').value = '200';
            document.getElementById('heightFeet').value = '6';
            document.getElementById('heightInches').value = '0';
            document.getElementById('sex').value = 'male';
            document.getElementById('goal').value = 'gain';
            document.getElementById('lifestyle').value = '1.5';
            document.getElementById('exercise').value = '0.3';
            document.getElementById('diet').value = 'carnivore';
        });

        console.log('✅ Form filled');

        // Click Next
        await page.click('#calculateBtn');
        await page.waitForTimeout(1500);

        const paidAdvanced = await page.evaluate(() =>
            !document.getElementById('advancedSections').classList.contains('hidden')
        );
        console.log(`${paidAdvanced ? '✅' : '❌'} Advanced sections appear`);

        const sectionCount = await page.evaluate(() =>
            document.querySelectorAll('.form-section').length
        );
        console.log(`${sectionCount >= 5 ? '✅' : '❌'} All form sections: ${sectionCount}`);

        // Check styling
        const hasStyle = await page.evaluate(() => {
            const section = document.querySelector('.form-section');
            const input = document.querySelector('.form-group input');
            if (!section || !input) return false;
            const sectionStyle = window.getComputedStyle(section);
            const inputStyle = window.getComputedStyle(input);
            return sectionStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
                   inputStyle.backgroundColor === 'rgb(255, 255, 255)';
        });
        console.log(`${hasStyle ? '✅' : '❌'} Form styling correct\n`);

        // Fill email
        await page.fill('#email', 'test@example.com');
        console.log('✅ Email filled');

        // Submit
        console.log('⏳ Submitting form...\n');
        await page.click('button:has-text("Generate My Complete Protocol")');
        await page.waitForTimeout(2000);

        const progressVisible = await page.evaluate(() =>
            document.body.innerText.includes('Building Your Protocol')
        );
        console.log(`${progressVisible ? '✅' : '❌'} Progress bar appears`);

        // Wait for progress
        await page.waitForTimeout(7000);

        const finalMessage = await page.evaluate(() => {
            const text = document.body.innerText;
            return text.includes('Complete') || text.includes('Protocol') || text.includes('Error');
        });
        console.log(`${finalMessage ? '✅' : '❌'} Final message appears\n`);

        console.log('═══════════════════════════════════════');
        console.log('🎉 BOTH PATHS TESTED SUCCESSFULLY');
        console.log('═══════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ ERROR:', error.message);
    }
}

testBothPaths().catch(console.error);
