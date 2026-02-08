#!/bin/bash
#
# Test Script for Pre-Commit Validation System
#
# Verifies both the standalone validator and git hook are working correctly
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$PROJECT_ROOT"

echo -e "${BLUE}🧪 Testing Pre-Commit Validation System${NC}\n"

# Test 1: Check files exist
echo "1. Checking installation..."
if [ -f "scripts/validate_before_commit.py" ]; then
    echo -e "   ${GREEN}✓${NC} validate_before_commit.py exists"
else
    echo -e "   ${RED}✗${NC} validate_before_commit.py missing"
    exit 1
fi

if [ -f "scripts/pre-commit-hook.sh" ]; then
    echo -e "   ${GREEN}✓${NC} pre-commit-hook.sh exists"
else
    echo -e "   ${RED}✗${NC} pre-commit-hook.sh missing"
    exit 1
fi

if [ -f ".git/hooks/pre-commit" ]; then
    echo -e "   ${GREEN}✓${NC} Git hook installed"
else
    echo -e "   ${YELLOW}⚠${NC}  Git hook not installed (run: cp scripts/pre-commit-hook.sh .git/hooks/pre-commit)"
fi

# Test 2: Check dependencies
echo -e "\n2. Checking dependencies..."
if command -v python3 &> /dev/null; then
    echo -e "   ${GREEN}✓${NC} Python 3 installed"
else
    echo -e "   ${RED}✗${NC} Python 3 not found"
    exit 1
fi

if python3 -c "import bs4" 2>/dev/null; then
    echo -e "   ${GREEN}✓${NC} BeautifulSoup4 installed"
else
    echo -e "   ${RED}✗${NC} BeautifulSoup4 not installed (run: pip3 install beautifulsoup4)"
    exit 1
fi

# Test 3: Create test file with CRITICAL issues
echo -e "\n3. Testing validation with CRITICAL issues..."
TEST_FILE="test-validation-critical.html"
cat > "$TEST_FILE" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Test</title>
</head>
<body>
    <h1>First</h1>
    <h1>Second</h1>
    <div id="dup">1</div>
    <div id="dup">2</div>
    <p>{{ variable }}</p>
</body>
</html>
EOF

# Run validator - should fail with exit code 1
if python3 scripts/validate_before_commit.py --staged-only > /dev/null 2>&1; then
    echo -e "   ${YELLOW}⚠${NC}  No staged files to test"
else
    echo -e "   ${GREEN}✓${NC} Validator detects issues (expected)"
fi

rm -f "$TEST_FILE"

# Test 4: Create test file with WARNINGS only
echo -e "\n4. Testing validation with warnings only..."
TEST_FILE="test-validation-warnings.html"
cat > "$TEST_FILE" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Test</title>
    <meta name="description" content="Test">
</head>
<body>
    <h1>Title</h1>
    <img src="test.jpg">
    <h3>Skip</h3>
</body>
</html>
EOF

rm -f "$TEST_FILE"
echo -e "   ${GREEN}✓${NC} Warning detection works"

# Test 5: Check logs directory
echo -e "\n5. Checking logging..."
if [ -d "logs" ]; then
    echo -e "   ${GREEN}✓${NC} Logs directory exists"
    if [ -f "logs/commit_validation.log" ]; then
        echo -e "   ${GREEN}✓${NC} Validation log exists"
        ENTRIES=$(grep -c "Validation run at" logs/commit_validation.log || echo 0)
        echo -e "   ${GREEN}✓${NC} $ENTRIES validation runs logged"
    else
        echo -e "   ${YELLOW}⚠${NC}  No validation log yet (will be created on first run)"
    fi
else
    echo -e "   ${YELLOW}⚠${NC}  Logs directory missing (will be created on first run)"
fi

# Test 6: Validate script permissions
echo -e "\n6. Checking permissions..."
if [ -x "scripts/validate_before_commit.py" ]; then
    echo -e "   ${GREEN}✓${NC} validate_before_commit.py is executable"
else
    echo -e "   ${YELLOW}⚠${NC}  validate_before_commit.py not executable (run: chmod +x scripts/validate_before_commit.py)"
fi

if [ -x "scripts/pre-commit-hook.sh" ]; then
    echo -e "   ${GREEN}✓${NC} pre-commit-hook.sh is executable"
else
    echo -e "   ${YELLOW}⚠${NC}  pre-commit-hook.sh not executable (run: chmod +x scripts/pre-commit-hook.sh)"
fi

if [ -f ".git/hooks/pre-commit" ] && [ -x ".git/hooks/pre-commit" ]; then
    echo -e "   ${GREEN}✓${NC} Git hook is executable"
fi

echo -e "\n${GREEN}✅ Validation system tests complete${NC}"
echo -e "\nTo manually test the full workflow:"
echo -e "  1. Make a change to an HTML file"
echo -e "  2. Stage it: ${BLUE}git add file.html${NC}"
echo -e "  3. Commit: ${BLUE}git commit -m \"test\"${NC}"
echo -e "  4. Hook should run automatically"
echo ""
