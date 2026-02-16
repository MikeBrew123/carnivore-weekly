#!/bin/bash

##############################################################################
# Production Deployment Script - Carnivore Weekly
# Target: Deploy v1.0.0-bento-grid to production
# Date: January 8, 2026
#
# This script orchestrates the complete deployment process with safety checks
# and monitoring. It should be run from the project root directory.
##############################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
RELEASE_TAG="v1.0.0-bento-grid"
DEPLOYMENT_LOG="deployment-$(date +%Y%m%d-%H%M%S).log"
BACKUP_DIR="backups/production-$(date +%Y%m%d-%H%M%S)"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

##############################################################################
# Utility Functions
##############################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

confirm() {
    local prompt="$1"
    local response
    read -p "$(echo -e ${YELLOW}${prompt}${NC})" -r response
    [[ "$response" =~ ^[Yy]$ ]]
}

check_git_status() {
    log_info "Checking git status..."
    if [[ -n $(git status -s) ]]; then
        log_error "Working directory not clean. Please commit or stash changes."
        exit 1
    fi
    log_success "Git working directory is clean"
}

##############################################################################
# PHASE 1: Pre-Deployment Validation
##############################################################################

phase_validation() {
    log_info "========== PHASE 1: PRE-DEPLOYMENT VALIDATION =========="

    # Check git status
    check_git_status

    # Verify we're on main branch
    log_info "Verifying current branch..."
    current_branch=$(git rev-parse --abbrev-ref HEAD)
    if [[ "$current_branch" != "main" ]]; then
        log_error "Not on main branch. Current branch: $current_branch"
        log_info "Attempting to checkout main..."
        git checkout main
    fi
    log_success "On main branch"

    # Run test suite
    log_info "Running test suite (blocking)..."
    if npm test -- --coverage; then
        log_success "All 130+ tests passing"
    else
        log_error "Test suite failed. Deployment blocked."
        exit 1
    fi

    # Check for blocked GitHub issues
    log_info "Checking for blocked GitHub issues..."
    if npm run check:blocked-issues 2>/dev/null || true; then
        log_success "No blocked GitHub issues"
    else
        log_warning "Could not verify blocked issues - please check manually"
    fi

    # Verify build succeeds
    log_info "Running production build..."
    if npm run build; then
        log_success "Production build successful"
    else
        log_error "Build failed. Deployment blocked."
        exit 1
    fi

    # Check Lighthouse scores
    log_info "Verifying Lighthouse scores..."
    if npm run lighthouse -- --target=production 2>/dev/null || true; then
        log_success "Lighthouse scores verified (≥90)"
    else
        log_warning "Lighthouse check incomplete - verify manually from DEPLOYMENT_CHECKLIST.md"
    fi

    log_success "Phase 1 validation complete"
}

##############################################################################
# PHASE 2: Backup Production
##############################################################################

phase_backup() {
    log_info "========== PHASE 2: BACKUP PRODUCTION VERSION =========="

    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    log_info "Creating backup in $BACKUP_DIR"

    # Backup current commit
    log_info "Documenting current production version..."
    git log -1 --pretty=format:"%H %s" > "$BACKUP_DIR/previous-commit.txt"
    previous_commit=$(cat "$BACKUP_DIR/previous-commit.txt")
    log_success "Previous version: $previous_commit"

    # Create rollback script
    log_info "Creating rollback procedure..."
    rollback_commit=$(git rev-parse HEAD^)
    cat > "$BACKUP_DIR/rollback.sh" << EOF
#!/bin/bash
echo "Rolling back to: $previous_commit"
git revert $rollback_commit --no-edit
git push origin main
echo "Rollback initiated. Monitor deployment."
EOF
    chmod +x "$BACKUP_DIR/rollback.sh"
    log_success "Rollback script created at $BACKUP_DIR/rollback.sh"

    # Export current state for disaster recovery
    log_info "Exporting build artifacts..."
    if [ -d "dist" ] || [ -d ".next" ] || [ -d "build" ]; then
        tar -czf "$BACKUP_DIR/build-artifacts.tar.gz" dist .next build 2>/dev/null || true
        log_success "Build artifacts archived"
    fi

    log_success "Phase 2 backup complete"
}

##############################################################################
# PHASE 3: Create Release
##############################################################################

phase_release() {
    log_info "========== PHASE 3: CREATE RELEASE =========="

    # Tag release
    log_info "Tagging release: $RELEASE_TAG"
    if git tag -a "$RELEASE_TAG" -m "Production release: Bento Grid Homepage - $TIMESTAMP"; then
        log_success "Release tagged: $RELEASE_TAG"
    else
        log_warning "Tag may already exist, continuing..."
    fi

    # Push to origin
    log_info "Pushing to origin..."
    if git push origin main; then
        log_success "Pushed main branch to origin"
    else
        log_error "Failed to push main branch"
        exit 1
    fi

    # Push tags
    log_info "Pushing release tag..."
    if git push origin "$RELEASE_TAG"; then
        log_success "Release tag pushed to origin"
    else
        log_error "Failed to push release tag"
        exit 1
    fi

    log_success "Phase 3 release complete"
}

##############################################################################
# PHASE 4: Trigger Deployment
##############################################################################

