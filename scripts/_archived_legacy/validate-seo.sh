#!/bin/bash

# SEO Validation Script for Carnivore Weekly
# Validates critical SEO elements in HTML files
# Usage: ./validate-seo.sh <html_file>
# Exit codes: 0 = pass, 1 = fail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
RESET='\033[0m'

PASSED=0
FAILED=0
WARNINGS=0

print_result() {
    local status=$1
    local message=$2

    case $status in
        "pass")
            echo -e "${GREEN}✅${RESET} $message"
            ((PASSED++))
            ;;
        "fail")
            echo -e "${RED}❌${RESET} $message"
            ((FAILED++))
            ;;
        "warning")
            echo -e "${YELLOW}⚠️${RESET} $message"
            ((WARNINGS++))
            ;;
    esac
}

if [[ $# -ne 1 ]]; then
    echo "Usage: $0 <html_file>"
    exit 1
fi

FILE="$1"

if [[ ! -f "$FILE" ]]; then
    echo -e "${RED}❌ Error: File '$FILE' not found${RESET}"
    exit 1
fi

echo "=========================================="
echo "SEO Validation: $FILE"
echo "=========================================="
echo ""

# Check meta description
if grep -q '<meta name="description"' "$FILE"; then
    DESC_LEN=$(grep '<meta name="description"' "$FILE" | sed 's/.*content="\([^"]*\)".*/\1/' | wc -c)
    if [[ $DESC_LEN -ge 120 && $DESC_LEN -le 160 ]]; then
        print_result "pass" "Meta description present ($DESC_LEN chars)"
    else
        print_result "warning" "Meta description present but length is $DESC_LEN (recommend 120-160)"
    fi
else
    print_result "fail" "Meta description missing"
fi

# Check Open Graph tags
OG_COUNT=$(grep -c 'property="og:' "$FILE" || echo 0)
if [[ $OG_COUNT -ge 6 ]]; then
    print_result "pass" "Open Graph tags present ($OG_COUNT found)"
elif [[ $OG_COUNT -ge 3 ]]; then
    print_result "warning" "Open Graph tags incomplete ($OG_COUNT/6 found)"
else
    print_result "fail" "Open Graph tags missing ($OG_COUNT found)"
fi

# Check Twitter Card tags
TWITTER_COUNT=$(grep -c 'name="twitter:' "$FILE" || echo 0)
if [[ $TWITTER_COUNT -ge 4 ]]; then
    print_result "pass" "Twitter Card tags present ($TWITTER_COUNT found)"
elif [[ $TWITTER_COUNT -ge 2 ]]; then
    print_result "warning" "Twitter Card tags incomplete ($TWITTER_COUNT/4 found)"
else
    print_result "fail" "Twitter Card tags missing ($TWITTER_COUNT found)"
fi

# Check H1 tag count
H1_COUNT=$(grep -o '<h1[^>]*>' "$FILE" | wc -l)
if [[ $H1_COUNT -eq 1 ]]; then
    print_result "pass" "Exactly 1 H1 tag found"
elif [[ $H1_COUNT -eq 0 ]]; then
    print_result "fail" "No H1 tag found (required for SEO)"
else
    print_result "fail" "Multiple H1 tags found ($H1_COUNT, should have exactly 1)"
fi

# Check Google Analytics tracking
if grep -q "G-NR4JVKW2JV" "$FILE"; then
    print_result "pass" "Google Analytics tracking code present"
else
    print_result "fail" "Google Analytics tracking code missing (expected G-NR4JVKW2JV)"
fi

# Check image alt text
IMAGES=$(grep -o '<img[^>]*>' "$FILE" | wc -l)
IMG_WITHOUT_ALT=$(grep '<img[^>]*>' "$FILE" | grep -vc 'alt=' || echo 0)

if [[ $IMAGES -eq 0 ]]; then
    print_result "warning" "No images found on page"
elif [[ $IMG_WITHOUT_ALT -eq 0 ]]; then
    print_result "pass" "All $IMAGES images have alt text"
else
    print_result "fail" "$IMG_WITHOUT_ALT/$IMAGES images missing alt text"
fi

# Summary
echo ""
echo "==============================================="
echo "SEO Validation Summary"
echo "==============================================="
echo -e "${GREEN}Passed: $PASSED${RESET}"
echo -e "${YELLOW}Warnings: $WARNINGS${RESET}"
echo -e "${RED}Failed: $FAILED${RESET}"
echo ""

if [[ $FAILED -eq 0 ]]; then
    echo -e "${GREEN}✅ SEO validation passed!${RESET}"
    exit 0
else
    echo -e "${RED}❌ SEO validation failed${RESET}"
    exit 1
fi
