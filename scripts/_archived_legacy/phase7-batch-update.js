#!/usr/bin/env node

/**
 * Phase 7 Batch Update Script
 * Automatically adds TL;DR, pull quotes, key takeaways, and post reactions to blog posts
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Configuration
const BLOG_DIR = path.join(__dirname, '../public/blog');
const POSTS_TO_UPDATE = [
  '2026-01-05-womens-health.html',
  '2026-01-06-transformation-stories.html',
  '2026-01-07-fasting-protocols.html',
  '2026-01-08-environmental-impact.html',
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
 * Extract writer from post metadata
 */
function extractWriter(html) {
  const writerMatch = html.match(/by\s+(Sarah|Marcus|Chloe)/i);
  return writerMatch ? writerMatch[1] : 'Sarah'; // Default to Sarah
}

/**
 * Extract post slug from filename
 */
function getPostSlug(filename) {
  return filename.replace('.html', '').replace(/^\d{4}-\d{2}-\d{2}-/, '');
}

/**
 * Extract main content from HTML
 */
function extractContent(html) {
  // Find content between <div class="post-content"> and </div> (or article closing)
  const contentMatch = html.match(/<div class="post-content">([\s\S]*?)(<\/article>|<div class="wiki-box"|<footer|<section class="related-content")/);
  if (!contentMatch) {
    // Try alternate pattern
    const altMatch = html.match(/<article>([\s\S]*?)(<\/article>|<div class="wiki-box"|<footer|<section class="related-content")/);
    return altMatch ? altMatch[1] : '';
  }
  return contentMatch[1];
}

/**
 * Generate TL;DR bullets based on content analysis
 */
function generateTLDR(content, writer, title) {
  // Extract key insights from content - look for strong statements, data, conclusions
  const bullets = [];

  // Pattern 1: Look for sentences with numbers/data
  const dataMatches = content.match(/<p>(.*?\d+.*?\.)<\/p>/g) || [];
  dataMatches.slice(0, 1).forEach(match => {
    const clean = match.replace(/<[^>]+>/g, '').trim();
    if (clean.length > 30 && clean.length < 150 && !clean.includes('http')) {
      bullets.push(clean);
    }
  });

  // Pattern 2: Look for <strong> emphasis points
  const strongMatches = content.match(/<p><strong>([^<]+)<\/strong>:?\s*([^<]+)<\/p>/g) || [];
  strongMatches.slice(0, bullets.length < 3 ? 2 : 1).forEach(match => {
    const clean = match.replace(/<[^>]+>/g, '').replace(/^strong/, '').trim();
    if (clean.length > 30 && clean.length < 150) {
      bullets.push(clean);
    }
  });

  // Pattern 3: Extract first paragraph if no matches yet
  if (bullets.length === 0) {
    const firstParagraphs = content.match(/<p>(.*?)<\/p>/g) || [];
    firstParagraphs.slice(0, 3).forEach(p => {
      const clean = p.replace(/<[^>]+>/g, '').trim();
      if (clean.length > 50 && clean.length < 150 && !clean.includes('http')) {
        bullets.push(clean);
      }
    });
  }

  // Ensure we have 3 bullets
  while (bullets.length < 3) {
    bullets.push('Essential insights backed by research and real-world experience');
  }

  return bullets.slice(0, 3);
}

/**
 * Extract potential pull quotes from content
 */
function findPullQuotes(content) {
  const quotes = [];

  // Pattern 1: Look for impactful standalone sentences
  const impactfulSentences = content.match(/<p>([^<]*?[\.!])<\/p>/g) || [];
  impactfulSentences.forEach(match => {
    const clean = match.replace(/<[^>]+>/g, '').trim();
    // Good pull quotes: 60-180 chars, contain "you/your", make a strong claim
    if (clean.length >= 60 && clean.length <= 180 &&
        (clean.match(/you|your|we|I/i) || clean.match(/is|are|will|can/))) {
      quotes.push(clean);
    }
  });

  // Pattern 2: Extract from Q&A sections (answers only)
  const qaMatches = content.match(/<p><strong>Q:.*?<\/strong><br>\s*A:\s*(.*?)<\/p>/g) || [];
  qaMatches.forEach(match => {
    const answerMatch = match.match(/A:\s*([^<]+)/);
    if (answerMatch) {
      const clean = answerMatch[1].trim();
      if (clean.length >= 60 && clean.length <= 180) {
        quotes.push(clean);
      }
    }
  });

  // Pattern 3: Look for sentences with strong verbs
  const strongVerbPattern = /<p>([^<]*?\b(proves|shows|reveals|demonstrates|explains|matters|works)[^<]*?\.)<\/p>/gi;
  const strongVerbMatches = content.match(strongVerbPattern) || [];
  strongVerbMatches.forEach(match => {
    const clean = match.replace(/<[^>]+>/g, '').trim();
    if (clean.length >= 60 && clean.length <= 180) {
      quotes.push(clean);
    }
  });

  return quotes.slice(0, 2); // Return top 2 candidates
}

