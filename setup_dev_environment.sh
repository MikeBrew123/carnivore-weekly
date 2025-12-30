#!/bin/bash
# Setup Development Environment for Carnivore Weekly
# Run this once to configure code quality tools and git hooks

set -e

echo "======================================================================"
echo "🔧 Setting up Carnivore Weekly development environment..."
echo "======================================================================"
echo ""

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install flake8 black mypy --quiet
echo "✓ Python tools installed (flake8, black, mypy)"
echo ""

# Install JavaScript dependencies (if Node.js is available)
if command -v node &> /dev/null; then
    echo "📦 Installing JavaScript dependencies..."
    cd api 2>/dev/null && npm install eslint --save-dev --quiet 2>/dev/null && cd ..
    echo "✓ ESLint installed in api/"
else
    echo "⚠️  Node.js not found - skipping JavaScript setup"
fi
echo ""

# Setup git pre-commit hook
echo "🔗 Installing git pre-commit hook..."
mkdir -p .git/hooks

cat > .git/hooks/pre-commit << 'HOOK'
#!/bin/bash
# Pre-commit hook: Check Python code quality before commit
set -e

echo "🔍 Running pre-commit checks..."

# Run flake8 on changed Python files
CHANGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep '.py$' || true)

if [ -n "$CHANGED_FILES" ]; then
    echo "   Checking code quality..."
    python3 -m flake8 $CHANGED_FILES --count || {
        echo "   ⚠️  Code quality issues found!"
        echo "   Fix with: python3 -m black <file>"
        echo "   Continue anyway? (y/n)"
        read -r response
        if [ "$response" != "y" ]; then
            exit 1
        fi
    }
fi

echo "✓ Pre-commit checks passed"
HOOK

chmod +x .git/hooks/pre-commit
echo "✓ Pre-commit hook installed"
echo ""

# Create pyproject.toml for black configuration
echo "⚙️  Configuring code formatters..."

cat > pyproject.toml << 'CONFIG'
[tool.black]
line-length = 100
target-version = ['py39']
include = '\.pyi?$'
extend-exclude = '''
/(
  # directories
  \.eggs
  | \.git
  | \.hg
  | \.mypy_cache
  | \.tox
  | \.venv
  | build
  | dist
)/
'''
CONFIG

echo "✓ Black configuration created (pyproject.toml)"
echo ""

echo "======================================================================"
echo "✅ Development environment setup complete!"
echo "======================================================================"
echo ""
echo "What's been configured:"
echo "  ✓ flake8 - Code quality checker (ignore config in .flake8)"
echo "  ✓ black - Code formatter (config in pyproject.toml)"
echo "  ✓ Git pre-commit hook - Validates code before commits"
echo ""
echo "Daily workflow:"
echo "  1. Make code changes"
echo "  2. git add . (pre-commit hook will check code)"
echo "  3. git commit (will fail if code quality issues)"
echo "  4. Fix issues: python3 -m black scripts/"
echo "  5. git commit again"
echo ""
echo "Weekly automation:"
echo "  1. ./run_weekly_update.sh (generates all content + validates code)"
echo "  2. Run /copy-editor and /carnivore-brand validation"
echo "  3. Fix any issues found"
echo "  4. git add . && git commit && git push"
echo ""
