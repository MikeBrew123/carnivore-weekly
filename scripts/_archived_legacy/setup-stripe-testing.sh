#!/bin/bash

# Stripe Testing Setup Script
# This script sets up local Stripe testing environment

set -e

echo "=================================================="
echo "Stripe Testing Environment Setup"
echo "=================================================="

# Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo "Stripe CLI not found. Installing..."
    brew install stripe/stripe-cli/stripe
else
    echo "✓ Stripe CLI is installed ($(stripe --version))"
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "✗ Node.js not found. Please install Node.js first."
    exit 1
fi

echo "✓ Node.js is installed ($(node --version))"

# Install Playwright if not already installed
if ! npm list @playwright/test > /dev/null 2>&1; then
    echo ""
    echo "Installing Playwright..."
    npm install -D @playwright/test
    npx playwright install chromium
else
    echo "✓ Playwright is already installed"
fi

# Check for .env file
echo ""
echo "=================================================="
echo "Environment Configuration"
echo "=================================================="

if [ ! -f .env ]; then
    echo "⚠ No .env file found. Creating template..."
    cat > .env.stripe.template << 'EOF'
# Stripe API Keys (from https://dashboard.stripe.com/test/apikeys)
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE

# Webhook Signing Secret (from stripe listen output)
STRIPE_WEBHOOK_SECRET=whsec_test_YOUR_SECRET_HERE

# Test Configuration
BASE_URL=http://localhost:3000
STRIPE_WEBHOOK_URL=localhost:3000/webhook
EOF

    echo "✓ Created .env.stripe.template"
    echo ""
    echo "Please update .env file with your Stripe test keys:"
    echo "  1. Go to https://dashboard.stripe.com/test/apikeys"
    echo "  2. Copy your Publishable Key and Secret Key"
    echo "  3. Update .env with these values"
    echo ""
else
    echo "✓ .env file exists"
fi

echo ""
echo "=================================================="
echo "Quick Start Guide"
echo "=================================================="

echo ""
echo "To start testing:"
echo ""
echo "Terminal 1 - Start Stripe webhook listener:"
echo "  stripe listen --forward-to localhost:3000/webhook"
echo ""
echo "Terminal 2 - Start dev server:"
echo "  npm run dev"
echo ""
echo "Terminal 3 - Run tests:"
echo "  node test-calculator-flow.js"
echo ""

echo "=================================================="
echo "Test Card Numbers"
echo "=================================================="

echo ""
echo "Successful Payment:"
echo "  Card: 4242 4242 4242 4242"
echo "  Expiry: Any future date (e.g., 12/26)"
echo "  CVC: Any 3 digits (e.g., 123)"
echo ""

echo "Declined Payment:"
echo "  Card: 4000 0000 0000 0069"
echo "  Expiry: Any future date"
echo "  CVC: Any 3 digits"
echo ""

echo "For more test cards, see:"
echo "  https://stripe.com/docs/testing"
echo ""

echo "=================================================="
echo "Setup Complete!"
echo "=================================================="

echo ""
echo "Next steps:"
echo "1. Update .env with your Stripe test keys"
echo "2. Start the Stripe webhook listener in Terminal 1"
echo "3. Start your dev server in Terminal 2"
echo "4. Run tests with: node test-calculator-flow.js"
echo ""

echo "For detailed setup instructions, see:"
echo "  STRIPE_TESTING_SETUP.md"
echo ""
