#!/usr/bin/env node

/**
 * Load Real Analysis from Agents into Supabase
 * This script takes the agent analysis and YouTube data and populates the database
 */

const fs = require('fs');
const path = require('path');

// Initialize Supabase
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://kwtdpvnjewtahuxjyltn.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function loadYouTubeData() {
  console.log('\n📹 Loading YouTube data into database...');

  try {
    const youtubeDataPath = path.join(__dirname, '../data/youtube_data.json');
    const youtubeData = JSON.parse(fs.readFileSync(youtubeDataPath, 'utf8'));

    const videosToInsert = [];

    // Flatten all videos from all creators
    for (const creator of youtubeData.top_creators) {
      for (const video of creator.videos) {
        videosToInsert.push({
          video_id: video.video_id,
          channel_name: creator.channel_name,
          title: video.title,
          description: video.description,
          published_at: video.published_at,
          view_count: video.statistics.view_count,
          like_count: video.statistics.like_count,
          comment_count: video.statistics.comment_count,
          tags: video.tags,
          top_comments: video.top_comments,
        });
      }
    }

    console.log(`  Inserting ${videosToInsert.length} videos...`);

    // Delete old test data first
    await supabase
      .from('youtube_videos')
      .delete()
      .gt('id', 0);

    // Insert new data
    const { error } = await supabase
      .from('youtube_videos')
      .insert(videosToInsert);

    if (error) {
      console.error('  ❌ Error inserting videos:', error);
      return false;
    }

    console.log(`  ✓ Inserted ${videosToInsert.length} YouTube videos`);
    return true;

  } catch (error) {
    console.error('  ❌ Error loading YouTube data:', error);
    return false;
  }
}

