/**
 * Content of the Week - Dynamic Loader
 * Loads editorial picks from JSON and merges with real YouTube metadata
 */

async function loadContentOfTheWeek() {
    const container = document.getElementById('content-of-the-week-grid');

    if (!container) {
        console.error('Content of the Week container not found');
        return;
    }

    try {
        // Show loading state
        container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--color-text-secondary);">Loading featured content...</div>';

        // Fetch both data sources
        const [editorial, youtubeData] = await Promise.all([
            fetch('/data/content-of-the-week.json').then(r => r.json()),
            fetch('/data/youtube_data.json').then(r => r.json())
        ]);

        // Find video metadata by video_id in YouTube data
        function findVideoMetadata(videoId) {
            for (const creator of youtubeData.top_creators) {
                const video = creator.videos.find(v => v.video_id === videoId);
                if (video) {
                    return {
                        channel_name: creator.channel_name,
                        video: video
                    };
                }
            }
            return null;
        }

        // Build video cards HTML
        const cardsHTML = editorial.featured_videos.map(pick => {
            const metadata = findVideoMetadata(pick.video_id);

            // Fallback if video not found in YouTube data
            const channelName = metadata ? metadata.channel_name : 'Unknown Channel';
            const thumbnailUrl = `https://img.youtube.com/vi/${pick.video_id}/hqdefault.jpg`;

            return `
                <article class="video-card card card--clickable">
                    <div class="video-thumbnail">
                        <img src="${thumbnailUrl}" alt="${pick.editorial_title}" loading="lazy">
                        <span class="play-overlay" aria-hidden="true">▶</span>
                    </div>
                    <div class="video-meta">
                        <span class="heat-badge">${pick.heat_badge}</span>
                        <span class="video-channel">${channelName}</span>
                    </div>
                    <h3 class="video-title">${pick.editorial_title}</h3>
                    <div class="video-commentary">
                        <p class="commentary-text">"${pick.commentary}"</p>
                        <span class="commentary-author">— ${pick.curator}</span>
                    </div>
                </article>
            `;
        }).join('');

        // Render cards
        container.innerHTML = cardsHTML;

        // Add click handlers to open YouTube videos
        container.querySelectorAll('.video-card').forEach((card, index) => {
            const videoId = editorial.featured_videos[index].video_id;
            card.addEventListener('click', () => {
                window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
            });
        });

    } catch (error) {
        console.error('Failed to load Content of the Week:', error);
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--color-text-secondary);">
                <p>Unable to load featured content.</p>
                <p style="font-size: 14px; margin-top: 10px;">Error: ${error.message}</p>
            </div>
        `;
    }
}

// Load when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadContentOfTheWeek);
} else {
    loadContentOfTheWeek();
}
