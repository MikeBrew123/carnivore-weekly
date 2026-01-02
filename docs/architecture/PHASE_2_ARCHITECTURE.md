# PHASE 2: Architecture & Technical Diagrams

## High-Level System Architecture

### Current Architecture (Fragmented)
```
┌─────────────────────────────────────────────────────────────────┐
│                    run_weekly_update.sh                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ Validation Loop  │  │  Data Pipeline   │  │ Generation   │  │
│  │                  │  │                  │  │ Loop         │  │
│  ├──────────────────┤  ├──────────────────┤  ├──────────────┤  │
│  │                  │  │                  │  │              │  │
│  │ validate_        │  │ youtube_         │  │ generate_    │  │
│  │ structure.py     │  │ collector.py     │  │ pages.py     │  │
│  │                  │  │                  │  │              │  │
│  │ validate_        │  │ content_         │  │ generate_    │  │
│  │ before_update.py │  │ analyzer.py      │  │ archive.py   │  │
│  │                  │  │                  │  │              │  │
│  │ validate-        │  │ add_sentiment.py │  │ generate_    │  │
│  │ brand.sh         │  │                  │  │ newsletter.py│  │
│  │                  │  │ answer_          │  │              │  │
│  │ validate-seo.sh  │  │ questions.py     │  │ generate_    │  │
│  │                  │  │                  │  │ channels.py  │  │
│  │ validate-w3c.sh  │  │ extract_wiki_    │  │              │  │
│  │                  │  │ keywords.py      │  │ update_wiki_ │  │
│  │                  │  │                  │  │ videos.py    │  │
│  │ (Python + Bash)  │  │                  │  │              │  │
│  │ (Duplicated      │  │                  │  │ (Duplicated  │  │
│  │ logic)           │  │                  │  │ logic)       │  │
│  │ (Inconsistent    │  │                  │  │ (Hardcoded   │  │
│  │ output)          │  │                  │  │ paths)       │  │
│  │ (Hardcoded       │  │                  │  │ (No caching) │  │
│  │ rules)           │  │                  │  │              │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│       (5 tools)            (standard)            (5+ tools)     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Issues:
  ✗ Multiple tools with overlapping responsibility
  ✗ Bash + Python mix (incompatible ecosystems)
  ✗ Configuration scattered across files
  ✗ Data loaded multiple times
  ✗ Inconsistent error handling
  ✗ Manual tool coordination
```

### New Architecture (Unified)
```
┌─────────────────────────────────────────────────────────────────┐
│                    run_weekly_update.sh                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ Validation       │  │  Data Pipeline   │  │ Generation   │  │
│  │                  │  │                  │  │              │  │
│  ├──────────────────┤  ├──────────────────┤  ├──────────────┤  │
│  │                  │  │                  │  │              │  │
│  │  validate.py     │  │ youtube_         │  │ generate.py  │  │
│  │  ├─ structure    │  │ collector.py     │  │ ├─ pages     │  │
│  │  ├─ seo          │  │                  │  │ ├─ archive   │  │
│  │  ├─ brand        │  │ content_         │  │ ├─ newsletter│  │
│  │  ├─ w3c          │  │ analyzer.py      │  │ ├─ channels  │  │
│  │  ├─ accessibility│  │                  │  │ ├─ wiki      │  │
│  │  └─ preflight    │  │ add_sentiment.py │  │ └─ all       │  │
│  │                  │  │                  │  │              │  │
│  │ (1 tool)         │  │ answer_          │  │ (1 tool)     │  │
│  │ (Pure Python)    │  │ questions.py     │  │ (Unified)    │  │
│  │ (Config-driven)  │  │                  │  │ (Caching)    │  │
│  │ (Consistent      │  │                  │  │ (Smart       │  │
│  │  output)         │  │                  │  │  ordering)   │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│                              │                                 │
│                              ▼                                 │
│                    ┌──────────────────┐                        │
│                    │  config/         │                        │
│                    │  project.json    │                        │
│                    │                  │                        │
│                    │ ├─ validators    │                        │
│                    │ ├─ generators    │                        │
│                    │ ├─ paths         │                        │
│                    │ └─ services      │                        │
│                    └──────────────────┘                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Improvements:
  ✓ Single tool per job (validate, generate)
  ✓ Pure Python (consistent ecosystem)
  ✓ Centralized configuration
  ✓ Data loaded once (caching)
  ✓ Consistent error handling
  ✓ Automatic tool coordination
  ✓ Extensible architecture
```

