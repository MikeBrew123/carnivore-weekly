#!/bin/bash
#
# Pre-Commit Git Hook for Carnivore Weekly
#
# Runs validation on staged files before allowing commit.
# Blocks commit if critical issues found.
# Allows commit if only warnings present.
#
# Installation:
#   cp scripts/pre-commit-hook.sh .git/hooks/pre-commit
#   chmod +x .git/hooks/pre-commit
#
# To bypass (emergency only):
#   git commit --no-verify
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Running pre-commit validation...${NC}"

# Get project root (where .git is)
PROJECT_ROOT=$(git rev-parse --show-toplevel)
cd "$PROJECT_ROOT"

# Check if validation script exists
VALIDATOR="$PROJECT_ROOT/scripts/validate_before_commit.py"
if [ ! -f "$VALIDATOR" ]; then
    echo -e "${RED}❌ Error: Validation script not found at $VALIDATOR${NC}"
    echo "Cannot proceed with commit validation"
    exit 1
fi

# Check Python is available
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Error: python3 not found${NC}"
    echo "Install Python 3 to run validation"
    exit 1
fi

# Check BeautifulSoup4 is installed
if ! python3 -c "import bs4" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Warning: BeautifulSoup4 not installed${NC}"
    echo "Install with: pip3 install beautifulsoup4"
    echo ""
    read -p "Continue without validation? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    exit 0
fi

# Run validation on staged files only
echo "Checking staged files..."
python3 "$VALIDATOR" --staged-only

# Capture exit code
EXIT_CODE=$?

# Create logs directory if it doesn't exist
mkdir -p "$PROJECT_ROOT/logs"

# Handle results
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ All validation checks passed${NC}"
    echo "Proceeding with commit..."
    exit 0
elif [ $EXIT_CODE -eq 1 ]; then
    echo ""
    echo -e "${RED}❌ COMMIT BLOCKED${NC}"
    echo -e "${RED}Critical issues must be fixed before committing${NC}"
    echo ""
    echo "Fix the issues above and try again."
    echo "To bypass (not recommended): git commit --no-verify"
    exit 1
elif [ $EXIT_CODE -eq 2 ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Validation completed with warnings${NC}"
    echo "Consider fixing warnings before commit, but proceeding..."
    exit 0
else
    echo ""
    echo -e "${RED}❌ Validation script failed with unexpected error${NC}"
    echo "Check logs/commit_validation.log for details"
    exit 1
fi
