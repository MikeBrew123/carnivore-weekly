# PHASE 4: Database Migration Plan (JSON → Supabase)

**Lead:** Leo (Database Migration Specialist)
**Status:** In Progress
**Date Started:** January 1, 2026
**Target Completion:** This week

---

## Executive Summary

Moving from JSON files to Supabase as the primary database. This provides:
- Real-time data access for live dashboards (Phase 5)
- Scalable content management
- Better querying and filtering
- Atomic transactions for data consistency
- Audit trails and versioning

---

## Data Inventory: What's Being Migrated

### Priority 1: Core Content (Migrate First)

**1. Blog Posts** (`data/blog_posts.json` - 102KB)
- ~3-5 active blog posts per week
- Structure: id, slug, title, author, date, published, tags, content (HTML), SEO metadata
- Target table: `blog_posts`

**2. YouTube Videos** (`data/youtube_data.json` - 252KB)
- ~50-200 videos per analysis cycle
- Structure: video_id, title, channel, views, engagement, published_at, content analysis
- Target table: `youtube_videos`

**3. Writer Personas** (`data/personas.json` - ~5KB)
- 9 writers with profiles, skills, writing styles, assignment rules
- Structure: name, title, backstory, personality, skills, preferences
- Target table: `writers` (expand from earlier design)

### Priority 2: Supporting Data (Migrate Second)

**4. Wiki Metadata** (`data/wiki_videos_meta.json` - ~4KB)
- Links between wiki topics and YouTube videos
- Structure: topic, video_id, relevance_score, notes
- Target table: `wiki_video_links`

**5. Analyzed Content** (`data/analyzed_content.json` - ~10KB)
- Weekly analysis outputs (summary, insights, sentiment)
- Structure: week, summary, trends, key_insights, sentiment_analysis
- Target table: `weekly_analysis`

**6. Blog Topic Mapping** (`data/blog-topic-product-mapping.json` - ~6KB)
- Internal product recommendation strategy
- Structure: topic, product_name, recommendation_type, when_to_recommend
- Target table: `topic_product_mapping`

### Priority 3: Archive & Reference Data

**7. Archive History** (`data/archive/` - ~100+ JSON files)
- Historic weekly analyses and newsletter data
- Target table: `archive_snapshots` (for historical reference)

---

## Database Schema Design

### Table 1: `blog_posts`

```sql
CREATE TABLE blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    author_id UUID REFERENCES writers(id),
    published_date DATE NOT NULL,
    scheduled_date DATE,
    is_published BOOLEAN DEFAULT false,
    category TEXT,
    tags TEXT[],
    excerpt TEXT,
    content TEXT NOT NULL,
    featured_image_url TEXT,

    -- SEO
    meta_description TEXT,
    meta_keywords TEXT[],

    -- Wiki Links
    wiki_links TEXT[],
    related_post_ids UUID[],

    -- Validation Status
    copy_editor_status TEXT,
    brand_validator_status TEXT,
    humanization_status TEXT,

    -- Settings
    comments_enabled BOOLEAN DEFAULT true,
    sponsor_callout TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Indexes
    CONSTRAINT valid_category CHECK (category IN ('health', 'protocol', 'community', 'strategy', 'news'))
);

CREATE INDEX idx_blog_posts_author_id ON blog_posts(author_id);
CREATE INDEX idx_blog_posts_published_date ON blog_posts(published_date DESC);
CREATE INDEX idx_blog_posts_is_published ON blog_posts(is_published);
CREATE INDEX idx_blog_posts_tags ON blog_posts USING GIN(tags);
```

### Table 2: `youtube_videos`

```sql
CREATE TABLE youtube_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    youtube_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    channel_name TEXT NOT NULL,
    channel_id TEXT,
    description TEXT,
    published_at TIMESTAMPTZ NOT NULL,

    -- Engagement Metrics
    view_count INT,
    like_count INT,
    comment_count INT,

    -- Analysis Data
    analyzed_by_id UUID REFERENCES writers(id),
    analysis_data JSONB,
    content_summary TEXT,
    key_takeaways TEXT[],
    relevance_score INT, -- 1-100

    -- Categorization
    topic_tags TEXT[],
    content_category TEXT,

    -- Tracking
    added_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_analyzed_at TIMESTAMPTZ
);

CREATE INDEX idx_youtube_videos_youtube_id ON youtube_videos(youtube_id);
CREATE INDEX idx_youtube_videos_channel_id ON youtube_videos(channel_id);
CREATE INDEX idx_youtube_videos_published_at ON youtube_videos(published_at DESC);
CREATE INDEX idx_youtube_videos_relevance ON youtube_videos(relevance_score DESC);
```

### Table 3: `writers` (Expanded)

```sql
CREATE TABLE writers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    signature TEXT,

    -- Profile
    backstory TEXT,
    personality TEXT,
    hobbies TEXT,
    pet_name TEXT,

    -- Professional Info
    expertise_areas TEXT[],
    tech_interests TEXT[],

    -- Writing Style
    tone TEXT,
    writing_characteristics TEXT[],
    opening_patterns TEXT[],
    content_type_specialties TEXT[],

    -- Assignment Rules (stored as JSONB for flexibility)
    assignment_rules JSONB,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_writers_slug ON writers(slug);
CREATE INDEX idx_writers_is_active ON writers(is_active);
```

### Table 4: `weekly_analysis`

```sql
CREATE TABLE weekly_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_date DATE UNIQUE NOT NULL,

    -- Content
    weekly_summary TEXT,
    trending_topics TEXT[],
    key_insights TEXT[],
    community_sentiment TEXT,
    recommended_watching TEXT[],
    qa_section JSONB,

    -- Assignment
    assigned_to JSONB, -- {section: writer_id, ...}

    -- Status
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_weekly_analysis_date ON weekly_analysis(analysis_date DESC);
CREATE INDEX idx_weekly_analysis_published ON weekly_analysis(is_published);
```

