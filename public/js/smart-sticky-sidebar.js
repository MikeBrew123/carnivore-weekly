/**
 * Smart Sticky Sidebar
 * Implements intelligent sticky positioning that scrolls naturally with content
 * until the sidebar bottom/top becomes visible, then locks to viewport.
 *
 * Features:
 * - Detects when sidebar is taller than viewport
 * - Activates smart sticky behavior only when needed
 * - Smooth 60fps performance with requestAnimationFrame
 * - Responsive: Desktop only (>1200px)
 * - Handles window resize and dynamic content changes
 */

(function() {
    'use strict';

    // =====================================================
    // CONFIGURATION
    // =====================================================

    const config = {
        desktopBreakpoint: 1200,
        sidebarSelector: '.sidebar-2026',
        headerOffset: 180,          // Matches current top: 180px
        scrollThrottle: 16,         // ~60fps = 16.67ms per frame
        resizeDebounceMs: 250,
        enableDebug: true
    };

    // =====================================================
    // STATE MACHINE
    // =====================================================

    const State = {
        DISABLED: 'disabled',           // Mobile/tablet (≤1200px) - no smart sticky
        STICKY_TOP: 'sticky-top',       // Sidebar fits in viewport - normal sticky behavior
        SCROLLING: 'scrolling',         // Sidebar taller than viewport - scrolling naturally
        LOCKED_BOTTOM: 'locked-bottom', // Bottom visible - locked to viewport bottom
        LOCKED_TOP: 'locked-top'        // Top visible - locked to viewport top
    };

    // =====================================================
    // RUNTIME STATE
    // =====================================================

    let currentState = State.DISABLED;
    let sidebar = null;
    let sidebarHeight = 0;
    let viewportHeight = 0;
    let lastScrollY = 0;
    let scrollDirection = null;     // 'down' or 'up'
    let rafId = null;
    let resizeTimer = null;
    let isSmartStickyActive = false;
    let accumulatedScroll = 0;      // Tracks scroll offset when in SCROLLING state

    // =====================================================
    // INITIALIZATION
    // =====================================================

    function init() {
        sidebar = document.querySelector(config.sidebarSelector);

        if (!sidebar) {
            logDebug('Sidebar element not found');
            return;
        }

        logDebug('Smart sticky sidebar initialized');

        // Initial measurements and state detection
        measureSidebar();
        determineState();

        // Event listeners
        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleResize);

        // Watch for dynamic content changes
        observeSidebarChanges();
    }

    // =====================================================
    // STATE MANAGEMENT
    // =====================================================

    /**
     * Determine initial state based on viewport size
     * Always activates smart sticky on desktop (≥1200px)
     */
    function determineState() {
        const isDesktop = window.innerWidth > config.desktopBreakpoint;

        if (!isDesktop) {
            // Mobile/tablet - disable smart sticky
            transitionToState(State.DISABLED);
            isSmartStickyActive = false;
            return;
        }

        measureSidebar();

        // Desktop: Always use smart sticky behavior (scroll naturally, then lock)
        transitionToState(State.SCROLLING);
        isSmartStickyActive = true;

        logDebug(`Smart sticky ACTIVATED: sidebar will scroll naturally, then lock when top/bottom visible`);
    }

    /**
     * Transition to new state with cleanup and setup
     */
    function transitionToState(newState) {
        if (currentState === newState) {
            return;
        }

        logDebug(`State transition: ${currentState} → ${newState}`);

        // Remove old state class
        sidebar.classList.remove(`sidebar-state-${currentState}`);

        // Add new state class
        sidebar.classList.add(`sidebar-state-${newState}`);

        // State-specific setup
        switch (newState) {
            case State.DISABLED:
                resetSidebarPosition();
                break;

            case State.STICKY_TOP:
                resetSidebarPosition();
                break;

            case State.SCROLLING:
                // Scrolling state: sidebar scrolls naturally with page
                // Just reset to relative positioning (no dynamic styles needed)
                accumulatedScroll = 0;
                sidebar.style.position = '';
                sidebar.style.top = '';
                break;

            case State.LOCKED_BOTTOM:
                lockToBottom();
                break;

            case State.LOCKED_TOP:
                lockToTop();
                break;
        }

        currentState = newState;
    }

    // =====================================================
    // SCROLL HANDLING
    // =====================================================

    /**
     * Scroll event listener - throttles updates using RAF
     */
    function handleScroll() {
        if (!isSmartStickyActive) {
            return;
        }

        if (rafId) {
            cancelAnimationFrame(rafId);
        }

        rafId = requestAnimationFrame(updateSidebarPosition);
    }

    /**
     * Update sidebar position based on scroll direction
     * Called via requestAnimationFrame for 60fps performance
     */
    function updateSidebarPosition() {
        const currentScrollY = window.scrollY;
        const scrollDelta = currentScrollY - lastScrollY;

        // Determine scroll direction
        if (scrollDelta > 0) {
            scrollDirection = 'down';
        } else if (scrollDelta < 0) {
            scrollDirection = 'up';
        }

        lastScrollY = currentScrollY;

        // Handle based on direction
        if (scrollDirection === 'down') {
            handleScrollDown();
        } else if (scrollDirection === 'up') {
            handleScrollUp();
        }
    }

    /**
     * Handle downward scrolling
     */
    function handleScrollDown() {
        const rect = sidebar.getBoundingClientRect();
        const sidebarBottom = rect.bottom;
        const viewportBottom = window.innerHeight;

        switch (currentState) {
            case State.SCROLLING:
                // Check if sidebar bottom is now visible
                if (sidebarBottom <= viewportBottom) {
                    transitionToState(State.LOCKED_BOTTOM);
                }
                break;

            case State.LOCKED_TOP:
                // Unlock when scrolling down from locked top
                transitionToState(State.SCROLLING);
                break;

            case State.LOCKED_BOTTOM:
                // Stay locked to bottom - no action needed
                break;
        }
    }

    /**
     * Handle upward scrolling
     */
    function handleScrollUp() {
        const rect = sidebar.getBoundingClientRect();
        const sidebarTop = rect.top;

        switch (currentState) {
            case State.SCROLLING:
                // Check if sidebar top is now visible
                if (sidebarTop >= config.headerOffset) {
                    transitionToState(State.LOCKED_TOP);
                }
                break;

            case State.LOCKED_BOTTOM:
                // Unlock when scrolling up from locked bottom
                transitionToState(State.SCROLLING);
                break;

            case State.LOCKED_TOP:
                // Stay locked to top - no action needed
                break;
        }
    }

    // =====================================================
    // POSITION CALCULATIONS
    // =====================================================

    /**
     * Lock sidebar to viewport bottom
     * Calculates position so sidebar bottom aligns with viewport bottom
     */
    function lockToBottom() {
        const viewportHeight = window.innerHeight;
        const sidebarHeight = sidebar.offsetHeight;
        const topPosition = viewportHeight - sidebarHeight;

        sidebar.style.position = 'fixed';
        sidebar.style.top = `${topPosition}px`;

        logDebug(`Locked to bottom: top=${topPosition}px`);
    }

    /**
     * Lock sidebar to viewport top
     * Uses headerOffset to maintain spacing from page top
     */
    function lockToTop() {
        sidebar.style.position = 'fixed';
        sidebar.style.top = `${config.headerOffset}px`;

        logDebug(`Locked to top: top=${config.headerOffset}px`);
    }

    /**
     * Calculate position for natural scrolling state
     * Sidebar moves with page, positioned absolutely relative to parent
     */
    function calculateScrollingOffset() {
        const scrollFromTop = window.scrollY;
        const sidebarParent = sidebar.parentElement;
        const parentTop = sidebarParent.getBoundingClientRect().top + window.scrollY;

        // Calculate offset: how far down sidebar should be positioned
        const offset = scrollFromTop - parentTop + accumulatedScroll;

        sidebar.style.position = 'absolute';
        sidebar.style.top = `${offset}px`;

        logDebug(`Scrolling state: top=${offset}px`);
    }

    /**
     * Reset sidebar to default CSS positioning
     * Used for DISABLED and STICKY_TOP states
     */
    function resetSidebarPosition() {
        sidebar.style.position = '';
        sidebar.style.top = '';
        accumulatedScroll = 0;

        logDebug('Position reset to CSS defaults');
    }

    // =====================================================
    // MEASUREMENTS & RESIZE HANDLING
    // =====================================================

    /**
     * Measure sidebar and viewport dimensions
     */
    function measureSidebar() {
        viewportHeight = window.innerHeight;
        sidebarHeight = sidebar.offsetHeight;

        logDebug(`Measurements: sidebar=${sidebarHeight}px, viewport=${viewportHeight}px`);
    }

    /**
     * Handle window resize events
     * Debounced to prevent excessive recalculations
     */
    function handleResize() {
        if (resizeTimer) {
            clearTimeout(resizeTimer);
        }

        resizeTimer = setTimeout(() => {
            logDebug('Window resized - recalculating state');
            measureSidebar();
            determineState();
        }, config.resizeDebounceMs);
    }

    /**
     * Observe sidebar content changes
     * Recalculates state if sidebar height changes dynamically
     */
    function observeSidebarChanges() {
        if (!('ResizeObserver' in window)) {
            logDebug('ResizeObserver not supported - skipping dynamic observation');
            return;
        }

        const observer = new ResizeObserver(entries => {
            for (let entry of entries) {
                const newHeight = entry.target.offsetHeight;

                if (newHeight !== sidebarHeight) {
                    logDebug(`Sidebar height changed: ${sidebarHeight}px → ${newHeight}px`);
                    measureSidebar();
                    determineState();
                }
            }
        });

        observer.observe(sidebar);
    }

    // =====================================================
    // CLEANUP
    // =====================================================

    /**
     * Clean up event listeners and state
     * Called on page unload
     */
    function destroy() {
        if (rafId) {
            cancelAnimationFrame(rafId);
        }

        if (resizeTimer) {
            clearTimeout(resizeTimer);
        }

        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleResize);

        logDebug('Smart sticky sidebar destroyed');
    }

    // =====================================================
    // UTILITIES
    // =====================================================

    /**
     * Debug logging helper
     */
    function logDebug(message) {
        if (config.enableDebug) {
            console.log(`[SmartStickySidebar] ${message}`);
        }
    }

    // =====================================================
    // PAGE LOAD DETECTION & INITIALIZATION
    // =====================================================

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // DOM already loaded (e.g., dynamic page load)
        init();
    }

    // Expose cleanup function globally if needed
    window.smartStickySidebarCleanup = destroy;

})();
