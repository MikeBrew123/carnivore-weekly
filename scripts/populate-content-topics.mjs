#!/usr/bin/env node
/**
 * Auto-populate content_topics table by analyzing content slugs
 * Maps wiki sections, blog posts, and videos to appropriate topics
 */

// Topic slug → keywords mapping (for intelligent matching)
const topicKeywords = {
  'beef-nutrition': ['beef', 'meat', 'steak', 'ribeye'],
  'carnivore-basics': ['beginners', 'blueprint', 'welcome', 'start', 'keto-to-carnivore'],
  'electrolytes': ['electrolytes', 'salt', 'sodium'],
  'adaptation': ['adaptation', 'keto-to-carnivore', 'beginners'],
  'metabolic-health': ['metabolic', 'insulin', 'lipid', 'physiological'],
  'autoimmune': ['autoimmune', 'inflammation', 'acne', 'purge'],
  'mental-health': ['adhd', 'mental', 'depression', 'anxiety'],
  'animal-fats': ['fat', 'tallow', 'lard', 'butter'],
  'organ-meats': ['organ', 'liver', 'heart', 'kidney'],
  'nose-to-tail': ['nose-to-tail', 'whole-animal'],
  'cooking-techniques': ['cooking', 'recipe', 'preparation'],
  'food-quality': ['quality', 'grass-fed', 'sourcing', 'budget'],
  'supplements': ['supplement', 'creatine', 'vitamin'],
  'exercise': ['exercise', 'performance', 'muscle', 'mtor', 'training'],
  'sleep': ['sleep', 'night-sweats', 'circadian'],
  'digestion': ['digestion', 'gut', 'fiber', 'scurvy'],
  'inflammation': ['inflammation', 'chronic', 'acne'],
  'weight-loss': ['weight', 'fat-loss', 'stall', 'psmf'],
  'cancer': ['cancer', 'metabolism'],
  'longevity': ['longevity', 'healthspan', 'lifespan']
};

// Wiki sections (from public/wiki.html)
const wikiSections = [
  'a1-a2-dairy',
  'alcohol',
  'beer-gout',
  'best-salt',
  'budget',
  'cholesterol',
  'coffee',
  'creatine',
  'critics',
  'dairy',
  'digestion',
  'electrolytes',
  'fiber',
  'gout',
  'honey-fruit',
  'keto-to-carnivore',
  'kidney-health',
  'menopause',
  'organ-meats',
  'organ-vs-muscle',
  'salt',
  'scurvy',
  'weight-stall'
];

// Blog posts (from public/blog/*.html)
const blogPosts = [
  'acne-purge',
  'adhd-connection',
  'anti-resolution-playbook',
  'beginners-blueprint',
  'carnivore-bar-guide',
  'deep-freezer-strategy',
  'environmental-impact',
  'family-integration',
  'fasting-protocols',
  'lion-diet-challenge',
  'lipid-energy-model',
  'mtor-muscle',
  'new-year-same-you',
  'night-sweats',
  'organ-meats-guide',
  'pcos-hormones',
  'physiological-insulin-resistance',
  'psmf-fat-loss',
  'seven-dollar-survival-guide',
  'top-creators-2026',
  'transformation-stories',
  'welcome-to-carnivore-weekly',
  'womens-health'
];