---

## Validator Architecture

### Current: 5 Separate Tools
```
validate_structure.py          validate_before_update.py
├─ Rule 1-15                  ├─ Check environment
├─ Config in code             ├─ Check packages
├─ Exit codes 0-3             ├─ Check directories
└─ Python                      ├─ Check templates
                              ├─ Check API
validate-brand.sh             └─ Check disk
├─ Colors hardcoded
├─ Fonts hardcoded      validate-seo.sh
├─ Spacing hardcoded    ├─ Meta description
├─ Exit codes 0-1       ├─ OG tags
└─ Bash                 ├─ Twitter cards
                        ├─ H1 count
validate-w3c.sh         ├─ Analytics
├─ DOCTYPE              ├─ Image alt
├─ Lang attribute       └─ Exit codes 0-1
├─ Tags
└─ Bash
```

### New: Unified Validator
```
                        validate.py
                             │
                ┌────────────┼────────────┐
                │            │            │
                ▼            ▼            ▼
        ┌─────────────┐ ┌──────────── ┌──────────────┐
        │ Config      │ │ Arg Parser  │ Output       │
        │ Loader      │ │             │ Formatter    │
        └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
               │                │              │
               └────────┬───────┴──────┬───────┘
                        │              │
                        ▼              ▼
              ┌─────────────────────────────────┐
              │  BaseValidator (abstract)        │
              ├─────────────────────────────────┤
              │ - validate_file()               │
              │ - validate_directory()          │
              │ - filter_by_severity()          │
              │ - format_results()              │
              └────────────┬────────────────────┘
                           │
            ┌──────────────┼──────────────┬──────────┬──────────┐
            │              │              │          │          │
            ▼              ▼              ▼          ▼          ▼
        Structure      Brand         SEO         W3C      Accessibility
        Validator      Validator    Validator   Validator  Validator
        (15 rules)     (8 rules)    (7 rules)   (12 rules) (10+ rules)

        + Preflight Validator (8 checks)

Files:
  validate.py                 (200 lines - entry point)
  validators/base_validator.py (150 lines)
  validators/*_validator.py    (100-1000 lines each)
  config/project.json          (650 lines)
```

### Validator Data Flow
```
Input: public/index.html
  │
  ├─► Load config from project.json
  │
  ├─► Select validator based on --type
  │
  ├─► Run validation:
  │   ├─ Read HTML file
  │   ├─ Parse with BeautifulSoup
  │   ├─ Run rules/checks
  │   └─ Collect errors
  │
  ├─► Format results:
  │   ├─ Group by severity
  │   ├─ Filter by requested level
  │   └─ Format for output type
  │
  ├─► Output (text/json/summary)
  │
  └─► Exit with code (0, 1, 2, or 3)
```

---

## Generator Architecture

### Current: 5+ Separate Tools
```
generate_pages.py              generate_archive.py
├─ Load data                  ├─ Load data (duplicate)
├─ Render template            ├─ Save current week
├─ Output to file             ├─ Generate week pages
└─ 234 lines                  ├─ Generate index
                              └─ 244 lines

generate_newsletter.py         generate_channels.py
├─ Load current week          ├─ Load data (duplicate)
├─ Load last week             ├─ Analyze appearances
├─ Compare stats              ├─ Fetch thumbnails
├─ AI generation              ├─ Render template
├─ Multiple outputs           └─ 271 lines
└─ 600 lines

update_wiki_videos.py
├─ Extract keywords
├─ Auto-link
└─ ? lines
```

