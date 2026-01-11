#!/usr/bin/env node
import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
const page = await context.newPage();

await page.goto('http://localhost:8000/calculator.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

console.log('📋 Inspecting calculator form structure...\n');

// Get all input elements
const inputs = await page.evaluate(() => {
    const allInputs = Array.from(document.querySelectorAll('input'));
    return allInputs.map(input => ({
        type: input.type,
        name: input.name,
        placeholder: input.placeholder,
        value: input.value,
        id: input.id,
        ariaLabel: input.getAttribute('aria-label')
    }));
});

console.log('Input fields found:', inputs.length);
inputs.forEach((input, i) => {
    console.log(`\n  Input ${i + 1}:`);
    console.log(`    Type: ${input.type}`);
    console.log(`    Name: ${input.name || '(none)'}`);
    console.log(`    Placeholder: ${input.placeholder || '(none)'}`);
    console.log(`    Value: ${input.value || '(none)'}`);
    console.log(`    ID: ${input.id || '(none)'}`);
    console.log(`    Aria-label: ${input.ariaLabel || '(none)'}`);
});

// Get all buttons
const buttons = await page.evaluate(() => {
    const allButtons = Array.from(document.querySelectorAll('button'));
    return allButtons.map(btn => ({
        text: btn.textContent.trim(),
        type: btn.type,
        className: btn.className
    }));
});

console.log('\n\nButtons found:', buttons.length);
buttons.forEach((btn, i) => {
    console.log(`\n  Button ${i + 1}:`);
    console.log(`    Text: "${btn.text}"`);
    console.log(`    Type: ${btn.type}`);
    console.log(`    Class: ${btn.className || '(none)'}`);
});

// Take screenshot
await page.screenshot({ path: '/tmp/calculator-form-structure.png', fullPage: true });
console.log('\n📸 Screenshot saved: /tmp/calculator-form-structure.png');

await browser.close();
