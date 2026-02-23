(function() {
    'use strict';

    // API endpoint
    const FEEDBACK_URL = 'https://carnivore-report-api-production.iambrew.workers.dev/api/v1/feedback';

    // Rate limit key
    const RATE_LIMIT_KEY = 'cw_feedback_last_submit';
    const RATE_LIMIT_MS = 60000; // 1 minute between submissions

    // DOM elements
    let feedbackButton, feedbackModal, feedbackForm, feedbackTextarea;
    let formView, successView, errorView;
    let submitButton, cancelButton, closeButton, retryButton, closeSuccessButton;
    let charCount;

    // Check rate limit
    function checkRateLimit() {
        const lastSubmit = localStorage.getItem(RATE_LIMIT_KEY);
        if (!lastSubmit) return true;

        const timeSince = Date.now() - parseInt(lastSubmit, 10);
        return timeSince > RATE_LIMIT_MS;
    }

    // Initialize modal
    function init() {
        // Get DOM references
        feedbackButton = document.getElementById('feedback-button');
        feedbackModal = document.getElementById('feedback-modal');
        feedbackForm = document.getElementById('feedback-form');
        feedbackTextarea = document.getElementById('feedback-request');

        formView = document.querySelector('.feedback-form-view');
        successView = document.querySelector('.feedback-success-view');
        errorView = document.querySelector('.feedback-error-view');

        submitButton = document.getElementById('feedback-submit');
        cancelButton = document.getElementById('feedback-cancel');
        closeButton = document.querySelector('.feedback-modal-close');
        retryButton = document.getElementById('feedback-retry');
        closeSuccessButton = document.getElementById('feedback-close-success');

        charCount = document.querySelector('.char-count');

        if (!feedbackButton || !feedbackModal) {
            console.warn('Feedback modal components not found');
            return;
        }

        // Event listeners
        feedbackButton.addEventListener('click', openModal);
        closeButton.addEventListener('click', closeModal);
        cancelButton.addEventListener('click', closeModal);
        closeSuccessButton.addEventListener('click', closeModal);
        retryButton.addEventListener('click', resetToForm);

        feedbackForm.addEventListener('submit', handleSubmit);
        feedbackTextarea.addEventListener('input', updateCharCount);

        // Close on overlay click
        feedbackModal.querySelector('.feedback-modal-overlay').addEventListener('click', closeModal);

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && feedbackModal.style.display !== 'none') {
                closeModal();
            }
        });
    }

    // Open modal
    function openModal() {
        // Check rate limit
        if (!checkRateLimit()) {
            alert('Please wait a moment before submitting another request.');
            return;
        }

        feedbackModal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Prevent background scroll
        feedbackTextarea.focus();
    }

    // Close modal
    function closeModal() {
        feedbackModal.style.display = 'none';
        document.body.style.overflow = '';

        // Reset form after animation
        setTimeout(resetToForm, 300);
    }

    // Reset to form view
    function resetToForm() {
        formView.style.display = 'block';
        successView.style.display = 'none';
        errorView.style.display = 'none';
        feedbackForm.reset();
        updateCharCount();

        // Re-enable submit button
        submitButton.disabled = false;
        submitButton.querySelector('.button-text').style.display = 'inline';
        submitButton.querySelector('.button-loading').style.display = 'none';
    }

    // Update character count
    function updateCharCount() {
        const length = feedbackTextarea.value.length;
        charCount.textContent = length;

        // Warning color if approaching limit
        if (length > 950) {
            charCount.style.color = '#ff6b6b';
        } else {
            charCount.style.color = '';
        }
    }

    // Handle form submission
    async function handleSubmit(event) {
        event.preventDefault();

        const requestText = feedbackTextarea.value.trim();
        const email = document.getElementById('feedback-email').value.trim() || null;

        // Validation
        if (requestText.length < 10) {
            alert('Please write at least 10 characters.');
            return;
        }

        if (requestText.length > 1000) {
            alert('Please keep your request under 1000 characters.');
            return;
        }

        // Check rate limit again
        if (!checkRateLimit()) {
            showError('Please wait a moment before submitting another request.');
            return;
        }

        // Disable submit button
        submitButton.disabled = true;
        submitButton.querySelector('.button-text').style.display = 'none';
        submitButton.querySelector('.button-loading').style.display = 'inline-block';

        try {
            const response = await fetch(FEEDBACK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    request_text: requestText,
                    email: email
                })
            });
            const data = await response.json();

            if (response.ok && data.success) {
                localStorage.setItem(RATE_LIMIT_KEY, Date.now().toString());
                showSuccess();
            } else {
                throw new Error(data.message || 'Submission failed');
            }

        } catch (error) {
            console.error('Feedback submission error:', error);
            showError('Something went wrong. Please try again later.');

            // Re-enable submit button
            submitButton.disabled = false;
            submitButton.querySelector('.button-text').style.display = 'inline';
            submitButton.querySelector('.button-loading').style.display = 'none';
        }
    }

    // Show success view
    function showSuccess() {
        formView.style.display = 'none';
        successView.style.display = 'block';
    }

    // Show error view
    function showError(message) {
        formView.style.display = 'none';
        errorView.style.display = 'block';
        errorView.querySelector('.error-detail').textContent = message;
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
