import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔧 Post-build: Updating calculator references...\n');

// Paths
const builtIndexPath = join(__dirname, '../public/assets/calculator2/index.html');
const calculatorHtmlPath = join(__dirname, '../public/calculator.html');
const calculatorIndexPath = join(__dirname, '../public/calculator/index.html');

try {
  // 1. Read the built index.html from Vite output
  const builtIndex = readFileSync(builtIndexPath, 'utf-8');

  // 2. Extract actual JS and CSS filenames using regex
  const jsMatch = builtIndex.match(/src="\/assets\/calculator2\/assets\/(index-[^"]+\.js)"/);
  const cssMatch = builtIndex.match(/href="\/assets\/calculator2\/assets\/(index-[^"]+\.css)"/);

  if (!jsMatch || !cssMatch) {
    throw new Error('Could not extract JS/CSS filenames from built index.html');
  }

  const jsFilename = jsMatch[1];
  const cssFilename = cssMatch[1];

  console.log(`📦 Built files detected:`);
  console.log(`   JS:  ${jsFilename}`);
  console.log(`   CSS: ${cssFilename}\n`);

  // 3. Update calculator.html
  let calculatorHtml = readFileSync(calculatorHtmlPath, 'utf-8');

  // Replace JS reference (both full domain and relative paths)
  const updatedCalculatorHtml = calculatorHtml
    .replace(/src="(?:https:\/\/carnivoreweekly\.com)?\/assets\/calculator2\/assets\/index-[^"]+\.js"/g,
             `src="/assets/calculator2/assets/${jsFilename}"`)
    .replace(/href="(?:https:\/\/carnivoreweekly\.com)?\/assets\/calculator2\/assets\/index-[^"]+\.js"/g,
             `href="/assets/calculator2/assets/${jsFilename}"`)
    .replace(/href="(?:https:\/\/carnivoreweekly\.com)?\/assets\/calculator2\/assets\/index-[^"]+\.css"/g,
             `href="/assets/calculator2/assets/${cssFilename}"`)
    // The lazy-load bootstrap in calculator.html (LCP fix) holds the bundle paths
    // in single-quoted JS strings (var SRC / var CSS) — keep those in sync too,
    // or the calculator silently breaks on the next rebuild.
    .replace(/'\/assets\/calculator2\/assets\/index-[^']+\.js'/g,
             `'/assets/calculator2/assets/${jsFilename}'`)
    .replace(/'\/assets\/calculator2\/assets\/index-[^']+\.css'/g,
             `'/assets/calculator2/assets/${cssFilename}'`);

  writeFileSync(calculatorHtmlPath, updatedCalculatorHtml, 'utf-8');
  console.log(`✅ Updated: public/calculator.html`);

  // 4. Update calculator/index.html — legacy page, no longer exists in the repo.
  // Skip gracefully instead of throwing AFTER calculator.html was already
  // updated (the old behavior made every build exit 1 and look broken).
  if (existsSync(calculatorIndexPath)) {
    let calculatorIndexHtml = readFileSync(calculatorIndexPath, 'utf-8');

    // Replace JS reference (relative path)
    const jsRegexRelative = /src="\/assets\/calculator2\/assets\/index-[^"]+\.js"/g;
    const updatedCalculatorIndexHtml = calculatorIndexHtml
      .replace(jsRegexRelative, `src="/assets/calculator2/assets/${jsFilename}"`)
      .replace(/href="\/assets\/calculator2\/assets\/index-[^"]+\.css"/g,
               `href="/assets/calculator2/assets/${cssFilename}"`);

    writeFileSync(calculatorIndexPath, updatedCalculatorIndexHtml, 'utf-8');
    console.log(`✅ Updated: public/calculator/index.html\n`);
  } else {
    console.log(`⏭️  Skipped: public/calculator/index.html (file not present)\n`);
  }

  console.log('🎉 Calculator references updated successfully!');

} catch (error) {
  console.error(`\n❌ Error: ${error.message}`);
  process.exit(1);
}
