/**
 * Mobile Navigation Hamburger Menu
 * Handles responsive navigation for mobile and tablet devices (≤768px)
 *
 * Features:
 * - Auto-detects navigation element (.nav-menu-2026 or .nav-menu)
 * - Injects hamburger button dynamically
 * - Toggles menu visibility on click
 * - Closes menu when clicking outside or on links
 * - Keyboard accessible (Tab, Enter, Escape)
 * - ARIA labels for screen readers
 */

(function() {
    'use strict';

    // Configuration
    const config = {
        mobileBreakpoint: 768,
        navSelectors: ['.nav-menu-2026', '.nav-menu'],
        activeClass: 'mobile-visible',
        hamburgerClass: 'hamburger-menu-btn'
    };

    // State
    let isMenuOpen = false;
    let hamburgerBtn = null;
    let navElement = null;

    /**
     * Initialize the mobile navigation
     */
    function init() {
        // Find the navigation element
        navElement = findNavElement();
        if (!navElement) {
            return; // No navigation found
        }

        // Only initialize if we're at mobile breakpoint or below
        if (window.innerWidth <= config.mobileBreakpoint) {
            createHamburgerButton();
            attachEventListeners();
        }

        // Listen for window resize to handle mobile/desktop transitions
        window.addEventListener('resize', handleResize);
    }

    /**
     * Find the navigation element
     */
    function findNavElement() {
        for (let selector of config.navSelectors) {
            const nav = document.querySelector(selector);
            if (nav) {
                return nav;
            }
        }
        return null;
    }

    /**
     * Create the hamburger button and inject it into the DOM
     */
    function createHamburgerButton() {
        // Check if button already exists
        if (document.querySelector('.' + config.hamburgerClass)) {
            hamburgerBtn = document.querySelector('.' + config.hamburgerClass);
            return;
        }

        // Create button
        hamburgerBtn = document.createElement('button');
        hamburgerBtn.className = config.hamburgerClass;
        hamburgerBtn.setAttribute('aria-label', 'Toggle navigation menu');
        hamburgerBtn.setAttribute('aria-expanded', 'false');
        hamburgerBtn.setAttribute('aria-controls', 'main-navigation');
        hamburgerBtn.innerHTML = '<span></span><span></span><span></span>';

        // Give nav an ID if it doesn't have one
        if (!navElement.id) {
            navElement.id = 'main-navigation';
        }

        // Insert button before the navigation element
        navElement.parentNode.insertBefore(hamburgerBtn, navElement);
    }

    /**
     * Attach event listeners
     */
    function attachEventListeners() {
        if (!hamburgerBtn) return;

        // Click on hamburger button
        hamburgerBtn.addEventListener('click', toggleMenu);

        // Click outside the menu to close
        document.addEventListener('click', handleOutsideClick);

        // Click on nav links to close menu
        navElement.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', closeMenu);
        });

        // Keyboard navigation
        document.addEventListener('keydown', handleKeyboard);
    }

    /**
     * Toggle the menu open/closed
     */
    function toggleMenu(e) {
        e.stopPropagation();

        if (isMenuOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    }

    /**
     * Open the menu
     */
    function openMenu() {
        isMenuOpen = true;
        navElement.classList.add(config.activeClass);
        hamburgerBtn.setAttribute('aria-expanded', 'true');

        // Prevent body scroll when menu is open (optional)
        // document.body.style.overflow = 'hidden';
    }

    /**
     * Close the menu
     */
    function closeMenu() {
        isMenuOpen = false;
        navElement.classList.remove(config.activeClass);
        hamburgerBtn.setAttribute('aria-expanded', 'false');

        // Restore body scroll (optional)
        // document.body.style.overflow = '';
    }

    /**
     * Handle clicks outside the menu
     */
    function handleOutsideClick(e) {
        if (!isMenuOpen) return;

        // Check if click is outside menu and button
        if (!navElement.contains(e.target) && !hamburgerBtn.contains(e.target)) {
            closeMenu();
        }
    }

    /**
     * Handle keyboard navigation
     */
    function handleKeyboard(e) {
        // Escape key closes menu
        if (e.key === 'Escape' && isMenuOpen) {
            closeMenu();
            hamburgerBtn.focus();
        }

        // Enter/Space on hamburger button toggles menu
        if ((e.key === 'Enter' || e.key === ' ') && document.activeElement === hamburgerBtn) {
            e.preventDefault();
            toggleMenu(e);
        }
    }

    /**
     * Handle window resize
     */
    function handleResize() {
        // If we're above the mobile breakpoint, ensure hamburger is hidden and menu is visible
        if (window.innerWidth > config.mobileBreakpoint) {
            if (hamburgerBtn) {
                hamburgerBtn.style.display = 'none';
            }
            if (navElement) {
                navElement.classList.remove(config.activeClass);
            }
            isMenuOpen = false;
        } else {
            // At mobile breakpoint, ensure hamburger is visible
            if (hamburgerBtn) {
                hamburgerBtn.style.display = '';
            }
        }
    }

    /**
     * Clean up event listeners on page unload
     */
    function destroy() {
        if (hamburgerBtn) {
            hamburgerBtn.removeEventListener('click', toggleMenu);
        }
        if (navElement) {
            navElement.querySelectorAll('a').forEach(link => {
                link.removeEventListener('click', closeMenu);
            });
        }
        document.removeEventListener('click', handleOutsideClick);
        document.removeEventListener('keydown', handleKeyboard);
        window.removeEventListener('resize', handleResize);
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose destroy function globally for cleanup if needed
    window.mobileNavCleanup = destroy;

})();
