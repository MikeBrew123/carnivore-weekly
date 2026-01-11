(function() {
    'use strict';

    // Supabase connection
    const SUPABASE_URL = 'https://kwtdpvnjewtahuxjyltn.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3dGRwdm5qZXd0YWh1eGp5bHRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxODQyODMsImV4cCI6MjA4Mjc2MDI4M30.wvbYYXyp9Fv_KCg0UC_ZBobFNdypV8ts4k68ZJ09Q2Y';

    // LocalStorage key prefix
    const REACTION_KEY_PREFIX = 'cw_reaction_';

    // Simple browser fingerprint
    function generateFingerprint() {
        const data = [
            navigator.userAgent,
            navigator.language,
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset()
        ].join('|');

        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'fp_' + Math.abs(hash).toString(36);
    }

    // Get user's previous reaction from localStorage
    function getPreviousReaction(postSlug) {
        return localStorage.getItem(REACTION_KEY_PREFIX + postSlug);
    }

    // Save reaction to localStorage
    function saveReaction(postSlug, reactionType) {
        localStorage.setItem(REACTION_KEY_PREFIX + postSlug, reactionType);
    }

    // Initialize all reaction components
    async function initReactions() {
        const components = document.querySelectorAll('.post-reactions');

        for (const component of components) {
            await initComponent(component);
        }
    }

    // Initialize single component
    async function initComponent(component) {
        const postSlug = component.dataset.postSlug;

        if (!postSlug) {
            console.warn('Post reactions component missing data-post-slug');
            return;
        }

        const upButton = component.querySelector('.reaction-btn--up');
        const downButton = component.querySelector('.reaction-btn--down');
        const buttonsContainer = component.querySelector('.reactions-buttons');
        const thanksMessage = component.querySelector('.reactions-thanks');

        // Load reaction counts
        await loadCounts(component, postSlug);

        // Check if user already reacted
        const previousReaction = getPreviousReaction(postSlug);
        if (previousReaction) {
            showThanksMessage(component, previousReaction);
            return;
        }

        // Add event listeners (with null checks)
        if (upButton) {
            upButton.addEventListener('click', () => handleReaction(component, postSlug, 'up'));
        }
        if (downButton) {
            downButton.addEventListener('click', () => handleReaction(component, postSlug, 'down'));
        }
    }

    // Load reaction counts from Supabase
    async function loadCounts(component, postSlug) {
        try {
            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/v_post_reaction_counts?post_slug=eq.${postSlug}`,
                {
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();

                if (data.length > 0) {
                    const counts = data[0];
                    updateCount(component, 'up', counts.thumbs_up || 0);
                    updateCount(component, 'down', counts.thumbs_down || 0);
                } else {
                    // No reactions yet
                    updateCount(component, 'up', 0);
                    updateCount(component, 'down', 0);
                }
            }
        } catch (error) {
            console.error('Failed to load reaction counts:', error);
            // Show 0 counts on error
            updateCount(component, 'up', 0);
            updateCount(component, 'down', 0);
        }
    }

    // Update count display
    function updateCount(component, type, count) {
        const countElement = component.querySelector(`.reaction-count[data-type="${type}"]`);
        if (countElement) {
            countElement.textContent = count;
        }
    }

    // Handle reaction button click
    async function handleReaction(component, postSlug, reactionType) {
        const upButton = component.querySelector('.reaction-btn--up');
        const downButton = component.querySelector('.reaction-btn--down');
        const clickedButton = reactionType === 'up' ? upButton : downButton;

        // Null check before proceeding
        if (!upButton || !downButton || !clickedButton) {
            console.warn('Reaction buttons not found');
            return;
        }

        // Disable buttons and show loading
        upButton.disabled = true;
        downButton.disabled = true;
        clickedButton.classList.add('loading');

        try {
            const fingerprint = generateFingerprint();

            // Submit reaction to Supabase
            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/post_reactions`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({
                        post_slug: postSlug,
                        reaction_type: reactionType,
                        fingerprint: fingerprint,
                        ip_address: null, // Backend can extract this
                        user_agent: navigator.userAgent
                    })
                }
            );

            if (response.ok || response.status === 201) {
                // Success - save to localStorage
                saveReaction(postSlug, reactionType);

                // Update count optimistically
                const countEl = clickedButton.querySelector('.reaction-count');
                const currentCount = countEl ? parseInt(countEl.textContent, 10) || 0 : 0;
                updateCount(component, reactionType, currentCount + 1);

                // Show thank you message
                showThanksMessage(component, reactionType);

            } else if (response.status === 409) {
                // Duplicate - user already reacted
                saveReaction(postSlug, reactionType);
                showThanksMessage(component, reactionType);

            } else {
                throw new Error('Reaction submission failed');
            }

        } catch (error) {
            console.error('Reaction error:', error);
            alert('Something went wrong. Please try again.');

            // Re-enable buttons
            upButton.disabled = false;
            downButton.disabled = false;
            clickedButton.classList.remove('loading');
        }
    }

    // Show thank you message
    function showThanksMessage(component, reactionType) {
        const buttonsContainer = component.querySelector('.reactions-buttons');
        const thanksMessage = component.querySelector('.reactions-thanks');
        const header = component.querySelector('.reactions-header');

        // Null checks before manipulating DOM
        if (!buttonsContainer || !thanksMessage) {
            console.warn('Thanks message components not found');
            return;
        }

        // Hide buttons and header
        buttonsContainer.style.display = 'none';
        if (header) {
            header.style.display = 'none';
        }

        // Update message based on reaction
        const messageEl = thanksMessage.querySelector('.thanks-message');
        if (messageEl && reactionType === 'down') {
            messageEl.textContent = 'We\'ll work on improving content like this.';
        }

        // Show thanks message
        thanksMessage.style.display = 'block';
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initReactions);
    } else {
        initReactions();
    }
})();
