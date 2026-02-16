#!/bin/bash

# Brand Validation Script for Carnivore Weekly
# Validates brand compliance in HTML files
# Usage: ./validate-brand.sh <html_file>
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
echo "Brand Validation: $FILE"
echo "=========================================="
echo ""

# Check dark background color (#1a120b)
if grep -q "#1a120b\|#1A120B" "$FILE"; then
    print_result "pass" "Dark background color #1a120b found"
else
    print_result "fail" "Dark background color #1a120b not found"
fi

# Check text color (#2c1810)
if grep -q "#2c1810\|#2C1810" "$FILE"; then
    print_result "pass" "Text color #2c1810 found"
else
    print_result "fail" "Text color #2c1810 not found"
fi

# Check Playfair Display font
if grep -q "Playfair" "$FILE"; then
    print_result "pass" "Playfair Display font found"
else
    print_result "fail" "Playfair Display font not found"
fi

# Check Merriweather font
if grep -q "Merriweather" "$FILE"; then
    print_result "pass" "Merriweather font found"
else
    print_result "fail" "Merriweather font not found"
fi

# Check spacing standards
if grep -q "50px\|50" "$FILE"; then
    print_result "pass" "Navigation spacing (50px) found"
else
    print_result "warning" "Navigation spacing (50px) not explicitly found"
fi

if grep -q "25\|30\|35\|40" "$FILE" && grep -q "padding\|gap\|margin" "$FILE"; then
    print_result "pass" "Section spacing (25-40px) found"
else
    print_result "warning" "Section spacing (25-40px) not explicitly found"
fi

if grep -q "1400px\|max-width.*1400" "$FILE"; then
    print_result "pass" "Container max-width (1400px) found"
else
    print_result "warning" "Container max-width (1400px) not explicitly found"
fi

# Check em-dashes
EM_DASH_COUNT=$(grep -o -- '--' "$FILE" | wc -l)
if [[ $EM_DASH_COUNT -eq 0 ]]; then
    print_result "pass" "No em-dashes found (compliant)"
elif [[ $EM_DASH_COUNT -eq 1 ]]; then
    print_result "pass" "Em-dash count acceptable (1 found)"
else
    print_result "warning" "Multiple em-dashes found ($EM_DASH_COUNT, recommend max 1)"
fi

# Check sans-serif usage
SANS_SERIF_COUNT=$(grep -i "sans-serif" "$FILE" | wc -l)
if [[ $SANS_SERIF_COUNT -eq 0 ]]; then
    print_result "pass" "No sans-serif fonts found (preferred serif-only)"
elif [[ $SANS_SERIF_COUNT -eq 1 ]]; then
    print_result "pass" "Sans-serif usage minimal (1 instance)"
else
    print_result "warning" "Multiple sans-serif instances found ($SANS_SERIF_COUNT, recommend max 1)"
fi

# Check for leather texture
if grep -q "feTurbulence\|texture\|leather\|noise" "$FILE"; then
    print_result "pass" "Leather texture/SVG filter found"
else
    print_result "warning" "Leather texture/SVG filter not found (recommended element)"
fi

# Check accent colors
if grep -q "#d4a574\|#D4A574" "$FILE"; then
    print_result "pass" "Accent color tan #d4a574 found"
else
    print_result "warning" "Accent color tan #d4a574 not found"
fi

if grep -q "#ffd700\|#FFD700" "$FILE"; then
    print_result "pass" "Accent color gold #ffd700 found"
else
    print_result "warning" "Accent color gold #ffd700 not found"
fi

# Summary
echo ""
echo "==============================================="
echo "Brand Validation Summary"
echo "==============================================="
echo -e "${GREEN}Passed: $PASSED${RESET}"
echo -e "${YELLOW}Warnings: $WARNINGS${RESET}"
echo -e "${RED}Failed: $FAILED${RESET}"
echo ""

if [[ $FAILED -eq 0 ]]; then
    echo -e "${GREEN}✅ Brand validation passed!${RESET}"
    exit 0
else
    echo -e "${RED}❌ Brand validation failed${RESET}"
    exit 1
fi
