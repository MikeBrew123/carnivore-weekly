/**
 * Wiki Preview System
 *
 * Handles dynamic preview popups for wiki-linked keywords.
 * Features:
 * - Load preview data on demand
 * - Desktop hover + Mobile click detection
 * - Keyboard navigation (Escape to close, Enter to follow)
 * - Position detection (show above/below as needed)
 * - WCAG 2.1 AA accessible
 *
 * Usage:
 *   <script src="wiki-preview.js"><\/script>
 *   <a href="wiki.html#ketosis" class="wiki-link">Ketosis</a>
 */

class WikiPreviewManager {
    constructor(options = {}) {
        this.options = {
            previewUrl: options.previewUrl || '/api/wiki-preview',
            cache: options.cache !== false,
            cacheExpiry: options.cacheExpiry || 3600000, // 1 hour
            mobileBreakpoint: options.mobileBreakpoint || 768,
            ...options
        };

        this.cache = new Map();
        this.activePreview = null;
        this.isMobile = this._detectMobile();
        this.wikiKeywords = null;

        this._init();
    }

    /**
     * Initialize the preview system
     */
    _init() {
        // Load wiki keywords data
        this._loadWikiKeywords();

        // Setup event delegation
        document.addEventListener('click', (e) => this._handleClick(e), true);
        document.addEventListener('keydown', (e) => this._handleKeydown(e));
        document.addEventListener('mouseover', (e) => this._handleMouseOver(e));
        document.addEventListener('mouseout', (e) => this._handleMouseOut(e));

        // Redetect mobile on resize
        window.addEventListener('resize', () => {
            const wasMobile = this.isMobile;
            this.isMobile = this._detectMobile();

            if (wasMobile !== this.isMobile) {
                this._closePreview();
            }
        });

        // Close preview when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.wiki-link') && this.activePreview) {
                this._closePreview();
            }
        });

        console.log('WikiPreviewManager initialized');
    }

    /**
     * Load wiki keywords from JSON data
     */
    _loadWikiKeywords() {
        // Try to load from inline data first
        const script = document.querySelector('script[data-wiki-keywords]');
        if (script) {
            try {
                this.wikiKeywords = JSON.parse(script.textContent);
                return;
            } catch (e) {
                console.error('Failed to parse inline wiki keywords:', e);
            }
        }

        // Otherwise load from JSON file
        fetch('/data/wiki-keywords.json')
            .then(res => res.json())
            .then(data => {
                this.wikiKeywords = data;
            })
            .catch(err => {
                console.error('Failed to load wiki keywords:', err);
            });
    }

    /**
     * Detect if device is mobile
     */
    _detectMobile() {
        // Check window width
        if (window.innerWidth <= this.options.mobileBreakpoint) {
            return true;
        }

        // Check user agent for mobile devices
        const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
        return mobileRegex.test(navigator.userAgent);
    }

    /**
     * Handle click events on wiki links
     */
    _handleClick(e) {
        const link = e.target.closest('a.wiki-link');
        if (!link) return;

        if (this.isMobile) {
            // On mobile, prevent default and show preview
            e.preventDefault();
            this._showPreview(link);
        }
    }

    /**
     * Handle mouseover for desktop preview
     */
    _handleMouseOver(e) {
        if (this.isMobile) return;

        const link = e.target.closest('a.wiki-link');
        if (!link) return;

        // Show preview on hover
        this._showPreview(link);
    }

    /**
     * Handle mouseout to hide preview
     */
    _handleMouseOut(e) {
        if (this.isMobile) return;

        const link = e.target.closest('a.wiki-link');
        if (!link) return;

        // Small delay to allow moving to preview
        setTimeout(() => {
            if (!this.activePreview || this.activePreview !== link) {
                this._closePreview();
            }
        }, 100);
    }

    /**
     * Handle keyboard navigation
     */
    _handleKeydown(e) {
        const link = document.activeElement;

        if (!link || !link.classList.contains('wiki-link')) return;

        switch (e.key) {
            case 'Enter':
                // Follow link
                if (this.isMobile && this.activePreview === link) {
                    // Go to full wiki page
                    const href = link.getAttribute('href');
                    if (href) {
                        window.location.href = href;
                    }
                } else {
                    // Show preview
                    this._showPreview(link);
                }
                e.preventDefault();
                break;

            case 'Escape':
                // Close preview
                if (this.activePreview) {
                    this._closePreview();
                    link.focus();
                    e.preventDefault();
                }
                break;

            case 'Tab':
                // Close preview on tab away
                if (this.activePreview) {
                    this._closePreview();
                }
                break;
        }
    }

    /**
     * Show preview for a wiki link
     */
    async _showPreview(link) {
        // Close any existing preview
        if (this.activePreview && this.activePreview !== link) {
            this._closePreview();
        }

        // Mark as active
        this.activePreview = link;
        link.classList.add('preview-active');

        // Get or create preview container
        let preview = link.querySelector('.wiki-preview');
        if (!preview) {
            preview = document.createElement('div');
            preview.className = 'wiki-preview loading';
            link.appendChild(preview);
        }

        // Fetch preview data
        const wikiPage = link.getAttribute('data-wiki-page') || link.getAttribute('href');
        const previewData = await this._getPreviewData(wikiPage);

        if (previewData) {
            this._renderPreview(preview, previewData, link);
        } else {
            preview.innerHTML = '<div class="wiki-preview-summary">Preview not available</div>';
        }

        preview.classList.remove('loading');

        // Check positioning and adjust if needed
        this._adjustPreviewPosition(link, preview);
    }

    /**
     * Close active preview
     */
    _closePreview() {
        if (this.activePreview) {
            this.activePreview.classList.remove('preview-active');
            const preview = this.activePreview.querySelector('.wiki-preview');
            if (preview) {
                preview.style.display = 'none';
            }
        }
        this.activePreview = null;
    }

    /**
     * Get preview data for a wiki page
     */
    async _getPreviewData(wikiPage) {
        // Check cache
        if (this.options.cache && this.cache.has(wikiPage)) {
            const cached = this.cache.get(wikiPage);
            if (Date.now() - cached.time < this.options.cacheExpiry) {
                return cached.data;
            }
        }

        try {
            // Try to fetch from API
            const response = await fetch(`${this.options.previewUrl}?page=${encodeURIComponent(wikiPage)}`);
            if (!response.ok) {
                return this._generateLocalPreview(wikiPage);
            }

            const data = await response.json();

            // Cache result
            if (this.options.cache) {
                this.cache.set(wikiPage, {
                    data: data,
                    time: Date.now()
                });
            }

            return data;
        } catch (err) {
            console.error('Error fetching preview data:', err);
            return this._generateLocalPreview(wikiPage);
        }
    }

    /**
     * Generate local preview from page content
     */
    _generateLocalPreview(wikiPage) {
        // Extract page ID from URL
        const pageId = wikiPage.split('#')[1] || wikiPage;

        // Try to find the page on the current wiki
        const pageElement = document.querySelector(`#${pageId}`);
        if (!pageElement) {
            return null;
        }

        // Extract title
        const title = pageElement.querySelector('h2')?.textContent || pageId;

        // Extract summary (first paragraph or content)
        let summary = '';
        const contentDiv = pageElement.querySelector('.topic-content');
        if (contentDiv) {
            const firstParagraph = contentDiv.querySelector('p');
            if (firstParagraph) {
                summary = firstParagraph.textContent.substring(0, 150);
                if (firstParagraph.textContent.length > 150) {
                    summary += '...';
                }
            }
        }

        return {
            title: title,
            summary: summary,
            url: wikiPage
        };
    }

    /**
     * Render preview content
     */
    _renderPreview(preview, data, link) {
        const { title, summary, url } = data;

        let html = '';

        if (title) {
            html += `<div class="wiki-preview-title">${this._escapeHtml(title)}</div>`;
        }

        if (summary) {
            html += `<div class="wiki-preview-summary">${this._escapeHtml(summary)}</div>`;
        }

        if (url) {
            html += `<a href="${this._escapeHtml(url)}" class="wiki-preview-link">Read more →</a>`;
        }

        preview.innerHTML = html;

        // Make "Read more" link focusable
        const readMoreLink = preview.querySelector('.wiki-preview-link');
        if (readMoreLink) {
            readMoreLink.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    readMoreLink.click();
                }
            });
        }
    }

    /**
     * Adjust preview position if near viewport edges
     */
    _adjustPreviewPosition(link, preview) {
        // Get positions
        const linkRect = link.getBoundingClientRect();
        const previewRect = preview.getBoundingClientRect();

        // Check if preview would go off-screen above
        if (linkRect.top - previewRect.height < 10) {
            // Show below instead
            preview.classList.add('below');
        } else {
            preview.classList.remove('below');
        }

        // Check if preview goes off-screen horizontally
        if (previewRect.right > window.innerWidth - 10) {
            // Adjust to stay in viewport
            preview.style.right = '10px';
            preview.style.left = 'auto';
        } else if (previewRect.left < 10) {
            preview.style.left = '10px';
            preview.style.right = 'auto';
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    _escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.wikiPreviewManager = new WikiPreviewManager();
    });
} else {
    window.wikiPreviewManager = new WikiPreviewManager();
}