### New: Unified Generator
```
                        generate.py
                             │
                ┌────────────┼────────────┐
                │            │            │
                ▼            ▼            ▼
        ┌─────────────┐ ┌──────────── ┌──────────────┐
        │ Config      │ │ Arg Parser  │ Output       │
        │ Loader      │ │             │ Manager      │
        └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
               │                │              │
               └────────┬───────┴──────┬───────┘
                        │              │
                        ▼              ▼
              ┌─────────────────────────────────┐
              │  DataLoader (shared)            │
              ├─────────────────────────────────┤
              │ - load_current_week()           │
              │ - load_archive()                │
              │ - cache_results()               │
              │ - validate_data()               │
              └────────────┬────────────────────┘
                           │
                           ▼
              ┌─────────────────────────────────┐
              │  BaseGenerator (abstract)        │
              ├─────────────────────────────────┤
              │ - setup_jinja2()                │
              │ - render_template()             │
              │ - save_output()                 │
              │ - get_data()                    │
              └────────────┬────────────────────┘
                           │
        ┌──────────────────┼──────────────┬──────────┬──────┐
        │                  │              │          │      │
        ▼                  ▼              ▼          ▼      ▼
      Pages          Archive          Newsletter  Channels  Wiki
    Generator      Generator        Generator    Generator Generator
    (homepage)     (weeks+index)    (ai+html)    (featured) (keywords)

Files:
  generate.py                 (150 lines - entry point)
  generators/base_generator.py (150 lines)
  generators/data_loader.py    (200 lines)
  generators/*_generator.py    (150-400 lines each)
```

### Generator Data Flow
```
Input: --type pages,archive
  │
  ├─► Load config from project.json
  │
  ├─► DataLoader:
  │   ├─ Load analyzed_content.json (cached)
  │   ├─ Load archive/*.json (if needed)
  │   ├─ Validate data structure
  │   └─ Return dataset
  │
  ├─► For each type in generation_order:
  │   │
  │   ├─► Pages Generator:
  │   │   ├─ Render index_template.html
  │   │   ├─ Apply wiki links
  │   │   └─ Save to public/index.html
  │   │
  │   ├─► Archive Generator:
  │   │   ├─ Render archive_template.html
  │   │   ├─ Generate week pages
  │   │   └─ Save to public/archive/*
  │   │
  │   └─► (etc for other types)
  │
  ├─► Output summary
  │
  └─► Exit with code 0 (success)
```

---

## Data Flow: Weekly Update

### Before (Fragmented)
```
run_weekly_update.sh
│
├─► validate_structure.py templates/      ← Read templates
│
├─► validate_before_update.py             ← Check env/packages
│
├─► youtube_collector.py                  ← Fetch YouTube
│   └─► data/youtube_data.json
│
├─► content_analyzer_optimized.py         ← Analyze content
│   ├─► Read data/youtube_data.json ✓
│   └─► data/analyzed_content.json
│
├─► add_sentiment.py                      ← Add sentiment
│   ├─► Read data/analyzed_content.json ✓
│   └─► Update data/analyzed_content.json
│
├─► answer_questions.py                   ← Generate Q&A
│   ├─► Read data/analyzed_content.json ✓
│   └─► Update data/analyzed_content.json
│
├─► extract_wiki_keywords.py              ← Extract keywords
│   ├─► Read data/analyzed_content.json ✓
│   └─► data/wiki_keywords.json
│
├─► generate_pages.py                     ← Generate homepage
│   ├─► Read data/analyzed_content.json ✓
│   ├─► Load templates/index_template.html
│   ├─► Render HTML
│   └─► public/index.html
│
├─► generate_archive.py                   ← Generate archive
│   ├─► Read data/analyzed_content.json ✓
│   ├─► Read data/archive/*.json
│   ├─► Load templates/archive_template.html
│   ├─► Render HTML ×N weeks
│   └─► public/archive.html + public/archive/*.html
│
├─► generate_channels.py                  ← Generate channels
│   ├─► Read data/archive/*.json
│   ├─► YouTube API calls (thumbnails) ◄── API CALL 1
│   ├─► Load templates/channels_template.html
│   ├─► Render HTML
│   └─► public/channels.html
│
├─► update_wiki_videos.py                 ← Update wiki
│   ├─► Read data/analyzed_content.json ✓
│   ├─► Read data/wiki_keywords.json
│   └─► Update wiki links
│
├─► generate_newsletter.py                ← Generate newsletter
│   ├─► Read data/analyzed_content.json ✓
│   ├─► Read data/archive/*.json
│   ├─► Claude API call ◄── API CALL 2
│   ├─► Load templates/newsletter_template.html
│   ├─► Render HTML
│   └─► newsletters/newsletter_*.txt/html
│
├─► validate_structure.py public/         ← Validate generated
│   └─► Read public/*.html
│
└─► Copy to root for GitHub Pages

Issues:
  ✗ data/analyzed_content.json read 5+ times
  ✗ data/archive/*.json read 2+ times
  ✗ Templates loaded separately
  ✗ YouTube API called separately
  ✗ No shared caching
  ✗ Manual error handling
  ✗ 10+ tool invocations
```

