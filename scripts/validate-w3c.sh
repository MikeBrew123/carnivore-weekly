#!/bin/bash

# W3C HTML Validation Script for Carnivore Weekly
# Validates HTML structure and common compliance issues
# Usage: ./validate-w3c.sh <html_file>
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

echo "==========================================="
echo "W3C HTML Validation: $FILE"
echo "==========================================="
echo ""

# Check DOCTYPE declaration
if grep -q "<!DOCTYPE html>" "$FILE" || grep -q "<!doctype html>" "$FILE"; then
    print_result "pass" "HTML5 DOCTYPE declared"
else
    print_result "fail" "DOCTYPE declaration missing or incorrect"
fi

# Check <html> tag with lang attribute
if grep -q '<html[^>]*lang=' "$FILE"; then
    LANG=$(grep '<html[^>]*lang=' "$FILE" | sed -n 's/.*lang="\([^"]*\)".*/\1/p' | head -1)
    print_result "pass" "HTML tag has lang attribute (lang=\"$LANG\")"
else
    print_result "fail" "HTML tag missing lang attribute"
fi

# Check <head> tag present
if grep -q "<head" "$FILE"; then
    print_result "pass" "<head> tag present"
else
    print_result "fail" "<head> tag missing"
fi

# Check <title> tag
if grep -q "<title" "$FILE"; then
    TITLE=$(grep "<title" "$FILE" | sed 's/<title>//g' | sed 's/<\/title>//g' | head -1)
    TITLE_LEN=${#TITLE}
    if [[ $TITLE_LEN -gt 0 && $TITLE_LEN -lt 100 ]]; then
        print_result "pass" "<title> tag present ($TITLE_LEN chars)"
    else
        print_result "warning" "<title> tag present but length is $TITLE_LEN (recommend 30-60)"
    fi
else
    print_result "fail" "<title> tag missing"
fi

# Check <meta charset>
if grep -q 'charset=.*UTF-8\|charset=.*utf-8' "$FILE"; then
    print_result "pass" "UTF-8 charset declared"
else
    print_result "fail" "UTF-8 charset not declared"
fi

# Check <meta viewport>
if grep -q '<meta[^>]*viewport' "$FILE"; then
    print_result "pass" "Viewport meta tag present"
else
    print_result "fail" "Viewport meta tag missing (required for mobile)"
fi

# Check <body> tag
if grep -q "<body" "$FILE"; then
    print_result "pass" "<body> tag present"
else
    print_result "fail" "<body> tag missing"
fi

# Check for unclosed tags (basic check)
UNCLOSED_P=$(grep -o '<p[^>]*>' "$FILE" | wc -l)
CLOSED_P=$(grep -o '</p>' "$FILE" | wc -l)
if [[ $UNCLOSED_P -gt 0 ]]; then
    if [[ $UNCLOSED_P -eq $CLOSED_P ]]; then
        print_result "pass" "All <p> tags properly closed ($UNCLOSED_P pairs)"
    else
        print_result "warning" "Mismatched <p> tags ($UNCLOSED_P opened, $CLOSED_P closed)"
    fi
fi

# Check for unclosed div tags
UNCLOSED_DIV=$(grep -o '<div[^>]*>' "$FILE" | wc -l)
CLOSED_DIV=$(grep -o '</div>' "$FILE" | wc -l)
if [[ $UNCLOSED_DIV -gt 0 ]]; then
    if [[ $UNCLOSED_DIV -eq $CLOSED_DIV ]]; then
        print_result "pass" "All <div> tags properly closed ($UNCLOSED_DIV pairs)"
    else
        print_result "warning" "Mismatched <div> tags ($UNCLOSED_DIV opened, $CLOSED_DIV closed)"
    fi
fi

# Check for form issues
FORM_COUNT=$(grep -o '<form[^>]*>' "$FILE" | wc -l)
FORM_CLOSE=$(grep -o '</form>' "$FILE" | wc -l)
if [[ $FORM_COUNT -gt 0 ]]; then
    if [[ $FORM_COUNT -eq $FORM_CLOSE ]]; then
        print_result "pass" "All <form> tags properly closed ($FORM_COUNT pairs)"
    else
        print_result "fail" "Mismatched <form> tags ($FORM_COUNT opened, $FORM_CLOSE closed)"
    fi
fi

# Check for empty href attributes
if grep -q '<a href=""' "$FILE"; then
    EMPTY_HREF=$(grep -o '<a href=""' "$FILE" | wc -l)
    print_result "warning" "Found $EMPTY_HREF empty href attributes"
fi

# Check for style attributes (should be avoided)
STYLE_COUNT=$(grep -o 'style=' "$FILE" | wc -l)
if [[ $STYLE_COUNT -eq 0 ]]; then
    print_result "pass" "No inline styles found (good practice)"
elif [[ $STYLE_COUNT -le 3 ]]; then
    print_result "pass" "Minimal inline styles ($STYLE_COUNT found)"
else
    print_result "warning" "Multiple inline styles found ($STYLE_COUNT, recommend using CSS classes)"
fi

# Check for deprecated tags
DEPRECATED_TAGS=0
for tag in "font" "center" "basefont"; do
    if grep -q "<$tag" "$FILE"; then
        ((DEPRECATED_TAGS++))
    fi
done

if [[ $DEPRECATED_TAGS -eq 0 ]]; then
    print_result "pass" "No deprecated HTML tags found"
else
    print_result "warning" "Found $DEPRECATED_TAGS deprecated HTML tags"
fi

# Check for proper heading hierarchy
H1_COUNT=$(grep -o '<h1[^>]*>' "$FILE" | wc -l)
if [[ $H1_COUNT -eq 0 ]]; then
    print_result "fail" "No H1 heading found (required for accessibility)"
elif [[ $H1_COUNT -eq 1 ]]; then
    print_result "pass" "Single H1 heading present (proper hierarchy)"
else
    print_result "warning" "Multiple H1 headings found ($H1_COUNT, recommend single H1)"
fi

# Check for basic accessibility - language spans
if grep -q '<span[^>]*lang=' "$FILE"; then
    print_result "pass" "Language markers found for accessibility"
elif [[ $H1_COUNT -gt 0 ]]; then
    print_result "warning" "No language spans found (consider adding for mixed-language content)"
fi

# Summary
echo ""
echo "==============================================="
echo "W3C Compliance Summary"
echo "==============================================="
echo -e "${GREEN}Passed: $PASSED${RESET}"
echo -e "${YELLOW}Warnings: $WARNINGS${RESET}"
echo -e "${RED}Failed: $FAILED${RESET}"
echo ""

if [[ $FAILED -eq 0 ]]; then
    echo -e "${GREEN}✅ W3C validation passed!${RESET}"
    exit 0
else
    echo -e "${RED}❌ W3C validation failed${RESET}"
    exit 1
fi
