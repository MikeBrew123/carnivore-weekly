/**
 * Trending Topic Explorer - Interactive Expanding Cards with Sentiment Analysis
 * Features:
 * - Expand/collapse cards with smooth animations
 * - Search/filter functionality with 300ms debounce
 * - Sentiment visualization (3-segment bar)
 * - Creator chips linking to YouTube channels
 * - Mobile responsive with keyboard navigation
 * - WCAG AA accessibility compliance
 */

class TrendingTopicExplorer {
  constructor(containerId = 'trending-explorer-container', dataUrl = '/data/trending-topics-mock.json') {
    this.containerId = containerId;
    this.dataUrl = dataUrl;
    this.container = null;
    this.topicsGrid = null;
    this.searchInput = null;
    this.filterButtons = null;
    this.emptyState = null;
    this.resultCount = null;

    this.topicsData = [];
    this.filteredTopics = [];
    this.currentFilter = 'all';
    this.searchQuery = '';
    this.searchDebounceTimer = null;

    this.init();
  }

  /**
   * Initialize the component
   */
  async init() {
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.error(`Container with ID "${this.containerId}" not found`);
      return;
    }

    // Load data
    await this.loadData();

    // Get DOM elements
    this.topicsGrid = this.container.querySelector('#topics-grid');
    this.searchInput = this.container.querySelector('#topic-search');
    this.filterButtons = this.container.querySelectorAll('.filter-btn');
    this.emptyState = this.container.querySelector('#empty-state');
    this.resultCount = this.container.querySelector('#result-count');

    // Attach event listeners
    this.attachEventListeners();