### After (Unified with Caching)
```
run_weekly_update.sh
│
├─► validate.py . --type preflight        ← Check env/packages
│
├─► youtube_collector.py                  ← Fetch YouTube
│   └─► data/youtube_data.json
│
├─► content_analyzer_optimized.py         ← Analyze content
│   ├─► Read data/youtube_data.json
│   └─► data/analyzed_content.json
│
├─► add_sentiment.py                      ← Add sentiment
│   ├─► Read data/analyzed_content.json
│   └─► Update data/analyzed_content.json
│
├─► answer_questions.py                   ← Generate Q&A
│   ├─► Read data/analyzed_content.json
│   └─► Update data/analyzed_content.json
│
├─► generate.py --type all                ◄── UNIFIED
│   │
│   └─► DataLoader (single instance)
│       │
│       ├─► Load data/analyzed_content.json (READ ONCE, CACHE) ◄─────┐
│       │                                                             │
│       ├─► Load data/archive/*.json (READ ONCE, CACHE) ◄───────────┐│
│       │                                                           ││
│       └─► Validate data structure                                 ││
│                                                                   ││
│   ├─► PagesGenerator:                                             ││
│   │   ├─ Use cached data ◄───────────────────────────────────────┘│
│   │   ├─ Render index_template.html                              │
│   │   ├─ Apply wiki links                                        │
│   │   └─ public/index.html                                       │
│   │                                                              │
│   ├─► ArchiveGenerator:                                           │
│   │   ├─ Use cached data ◄───────────────────────────────────────┘
│   │   ├─ Render archive_template.html
│   │   └─ public/archive.html + public/archive/*.html
│   │
│   ├─► ChannelsGenerator:
│   │   ├─ Use cached archive data
│   │   ├─ YouTube API cache (1 call, not 10) ◄── API CALL 1
│   │   ├─ Render channels_template.html
│   │   └─ public/channels.html
│   │
│   ├─► WikiGenerator:
│   │   ├─ Use cached data
│   │   ├─ Extract keywords
│   │   └─ Update wiki links
│   │
│   └─► NewsletterGenerator:
│       ├─ Use cached data
│       ├─ Claude API call ◄── API CALL 2
│       ├─ Render newsletter_template.html
│       └─ newsletters/newsletter_*.txt/html
│
├─► validate.py public/ --type all        ← Validate generated
│
└─► Copy to root for GitHub Pages

Improvements:
  ✓ data/analyzed_content.json read once
  ✓ data/archive/*.json read once
  ✓ Shared caching across generators
  ✓ Smart API call management
  ✓ Single validation pass
  ✓ 2 main tool invocations
  ✓ Unified error handling
```

---

## Module Dependencies

### Validator Dependencies
```
validate.py (entry point)
  │
  ├─► config/config_loader.py
  │   └─► config/project.json
  │
  └─► validators/
      │
      ├─► base_validator.py (abstract)
      │
      ├─► structure_validator.py
      │   ├─ BeautifulSoup
      │   ├─ base_validator.py
      │   └─ config
      │
      ├─► brand_validator.py
      │   ├─ BeautifulSoup
      │   ├─ base_validator.py
      │   └─ config (colors, fonts, spacing)
      │
      ├─► seo_validator.py
      │   ├─ BeautifulSoup
      │   ├─ base_validator.py
      │   └─ config (thresholds)
      │
      ├─► w3c_validator.py
      │   ├─ BeautifulSoup
      │   ├─ base_validator.py
      │   └─ config (rules)
      │
      ├─► accessibility_validator.py (NEW)
      │   ├─ BeautifulSoup
      │   ├─ base_validator.py
      │   └─ config (WCAG rules)
      │
      └─► preflight_validator.py
          ├─ os/sys
          ├─ base_validator.py
          └─ config (checks)
```

