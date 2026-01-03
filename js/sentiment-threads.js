/**
 * Sentiment Threads Feature - Filtering and Interaction Logic
 *
 * Provides dynamic filtering of community sentiment threads by sentiment type,
 * manages filter button states, and handles pagination/load more functionality.
 *
 * Features:
 * - Filter threads by sentiment (All, Positive, Neutral, Negative)
 * - Keyboard navigation support (arrow keys)
 * - Mobile-responsive touch support
 * - Accessibility-first design with ARIA labels
 * - Real-time sentiment data loading from JSON
 *
 * Author: Generated with Claude Code
 * Date: 2025-12-31
 */

(function() {
  'use strict';

  // ===================================================================
  // Configuration & State
  // ===================================================================

  const CONFIG = {
    dataUrl: '/data/sentiment-threads-mock.json',
    threadsPerPage: 10,
    animationDuration: 300,
  };

  let state = {
    allThreads: [],
    currentFilter: 'all',
    displayedThreadCount: 10,
    isLoadingMore: false,
    ariaLiveRegion: null,
  };

  // ===================================================================
  // DOM References
  // ===================================================================

  const DOM = {
    threadsList: null,
    filterButtons: [],
    loadMoreBtn: null,
    summaryCards: [],
  };

  // ===================================================================
  // Initialization
  // ===================================================================

  /**
   * Initialize the sentiment threads feature
   */
  function init() {
    cacheDOM();

    if (!DOM.threadsList) {
      console.warn('Sentiment threads container not found. Feature disabled.');
      return;
    }

    loadSentimentData()
      .then(data => {
        state.allThreads = data.threads || [];
        attachEventListeners();
        renderInitialThreads();
        createAriaLiveRegion();
        initKeyboardNavigation();
      })
      .catch(error => {
        console.error('Failed to load sentiment data:', error);
        showErrorState();
      });
  }

  /**
   * Cache frequently accessed DOM elements
   */
  function cacheDOM() {
    DOM.threadsList = document.getElementById('sentiment-threads-list');
    DOM.filterButtons = Array.from(document.querySelectorAll('.sentiment-filter-btn'));
    DOM.loadMoreBtn = document.getElementById('sentiment-load-more-btn');
    DOM.summaryCards = Array.from(document.querySelectorAll('.sentiment-card'));
  }

  // ===================================================================
  // Data Loading
  // ===================================================================

  /**
   * Load sentiment data from JSON file
   * @returns {Promise<Object>} Sentiment data with threads and success stories
   */
  function loadSentimentData() {
    return fetch(CONFIG.dataUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .catch(error => {
        console.error('Error loading sentiment data:', error);
        // Return mock data as fallback
        return getMockData();
      });
  }

  /**
   * Return mock data for fallback/testing
   * @returns {Object} Mock sentiment data
   */
  function getMockData() {
    return {
      summary: {
        positive: 245,
        neutral: 89,
        negative: 12,
        total_threads: 346,
      },
      threads: [],
      success_stories: [],
    };
  }

  // ===================================================================
  // Rendering
  // ===================================================================

  /**
   * Render initial threads on page load
   */
  function renderInitialThreads() {
    const threadsToShow = state.allThreads.slice(0, CONFIG.threadsPerPage);
    threadsToShow.forEach(thread => {
      const threadElement = createThreadElement(thread);
      DOM.threadsList.appendChild(threadElement);
    });

    state.displayedThreadCount = threadsToShow.length;
    updateLoadMoreButton();
  }

  /**
   * Create thread element from data
   * @param {Object} thread - Thread data object
   * @returns {HTMLElement} Thread article element
   */
  function createThreadElement(thread) {
    const article = document.createElement('article');
    article.className = 'sentiment-thread-item';
    article.setAttribute('data-sentiment', thread.sentiment);
    article.setAttribute('data-thread-id', thread.id);

    const sentimentColor = getSentimentColor(thread.sentiment);
    const sentimentIcon = getSentimentIcon(thread.sentiment);
    const sentimentBadgeLabel = getSentimentLabel(thread.sentiment);

    article.innerHTML = `
      <div class="thread-header">
        <div class="thread-sentiment-indicator" style="border-left-color: ${sentimentColor}"></div>

        <div class="thread-meta">
          <h3 class="thread-title">${escapeHtml(thread.title)}</h3>
          <div class="thread-info">
            <span class="thread-creator">${escapeHtml(thread.creator)}</span>
            <span class="thread-video">${escapeHtml(thread.video_title)}</span>
            <span class="thread-date">${formatDate(thread.timestamp)}</span>
          </div>
        </div>

        <div class="thread-engagement">
          <span class="engagement-count" title="Engagement (likes and interaction)">${thread.engagement}</span>
          <span class="engagement-icon">👍</span>
        </div>
      </div>

      <div class="thread-body">
        <p class="thread-summary">${escapeHtml(thread.summary)}</p>
      </div>

      <div class="thread-footer">
        <div class="sentiment-badge sentiment-badge--${thread.sentiment}">
          <span class="badge-icon">${sentimentIcon}</span> ${sentimentBadgeLabel}
        </div>
        <div class="thread-replies">
          <span class="replies-count">${thread.replies}</span>
          <span class="replies-label">replies</span>
        </div>
      </div>
    `;

    return article;
  }

  /**
   * Get color for sentiment type
   * @param {string} sentiment - Sentiment type (positive, neutral, negative)
   * @returns {string} Hex color code
   */
  function getSentimentColor(sentiment) {
    const colors = {
      positive: '#2d5a2d',
      neutral: '#4a5f7f',
      negative: '#5a2d2d',
    };
    return colors[sentiment] || '#4a5f7f';
  }

  /**
   * Get icon for sentiment type
   * @param {string} sentiment - Sentiment type
   * @returns {string} Icon/emoji
   */
  function getSentimentIcon(sentiment) {
    const icons = {
      positive: '✓',
      neutral: '?',
      negative: '!',
    };
    return icons[sentiment] || '?';
  }

  /**
   * Get label for sentiment type
   * @param {string} sentiment - Sentiment type
   * @returns {string} Display label
   */
  function getSentimentLabel(sentiment) {
    const labels = {
      positive: 'Positive',
      neutral: 'Question',
      negative: 'Critical',
    };
    return labels[sentiment] || 'Unknown';
  }

  // ===================================================================
  // Filtering
  // ===================================================================

  /**
   * Filter threads by sentiment type
   * @param {string} sentimentType - Sentiment to filter by ('all', 'positive', 'neutral', 'negative')
   */
  function filterBySentiment(sentimentType) {
    state.currentFilter = sentimentType;
    updateFilterButtons();
    applyFilter();
    updateAriaLiveRegion(`Filtering threads to show ${sentimentType} sentiment`);
  }

  /**
   * Apply current filter to thread list
   */
  function applyFilter() {
    const threadElements = Array.from(DOM.threadsList.querySelectorAll('.sentiment-thread-item'));
    let visibleCount = 0;

    threadElements.forEach((element, index) => {
      const sentiment = element.getAttribute('data-sentiment');
      const shouldShow = state.currentFilter === 'all' || sentiment === state.currentFilter;

      if (shouldShow && index < state.displayedThreadCount) {
        element.classList.remove('hidden');
        element.style.animation = `fadeIn ${CONFIG.animationDuration}ms ease-in`;
        visibleCount++;
      } else {
        element.classList.add('hidden');
      }
    });

    updateLoadMoreButton();
  }

  /**
   * Update filter button active states
   */
  function updateFilterButtons() {
    DOM.filterButtons.forEach(btn => {
      const filter = btn.getAttribute('data-filter');
      if (filter === state.currentFilter) {
        btn.classList.add('sentiment-filter-btn--active');
        btn.setAttribute('aria-pressed', 'true');
      } else {
        btn.classList.remove('sentiment-filter-btn--active');
        btn.setAttribute('aria-pressed', 'false');
      }
    });
  }

  // ===================================================================
  // Load More Functionality
  // ===================================================================

  /**
   * Load more threads and display them
   */
  function loadMoreThreads() {
    if (state.isLoadingMore) return;

    state.isLoadingMore = true;
    DOM.loadMoreBtn.disabled = true;
    DOM.loadMoreBtn.textContent = 'Loading...';

    // Simulate loading delay
    setTimeout(() => {
      const newCount = state.displayedThreadCount + CONFIG.threadsPerPage;
      state.displayedThreadCount = Math.min(newCount, state.allThreads.length);
      applyFilter();

      state.isLoadingMore = false;
      DOM.loadMoreBtn.disabled = false;
      DOM.loadMoreBtn.textContent = 'Load More Threads';

      updateAriaLiveRegion(`Loaded more threads. ${state.displayedThreadCount} threads now visible.`);
    }, CONFIG.animationDuration);
  }

  /**
   * Update load more button state
   */
  function updateLoadMoreButton() {
    if (!DOM.loadMoreBtn) return;

    const visibleThreads = Array.from(DOM.threadsList.querySelectorAll('.sentiment-thread-item')).filter(
      el => !el.classList.contains('hidden')
    ).length;

    const hasMore = state.displayedThreadCount < state.allThreads.length;

    if (hasMore) {
      DOM.loadMoreBtn.style.display = 'block';
      DOM.loadMoreBtn.disabled = false;
    } else {
      DOM.loadMoreBtn.style.display = 'none';
    }
  }

  // ===================================================================
  // Keyboard Navigation
  // ===================================================================

  /**
   * Initialize keyboard navigation
   */
  function initKeyboardNavigation() {
    DOM.filterButtons.forEach((btn, index) => {
      btn.addEventListener('keydown', event => {
        let targetIndex = index;

        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault();
          targetIndex = (index + 1) % DOM.filterButtons.length;
          DOM.filterButtons[targetIndex].focus();
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault();
          targetIndex = (index - 1 + DOM.filterButtons.length) % DOM.filterButtons.length;
          DOM.filterButtons[targetIndex].focus();
        } else if (event.key === 'Home') {
          event.preventDefault();
          DOM.filterButtons[0].focus();
        } else if (event.key === 'End') {
          event.preventDefault();
          DOM.filterButtons[DOM.filterButtons.length - 1].focus();
        }
      });
    });
  }

  // ===================================================================
  // Accessibility
  // ===================================================================

  /**
   * Create ARIA live region for announcing changes
   */
  function createAriaLiveRegion() {
    state.ariaLiveRegion = document.createElement('div');
    state.ariaLiveRegion.setAttribute('aria-live', 'polite');
    state.ariaLiveRegion.setAttribute('aria-atomic', 'true');
    state.ariaLiveRegion.className = 'sr-only';
    document.body.appendChild(state.ariaLiveRegion);
  }

  /**
   * Update ARIA live region with announcement
   * @param {string} message - Message to announce
   */
  function updateAriaLiveRegion(message) {
    if (state.ariaLiveRegion) {
      state.ariaLiveRegion.textContent = message;
    }
  }

  // ===================================================================
  // Event Listeners
  // ===================================================================

  /**
   * Attach event listeners to interactive elements
   */
  function attachEventListeners() {
    // Filter button events
    DOM.filterButtons.forEach(btn => {
      btn.addEventListener('click', event => {
        event.preventDefault();
        const filter = btn.getAttribute('data-filter');
        filterBySentiment(filter);
      });

      // Add ARIA attributes
      btn.setAttribute('role', 'button');
      btn.setAttribute('aria-pressed', 'false');
    });

    // Load more button event
    if (DOM.loadMoreBtn) {
      DOM.loadMoreBtn.addEventListener('click', event => {
        event.preventDefault();
        loadMoreThreads();
      });
    }
  }

  // ===================================================================
  // Utility Functions
  // ===================================================================

  /**
   * Escape HTML special characters
   * @param {string} text - Text to escape
   * @returns {string} Escaped text safe for HTML
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Format date string
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date
   */
  function formatDate(dateString) {
    try {
      const date = new Date(dateString);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Format as "2 days ago" or "Dec 28"
      const daysDiff = Math.floor((today - date) / (1000 * 60 * 60 * 24));

      if (daysDiff === 0) {
        return 'Today';
      } else if (daysDiff === 1) {
        return 'Yesterday';
      } else if (daysDiff < 7) {
        return `${daysDiff} days ago`;
      } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    } catch (error) {
      console.error('Date formatting error:', error);
      return dateString;
    }
  }

  /**
   * Show error state when data loading fails
   */
  function showErrorState() {
    if (!DOM.threadsList) return;

    const errorDiv = document.createElement('div');
    errorDiv.className = 'sentiment-error-message';
    errorDiv.innerHTML = `
      <p>Unable to load community sentiment data. Please try refreshing the page.</p>
    `;
    errorDiv.style.cssText = `
      background: rgba(90, 45, 45, 0.3);
      color: #d88a8a;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      margin: 20px 0;
    `;

    DOM.threadsList.parentNode.insertBefore(errorDiv, DOM.threadsList);
  }

  // ===================================================================
  // Screen Reader Only Styles
  // ===================================================================

  /**
   * Add screen reader only style to document
   */
  function addScreenReaderStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border-width: 0;
      }
    `;
    document.head.appendChild(style);
  }

  // ===================================================================
  // Fade-in Animation
  // ===================================================================

  /**
   * Add fade-in animation styles
   */
  function addAnimationStyles() {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ===================================================================
  // Startup
  // ===================================================================

  // Add styles when DOM is ready
  addScreenReaderStyles();
  addAnimationStyles();

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export for testing/debugging (if needed)
  window.SentimentThreads = {
    filterBySentiment,
    loadMoreThreads,
    getState: () => state,
    getConfig: () => CONFIG,
  };
})();
