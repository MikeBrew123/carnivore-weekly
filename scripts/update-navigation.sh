#!/bin/bash
# Update navigation across all HTML files to use new names
# Phase 4: Template Updates

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting navigation update across site...${NC}"

# Files to update
FILES=(
    "public/wiki.html"
    "public/blog.html"
    "public/calculator.html"
)

# Add all blog post files
BLOG_FILES=$(find public/blog -name "*.html" -type f 2>/dev/null)
if [ -n "$BLOG_FILES" ]; then
    FILES+=($BLOG_FILES)
fi

# Count files
TOTAL=${#FILES[@]}
CURRENT=0

for file in "${FILES[@]}"; do
    if [ ! -f "$file" ]; then
        continue
    fi

    CURRENT=$((CURRENT + 1))
    echo -e "${BLUE}[$CURRENT/$TOTAL] Updating: $file${NC}"

    # Update navigation text (case-sensitive)
    sed -i '' 's|>Channels<|>Weekly Watch<|g' "$file"
    sed -i '' 's|>Wiki<|>Protocols \&amp; Basics<|g' "$file"
    sed -i '' 's|>Blog<|>Insights<|g' "$file"

    # Update page titles for consistency
    sed -i '' 's|Channels - |Weekly Watch - |g' "$file"
    sed -i '' 's|Wiki - |Protocols \&amp; Basics - |g' "$file"
    sed -i '' 's|Blog - |Insights - |g' "$file"

    # Update Open Graph titles
    sed -i '' 's|Featured Channels|Weekly Watch|g' "$file"
    sed -i '' 's|Carnivore Diet Wiki|Protocols \&amp; Basics|g' "$file"

    echo -e "${GREEN}  ✓ Navigation updated${NC}"
done

echo -e "${GREEN}Done! Updated $CURRENT files.${NC}"
echo ""
echo "Next steps:"
echo "1. Review changes: git diff"
echo "2. Test pages in browser"
echo "3. Commit if all looks good"
