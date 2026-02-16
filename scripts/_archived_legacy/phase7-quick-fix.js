#!/usr/bin/env node

/**
 * Phase 7 Quick Fix Script
 * Adds missing TL;DR and post-reactions to 16 incomplete posts
 */

const fs = require('fs');
const path = require('path');

const BLOG_DIR = path.join(__dirname, '../public/blog');

// Posts that need TL;DR and/or post-reactions
const POSTS_TO_FIX = [
  '2026-01-09-family-integration.html',
  '2025-12-18-carnivore-bar-guide.html',
  '2025-12-19-psmf-fat-loss.html',
  '2025-12-20-lipid-energy-model.html',
  '2025-12-21-night-sweats.html',
  '2025-12-22-mtor-muscle.html',
  '2025-12-23-adhd-connection.html',
  '2025-12-24-deep-freezer-strategy.html',
  '2025-12-25-new-year-same-you.html',
  '2025-12-26-seven-dollar-survival-guide.html',
  '2025-12-27-anti-resolution-playbook.html',
  '2025-12-28-physiological-insulin-resistance.html',
  '2025-12-29-lion-diet-challenge.html',
  '2025-12-30-pcos-hormones.html',
  '2025-12-31-acne-purge.html',
  '2025-12-31-welcome-to-carnivore-weekly.html'
];

/**
 * Extract post slug from filename
 */
function getPostSlug(filename) {
  return filename.replace('.html', '').replace(/^\d{4}-\d{2}-\d{2}-/, '');
}

/**
 * Extract title from HTML
 */
function extractTitle(html) {
  const titleMatch = html.match(/<h1[^>]*class="post-title"[^>]*>(.*?)<\/h1>/s) ||
                     html.match(/<title>(.*?)<\/title>/);
  if (titleMatch) {
    return titleMatch[1].replace(/<[^>]+>/g, '').replace(' - Carnivore Weekly Blog', '').trim();
  }
  return '';
}

/**
 * Extract first few paragraphs for TL;DR generation
 */
function extractKeyPoints(html) {
  const bullets = [];

  // Look for strong statements in first 500 chars of content
  const contentMatch = html.match(/<div class="post-content">([\s\S]{0,1500})/);
  if (contentMatch) {
    const earlyContent = contentMatch[1];

    // Extract impactful sentences
    const paragraphs = earlyContent.match(/<p>([^<]{50,150}[.!])<\/p>/g) || [];
    paragraphs.slice(0, 3).forEach(p => {
      const clean = p.replace(/<[^>]+>/g, '').trim();
      if (clean.length > 40 && clean.length < 150) {
        bullets.push(clean);
      }
    });
  }

  // Fallback: generic bullets based on title
  while (bullets.length < 3) {
    if (bullets.length === 0) {
      bullets.push('Evidence-based insights on carnivore nutrition and metabolic health');
    } else if (bullets.length === 1) {
      bullets.push('Practical strategies you can implement immediately');
    } else {
      bullets.push('Real-world experience and research-backed recommendations');
    }
  }

  return bullets.slice(0, 3);
}

/**
 * Check if component already exists
 */
function hasTLDR(html) {
  return html.includes('class="tldr-box');
}

function hasPostReactions(html) {
  return html.includes('class="post-reactions');
}

/**
 * Add TL;DR box after post header/author bio
 */
function addTLDR(html, bullets) {
  const tldrHTML = `
                <div class="tldr-box tldr-box--green">
                    <h3>TL;DR</h3>
                    <ul>
                        ${bullets.map(b => `<li>${b}</li>`).join('\n                        ')}
                    </ul>
                </div>

`;

  // Try multiple insertion points (more flexible)
  const patterns = [
    // After post-author-bio closing div
    /(<div class="post-author-bio">[\s\S]*?<\/div>\s*<\/header>\s*)(<div class="post-content">)/,
    // After post-meta
    /(<div class="post-meta">[\s\S]*?<\/div>\s*)(<div class="post-content">)/,
    // After header closing tag
    /(<\/header>\s*)(<div class="post-content">)/,
    // After first <p> tag in content
    /(<div class="post-content">\s*<p>[\s\S]*?<\/p>\s*)/
  ];

  for (const pattern of patterns) {
    if (pattern.test(html)) {
      if (pattern === patterns[3]) {
        // Insert after first paragraph
        return html.replace(pattern, `$1\n${tldrHTML}`);
      } else {
        // Insert between matched groups
        return html.replace(pattern, `$1\n${tldrHTML}$2`);
      }
    }
  }

  // Fallback: insert after <article> tag
  return html.replace(/(<article[^>]*>\s*)/, `$1\n${tldrHTML}`);
}