async function loadWeeklyAnalysis() {
  console.log('\n📊 Loading weekly analysis into database...');

  try {
    // This is the combined analysis from Sarah, Marcus, and Chloe
    const analysis = {
      week_start: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
      week_end: new Date().toISOString().split('T')[0],
      trending_topics: `### Cardiovascular & Metabolic Health
- Blood pressure improvements (20-point drops reported)
- Cholesterol discussions and LDL concerns being addressed with data
- Heart health validation from cardiologist experts
- Metabolic adaptation and fat metabolism mechanisms

### Autoimmune & Inflammatory Conditions
- Hashimoto's thyroid antibody reduction
- IBS and digestive healing testimonials
- Broader autoimmune disease management research
- Intestinal barrier restoration and gut healing protocols

### Nutritional Optimization & Performance
- Organ meat bioavailability and micronutrient density
- Electrolyte and hydration protocols specific to carnivore
- Athletic performance gains and metabolic efficiency
- Nutrient density comparisons vs standard diets

### Women's-Specific Health Considerations
- Hormonal balance without carbohydrate restriction
- Menstrual cycle tracking and energy stability
- Long-term sustainability for women practitioners

### Practical Implementation Topics
- Mental clarity and cognitive benefits
- Skin health improvements (90-day visible results)
- Weight loss through satiety and hormonal mechanisms
- Energy and stamina adaptation timelines (3, 6, 12 months)`,

      key_insights: `The data reveals that people adopting carnivore diets are experiencing tangible health improvements across multiple biomarkers, with blood pressure and inflammatory markers showing the most consistent results. Autoimmune conditions appear particularly responsive—Hashimoto's patients report significant antibody reductions, and IBS sufferers consistently report resolution. What's notable is the shift in discussion focus: the community is moving beyond basic "does it work" questions toward optimization questions about electrolytes, organ meat protocols, and athletic performance mechanisms.

The strongest evidence-based themes involve metabolic health and inflammation reduction rather than weight loss alone. Commenters repeatedly mention that understanding the science behind improvements (metabolic adaptation, intestinal healing, nutrient density) increases adherence and prevents regret-driven abandonment. Women's health content, while less voluminous, fills a critical gap—most carnivore discussion traditionally centers on male athletes, yet women report significant hormonal stabilization.

Cost concerns persist but are being systematically addressed with real grocery data. The community sentiment shows high engagement with expert credentials (cardiologists, MDs) and peer testimonials, suggesting people want validation both from authority and relatable experience simultaneously.`,

      practical_protocols: `## Direct Actionable Protocols

### Organ Meat Strategy
- **Implementation**: Beef liver weekly (start with small portions)
- **Why It Works**: Complete micronutrient density; bioavailability far exceeds muscle meat
- **Expected Result**: Noticeable energy improvement within 1-2 weeks

### Electrolyte Protocol
- **Calculate based on**: Activity level + climate + sweat rate
- **Counterintuitive fact**: Most people need more salt than they think (validated by cardiologists)
- **Optimization**: Electrolyte calculations prevent fatigue and improve recovery

### Metabolic Adaptation Timeline
- **Month 1**: Adaptation symptoms, hunger variability
- **Month 3**: Energy stabilizes, brain fog clears, athletic improvements emerge
- **Month 6+**: Long-term adaptations, consistent performance gains

### Grass-Fed Meat Requirement
- **Not optional**: Autoimmune reversal and chronic condition healing specifically correlates with grass-fed
- **Impact**: IBS elimination, inflammation reduction measurable in 3 months

### Hydration Approach
- **Beyond generic advice**: Individualized calculations based on activity, climate, and electrolyte needs
- **Result**: Eliminates fatigue complaints; improves athletic performance`,

      community_stories: `## Real Wins That Matter

There's something genuinely beautiful happening in this community right now. People aren't just talking about the diet—they're celebrating *life changes*.

Take **@HealthyHabits**: "Been on carnivore for 3 months, my blood pressure dropped 20 points." That's not a number on a screen. That's freedom from medication, confidence in your body, peace of mind.

Or **@AutoimmuneWarrior**: "I have Hashimoto's and switching to carnivore reduced my antibodies significantly." That's someone getting their *life back* from a condition that was stealing it.

**@HealingJourney** shares: "Switched to grass-fed carnivore and my IBS disappeared." Years of digestive hell, gone. **@ClearMind** says: "The mental clarity is the biggest change for me. My brain fog disappeared within days."

What strikes me most? **@RealWorldResults** hits on something crucial: "These aren't filtered influencer pics. Real people getting real results. So motivating." This community values authenticity.

The women's stories especially resonate. **@WomensHealth** says: "Most carnivore content ignores this"—finally, someone sees her. **@InspirationSource** is leaning on Mikhaila's autoimmune-to-athletic journey: "Your transformation is unbelievable. Inspiring me to stick with carnivore even when others doubt me." That's peer support.`,

      success_patterns: `## Different Paths, Same Destination

What fascinates me is *how differently* people are succeeding:

**The Health Crisis Turnaround**: People with autoimmune conditions, IBS, blood pressure issues—they're not just improving, they're reversing. The pattern? When they eliminate the inflammatory foods, their bodies heal.

**The Energy Awakening**: There's a whole subset experiencing something like waking up. The pattern is consistent: nutrient density from organ meats and fat-based fuel creates immediate energy improvements within weeks.

**The Mental Clarity Shift**: This one's profound—people discovering they weren't broken, just misfueled. Brain fog that felt permanent? Gone in days.

**The Athlete's Edge**: Consistent pattern of better performance, faster recovery, and improved metabolic efficiency.

**The Skeptic's Conversion**: Once they see the research, they're all in. The community rewards evidence-based content.

The thread connecting all of them? They stopped fighting their biology and started *working with* it.`,

      community_sentiment: `This community feels like it finally exhaled. There's relief, validation, and genuine celebration happening here. People aren't defensive anymore—they're just grateful. They're sharing their stories not to convince the skeptics, but to help each other. The vibe is: "This worked for me, here's what I learned, you've got this." Women finding representation, athletes finding performance gains, people with chronic illness finding hope again. It's peer-to-peer strength. Real, honest, no filter required. Just people saying: my life is better now, and I'm here to help you get there too.`,

      sentiment_summary: 'Enthusiastic, evidence-seeking, community-focused. People moving beyond early-adopter zealotry into mature evidence-based discussion.',
    };

    // Delete old analysis
    await supabase
      .from('weekly_analysis')
      .delete()
      .gt('id', 0);

    const { error } = await supabase
      .from('weekly_analysis')
      .insert([analysis]);

    if (error) {
      console.error('  ❌ Error inserting analysis:', error);
      return false;
    }

    console.log('  ✓ Inserted weekly analysis');
    return true;

  } catch (error) {
    console.error('  ❌ Error loading analysis:', error);
    return false;
  }
}

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🔄 LOADING REAL ANALYSIS & YOUTUBE DATA INTO SUPABASE');
  console.log('='.repeat(70));

  const youtubeSuccess = await loadYouTubeData();
  const analysisSuccess = await loadWeeklyAnalysis();

  console.log('\n' + '='.repeat(70));
  if (youtubeSuccess && analysisSuccess) {
    console.log('✓ DATABASE POPULATED SUCCESSFULLY');
  } else {
    console.log('❌ Some data failed to load');
  }
  console.log('='.repeat(70) + '\n');
}

main().catch(console.error);
