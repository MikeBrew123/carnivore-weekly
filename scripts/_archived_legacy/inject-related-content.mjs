#!/usr/bin/env node
/**
 * Auto-inject related content component into wiki sections and blog posts
 * Run after content creation or as batch update
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Component template (minified for injection)
const RELATED_CONTENT_TEMPLATE = `
<!-- Related Content Component -->
<section class="related-content" data-content-type="{{CONTENT_TYPE}}" data-content-id="{{CONTENT_ID}}">
    <h3 class="related-content-title">Related Content</h3>
    <div class="related-content-loading">
        <span class="spinner"></span>
        Loading related content...
    </div>
    <div class="related-content-grid" style="display: none;"></div>
</section>

<script src="/js/related-content.js" defer></script>
`;

// Find injection point in HTML
function findInjectionPoint(html, contentType) {
  if (contentType === 'blog') {
    // Inject before closing </article> or before footer
    const articleEnd = html.lastIndexOf('</article>');
    if (articleEnd !== -1) return articleEnd;

    const footerStart = html.lastIndexOf('<footer');
    if (footerStart !== -1) return footerStart;
  }

  if (contentType === 'wiki') {
    // Inject at end of .topic-content div
    const matches = [...html.matchAll(/<div class="topic-content">([\s\S]*?)<\/div>/g)];
    if (matches.length > 0) {
      const lastMatch = matches[matches.length - 1];
      return lastMatch.index + lastMatch[0].length - 6; // Before closing </div>
    }
  }

  return -1;
}

// Check if related content already injected
function hasRelatedContent(html) {
  return html.includes('class="related-content"') || html.includes('related-content.js');
}

// Extract content ID from file path
function extractContentId(filePath, contentType) {
  const basename = path.basename(filePath, '.html');

  if (contentType === 'blog') {
    // Remove date prefix: 2025-12-30-pcos-hormones.html → pcos-hormones
    return basename.replace(/^\d{4}-\d{2}-\d{2}-/, '');
  }

  if (contentType === 'wiki') {
    // Wiki uses section IDs, not filename
    // Need to parse HTML to get section ID
    return null; // Handled separately
  }

  return basename;
}

// Get all wiki section IDs from file
function getWikiSectionIds(html) {
  const regex = /<div class="topic" id="([^"]+)"/g;
  const ids = [];
  let match;

  while ((match = regex.exec(html)) !== null) {
    ids.push(match[1]);
  }

  return ids;
}

// Inject component into file
function injectRelatedContent(filePath, contentType, contentId) {
  let html = fs.readFileSync(filePath, 'utf-8');

  // Skip if already has related content
  if (hasRelatedContent(html)) {
    console.log(`⏭️  Skip: ${path.basename(filePath)} (already has related content)`);
    return false;
  }

  // Find injection point
  const injectionPoint = findInjectionPoint(html, contentType);

  if (injectionPoint === -1) {
    console.log(`⚠️  Skip: ${path.basename(filePath)} (no injection point found)`);
    return false;
  }

  // Generate component HTML
  const component = RELATED_CONTENT_TEMPLATE
    .replace('{{CONTENT_TYPE}}', contentType)
    .replace('{{CONTENT_ID}}', contentId);

  // Inject component
  const before = html.slice(0, injectionPoint);
  const after = html.slice(injectionPoint);
  const newHtml = before + component + after;

  // Write back to file
  fs.writeFileSync(filePath, newHtml, 'utf-8');

  console.log(`✅ Injected: ${path.basename(filePath)} (${contentType}/${contentId})`);
  return true;
}

// Process all blog posts
function processBlogPosts() {
  const blogDir = path.join(projectRoot, 'public', 'blog');
  const files = fs.readdirSync(blogDir).filter(f => f.match(/^\d{4}-\d{2}-\d{2}-.+\.html$/));

  console.log(`\n📝 Processing ${files.length} blog posts...\n`);

  let injected = 0;

  for (const file of files) {
    const filePath = path.join(blogDir, file);
    const contentId = extractContentId(file, 'blog');

    if (injectRelatedContent(filePath, 'blog', contentId)) {
      injected++;
    }
  }

  console.log(`\n✅ Blog posts: ${injected}/${files.length} injected\n`);
}

// Process wiki sections (note: wiki is single file with multiple sections)
function processWikiSections() {
  console.log(`\n📚 Note: Wiki has multiple sections in single file.`);
  console.log(`   Manual injection recommended for wiki.html per section.\n`);
  console.log(`   Use: <section class="related-content" data-content-type="wiki" data-content-id="section-id"></section>\n`);
}

// Extract JS to separate file
function extractRelatedContentJS() {
  const componentPath = path.join(projectRoot, 'public', 'components', 'related-content.html');
  const jsOutputPath = path.join(projectRoot, 'public', 'js', 'related-content.js');

  if (!fs.existsSync(componentPath)) {
    console.log('⚠️  Component file not found, skipping JS extraction');
    return;
  }

  const html = fs.readFileSync(componentPath, 'utf-8');

  // Extract <script> content
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!scriptMatch) {
    console.log('⚠️  No <script> found in component');
    return;
  }

  const jsContent = scriptMatch[1].trim();

  // Ensure js directory exists
  const jsDir = path.dirname(jsOutputPath);
  if (!fs.existsSync(jsDir)) {
    fs.mkdirSync(jsDir, { recursive: true });
  }

  // Write JS file
  fs.writeFileSync(jsOutputPath, jsContent, 'utf-8');

  console.log(`✅ Extracted JS: ${jsOutputPath}\n`);
}

// Main execution
console.log('='.repeat(60));
console.log('Related Content Injector');
console.log('='.repeat(60));

// Extract JS to separate file first
extractRelatedContentJS();

// Process blog posts
processBlogPosts();

// Process wiki (manual)
processWikiSections();

console.log('='.repeat(60));
console.log('✅ Injection complete!');
console.log('='.repeat(60));
