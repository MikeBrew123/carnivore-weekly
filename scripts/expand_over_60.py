#!/usr/bin/env python3
"""Expand the carnivore-over-60-aging blog post content."""

import json
import re

BLOG_FILE = "/Users/mbrew/Developer/carnivore-weekly/data/blog_posts.json"
TARGET_SLUG = "2026-02-16-carnivore-over-60-aging"

BAD_WORDS = [
    "crucial", "vital", "straightforward", "game-changer", "dive into",
    "realm", "landscape", "unleash", "elevate", "navigate", "leverage",
    "robust", "tapestry", "paradigm", "delve", "utilize", "facilitate"
]

NEW_CONTENT = """<h2>Aging Isn't the Problem. Protein Deficiency Is.</h2>
<p>After 60, your body starts losing muscle. It's called sarcopenia, and it affects roughly 10% of adults over 60 and up to 50% of those over 80. Muscle loss leads to falls. Falls lead to fractures. Fractures lead to hospital stays. Hospital stays lead to decline.</p>
<p>This cascade isn't inevitable. But preventing it requires something most seniors aren't getting enough of: protein. And not just any protein. High-quality, bioavailable animal protein with the full amino acid profile your aging muscles demand.</p>
<p>The standard American diet fails older adults in two ways: it provides too little protein overall, and what it does provide comes wrapped in inflammatory seed oils, refined carbs, and processed fillers. A carnivore approach solves both problems at once.</p>

<h2>The Protein Gap</h2>
<p>The standard recommendation for protein is 0.8 grams per kilogram of body weight per day. That's the RDA, the Recommended Dietary Allowance. For older adults, it's dangerously low.</p>
<p>The PROT-AGE study group, an international panel of geriatric nutrition experts, recommends 1.0-1.2 grams per kilogram for healthy older adults and 1.2-1.5 grams for those with acute or chronic illness. For older adults doing resistance exercise, the recommendation goes up to 1.6 grams per kilogram.</p>
<p>That means a 170-pound person over 60 should eat 77-116 grams of protein daily. Most are eating 50-60 grams. That's a 30-50% deficit, every single day, for years.</p>
<p>Carnivore closes that gap automatically. A pound of ground beef provides about 80 grams of protein. Add a few eggs for breakfast and you're well above 100 grams without thinking about it. No counting, no measuring, no complicated meal plans. Just eat meat.</p>
<p>If you're new to this way of eating, our <a href="/blog/2026-01-02-beginners-blueprint.html">beginner's blueprint</a> walks you through the first 30 days step by step.</p>

<h2>Muscle Protein Synthesis After 60</h2>
<p>Younger bodies are efficient at building muscle from protein. Eat some chicken, lift some weights, muscles grow. After 60, this process becomes less efficient. It's called anabolic resistance, and it's one of the primary drivers of age-related muscle loss.</p>
<p>Your muscles need a higher threshold of amino acids to trigger protein synthesis. Research published in the American Journal of Clinical Nutrition shows that older adults need 25-40 grams of high-quality protein per meal to maximally stimulate muscle building. That's roughly a 4-6 ounce serving of meat at each meal.</p>
<p>Here's the key: spreading protein evenly across meals matters more after 60. A breakfast of toast and juice followed by a large steak dinner doesn't work as well as three meals each containing 30+ grams of protein. Your muscles have a refractory period. They can only respond to a leucine signal every 3-5 hours. Three protein-rich meals spaced throughout the day gives you three separate windows for muscle building instead of one.</p>
<p>Plant proteins are less effective at triggering this response. They're lower in leucine, the amino acid that initiates muscle protein synthesis. Animal proteins, especially beef, contain the highest concentrations of leucine per serving. A 6-ounce ribeye delivers roughly 3.2 grams of leucine. You'd need nearly double the volume of beans or tofu to match that.</p>
<p>This isn't about philosophy. It's about biochemistry. After 60, the quality of your protein matters more than ever.</p>

<h2>The Exercise Component (Non-Negotiable)</h2>
<p>Protein alone won't build muscle. You need mechanical tension on the muscles to trigger growth. Resistance training combined with high protein intake is the single most effective intervention against sarcopenia. Period.</p>
<p>Here's a practical starting protocol for someone over 60 who hasn't been strength training:</p>
<ul>
<li><strong>Week 1-2:</strong> Bodyweight only. Wall pushups (3 sets of 10), chair-assisted squats (3 sets of 8), resistance band rows (3 sets of 10). Three days per week with at least one rest day between sessions.</li>
<li><strong>Week 3-4:</strong> Add light dumbbells or increase resistance band tension. Goblet squats with a 10-15 lb dumbbell. Dumbbell presses. Single-arm rows.</li>
<li><strong>Month 2+:</strong> Progress to compound movements with moderate weights. Deadlifts (trap bar is easier on the back), bench press, barbell rows. Work with a trainer for form if you haven't done these before.</li>
</ul>
<p>The goal isn't bodybuilding. It's functional strength. Can you get up from a chair without using your hands? Can you carry two bags of groceries up the stairs? Can you catch yourself if you trip? That's the kind of strength that keeps you independent at 70, 80, and beyond.</p>
<p>A 2015 meta-analysis in the British Journal of Sports Medicine found that resistance training combined with protein supplementation increased lean mass by an average of 0.81 kg over 13 weeks in adults over 60. On carnivore, you're not supplementing protein. You're eating it at every meal.</p>

<h2>Bone Density and the Calcium Myth</h2>
<p>The standard advice for bones: drink milk, take calcium supplements, eat dairy. But calcium intake alone doesn't prevent osteoporosis. You need calcium, vitamin D, vitamin K2, magnesium, and adequate protein to build and maintain bone.</p>
<p>A 2019 meta-analysis in the BMJ found that calcium supplements did not significantly reduce fracture risk in older adults. What did reduce fracture risk? Adequate protein intake and resistance exercise.</p>
<p>Bone is roughly 50% protein by volume. Collagen provides the matrix that calcium deposits onto. Without sufficient protein, calcium has nowhere to go. You can supplement calcium all day, but if you're protein-deficient, your bones still weaken.</p>
<p>Carnivore provides protein, collagen (especially from bone broth and slow-cooked meats), vitamin D (from fatty fish and egg yolks), and vitamin K2 (from grass-fed meat and butter). The bone-building nutrients come as a package, not isolated pills.</p>
<p>For specific supplement recommendations that complement a carnivore diet after 60, check out our <a href="/blog/2026-02-08-carnivore-supplements.html">complete supplement guide</a>. It covers vitamin D dosing, magnesium forms, and what most people over 60 actually need.</p>

<h2>Cognitive Benefits</h2>
<p>Brain health is a top concern after 60. B12 deficiency, common in older adults, is linked to cognitive decline, memory loss, and dementia risk. A study in Neurology found that low B12 levels were associated with accelerated brain volume loss.</p>
<p>Older adults absorb B12 less efficiently from food due to declining stomach acid production. But animal-sourced B12 (the form found in meat) is still absorbed better than plant-sourced or supplemental forms. A 4-ounce serving of beef liver contains over 1,000% of the daily B12 requirement. Even regular ground beef provides roughly 100% per serving.</p>
<p>Omega-3 fatty acids, particularly DHA, support brain cell membrane integrity. Fatty fish provides the most bioavailable form. A 2022 study in the American Journal of Clinical Nutrition found that adults over 65 with higher DHA levels had a 49% lower risk of developing Alzheimer's disease. Two to three servings of fatty fish per week (salmon, sardines, mackerel) cover this base.</p>
<p>Choline from egg yolks supports acetylcholine production, a neurotransmitter involved in memory and learning. Most Americans don't get enough choline at any age. After 60, the deficit becomes more consequential. Three eggs per day provides roughly 450 mg of choline, close to the adequate intake of 550 mg for men and 425 mg for women.</p>
<p>A carnivore diet delivers all of these brain-supporting nutrients in every meal. No pill organizer required.</p>

<h2>Common Concerns (Addressed Directly)</h2>
<p><strong>Cholesterol:</strong> Yes, your cholesterol numbers may change on carnivore. LDL often increases on high-fat diets. But the relationship between dietary cholesterol and heart disease is far more complex than "cholesterol bad." A 2020 review in the Journal of the American College of Cardiology noted that LDL particle size matters more than total LDL number. Large, buoyant LDL particles (common on low-carb diets) carry a different risk profile than small, dense LDL. Discuss your lipid panel with a doctor who understands low-carb nutrition. Context matters more than a single number. Our <a href="/blog/2026-02-08-bloodwork-guide.html">bloodwork guide</a> breaks down exactly which tests to request and how to read them.</p>
<p><strong>Kidney health:</strong> High protein diets don't cause kidney disease in people with healthy kidneys. A 2018 meta-analysis in the Journal of Renal Nutrition found no evidence that high protein intake harms kidney function in adults without pre-existing kidney disease. If you already have kidney disease, work with your nephrologist on appropriate protein levels.</p>
<p><strong>Constipation:</strong> Common in the first 2-3 weeks. Your gut adjusts to the lack of fiber. Increase your fat intake (fattier cuts of meat, butter) and make sure you're drinking enough water. It resolves for most people. If it persists past week 4, add magnesium citrate (300-400 mg before bed). It helps with both bowel regularity and the muscle cramps that some people experience during adaptation.</p>
<p><strong>Digestive capacity:</strong> Some people over 60 produce less stomach acid and fewer digestive enzymes. If you feel heavy after eating meat, try smaller meals more frequently. Betaine HCl supplements with meals can support protein digestion. Start with one capsule per meal and increase gradually until you feel comfortable.</p>

<h2>Getting Started After 60: The 90-Day Protocol</h2>
<p>Here's the exact framework I recommend for anyone over 60 starting carnivore.</p>
<p><strong>Before Day 1:</strong> Get baseline bloodwork. Complete metabolic panel, lipid panel, A1C, fasting insulin, vitamin D, B12, and a DEXA scan if possible (for body composition and bone density baseline). These numbers become your comparison point at 90 days.</p>
<p><strong>Days 1-14 (Adaptation):</strong> Eat beef, eggs, and fish. Salt your food generously with mineral-rich salt. Drink water when thirsty. Don't restrict calories or portion sizes. Your appetite will naturally regulate. Expect some adjustment symptoms: fatigue, headaches, muscle cramps. These are electrolyte-related and temporary. Increase your sodium to 5-7 grams per day (about 2-3 teaspoons of salt). Add 300 mg of magnesium citrate daily.</p>
<p><strong>Days 15-30 (Foundation):</strong> Your energy should stabilize. Start or resume resistance training at a comfortable level. Aim for 3 sessions per week. Focus on eating 3 meals per day, each with 30+ grams of protein. Introduce organ meats if you're open to them. Even 2-3 ounces of liver per week makes a measurable difference in B12 and vitamin A status.</p>
<p><strong>Days 31-60 (Optimization):</strong> Dial in your routine. Most people find their natural eating pattern during this phase, whether that's 2 meals or 3. Gradually increase resistance training intensity. Pay attention to sleep quality and joint comfort. Most people report noticeable improvements in both by this point.</p>
<p><strong>Days 61-90 (Assessment):</strong> Get follow-up bloodwork. Compare your numbers. Assess how you feel: energy, strength, mental clarity, joint health, sleep. The data tells the story. If your numbers improved and you feel better, you have your answer.</p>
<p>Don't skip the bloodwork. Feelings are useful, but numbers don't lie. A before-and-after comparison at 90 days gives you objective evidence that this approach works for your body.</p>
<p>Aging doesn't mean declining. It means your body needs better inputs. Give it protein, movement, and time. The results will show.</p>"""

# Load, update, write
with open(BLOG_FILE, "r") as f:
    data = json.load(f)

found = False
for post in data["blog_posts"]:
    if post["slug"] == TARGET_SLUG:
        post["content"] = NEW_CONTENT
        found = True
        break

if not found:
    print(f"ERROR: Slug '{TARGET_SLUG}' not found!")
    exit(1)

with open(BLOG_FILE, "w") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

# Validation
char_count = len(NEW_CONTENT)
word_count = len(NEW_CONTENT.split())
em_dash_count = NEW_CONTENT.count("\u2014")
bad_found = [w for w in BAD_WORDS if w.lower() in NEW_CONTENT.lower()]

print(f"Characters: {char_count}")
print(f"Word count: {word_count}")
print(f"Em-dashes: {em_dash_count}")
print(f"Bad words: {bad_found if bad_found else 'None'}")
print(f"Target met: {'YES' if char_count >= 8500 else 'NO'} (need 8500+)")