### Generator Dependencies
```
generate.py (entry point)
  │
  ├─► config/config_loader.py
  │   └─► config/project.json
  │
  └─► generators/
      │
      ├─► data_loader.py (shared)
      │   ├─ json.load()
      │   ├─ pathlib.Path
      │   └─ caching logic
      │
      ├─► base_generator.py (abstract)
      │   ├─ Jinja2 Environment
      │   ├─ Template rendering
      │   └─ Output management
      │
      ├─► page_generator.py
      │   ├─ base_generator.py
      │   ├─ data_loader.py
      │   ├─ templates/index_template.html
      │   └─ auto_link_wiki_keywords.py
      │
      ├─► archive_generator.py
      │   ├─ base_generator.py
      │   ├─ data_loader.py
      │   └─ templates/archive_template.html
      │
      ├─► newsletter_generator.py
      │   ├─ base_generator.py
      │   ├─ data_loader.py
      │   ├─ templates/newsletter_template.html
      │   ├─ personas_helper.py
      │   └─ Anthropic API
      │
      ├─► channels_generator.py
      │   ├─ base_generator.py
      │   ├─ data_loader.py
      │   ├─ templates/channels_template.html
      │   ├─ requests (YouTube API)
      │   └─ caching (thumbnails)
      │
      └─► wiki_generator.py
          ├─ base_generator.py
          ├─ data_loader.py
          ├─ Keyword extraction
          └─ Wiki auto-linking
```

---

## Configuration Schema

### Config File Structure
```
config/project.json
│
├─ project (metadata)
│   ├─ name: "Carnivore Weekly"
│   ├─ version: "2.0"
│   └─ author: "Team"
│
├─ paths (all directories)
│   ├─ root: "."
│   ├─ scripts: "scripts"
│   ├─ templates: "templates"
│   ├─ public: "public"
│   ├─ data: "data"
│   ├─ archive: "data/archive"
│   ├─ newsletters: "newsletters"
│   └─ config: "config"
│
├─ external_services (API configs)
│   ├─ youtube:
│   │  ├─ api_key_env: "YOUTUBE_API_KEY"
│   │  ├─ cache_ttl: 3600
│   │  └─ max_retries: 3
│   │
│   ├─ anthropic:
│   │  ├─ api_key_env: "ANTHROPIC_API_KEY"
│   │  ├─ model: "claude-sonnet-4-5-20250929"
│   │  ├─ max_tokens: 2000
│   │  └─ temperature: 0.7
│   │
│   └─ supabase:
│       ├─ url_env: "SUPABASE_URL"
│       └─ key_env: "SUPABASE_KEY"
│
├─ validators (all validation rules)
│   ├─ structure: {...}
│   ├─ brand: {...}
│   ├─ seo: {...}
│   ├─ w3c: {...}
│   ├─ accessibility: {...}
│   └─ preflight: {...}
│
├─ generators (all generation options)
│   ├─ pages: {...}
│   ├─ archive: {...}
│   ├─ newsletter: {...}
│   ├─ channels: {...}
│   └─ wiki: {...}
│
├─ generation_order (precedence)
│   └─ [pages, archive, channels, wiki, newsletter]
│
├─ validation_order (precedence)
│   └─ [preflight, structure, seo, brand, w3c, accessibility]
│
└─ logging
    ├─ level: "INFO"
    ├─ format: "detailed"
    ├─ file: "logs/consolidation.log"
    └─ console: true
```

---

## Class Hierarchy

