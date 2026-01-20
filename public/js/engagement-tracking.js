/**
 * Engagement Tracking for Carnivore Weekly
 * Tracks internal links, scroll depth, and outbound clicks
 */

(function() {
    'use strict';

    // Only run if Google Analytics is loaded
    if (typeof gtag === 'undefined') {
        console.warn('Google Analytics not loaded - engagement tracking disabled');
        return;
    }

    // ===== INTERNAL LINK TRACKING =====
    function trackInternalLinks() {
        // Track clicks to key pages
        const internalLinks = document.querySelectorAll('a[href]');

        internalLinks.forEach(link => {
            const href = link.getAttribute('href');

            // Skip external links and fragments
            if (!href || href.startsWith('http') || href.startsWith('#')) {
                return;
            }

            // Determine destination type
            let destination = 'other';
            let label = href;

            if (href.includes('calculator')) {
                destination = 'calculator';
                label = 'Calculator';
            } else if (href.includes('blog')) {
                destination = 'blog';
                label = 'Blog';
            } else if (href.includes('wiki')) {
                destination = 'wiki';
                label = 'Wiki';
            } else if (href.includes('channels')) {
                destination = 'channels';
                label = 'Channels';
            } else if (href.includes('index.html') || href === '/') {
                destination = 'home';
                label = 'Home';
            }

            // Add click listener
            link.addEventListener('click', function() {
                gtag('event', 'internal_link_click', {
                    event_category: 'Navigation',
                    event_label: label,
                    destination: destination,
                    source_page: window.location.pathname
                });
            });
        });
    }

    // ===== SCROLL DEPTH TRACKING =====
    function trackScrollDepth() {
        const milestones = {
            25: false,
            50: false,
            75: false,
            100: false
        };

        let ticking = false;

        function calculateScrollPercentage() {
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

            return Math.round((scrollTop / (documentHeight - windowHeight)) * 100);
        }

        function checkScrollMilestones() {
            const scrollPercentage = calculateScrollPercentage();

            // Check each milestone
            Object.keys(milestones).forEach(milestone => {
                const milestoneNum = parseInt(milestone);

                if (scrollPercentage >= milestoneNum && !milestones[milestone]) {
                    milestones[milestone] = true;

                    gtag('event', 'scroll_depth', {
                        event_category: 'Engagement',
                        event_label: milestone + '%',
                        value: milestoneNum,
                        page: window.location.pathname
                    });
                }
            });

            ticking = false;
        }

        // Throttle scroll events for performance
        window.addEventListener('scroll', function() {
            if (!ticking) {
                window.requestAnimationFrame(function() {
                    checkScrollMilestones();
                });
                ticking = true;
            }
        });

        // Check immediately in case user is already scrolled
        checkScrollMilestones();
    }

    // ===== OUTBOUND LINK TRACKING =====
    function trackOutboundLinks() {
        // Track clicks to external resources
        const allLinks = document.querySelectorAll('a[href]');

        allLinks.forEach(link => {
            const href = link.getAttribute('href');

            // Only track external links
            if (!href || !href.startsWith('http')) {
                return;
            }

            // Skip if it's the same domain
            const currentDomain = window.location.hostname;
            try {
                const linkDomain = new URL(href).hostname;
                if (linkDomain === currentDomain) {
                    return;
                }
            } catch (e) {
                return; // Invalid URL
            }

            // Categorize outbound link
            let category = 'external_resource';
            let label = href;

            if (href.includes('youtube.com') || href.includes('youtu.be')) {
                category = 'youtube_video';
                label = 'YouTube: ' + (link.textContent || '').trim().substring(0, 50);
            } else if (href.includes('pubmed') || href.includes('nih.gov') || href.includes('ncbi')) {
                category = 'research_paper';
                label = 'Research: ' + (link.textContent || '').trim().substring(0, 50);
            } else if (href.includes('reddit.com')) {
                category = 'reddit';
                label = 'Reddit';
            } else if (href.includes('twitter.com') || href.includes('x.com')) {
                category = 'twitter';
                label = 'Twitter/X';
            } else if (href.includes('amazon.com')) {
                category = 'amazon';
                label = 'Amazon: ' + (link.textContent || '').trim().substring(0, 50);
            } else if (href.includes('drinklmnt.com')) {
                category = 'lmnt';
                label = 'LMNT';
            }

            // Add click listener
            link.addEventListener('click', function() {
                gtag('event', 'outbound_click', {
                    event_category: 'Outbound',
                    event_label: label,
                    link_type: category,
                    destination: href,
                    source_page: window.location.pathname
                });
            });
        });
    }

    // ===== INITIALIZE TRACKING =====
    function init() {
        // Wait for DOM to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                trackInternalLinks();
                trackScrollDepth();
                trackOutboundLinks();
            });
        } else {
            // DOM already loaded
            trackInternalLinks();
            trackScrollDepth();
            trackOutboundLinks();
        }
    }

    // Start tracking
    init();

})();