/**
 * Add post-reactions before closing </article>
 */
function addPostReactions(html, slug) {
  const reactionsHTML = `
                <div class="post-reactions" data-post-slug="${slug}"></div>
                <script src="/js/post-reactions.js" defer></script>

`;

  // Try multiple patterns for insertion point
  const patterns = [
    // Before closing </article>
    /(\s*<\/article>)/,
    // Before footer/wiki-box if they exist
    /(\s*<div class="wiki-box">)/,
    /(\s*<footer class="post-footer">)/,
    // Before script tags at end
    /(\s*<script src="https:\/\/utteranc\.es)/
  ];

  for (const pattern of patterns) {
    if (pattern.test(html)) {
      return html.replace(pattern, `${reactionsHTML}$1`);
    }
  }

  // Fallback: before </body>
  return html.replace(/(\s*<\/body>)/, `${reactionsHTML}$1`);
}

/**
 * Process a single post
 */
function processPost(filename, dryRun = false) {
  const filepath = path.join(BLOG_DIR, filename);

  if (!fs.existsSync(filepath)) {
    console.log(`❌ File not found: ${filename}`);
    return { success: false };
  }

  console.log(`\n📄 Processing: ${filename}`);

  let html = fs.readFileSync(filepath, 'utf-8');
  const slug = getPostSlug(filename);
  const title = extractTitle(html);

  let modified = false;
  let addedTLDR = false;
  let addedReactions = false;

  // Add TL;DR if missing
  if (!hasTLDR(html)) {
    const bullets = extractKeyPoints(html);
    console.log(`  Adding TL;DR (${bullets.length} bullets)`);
    html = addTLDR(html, bullets);
    modified = true;
    addedTLDR = true;
  } else {
    console.log(`  ✓ TL;DR already present`);
  }

  // Add post-reactions if missing
  if (!hasPostReactions(html)) {
    console.log(`  Adding post-reactions (slug: ${slug})`);
    html = addPostReactions(html, slug);
    modified = true;
    addedReactions = true;
  } else {
    console.log(`  ✓ Post-reactions already present`);
  }

  if (modified && !dryRun) {
    fs.writeFileSync(filepath, html, 'utf-8');
    console.log(`  ✅ Updated`);
  } else if (!modified) {
    console.log(`  ℹ️  No changes needed`);
  } else {
    console.log(`  🔍 Dry run - no changes written`);
  }

  return {
    success: true,
    modified,
    addedTLDR,
    addedReactions
  };
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('🚀 Phase 7 Quick Fix Script\n');
  console.log(`Processing ${POSTS_TO_FIX.length} posts...`);
  console.log(`Dry run: ${dryRun ? 'YES' : 'NO'}\n`);

  let stats = {
    processed: 0,
    tldrAdded: 0,
    reactionsAdded: 0,
    noChanges: 0,
    failed: 0
  };

  for (const filename of POSTS_TO_FIX) {
    try {
      const result = processPost(filename, dryRun);
      if (result.success) {
        stats.processed++;
        if (result.addedTLDR) stats.tldrAdded++;
        if (result.addedReactions) stats.reactionsAdded++;
        if (!result.modified) stats.noChanges++;
      } else {
        stats.failed++;
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
      stats.failed++;
    }
  }

  console.log(`\n✅ Complete!`);
  console.log(`  Posts processed: ${stats.processed}`);
  console.log(`  TL;DR added: ${stats.tldrAdded}`);
  console.log(`  Post-reactions added: ${stats.reactionsAdded}`);
  console.log(`  No changes needed: ${stats.noChanges}`);
  console.log(`  Failed: ${stats.failed}`);

  if (!dryRun && (stats.tldrAdded > 0 || stats.reactionsAdded > 0)) {
    console.log('\n📦 Ready to commit. Run:');
    console.log(`  git add public/blog/`);
    console.log(`  git commit -m "content: Phase 7 quick fix - complete remaining ${stats.tldrAdded + stats.reactionsAdded} components"`);
  }
}

main().catch(console.error);