### Validator Class Hierarchy
```
BaseValidator (abstract)
├── validate_file() → ValidationResult
├── validate_directory() → List[ValidationResult]
├── filter_by_severity() → List[ValidationError]
└── format_output() → str

    ├── StructureValidator
    │   ├── 15 validation rules (Rule1-Rule15)
    │   ├── _validate_relative_path()
    │   └── _get_file_depth()
    │
    ├── BrandValidator
    │   ├── check_colors()
    │   ├── check_typography()
    │   ├── check_spacing()
    │   └── check_textures()
    │
    ├── SEOValidator
    │   ├── check_meta_description()
    │   ├── check_og_tags()
    │   ├── check_twitter_tags()
    │   └── check_images()
    │
    ├── W3CValidator
    │   ├── check_doctype()
    │   ├── check_html_structure()
    │   ├── check_tags()
    │   └── check_hierarchy()
    │
    ├── AccessibilityValidator
    │   ├── check_wcag_aa()
    │   ├── check_contrast()
    │   ├── check_aria()
    │   └── check_keyboard_nav()
    │
    └── PreflightValidator
        ├── check_env_variables()
        ├── check_packages()
        ├── check_directories()
        └── check_api_connectivity()
```

### Generator Class Hierarchy
```
BaseGenerator (abstract)
├── setup_jinja2()
├── render_template() → str
├── save_output(path, content)
├── get_data() → dict
└── generate() → None

    ├── PageGenerator
    │   ├── load_analyzed_data()
    │   ├── generate_homepage()
    │   └── apply_wiki_links()
    │
    ├── ArchiveGenerator
    │   ├── save_current_week()
    │   ├── generate_week_page()
    │   └── generate_archive_index()
    │
    ├── NewsletterGenerator
    │   ├── load_current_week()
    │   ├── load_last_week()
    │   ├── calculate_stats_comparison()
    │   ├── generate_newsletter_content()
    │   ├── format_newsletter()
    │   └── generate_html_newsletter()
    │
    ├── ChannelsGenerator
    │   ├── analyze_channel_appearances()
    │   ├── get_channel_thumbnail()
    │   └── generate_channels_page()
    │
    └── WikiGenerator
        ├── extract_keywords()
        └── auto_link_content()
```

---

## Test Coverage Pyramid

### Unit Tests (500 lines)
```
                    ▲
                   ╱ ╲
                  ╱   ╲        End-to-End Tests
                 ╱     ╲       (Full workflow)
                ╱───────╲
               ╱         ╲     Integration Tests
              ╱           ╲    (Config + Validators + Generators)
             ╱             ╲
            ╱───────────────╲
           ╱                 ╲  Unit Tests
          ╱                   ╲ (Individual components)
         ╱_____________________╲

• test_config_loader.py (100 lines)
  ├─ Load config
  ├─ Validate config
  ├─ Override values
  └─ Handle missing keys

• test_validators.py (200 lines)
  ├─ Structure validator
  ├─ Brand validator
  ├─ SEO validator
  ├─ W3C validator
  ├─ Accessibility validator
  └─ Preflight validator

• test_generators.py (150 lines)
  ├─ Data loader
  ├─ Page generator
  ├─ Archive generator
  ├─ Newsletter generator
  ├─ Channels generator
  └─ Wiki generator

• integration_tests.py (300 lines)
  ├─ Full validation sequence
  ├─ Full generation sequence
  ├─ Output validation
  └─ Performance tests

• e2e_tests.py (50 lines)
  └─ Run full run_weekly_update.sh
```

---

## Performance Analysis

### Data Loading
```
Before (Separate Generators):
  Load analyzed_content.json: 5 times (pages, archive, newsletter, channels, wiki)
  Load archive/*.json:        2 times (archive, channels, newsletter)
  Total:                      7 file loads

After (Unified Generator):
  Load analyzed_content.json: 1 time (cached)
  Load archive/*.json:        1 time (cached)
  Total:                      2 file loads

Improvement: 71% reduction
```

### API Calls
```
Before:
  YouTube API (thumbnails): 1 call per channel (10+ calls)
  Anthropic API:            1 call (newsletter)
  Total:                    11+ API calls

After:
  YouTube API (thumbnails): 1 call (cached)
  Anthropic API:            1 call (newsletter)
  Total:                    2 API calls

Improvement: 80%+ reduction
```

