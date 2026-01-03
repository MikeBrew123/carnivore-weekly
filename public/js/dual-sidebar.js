/**
 * Dual Sidebar Layout Manager
 * Dynamically calculates menu sidebar sticky position based on fixed sidebar height
 */

console.log('[DualSidebar] Script loading...');

const dualSidebar = {
    config: {
        desktopBreakpoint: 1200,
        baseOffset: 32, // 2rem in pixels
        gap: 32 // var(--spacing-lg) in pixels (2rem)
    },

    init: function() {
        const fixedSidebar = document.querySelector('.sidebar-fixed');
        const menuSidebar = document.querySelector('.sidebar-menu');

        if (!fixedSidebar || !menuSidebar) {
            console.warn('[DualSidebar] Sidebars not found');
            return;
        }

        console.log('[DualSidebar] Initialized');
        this.updateMenuPosition(fixedSidebar, menuSidebar);

        // Listen for resize
        window.addEventListener('resize', () => {
            this.updateMenuPosition(fixedSidebar, menuSidebar);
        });

        // Monitor for content changes
        if ('ResizeObserver' in window) {
            const observer = new ResizeObserver(() => {
                this.updateMenuPosition(fixedSidebar, menuSidebar);
            });
            observer.observe(fixedSidebar);
        }
    },

    updateMenuPosition: function(fixedSidebar, menuSidebar) {
        const isDesktop = window.innerWidth > this.config.desktopBreakpoint;

        if (!isDesktop) {
            menuSidebar.style.position = '';
            menuSidebar.style.top = '';
            console.log('[DualSidebar] Mobile mode');
            return;
        }

        const fixedHeight = fixedSidebar.offsetHeight;
        const menuTop = this.config.baseOffset + fixedHeight + this.config.gap;

        menuSidebar.style.position = 'sticky';
        menuSidebar.style.top = menuTop + 'px';
        console.log('[DualSidebar] Desktop - menuTop:', menuTop);
    }
};

// Initialize when ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('[DualSidebar] DOMContentLoaded');
        dualSidebar.init();
    });
} else {
    console.log('[DualSidebar] DOM already ready');
    dualSidebar.init();
}