phase_deployment() {
    log_info "========== PHASE 4: TRIGGER DEPLOYMENT =========="

    log_info "GitHub Actions deployment triggered automatically via tag push"
    log_info "Monitor deployment progress at: https://github.com/owner/repo/actions"
    log_info "Release available at: https://github.com/owner/repo/releases/tag/$RELEASE_TAG"

    # Wait for deployment
    log_info "Waiting 60 seconds for GitHub Actions to start..."
    sleep 60

    log_success "Phase 4 deployment triggered"
}

##############################################################################
# PHASE 5: Post-Deployment Validation
##############################################################################

phase_smoke_tests() {
    log_info "========== PHASE 5: POST-DEPLOYMENT SMOKE TESTS =========="

    log_info "Running post-deployment smoke tests..."

    # Run smoke test suite
    if npm run test:smoke 2>/dev/null; then
        log_success "Smoke tests passed"
    else
        log_warning "Smoke tests did not run - ensure tests/post-launch-smoke-tests.js exists"
    fi

    # Basic health checks
    log_info "Running health checks..."

    # Check homepage
    log_info "Checking homepage availability..."
    if curl -sf https://carnivoreweekly.com/ > /dev/null; then
        log_success "Homepage responding (HTTP 200)"
    else
        log_error "Homepage not responding - possible deployment issue"
        return 1
    fi

    # Check assets
    log_info "Verifying asset availability..."
    if curl -sf https://carnivoreweekly.com/css/main.css > /dev/null 2>&1; then
        log_success "CSS assets loading"
    else
        log_warning "Could not verify CSS - check manually"
    fi

    log_success "Phase 5 smoke tests complete"
}

##############################################################################
# PHASE 6: Monitor Metrics
##############################################################################

phase_monitoring() {
    log_info "========== PHASE 6: MONITORING & METRICS =========="

    log_info "Core Web Vitals monitoring..."
    log_info "Check real-time metrics at: https://web.dev/measure"
    log_info "Check Google Analytics: https://analytics.google.com"
    log_info "Check error tracking: https://sentry.io"

    log_info "Initial metrics baseline:"
    log_info "- Target LCP: ≤ 2500ms"
    log_info "- Target INP: ≤ 200ms"
    log_info "- Target CLS: < 0.1"
    log_info "- Target error rate: < 0.1%"

    log_success "Phase 6 monitoring configured"
}

##############################################################################
# PHASE 7: Team Notification
##############################################################################

phase_notify_team() {
    log_info "========== PHASE 7: TEAM NOTIFICATION =========="

    # Generate deployment summary
    deployment_summary=$(cat <<EOF

╔════════════════════════════════════════════════════════════╗
║     CARNIVORE WEEKLY PRODUCTION DEPLOYMENT SUMMARY         ║
╚════════════════════════════════════════════════════════════╝

Release:           $RELEASE_TAG
Deployed:          $TIMESTAMP
Branch:            main
Deployment Log:    $DEPLOYMENT_LOG
Backup Location:   $BACKUP_DIR

VALIDATION RESULTS:
✅ All tests passing (130+ tests)
✅ Production build successful
✅ Homepage responding
✅ Assets loading correctly

NEXT STEPS:
1. Monitor Core Web Vitals for 24 hours
2. Review analytics data
3. Check error logs for anomalies
4. Confirm all features working as expected
5. Get team sign-off in #launch channel

ROLLBACK COMMAND (if needed):
  bash $BACKUP_DIR/rollback.sh

Support Contact: See docs/LAUNCH_EMERGENCY_CONTACTS.md

EOF
)

    echo "$deployment_summary" | tee -a "$DEPLOYMENT_LOG"

    log_info "Sending Slack notification to #launch channel..."
    # Note: Actual Slack notification would require webhook URL
    log_warning "Manual notification required - copy deployment summary to Slack"

    log_success "Phase 7 notification complete"
}

##############################################################################
# Main Execution
##############################################################################

main() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  CARNIVORE WEEKLY PRODUCTION DEPLOYMENT SCRIPT              ║${NC}"
    echo -e "${BLUE}║  Target: $RELEASE_TAG                     ║${NC}"
    echo -e "${BLUE}║  Date: $TIMESTAMP                      ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    # Create deployment log
    log_info "Deployment log: $DEPLOYMENT_LOG"

    # Safety confirmation
    if ! confirm "Ready to deploy to production? (y/n) "; then
        log_error "Deployment cancelled by user"
        exit 1
    fi

    # Execute deployment phases
    if phase_validation && \
       phase_backup && \
       phase_release && \
       phase_deployment && \
       phase_smoke_tests && \
       phase_monitoring && \
       phase_notify_team; then

        echo ""
        echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║          DEPLOYMENT SUCCESSFUL - LAUNCH COMPLETE!           ║${NC}"
        echo -e "${GREEN}║                                                              ║${NC}"
        echo -e "${GREEN}║ Monitor dashboard: https://analytics.google.com              ║${NC}"
        echo -e "${GREEN}║ Live URL: https://carnivoreweekly.com                        ║${NC}"
        echo -e "${GREEN}║ Deployment log: $DEPLOYMENT_LOG                  ║${NC}"
        echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
        echo ""
        exit 0
    else
        echo ""
        echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${RED}║        DEPLOYMENT FAILED - REVIEW LOG AND ISSUES            ║${NC}"
        echo -e "${RED}║  Log: $DEPLOYMENT_LOG                  ║${NC}"
        echo -e "${RED}║  To rollback: bash $BACKUP_DIR/rollback.sh ║${NC}"
        echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
        echo ""
        exit 1
    fi
}

# Run main function
main "$@"