/**
 * Generate key takeaways based on content
 */
function generateKeyTakeaways(content, writer, title) {
  const takeaways = [];

  // Pattern 1: Extract from numbered lists in later sections
  const h2Sections = content.split(/<h2[^>]*>/);
  const laterSections = h2Sections.slice(-3); // Last 3 sections

  laterSections.forEach(section => {
    const listItems = section.match(/<li><strong>([^<]+)<\/strong>:?\s*([^<]+)<\/li>/g) ||
                      section.match(/<li>([^<]+)<\/li>/g) || [];
    listItems.slice(0, 2).forEach(item => {
      const clean = item.replace(/<[^>]+>/g, '').trim();
      if (clean.length > 30 && clean.length < 200 && !clean.includes('http')) {
        takeaways.push(clean);
      }
    });
  });

  // Pattern 2: Extract from <ol> ordered lists (action steps)
  const orderedLists = content.match(/<ol>(.*?)<\/ol>/gs) || [];
  orderedLists.forEach(list => {
    const items = list.match(/<li>([^<]+)<\/li>/g) || [];
    items.slice(0, 2).forEach(item => {
      const clean = item.replace(/<[^>]+>/g, '').trim();
      if (clean.length > 30 && clean.length < 200 && !takeaways.includes(clean)) {
        takeaways.push(clean);
      }
    });
  });

  // Pattern 3: Extract strong recommendations or conclusions
  const recommendations = content.match(/<p><strong>(Start|Begin|Try|Track|Measure|Monitor|Test|Avoid|Focus on)[^<]+<\/strong>.*?<\/p>/gi) || [];
  recommendations.forEach(rec => {
    const clean = rec.replace(/<[^>]+>/g, '').trim();
    if (clean.length > 30 && clean.length < 200 && !takeaways.includes(clean)) {
      takeaways.push(clean);
    }
  });

  // Ensure we have 3-4 takeaways
  while (takeaways.length < 3) {
    if (takeaways.length === 0) {
      takeaways.push('Start with one small change and build from there based on your body\'s response');
    } else if (takeaways.length === 1) {
      takeaways.push('Track your progress with specific metrics, not just how you feel');
    } else {
      takeaways.push('Give your body time to adapt—most changes take 2-4 weeks to fully manifest');
    }
  }

  return takeaways.slice(0, 4);
}

/**
 * Insert Phase 7 components into HTML
 */