// Manual overrides for ambiguous content
const manualMappings = {
  // Wiki
  'cholesterol': ['metabolic-health', 'carnivore-basics'],
  'weight-stall': ['weight-loss', 'metabolic-health'],
  'fiber': ['digestion', 'carnivore-basics'],
  'keto-to-carnivore': ['carnivore-basics', 'adaptation'],
  'dairy': ['carnivore-basics', 'digestion'],
  'a1-a2-dairy': ['carnivore-basics', 'digestion'],
  'coffee': ['carnivore-basics'],
  'scurvy': ['digestion', 'carnivore-basics'],
  'digestion': ['digestion', 'carnivore-basics'],
  'salt': ['electrolytes', 'carnivore-basics'],
  'best-salt': ['electrolytes', 'food-quality'],
  'electrolytes': ['electrolytes', 'adaptation'],
  'alcohol': ['carnivore-basics'],
  'organ-meats': ['organ-meats', 'nose-to-tail'],
  'organ-vs-muscle': ['organ-meats', 'beef-nutrition'],
  'creatine': ['supplements', 'exercise'],
  'honey-fruit': ['carnivore-basics', 'adaptation'],
  'menopause': ['metabolic-health'],
  'budget': ['food-quality', 'carnivore-basics'],
  'critics': ['carnivore-basics'],
  'kidney-health': ['metabolic-health'],
  'gout': ['metabolic-health', 'inflammation'],
  'beer-gout': ['metabolic-health', 'inflammation'],

  // Blog
  'acne-purge': ['autoimmune', 'inflammation', 'adaptation'],
  'adhd-connection': ['mental-health'],
  'anti-resolution-playbook': ['weight-loss'],
  'beginners-blueprint': ['carnivore-basics', 'adaptation'],
  'carnivore-bar-guide': ['food-quality'],
  'deep-freezer-strategy': ['food-quality', 'carnivore-basics'],
  'environmental-impact': ['carnivore-basics'],
  'family-integration': ['carnivore-basics'],
  'fasting-protocols': ['metabolic-health', 'weight-loss'],
  'lion-diet-challenge': ['carnivore-basics', 'autoimmune'],
  'lipid-energy-model': ['metabolic-health'],
  'mtor-muscle': ['exercise', 'metabolic-health'],
  'new-year-same-you': ['weight-loss'],
  'night-sweats': ['sleep', 'adaptation'],
  'organ-meats-guide': ['organ-meats', 'nose-to-tail'],
  'pcos-hormones': ['metabolic-health', 'autoimmune'],
  'physiological-insulin-resistance': ['metabolic-health'],
  'psmf-fat-loss': ['weight-loss', 'metabolic-health'],
  'seven-dollar-survival-guide': ['food-quality', 'carnivore-basics'],
  'top-creators-2026': ['carnivore-basics'],
  'transformation-stories': ['carnivore-basics', 'weight-loss'],
  'welcome-to-carnivore-weekly': ['carnivore-basics'],
  'womens-health': ['metabolic-health']
};

// Generate SQL for content mapping
function generateSQL() {
  const inserts = [];

  // Map wiki sections
  for (const slug of wikiSections) {
    const topics = manualMappings[slug] || [];
    if (topics.length === 0) continue;

    const topicList = topics.map(t => `'${t}'`).join(', ');
    inserts.push(`
-- Wiki: ${slug}
INSERT INTO public.content_topics (topic_id, content_type, content_identifier, assigned_by)
SELECT t.id, 'wiki', '${slug}', 'quinn'
FROM public.topics t
WHERE t.slug IN (${topicList})
ON CONFLICT DO NOTHING;`);
  }

  // Map blog posts
  for (const slug of blogPosts) {
    const topics = manualMappings[slug] || [];
    if (topics.length === 0) continue;

    const topicList = topics.map(t => `'${t}'`).join(', ');
    inserts.push(`
-- Blog: ${slug}
INSERT INTO public.content_topics (topic_id, content_type, content_identifier, assigned_by)
SELECT t.id, 'blog', '${slug}', 'quinn'
FROM public.topics t
WHERE t.slug IN (${topicList})
ON CONFLICT DO NOTHING;`);
  }

  return inserts.join('\n');
}

// Output SQL
console.log('-- ============================================================');
console.log('-- Auto-generated content topic mappings');
console.log('-- Generated:', new Date().toISOString());
console.log('-- ============================================================\n');
console.log(generateSQL());

// Stats
const wikiMapped = wikiSections.filter(s => manualMappings[s]).length;
const blogMapped = blogPosts.filter(s => manualMappings[s]).length;

console.log('\n-- ============================================================');
console.log('-- STATS');
console.log('-- ============================================================');
console.log(`-- Wiki sections mapped: ${wikiMapped}/${wikiSections.length}`);
console.log(`-- Blog posts mapped: ${blogMapped}/${blogPosts.length}`);
console.log(`-- Total mappings: ${wikiMapped + blogMapped}`);