### Table 5: `wiki_video_links`

```sql
CREATE TABLE wiki_video_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wiki_topic TEXT NOT NULL,
    youtube_video_id UUID REFERENCES youtube_videos(id),
    relevance_score INT, -- 1-100
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(wiki_topic, youtube_video_id)
);

CREATE INDEX idx_wiki_video_links_topic ON wiki_video_links(wiki_topic);
CREATE INDEX idx_wiki_video_links_video_id ON wiki_video_links(youtube_video_id);
```

### Table 6: `topic_product_mapping`

```sql
CREATE TABLE topic_product_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic TEXT NOT NULL,
    product_name TEXT NOT NULL,
    product_url TEXT,
    recommendation_type TEXT, -- 'internal', 'partner', 'mentioned'
    when_to_recommend TEXT,
    framework_step TEXT, -- Which soft-conversion step to use
    notes TEXT,

    UNIQUE(topic, product_name)
);
```

---

## Migration Process

### Phase 4.1: Create Migration Files

**File:** `supabase/migrations/20250101_create_content_tables.sql`
- Creates all 6 new tables
- Sets up indexes
- Configures RLS policies

**File:** `supabase/migrations/20250101_create_migration_helpers.sql`
- JSON import function
- Data validation function
- Audit logging triggers

### Phase 4.2: Run Migrations on Supabase

```bash
cd /Users/mbrew/Developer/carnivore-weekly
supabase db push --linked
```

### Phase 4.3: Load Initial Data

**Scripts to create:**

1. `scripts/migrate_blog_posts.js` - Import blog_posts.json → blog_posts table
2. `scripts/migrate_youtube_data.js` - Import youtube_data.json → youtube_videos table
3. `scripts/migrate_writers.js` - Import personas.json → writers table
4. `scripts/migrate_wiki_links.js` - Import wiki_videos_meta.json → wiki_video_links table
5. `scripts/migrate_analyzed_content.js` - Import analyzed_content.json → weekly_analysis table

### Phase 4.4: Verification

- [ ] Count records: All data imported correctly
- [ ] Validate relationships: Foreign keys resolve
- [ ] Check constraints: No constraint violations
- [ ] Performance: Query times acceptable
- [ ] RLS policies: Security rules working

---

## Key Design Decisions

### Why JSONB for Complex Data?

Some fields like `analysis_data`, `assignment_rules` stored as JSONB because:
- Flexible schema (can add fields without migrations)
- Queryable (can search/filter on nested fields)
- Versioning support (can track changes)

### RLS Policies

- **Service Role:** Full access (for migration scripts)
- **Anon:** Read-only on public tables (blog_posts, youtube_videos, weekly_analysis)
- **Authenticated:** Future support for user-specific features

### Data Normalization

- Writers are separate table (not embedded in each post)
- Videos are separate (many-to-many with wiki topics via linking table)
- Analysis is weekly, not stored per blog post (reduces redundancy)

---

## Risk Mitigation

### Data Loss Prevention

- [ ] Backup JSON files before migration
- [ ] Keep parallel JSON files during transition
- [ ] Validate 100% of records migrate
- [ ] Test rollback procedure

### Performance

- [ ] Indexes on frequently queried fields
- [ ] Pagination for large result sets
- [ ] Connection pooling configured
- [ ] Query optimization before full migration

### Consistency

- [ ] Foreign key constraints enforce referential integrity
- [ ] Transactions ensure atomic operations
- [ ] Audit trail tracks who changed what when

---

## Implementation Order

**Day 1 (Today):**
1. ✅ Review this plan
2. Create migration SQL files
3. Run migrations on Supabase
4. Create migration scripts

**Day 2:**
5. Migrate blog posts
6. Migrate YouTube data
7. Verify data integrity

**Day 3:**
8. Migrate remaining data (writers, wiki links, analysis)
9. Run full validation
10. Update application code to use Supabase

**Day 4:**
11. Performance testing
12. Security audit
13. Documentation
14. Decommission JSON files (keep backups)

---

## Success Criteria

- [ ] All 6 tables created successfully
- [ ] 100% of data migrated without loss
- [ ] No constraint violations
- [ ] Queries run in <500ms on average
- [ ] RLS policies enforced correctly
- [ ] Application code updated to use Supabase
- [ ] JSON files archived but not deleted
- [ ] Full documentation created

---

## Post-Migration

### Application Changes Required

1. **Update Python scripts** to query Supabase instead of loading JSON
   - `scripts/generate.py` - Load writers, analysis from Supabase
   - `scripts/generate_newsletter.py` - Query weekly_analysis table
   - `scripts/seed_writer_data.js` → Use Supabase inserts

2. **Update API endpoints**
   - POST `/api/blog-posts` - Store new posts in Supabase
   - GET `/api/videos` - Query YouTube videos from Supabase
   - GET `/api/writers` - Load writers from Supabase

3. **Update web interfaces**
   - Cache strategy for public tables
   - Pagination for large datasets
   - Real-time updates using Supabase subscriptions (Phase 5)

---

## Leo's Deliverables

1. ✅ This comprehensive plan (done)
2. Migration SQL files
3. Data import/validation scripts
4. Rollback procedure documentation
5. Updated application code
6. Data validation report
7. Performance benchmarks
8. RLS security audit
9. Documentation for future data updates

---

**Next Steps:** Create migration SQL and scripts →  Run migrations → Load data → Validate

