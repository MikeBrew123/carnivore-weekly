#!/usr/bin/env python3
"""Expand the Valentine's Day carnivore date night blog post content."""

import json

FILE = "/Users/mbrew/Developer/carnivore-weekly/data/blog_posts.json"
SLUG = "2026-02-14-valentines-day-carnivore-date-night"

BAD_WORDS = [
    "crucial", "vital", "straightforward", "game-changer", "dive into",
    "realm", "landscape", "unleash", "elevate", "navigate", "leverage",
    "robust", "tapestry", "paradigm", "delve"
]

NEW_CONTENT = (
'<h2>Romance Doesn\'t Require Breadsticks</h2>\n'
'<p>Valentine\'s Day dinner usually means a prix fixe menu with pasta, chocolate mousse, and a wine pairing that costs more than your grocery bill. If you\'re carnivore, that menu is roughly 80% off-limits. And honestly? You\'re not missing much.</p>\n'
'<p>Good news: the best parts of a fancy dinner were always the steak and the butter anyway. Nobody ever left a great restaurant thinking, "Man, that bread basket really made the evening." They remember the perfectly cooked ribeye. The seared scallops. The person sitting across from them.</p>\n'
'<p>Here\'s how to do Valentine\'s Day carnivore, whether you\'re cooking at home or heading out. No weird substitutions. No sad plate. Just really good food and a good time with someone you like.</p>\n'

'<h2>The At-Home Steak Dinner (For Two)</h2>\n'
'<p>Cooking at home is the easiest carnivore Valentine\'s option. You control everything, the vibe is more relaxed, and honestly, a home-cooked ribeye beats most restaurant steaks. Plus you don\'t have to fight for a reservation you booked six weeks ago.</p>\n'

'<h3>The Starter: Bacon-Wrapped Scallops</h3>\n'
'<p>Wrap each scallop in a half-slice of thick-cut bacon and secure it with a toothpick. Sear them in butter over medium-high heat, about 2-3 minutes per side, until the bacon is crispy and the scallops are just opaque in the center. Three per person is plenty as a starter.</p>\n'
'<p>Pro tip: pat the scallops dry before wrapping. Wet scallops steam instead of searing, and you want that golden crust. If you can find dry-packed (not water-injected) scallops at your fish counter, grab those. The difference is noticeable.</p>\n'

'<h3>The Main: Reverse-Seared Ribeyes</h3>\n'
'<p>Two thick-cut ribeyes, 1.5 inches minimum. Season generously with coarse salt at least 45 minutes before cooking (overnight in the fridge is even better). Bring them to 120 degrees internal in a 250-degree oven, which usually takes about 45-50 minutes. Then sear in a screaming hot cast iron with butter, garlic cloves, and fresh thyme. Baste constantly for about 90 seconds per side. Rest for 5 minutes. Slice against the grain.</p>\n'
'<p>The reverse sear gives you edge-to-edge pink with a perfect crust. It\'s basically foolproof, which is what you want when you\'re trying to impress someone. Nobody wants a gray ribeye on Valentine\'s Day.</p>\n'
'<p>If your partner isn\'t full carnivore, roast some asparagus in beef tallow for their side. You eat another piece of steak. Problem solved.</p>\n'

'<h3>The Finish: Roasted Bone Marrow</h3>\n'
'<p>This is the move that turns a good dinner into a memorable one. Ask your butcher to split marrow bones lengthwise. Roast them at 450 degrees for 15-20 minutes until the marrow is soft, slightly bubbly, and starting to pull away from the bone. Sprinkle with flaky Maldon salt.</p>\n'
'<p>Spread the marrow on your steak. It\'s rich, buttery, and feels like dessert without the sugar crash. If you\'ve never had roasted bone marrow, Valentine\'s Day is a great excuse to try it. Your date will either be impressed or horrified, and both reactions are entertaining.</p>\n'

'<h3>Setting the Scene</h3>\n'
'<p>Light some candles. Put your phone in the other room. Play something that isn\'t a Spotify algorithm playlist (actual albums are better). Use the nice plates you got for Christmas that are still in the box. The food does most of the work, but small touches make it feel like an event rather than a Tuesday.</p>\n'
'<p>If you want to get fancy with the presentation, slice the ribeyes and fan them out on a cutting board. Add the marrow bones on the side. It looks like something from a food magazine, and it took you zero extra effort.</p>\n'

'<h2>The Restaurant Strategy</h2>\n'
'<p>Most steakhouses are carnivore-friendly by default. The trick is ordering confidently without making it weird. You\'re out to enjoy the night, not to give a TED talk about ancestral eating. I\'ve covered this in detail in the <a href="/blog/2026-02-08-restaurant-survival-guide.html">restaurant survival guide</a>, but here\'s the Valentine\'s Day version.</p>\n'
'<p>Skip the bread basket without apologizing. Order a shrimp cocktail to start (just shrimp and lemon, hold the cocktail sauce if it has sugar). Get the biggest steak on the menu, cooked medium rare, with extra butter on the side. Add a lobster tail if the budget allows. If you\'re watching your spending, check our <a href="/blog/2026-01-05-ground-beef-budget.html">carnivore budget guide</a> for ideas that don\'t break the bank.</p>\n'
'<p>When the server asks about sides, say "I\'m good with just the steak, thanks." No explanation needed. Nobody at the restaurant cares about your diet. They care about your tip. Servers have seen way stranger requests than "no sides, please."</p>\n'
'<p>One thing people forget: call ahead and mention it\'s Valentine\'s Day. Most nice restaurants will throw in small touches, a better table, maybe a complimentary something. You don\'t need to explain carnivore on the phone. Just make the reservation and mention it\'s a special occasion.</p>\n'
'<p>If your date orders pasta and dessert, don\'t comment on it. Eat your steak, enjoy the company, and skip the nutrition lecture. Nothing kills romance faster than unsolicited diet advice over candlelight.</p>\n'

'<h2>When Your Partner Isn\'t Carnivore</h2>\n'
'<p>This is the real Valentine\'s Day challenge. Not the food. The social dynamics.</p>\n'
'<p>If your partner thinks carnivore is extreme, Valentine\'s Day is not the time to convert them. It\'s the time to show that your diet doesn\'t ruin shared experiences. I wrote a whole piece about <a href="/blog/2026-02-08-dating-carnivore.html">dating on carnivore</a> because this comes up constantly in the community. The short version: be normal about it.</p>\n'
'<p>Cook something you both enjoy. Everyone likes a good steak. Make the meal about quality ingredients and time together, not about what you can\'t eat. If they want potatoes with their steak, make potatoes. You\'re not going to absorb carbs through proximity.</p>\n'
'<p>If they want chocolate for dessert, let them have chocolate. You can have a cup of bone broth with butter stirred in. Or just sit there contentedly full from your 16-ounce ribeye while they eat cake. That\'s genuinely fine. Being comfortable in your own choices without needing everyone else to mirror them is attractive. Nobody wants to date the food police.</p>\n'
'<p>If your partner is curious about carnivore (and Valentine\'s Day steak dinner is sometimes what sparks that curiosity), answer their questions honestly but briefly. "I feel better eating this way" is a complete sentence. Save the 45-minute breakdown of seed oils for a different night.</p>\n'
'<p>The goal is connection, not compliance.</p>\n'

'<h2>Carnivore "Dessert" Options</h2>\n'
'<p>If you genuinely want something sweet-ish after dinner, here are some options that stay carnivore and still feel like a treat:</p>\n'
'<p><strong>Whipped heavy cream with vanilla.</strong> Whip cold heavy cream until it forms stiff peaks, add a tiny pinch of vanilla extract. Serve it in a nice glass or ramekin. Some strict carnivores skip the vanilla, but for one night, it\'s not going to derail anything. If you want to get creative, top it with a sprinkle of cinnamon. It tastes like the best part of a dessert without all the sugar and flour underneath it.</p>\n'
'<p><strong>Crispy pork belly bites.</strong> Cut pork belly into 1-inch cubes, season generously with salt, and air fry at 400 degrees for 20-25 minutes (or broil, flipping once). The outside gets crackling crispy while the inside stays tender and rich. They scratch the "treat" itch without any plant ingredients. Make extra, because these disappear fast.</p>\n'
'<p><strong>Brie or camembert, slightly warmed.</strong> If you tolerate dairy, put a wheel of brie in a 350-degree oven for about 10 minutes until the center is gooey. Slice it and eat it warm. Rich, creamy, and it feels fancy. This is a solid closer to a meal, and even your non-carnivore partner will want some.</p>\n'
'<p><strong>Butter-poached lobster bites.</strong> If you went with steak for the main course and want something different for "dessert," cut lobster tail into chunks and gently poach them in melted butter with a clove of garlic for about 5 minutes. It\'s indulgent, it\'s special-occasion food, and it takes almost no effort.</p>\n'

'<h2>The Gift Situation</h2>\n'
'<p>Traditional Valentine\'s gifts lean heavily on chocolate and baked goods. If someone gives you a box of chocolates, say thank you and move on. You can regift them to a coworker, bring them to the office, or just accept the gesture gracefully without eating them. Making a big deal out of not eating a gift is awkward for everyone.</p>\n'
'<p>If you\'re buying for a carnivore partner, think practical and high-quality. A few ideas that actually land well:</p>\n'
'<ul>\n'
'<li>Wagyu steaks from a good mail-order butcher (Snake River Farms, Crowd Cow, or your local ranch)</li>\n'
'<li>A new cast iron skillet or a quality meat thermometer (the ThermoWorks Thermapen is the gold standard)</li>\n'
'<li>A meat subscription box for the next few months</li>\n'
'<li>Gift cards to their favorite steakhouse</li>\n'
'<li>A nice cutting board and a proper chef\'s knife</li>\n'
'</ul>\n'
'<p>These gifts show you understand their lifestyle and actually thought about what they\'d use. Way better than a generic box of truffles from the pharmacy checkout line.</p>\n'
'<p>If you\'re buying for someone who isn\'t carnivore, get them whatever they want. It\'s not your job to convert people through gift-giving. Save that energy for making the dinner so good they start asking questions on their own.</p>\n'

'<h2>Just Enjoy the Night</h2>\n'
'<p>Valentine\'s Day is about the person across the table, not the macros on the plate. Carnivore actually makes this easier. You\'re not stressing about menu choices, counting calories, or wondering if the dressing has sugar. Order meat. Eat meat. Focus on your date.</p>\n'
'<p>Some of the best Valentine\'s dinners don\'t involve restaurants at all. Two good steaks, some candles, and nowhere to be the next morning. That\'s the whole formula. The carnivore part is just the food. The rest is up to you.</p>\n'
'<p>The simplicity is a feature, not a limitation.</p>'
)

# Load, update, save
with open(FILE, "r") as f:
    data = json.load(f)

updated = False
for post in data["blog_posts"]:
    if post["slug"] == SLUG:
        post["content"] = NEW_CONTENT
        updated = True
        break

if not updated:
    print(f"ERROR: Slug '{SLUG}' not found!")
    exit(1)

with open(FILE, "w") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
    f.write("\n")

# Validation
char_count = len(NEW_CONTENT)
word_count = len(NEW_CONTENT.split())
em_dash_count = NEW_CONTENT.count("\u2014")
bad_found = [w for w in BAD_WORDS if w.lower() in NEW_CONTENT.lower()]

print(f"Character count: {char_count}")
print(f"Word count: {word_count}")
print(f"Em-dash count: {em_dash_count}")
print(f"Bad words found: {bad_found if bad_found else 'None'}")
print(f"Target met (7500+ chars): {'YES' if char_count >= 7500 else 'NO'}")
