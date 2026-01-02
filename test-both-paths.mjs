import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:8000/public/calculator.html';
console.log('Starting tests...\n');

async function runTests() {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    // Test 1: Check page loads
    console.log('Loading calculator...');
    await page.goto(BASE_URL);
    await page.waitForTimeout(2000);
    
    console.log('✅ Page loaded successfully\n');
    console.log('Browser opened - test manually by:');
    console.log('1. Click "Start Free Calculator"');
    console.log('2. Fill form and click "Calculate My Macros"');
    console.log('3. Go back and test "Get Full Protocol" path\n');
    
    console.log('Keeping browser open for manual testing...');
    console.log('Close the browser window when done testing.\n');
}

runTests().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