function insertPhase7Components(html, filename) {
  const writer = extractWriter(html);
  const slug = getPostSlug(filename);
  const content = extractContent(html);
  const title = html.match(/<h1[^>]*class="post-title">(.*?)<\/h1>/)?.[1] || '';

  // Generate components
  const tldrBullets = generateTLDR(content, writer, title);
  const pullQuoteTexts = findPullQuotes(content);
  const keyTakeaways = generateKeyTakeaways(content, writer, title);

  // Build TL;DR HTML
  const tldrHTML = `
                <div class="tldr-box tldr-box--green">
                    <h3>TL;DR</h3>
                    <ul>
                        ${tldrBullets.map(b => `<li>${b}</li>`).join('\n                        ')}
                    </ul>
                </div>

`;

  // Build pull quote HTML (insert after first <h2>)
  const pullQuoteHTML = pullQuoteTexts.length > 0 ? `
                <blockquote class="pull-quote">
                    "${pullQuoteTexts[0]}"
                </blockquote>

` : '';

  // Build key takeaways HTML
  const keyTakeawaysHTML = `
                <div class="key-takeaways">
                    <h3>Key Takeaways</h3>
                    <ol>
                        ${keyTakeaways.map(t => `<li>${t}</li>`).join('\n                        ')}
                    </ol>
                </div>

`;

  // Build post reactions HTML
  const reactionsHTML = `
                <div class="post-reactions" data-post-slug="${slug}"></div>
                <script src="/js/post-reactions.js" defer></script>
`;

  let updated = html;

  // Insert TL;DR after post header, before first <p> or <h2>
  const contentStartPattern = /(<\/header>\s*)(<!-- Post Content -->|<div class="post-content">)/;
  if (contentStartPattern.test(updated)) {
    updated = updated.replace(contentStartPattern, `$1$2\n${tldrHTML}`);
  }

  // Insert pull quote after first <h2>
  if (pullQuoteHTML) {
    const firstH2Pattern = /(<h2[^>]*>.*?<\/h2>\s*<p>.*?<\/p>)/;
    if (firstH2Pattern.test(updated)) {
      updated = updated.replace(firstH2Pattern, `$1\n${pullQuoteHTML}`);
    }
  }

  // Insert key takeaways before author signature or disclaimer
  const beforeSignaturePattern = /((<p>—(Sarah|Marcus|Chloe)<\/p>)|(<p class="post-disclaimer">))/;
  if (beforeSignaturePattern.test(updated)) {
    updated = updated.replace(beforeSignaturePattern, `${keyTakeawaysHTML}\n$1`);
  }

  // Insert post reactions before closing </article>
  const beforeArticleClose = /(\s*<\/article>)/;
  if (beforeArticleClose.test(updated)) {
    updated = updated.replace(beforeArticleClose, `\n${reactionsHTML}\n$1`);
  }

  return {
    html: updated,
    components: {
      tldr: tldrBullets,
      pullQuotes: pullQuoteTexts,
      takeaways: keyTakeaways,
      writer,
      slug
    }
  };
}

/**
 * Process a single post
 */
function processPost(filename, dryRun = false) {
  const filepath = path.join(BLOG_DIR, filename);

  if (!fs.existsSync(filepath)) {
    console.log(`❌ File not found: ${filename}`);
    return null;
  }

  console.log(`\n📄 Processing: ${filename}`);

  const html = fs.readFileSync(filepath, 'utf-8');
  const { html: updated, components } = insertPhase7Components(html, filename);

  console.log(`  Writer: ${components.writer}`);
  console.log(`  Slug: ${components.slug}`);
  console.log(`  TL;DR bullets: ${components.tldr.length}`);
  console.log(`  Pull quotes: ${components.pullQuotes.length}`);
  console.log(`  Key takeaways: ${components.takeaways.length}`);

  if (!dryRun) {
    fs.writeFileSync(filepath, updated, 'utf-8');
    console.log(`  ✅ Updated`);
  } else {
    console.log(`  🔍 Dry run - no changes written`);
  }

  return components;
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const sample = args.includes('--sample');

  console.log('🚀 Phase 7 Batch Update Script\n');

  if (sample) {
    console.log('📋 SAMPLE MODE: Processing first post only for review\n');
    const sampleFile = POSTS_TO_UPDATE[0];
    const components = processPost(sampleFile, true);

    if (components) {
      console.log('\n📝 GENERATED COMPONENTS:\n');
      console.log('TL;DR:');
      components.tldr.forEach((b, i) => console.log(`  ${i + 1}. ${b}`));
      console.log('\nPull Quotes:');
      components.pullQuotes.forEach((q, i) => console.log(`  ${i + 1}. "${q}"`));
      console.log('\nKey Takeaways:');
      components.takeaways.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));

      console.log('\n✅ Sample generated successfully!');
      console.log('\nTo apply to all posts, run:');
      console.log('  node scripts/phase7-batch-update.js');
    }
    return;
  }

  console.log(`Processing ${POSTS_TO_UPDATE.length} posts...`);
  console.log(`Dry run: ${dryRun ? 'YES' : 'NO'}\n`);

  let successCount = 0;
  let failCount = 0;

  for (const filename of POSTS_TO_UPDATE) {
    try {
      processPost(filename, dryRun);
      successCount++;
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
      failCount++;
    }
  }

  console.log(`\n✅ Complete!`);
  console.log(`  Success: ${successCount}`);
  console.log(`  Failed: ${failCount}`);

  if (!dryRun && successCount > 0) {
    console.log('\n📦 Ready to commit. Run:');
    console.log(`  git add public/blog/`);
    console.log(`  git commit -m "content: Phase 7 batch update - ${successCount} posts"`);
  }
}

main().catch(console.error);