    // Initial render
    this.filteredTopics = [...this.topicsData];
    this.render();
  }

  /**
   * Load topics data from JSON file
   */
  async loadData() {
    try {
      const response = await fetch(this.dataUrl);
      if (!response.ok) {
        throw new Error(`Failed to load data: ${response.statusText}`);
      }
      this.topicsData = await response.json();
    } catch (error) {
      console.error('Error loading trending topics data:', error);
      this.topicsData = [];
    }
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Search input with debounce
    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        this.handleSearch(e);
      });

      // Also support Enter key for accessibility
      this.searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.performSearch();
        }
      });
    }

    // Filter buttons
    this.filterButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        this.handleFilterChange(e);
      });
    });

    // Keyboard navigation for cards
    document.addEventListener('keydown', (e) => {
      if (e.target.closest('.topic-card')) {
        this.handleCardKeydown(e);
      }
    });

    // Touch support for expand buttons on mobile
    document.addEventListener('touchstart', (e) => {
      if (e.target.closest('.expand-btn')) {
        this.handleExpandBtnTouch(e);
      }
    }, { passive: true });
  }

  /**
   * Handle search input with debounce
   */
  handleSearch(event) {
    this.searchQuery = event.target.value.toLowerCase().trim();

    // Clear previous debounce timer
    clearTimeout(this.searchDebounceTimer);

    // Debounce search (300ms)
    this.searchDebounceTimer = setTimeout(() => {
      this.performSearch();
    }, 300);
  }

  /**
   * Perform the actual search and filter
   */
  performSearch() {
    this.currentFilter = 'all';
    this.updateFilterButtons();
    this.applyFilters();
  }

  /**
   * Handle filter button clicks
   */
  handleFilterChange(event) {
    const filterBtn = event.currentTarget;
    const filterValue = filterBtn.dataset.filter;

    this.currentFilter = filterValue;
    this.searchQuery = ''; // Clear search when filtering
    if (this.searchInput) {
      this.searchInput.value = '';
    }

    this.updateFilterButtons();
    this.applyFilters();
  }

  /**
   * Update filter button visual states
   */
  updateFilterButtons() {
    this.filterButtons.forEach((btn) => {
      const isActive = btn.dataset.filter === this.currentFilter;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive);
    });
  }

  /**
   * Apply search and filter logic
   */
  applyFilters() {
    this.filteredTopics = this.topicsData.filter((topic) => {
      // Search filter
      if (this.searchQuery) {
        const searchable = `${topic.title} ${topic.description} ${topic.expanded_content}`.toLowerCase();
        if (!searchable.includes(this.searchQuery)) {
          return false;
        }
      }

      // Category filter
      if (this.currentFilter === 'high-sentiment') {
        const positiveRatio = topic.sentiment.positive / 100;
        return positiveRatio > 0.5;
      }

      if (this.currentFilter === 'recent') {
        return topic.recent === true;
      }

      return true;
    });

    this.render();
  }

  /**
   * Render topics grid
   */
  render() {
    // Clear grid
    this.topicsGrid.innerHTML = '';

    // Show empty state if no results
    if (this.filteredTopics.length === 0) {
      this.emptyState.style.display = 'flex';
      this.updateResultCount(0);
      return;
    }

    this.emptyState.style.display = 'none';
    this.updateResultCount(this.filteredTopics.length);

    // Render each topic
    this.filteredTopics.forEach((topic) => {
      const cardElement = this.createCardElement(topic);
      this.topicsGrid.appendChild(cardElement);
    });
  }

  /**
   * Create a card element from a topic
   */
  createCardElement(topic) {
    const template = document.getElementById('topic-card-template');
    const card = template.content.cloneNode(true);

    const cardDiv = card.querySelector('.topic-card');
    cardDiv.dataset.topicId = topic.id;

    // Title
    card.querySelector('.topic-title').textContent = topic.title;

    // Meta information
    card.querySelector('.count-value').textContent = `${topic.mention_count} mentions`;
    card.querySelector('.score-value').textContent = `${topic.engagement_score.toFixed(1)}`;

    // Description
    card.querySelector('.topic-description').textContent = topic.description;

    // Expanded content
    card.querySelector('.expanded-description').textContent = topic.expanded_content;

    // Sentiment bar
    this.setupSentimentBar(card, topic.sentiment);

    // Sentiment details
    this.setupSentimentDetails(card, topic.sentiment);

    // Creator chips
    this.setupCreatorChips(card, topic.creators);

    // Expand button handler
    const expandBtn = card.querySelector('.expand-btn');
    expandBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleCardExpand(cardDiv);
    });

    // Card click to expand/collapse
    cardDiv.addEventListener('click', () => {
      this.toggleCardExpand(cardDiv);
    });

    return card;
  }

  /**
   * Setup sentiment bar visualization
   */
  setupSentimentBar(cardFragment, sentiment) {
    const bar = cardFragment.querySelector('.sentiment-bar');
    bar.innerHTML = ''; // Clear existing segments

    const total = sentiment.positive + sentiment.neutral + sentiment.negative;
    const segments = [
      { class: 'positive', value: sentiment.positive, label: 'Positive' },
      { class: 'neutral', value: sentiment.neutral, label: 'Neutral' },
      { class: 'negative', value: sentiment.negative, label: 'Negative' },
    ];

    segments.forEach((seg) => {
      const div = document.createElement('div');
      div.className = `sentiment-segment ${seg.class}`;
      const percentage = total > 0 ? ((seg.value / total) * 100).toFixed(0) : 0;
      div.style.flex = `${seg.value}`;
      div.setAttribute('data-value', `${percentage}%`);
      div.setAttribute('aria-label', `${seg.label} sentiment: ${percentage}%`);
      bar.appendChild(div);
    });
  }

  /**
   * Setup sentiment details section
   */
  setupSentimentDetails(cardFragment, sentiment) {
    const total = sentiment.positive + sentiment.neutral + sentiment.negative;

    const sentimentItems = cardFragment.querySelectorAll('.sentiment-item');
    sentimentItems.forEach((item, index) => {
      const value =
        index === 0 ? sentiment.positive : index === 1 ? sentiment.neutral : sentiment.negative;
      const percentage = total > 0 ? ((value / total) * 100).toFixed(0) : 0;
      item.querySelector('.sentiment-value').textContent = `${percentage}%`;
    });
  }

  /**
   * Setup creator chips
   */
  setupCreatorChips(cardFragment, creators) {
    const chipsContainer = cardFragment.querySelector('.creator-chips');
    chipsContainer.innerHTML = ''; // Clear existing chips

    if (!creators || creators.length === 0) {
      const emptyChip = document.createElement('div');
      emptyChip.style.fontSize = '0.85em';
      emptyChip.style.color = 'rgba(244, 228, 212, 0.6)';
      emptyChip.textContent = 'No creators listed';
      chipsContainer.appendChild(emptyChip);
      return;
    }

    creators.forEach((creator) => {
      const template = document.getElementById('creator-chip-template');
      const chip = template.content.cloneNode(true);

      const chipLink = chip.querySelector('.creator-chip');
      chipLink.href = creator.channel_url;
      chipLink.title = `Visit ${creator.name} on YouTube`;
      chipLink.querySelector('.creator-name').textContent = creator.name;

      chipsContainer.appendChild(chip);
    });
  }

  /**
   * Toggle card expand/collapse with animation
   */
  toggleCardExpand(cardElement) {
    const isExpanded = cardElement.classList.contains('expanded');
    const expandedContent = cardElement.querySelector('.card-expanded-content');
    const expandBtn = cardElement.querySelector('.expand-btn');

    if (isExpanded) {
      // Collapse
      cardElement.classList.remove('expanded');
      expandBtn.setAttribute('aria-expanded', 'false');
      expandedContent.setAttribute('aria-hidden', 'true');
    } else {
      // Expand
      cardElement.classList.add('expanded');
      expandBtn.setAttribute('aria-expanded', 'true');
      expandedContent.setAttribute('aria-hidden', 'false');

      // Scroll into view if needed
      setTimeout(() => {
        cardElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 150);
    }
  }

  /**
   * Handle keyboard navigation on cards
   */
  handleCardKeydown(event) {
    const card = event.target.closest('.topic-card');
    if (!card) return;

    // Enter/Space to expand/collapse
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggleCardExpand(card);
      return;
    }

    // Tab navigation - handle within expanded content
    if (event.key === 'Tab') {
      const isExpanded = card.classList.contains('expanded');
      if (!isExpanded && event.shiftKey === false) {
        // Moving forward through expandable card - expand it
        const focusableElements = card.querySelectorAll(
          'button, a, input, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length > 1) {
          // Only expand if there are actionable elements inside
          // This allows Tab to move to next card instead of expanding current
        }
      }
    }

    // Arrow keys for navigation (future enhancement)
    // Left/Right to navigate between cards
    // Up/Down to navigate within expanded content
  }

  /**
   * Handle touch for mobile expand
   */
  handleExpandBtnTouch(event) {
    const card = event.target.closest('.topic-card');
    if (card) {
      this.toggleCardExpand(card);
    }
  }

  /**
   * Update result count display
   */
  updateResultCount(count) {
    if (this.resultCount) {
      const countSpan = this.resultCount.querySelector('strong');
      if (countSpan) {
        countSpan.textContent = count;
      }
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new TrendingTopicExplorer('trending-explorer-container');
  });
} else {
  new TrendingTopicExplorer('trending-explorer-container');
}
