#!/bin/bash

# Blog post restructuring script
# Transforms blog posts to match gold standard template

# Define post details (date, author, tags)
declare -A posts=(
    ["2025-12-21-night-sweats.html"]="December 21, 2025|Sarah|Health Coach|adaptation,troubleshooting,electrolytes"
    ["2025-12-22-mtor-muscle.html"]="December 22, 2025|Marcus|Performance Coach|muscle-building,performance,science"
    ["2025-12-23-adhd-connection.html"]="December 23, 2025|Sarah|Health Coach|mental-health,research,neurology"
    ["2025-12-24-deep-freezer-strategy.html"]="December 24, 2025|Casey|Wellness Guide|practical,budget,meal-prep"
    ["2025-12-25-new-year-same-you.html"]="December 25, 2025|Marcus|Performance Coach|mindset,habits,behavior-change"
    ["2025-12-26-seven-dollar-survival-guide.html"]="December 26, 2025|Marcus|Performance Coach|budget,practical,money-saving"
    ["2025-12-27-anti-resolution-playbook.html"]="December 27, 2025|Casey|Wellness Guide|mindset,habits,systems"
    ["2025-12-28-physiological-insulin-resistance.html"]="December 28, 2025|Sarah|Health Coach|science,metabolic-health,research"
    ["2025-12-29-lion-diet-challenge.html"]="December 29, 2025|Marcus|Performance Coach|elimination-diet,challenge,practical"
)

for post in "${!posts[@]}"; do
    echo "✅ Processing: $post"

    IFS='|' read -r date author title tags <<< "${posts[$post]}"
    slug="${post%.html}"

    # Update metadata timestamp
    sed -i '' 's|<meta property="article:published_time" content="[^"]*">|<meta property="article:published_time" content="'${slug:0:10}'T00:00:00Z">|g' "/Users/mbrew/Developer/carnivore-weekly/public/blog/$post"

    # Update post-slug in reactions
    sed -i '' 's|data-post-slug=""|data-post-slug="'$slug'"|g' "/Users/mbrew/Developer/carnivore-weekly/public/blog/$post"

    # Update related content ID
    sed -i '' 's|data-content-id=""|data-content-id="'$slug'"|g' "/Users/mbrew/Developer/carnivore-weekly/public/blog/$post"

    # Update post meta date and author
    sed -i '' "s|<span></span>|<span>$date</span>|g" "/Users/mbrew/Developer/carnivore-weekly/public/blog/$post"
    sed -i '' "s|<span>by [a-z]*</span>|<span>by $author</span>|g" "/Users/mbrew/Developer/carnivore-weekly/public/blog/$post"

    # Update author bio
    sed -i '' "s|<strong>[a-z]*</strong><br>|<strong>$author</strong><br>$title at Carnivore Weekly, cutting through the noise to bring you evidence-based insights.|g" "/Users/mbrew/Developer/carnivore-weekly/public/blog/$post"

    # Update tags
    IFS=',' read -ra TAG_ARRAY <<< "$tags"
    tag_replacement=""
    for tag in "${TAG_ARRAY[@]}"; do
        tag_replacement+="<span class=\"tag\">$tag</span>\n                "
    done

    # This will need manual cleanup for tags since sed can't handle multi-line easily
    echo "  → Updated metadata for $post"
done

echo ""
echo "✅ All posts processed. Review changes and commit individually."
