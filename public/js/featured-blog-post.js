// Load featured blog post from JSON data file
(function() {
    fetch('/data/featured-blog-post.json')
        .then(response => response.json())
        .then(data => {
            const featuredCard = document.getElementById('featured-blog-post');
            if (!featuredCard || !data.featured_post) return;

            const post = data.featured_post;

            // Update featured post content
            featuredCard.innerHTML = `
                <div class="featured-post-image" style="background: url('${post.image}') center/cover;"></div>
                <div class="featured-post-content">
                    <span class="featured-badge">${post.badge}</span>
                    <h2 class="featured-post-title">${post.title}</h2>
                    <p class="featured-post-excerpt">${post.excerpt}</p>
                    <div class="featured-post-meta">
                        <span>by ${post.author}</span>
                        <a href="${post.url}" class="btn btn--primary">Read Article</a>
                    </div>
                </div>
            `;
        })
        .catch(error => {
            console.error('Error loading featured post:', error);
            // Fallback: keep default content that's already in HTML
        });
})();