### Execution Time
```
Before:
  5 validators:  2.0s
  5 generators:  30.0s (with API calls)
  Total:         32.0s

After:
  1 unified validator: 0.8s
  1 unified generator: 24.0s (with caching)
  Total:              24.8s

Improvement: 23% faster
```

---

## Deployment Architecture

### Current Setup
```
git repository
├── scripts/
│   ├── validate_structure.py
│   ├── validate_before_update.py
│   ├── validate-brand.sh
│   ├── validate-seo.sh
│   ├── validate-w3c.sh
│   ├── generate_pages.py
│   ├── generate_archive.py
│   ├── generate_newsletter.py
│   ├── generate_channels.py
│   └── update_wiki_videos.py
│
├── run_weekly_update.sh
│
└── public/
    ├── index.html
    ├── archive.html
    └── channels.html
```

### After Consolidation
```
git repository
├── config/
│   ├── project.json              (NEW - centralized config)
│   └── config_loader.py          (NEW - config management)
│
├── scripts/
│   ├── validate.py               (NEW - unified validator)
│   ├── generate.py               (NEW - unified generator)
│   │
│   ├── validators/               (NEW - validator modules)
│   │   ├── __init__.py
│   │   ├── base_validator.py
│   │   ├── result_formatter.py
│   │   ├── structure_validator.py
│   │   ├── brand_validator.py
│   │   ├── seo_validator.py
│   │   ├── w3c_validator.py
│   │   ├── accessibility_validator.py
│   │   └── preflight_validator.py
│   │
│   ├── generators/               (NEW - generator modules)
│   │   ├── __init__.py
│   │   ├── base_generator.py
│   │   ├── data_loader.py
│   │   ├── page_generator.py
│   │   ├── archive_generator.py
│   │   ├── newsletter_generator.py
│   │   ├── channels_generator.py
│   │   └── wiki_generator.py
│   │
│   ├── validate_structure.py.bak (FALLBACK)
│   ├── validate_before_update.py.bak (FALLBACK)
│   ├── validate-brand.sh.bak (FALLBACK)
│   ├── validate-seo.sh.bak (FALLBACK)
│   ├── validate-w3c.sh.bak (FALLBACK)
│   ├── generate_pages.py.bak (FALLBACK)
│   ├── generate_archive.py.bak (FALLBACK)
│   ├── generate_newsletter.py.bak (FALLBACK)
│   └── generate_channels.py.bak (FALLBACK)
│
├── tests/                         (NEW - test suite)
│   ├── test_config.py
│   ├── test_validators.py
│   ├── test_generators.py
│   ├── integration_tests.py
│   └── e2e_tests.py
│
├── run_weekly_update.sh           (UPDATED - uses new commands)
│
├── PHASE_2_CONSOLIDATION_REPORT.md
├── PHASE_2_SUMMARY.md
├── PHASE_2_QUICK_REFERENCE.md
├── PHASE_2_ARCHITECTURE.md
│
└── public/
    ├── index.html
    ├── archive.html
    └── channels.html
```

---

## Rollback Decision Tree

```
Issue Detected?
│
├─► During Phase 1 (Foundation)
│   └─► Delete /config and /scripts/validators/generators
│       └─► Old scripts automatically work
│           └─► Rollback time: 5 minutes
│
├─► During Phase 2 (Validators)
│   └─► Rename validators back from .bak
│       └─► Revert validate.py
│           └─► Rollback time: 10 minutes
│
├─► During Phase 3 (Generators)
│   └─► Rename generators back from .bak
│       └─► Revert generate.py
│           └─► Rollback time: 10 minutes
│
├─► During Phase 4 (Workflow)
│   └─► git checkout run_weekly_update.sh
│       └─► Use old workflow commands
│           └─► Rollback time: 5 minutes
│
└─► After Phase 5 (Complete)
    └─► Option 1: Disable new code in config
        └─► Use compatibility mode
            └─► Rollback time: 5 minutes

    └─► Option 2: Switch to old scripts
        └─► Keep .bak files available for 6+ months
            └─► Rollback time: 15 minutes
```

---

**End of Architecture Documentation**

For implementation details, see `/PHASE_2_CONSOLIDATION_REPORT.md`
For quick commands, see `/PHASE_2_QUICK_REFERENCE.md`
