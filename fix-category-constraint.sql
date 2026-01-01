ALTER TABLE blog_posts DROP CONSTRAINT valid_category;
ALTER TABLE blog_posts ADD CONSTRAINT valid_category CHECK (category IN ('health', 'protocol', 'community', 'strategy', 'news', 'featured', 'performance', 'lifestyle'));
