(function() {
    'use strict';

    // Supabase connection
    const SUPABASE_URL = 'https://kwtdpvnjewtahuxjyltn.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3dGRwdm5qZXd0YWh1eGp5bHRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxODQyODMsImV4cCI6MjA4Mjc2MDI4M30.wvbYYXyp9Fv_KCg0UC_ZBobFNdypV8ts4k68ZJ09Q2Y';

    // Content title mappings (for display)
    const CONTENT_TITLES = {
        wiki: {
            'cholesterol': 'Cholesterol Myths',
            'weight-stall': 'Weight Loss Stalls',
            'fiber': 'Fiber Necessity',
            'keto-to-carnivore': 'Keto to Carnivore',
            'dairy': 'Dairy on Carnivore',
            'electrolytes': 'Electrolyte Balance',
            'organ-meats': 'Organ Meat Guide',
            'digestion': 'Digestive Adaptation',
            'salt': 'Salt Recommendations'
        },
        blog: {
            'pcos-hormones': 'PCOS & Carnivore Diet',
            'beginners-blueprint': 'Beginner\'s Blueprint',
            'organ-meats-guide': 'Organ Meats Deep Dive',
            'night-sweats': 'Night Sweats During Adaptation',
            'mtor-muscle': 'mTOR & Muscle Growth'
        }
    };

    // Initialize all related content sections
    async function initRelatedContent() {
        const sections = document.querySelectorAll('.related-content');

        for (const section of sections) {
            const contentType = section.dataset.contentType;
            const contentId = section.dataset.contentId;

            if (!contentType || !contentId) {
                console.warn('Related content section missing data attributes');
                continue;
            }

            try {
                const relatedItems = await fetchRelatedContent(contentType, contentId);
                renderRelatedContent(section, relatedItems);
            } catch (error) {
                console.error('Failed to load related content:', error);
                showError(section);
            }
        }
    }

    // Fetch related content from Supabase
    async function fetchRelatedContent(contentType, contentId) {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/rpc/get_related_content`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({
                    p_content_type: contentType,
                    p_content_identifier: contentId,
                    p_limit: 6
                })
            }
        );

        if (!response.ok) {
            // Fallback: use view directly
            return fetchViaView(contentType, contentId);
        }

        return response.json();
    }

    // Fallback: query view directly
    async function fetchViaView(contentType, contentId) {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/v_related_content?source_type=eq.${contentType}&source_identifier=eq.${contentId}&limit=6`,
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        // Deduplicate by content identifier
        const seen = new Set();
        return data.filter(item => {
            const key = `${item.related_type}-${item.related_identifier}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    // Render related content cards
    function renderRelatedContent(section, items) {
        const loading = section.querySelector('.related-content-loading');
        const grid = section.querySelector('.related-content-grid');

        // Null checks before accessing properties
        if (!loading || !grid) {
            console.warn('Related content elements not found, skipping render');
            return;
        }

        loading.style.display = 'none';
        grid.style.display = 'grid';

        if (items.length === 0) {
            grid.innerHTML = '<p class="related-content-empty">No related content found yet. Check back soon!</p>';
            return;
        }

        grid.innerHTML = items.map(item => createCard(item)).join('');
    }

    // Create HTML card for related content
    function createCard(item) {
        const type = item.related_type;
        const id = item.related_identifier;
        const topic = item.shared_topic_name || 'Related';

        // Get title
        let title = CONTENT_TITLES[type]?.[id] || formatTitle(id);

        // Get URL
        let url;
        if (type === 'wiki') {
            url = `/wiki.html#${id}`;
        } else if (type === 'blog') {
            url = `/blog/${findBlogFile(id)}`;
        } else if (type === 'video') {
            url = `/channels.html?v=${id}`;
        }

        return `
            <a href="${url}" class="related-content-card">
                <span class="related-content-type related-content-type--${type}">${type}</span>
                <h4>${title}</h4>
                <p class="related-content-topic">Via: ${topic}</p>
            </a>
        `;
    }

    // Format identifier as title (fallback)
    function formatTitle(slug) {
        return slug
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    // Find blog file with date prefix
    function findBlogFile(slug) {
        // This is a simplified version - in production, fetch from manifest
        return `2025-12-30-${slug}.html`;
    }

    // Show error state
    function showError(section) {
        const loading = section.querySelector('.related-content-loading');
        const grid = section.querySelector('.related-content-grid');

        // Null checks before accessing properties
        if (!loading || !grid) {
            console.warn('Related content elements not found, skipping error display');
            return;
        }

        loading.style.display = 'none';
        grid.style.display = 'block';
        grid.innerHTML = '<p class="related-content-empty">Unable to load related content. Please refresh the page.</p>';
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initRelatedContent);
    } else {
        initRelatedContent();
    }
})();