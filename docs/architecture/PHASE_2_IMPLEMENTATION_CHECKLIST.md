# PHASE 2: Implementation Checklist

**Project:** Carnivore Weekly Consolidation
**Timeline:** 5 weeks, 260 hours
**Status:** Ready to Begin
**Start Date:** Monday, 2026-01-06

---

## WEEK 1: Foundation (40 hours)

### Task 1.1: Configuration System (15 hours)

- [ ] Create `/config/` directory
- [ ] Create `/config/project.json` (650 lines)
  - [ ] Section: project metadata
  - [ ] Section: paths (root, scripts, templates, public, data, archive, newsletters)
  - [ ] Section: external_services (YouTube, Anthropic, Supabase)
  - [ ] Section: validators (structure, brand, seo, w3c, accessibility, preflight)
  - [ ] Section: generators (pages, archive, newsletter, channels, wiki)
  - [ ] Section: generation_order
  - [ ] Section: validation_order
  - [ ] Section: logging
  - [ ] Validate JSON syntax
  - [ ] Add documentation comments

- [ ] Create `/config/config_loader.py` (200 lines)
  - [ ] Load config from JSON
  - [ ] Validate required sections
  - [ ] Handle missing values gracefully
  - [ ] Support config overrides from environment
  - [ ] Support alternative config paths
  - [ ] Add config caching
  - [ ] Error handling for missing config

- [ ] Create `/config/__init__.py`

- [ ] Write documentation
  - [ ] CONFIG.md explaining each section
  - [ ] Examples of overrides

**Deliverable:** Fully functional config system
**Status Check:** Config loads without errors, validation passes

---

### Task 1.2: Base Validator Classes (12 hours)

- [ ] Create `/scripts/validators/` directory

- [ ] Create `/scripts/validators/base_validator.py` (150 lines)
  - [ ] `BaseValidator` abstract class
  - [ ] `validate_file(path)` method
  - [ ] `validate_directory(path)` method
  - [ ] `filter_by_severity(errors, severity)` method
  - [ ] `_load_config()` method
  - [ ] `_find_line_number(html, search_str)` method
  - [ ] Error handling

- [ ] Create `/scripts/validators/result_formatter.py` (100 lines)
  - [ ] `ValidationError` dataclass (if not already defined)
  - [ ] `format_text(errors)` - human readable
  - [ ] `format_json(errors)` - JSON format
  - [ ] `format_summary(errors)` - summary only
  - [ ] Color output support (green/red/yellow)

- [ ] Create `/scripts/validators/__init__.py`

- [ ] Unit tests
  - [ ] test_config_loader.py (100 lines)
    - [ ] Load config from file
    - [ ] Validate required sections
    - [ ] Handle missing keys
    - [ ] Override values
    - [ ] 90%+ coverage

**Deliverable:** Base classes ready for validators
**Status Check:** Unit tests pass 100%, no import errors

---

### Task 1.3: Base Generator Classes (13 hours)

- [ ] Create `/scripts/generators/` directory

- [ ] Create `/scripts/generators/base_generator.py` (150 lines)
  - [ ] `BaseGenerator` abstract class
  - [ ] `generate()` abstract method
  - [ ] `setup_jinja2(template_dir)` method
  - [ ] `render_template(template_name, context)` method
  - [ ] `save_output(path, content)` method
  - [ ] `get_data()` method (calls DataLoader)
  - [ ] Error handling

- [ ] Create `/scripts/generators/data_loader.py` (200 lines)
  - [ ] `DataLoader` class (singleton pattern)
  - [ ] `load_current_week()` - loads analyzed_content.json
  - [ ] `load_archive()` - loads all archive files
  - [ ] `validate_data_structure(data)` - ensures required fields
  - [ ] `cache_results()` - caching mechanism
  - [ ] `get_cached_data(key)` - retrieve from cache
  - [ ] `clear_cache()` - for testing
  - [ ] Handle old/new data structure compatibility

- [ ] Create `/scripts/generators/__init__.py`

- [ ] Unit tests
  - [ ] test_base_generator.py (100 lines)
    - [ ] Jinja2 setup
    - [ ] Template rendering
    - [ ] Output saving
    - [ ] 85%+ coverage

**Deliverable:** Base classes and data loading ready
**Status Check:** Unit tests pass 100%, caching works

---

### Task 1.4: Integration Tests (5 hours)

- [ ] Create `/tests/` directory

- [ ] Create `/tests/test_config.py` (100 lines)
  - [ ] Test loading valid config
  - [ ] Test loading invalid config (should error gracefully)
  - [ ] Test config override from environment
  - [ ] Test required sections present
  - [ ] Test all paths resolve correctly

- [ ] Create `/tests/test_base_validator.py` (75 lines)
  - [ ] Test BaseValidator initialization
  - [ ] Test file validation flow
  - [ ] Test directory validation flow
  - [ ] Test severity filtering

- [ ] Create `/tests/test_base_generator.py` (75 lines)
  - [ ] Test BaseGenerator initialization
  - [ ] Test Jinja2 setup
  - [ ] Test data loading
  - [ ] Test caching

- [ ] Verify no breaking changes
  - [ ] Run existing tests
  - [ ] Verify old scripts still work
  - [ ] Verify no import conflicts

**Deliverable:** Foundation verified working
**Status Check:** All tests pass, existing functionality unchanged

---

**WEEK 1 GOALS:**
- ✓ Configuration system created and working
- ✓ Base classes implemented and tested
- ✓ No changes to existing scripts
- ✓ 90%+ test coverage for new code
- ✓ Full rollback capability (<5 minutes)

**WEEK 1 SUCCESS CRITERIA:**
- [ ] `/config/project.json` loads without errors
- [ ] `/scripts/validators/base_validator.py` initializes correctly
- [ ] `/scripts/generators/base_generator.py` initializes correctly
- [ ] Unit tests: 100% pass rate
- [ ] Old scripts: Still fully functional
- [ ] No Python/import errors

---

## WEEK 2: Validator Consolidation (60 hours)

### Task 2.1: Refactor Structure Validator (15 hours)

- [ ] Create `/scripts/validators/structure_validator.py` (1000+ lines)
  - [ ] Copy rules from validate_structure.py:
    - [ ] Rule 1-15 (all validation rules)
    - [ ] CSSExtractor class
    - [ ] All supporting methods
  - [ ] Inherit from BaseValidator
  - [ ] Load rules from config instead of code
  - [ ] Update error messages format
  - [ ] Test compatibility with old output
  - [ ] Unit tests (200 lines)

**Status Check:** Output matches original validate_structure.py exactly

---

### Task 2.2: Create Brand Validator (8 hours)

- [ ] Create `/scripts/validators/brand_validator.py` (200 lines)
  - [ ] Convert validate-brand.sh logic to Python
  - [ ] Use BeautifulSoup instead of grep
  - [ ] Load colors from config/project.json:
    - [ ] dark_background
    - [ ] text color
    - [ ] tan_accent
    - [ ] gold_accent
  - [ ] Load typography from config:
    - [ ] display_font (Playfair Display)
    - [ ] body_font (Merriweather)
  - [ ] Load spacing from config:
    - [ ] navigation (50px)
    - [ ] section_min (25px)
    - [ ] section_max (40px)
    - [ ] container_max_width (1400px)
  - [ ] Check: em-dashes count
  - [ ] Check: sans-serif usage
  - [ ] Check: leather texture
  - [ ] Inherit from BaseValidator
  - [ ] Unit tests (100 lines)

**Status Check:** Output matches validate-brand.sh exactly

---

### Task 2.3: Create SEO Validator (7 hours)

- [ ] Create `/scripts/validators/seo_validator.py` (150 lines)
  - [ ] Convert validate-seo.sh logic to Python
  - [ ] Load thresholds from config:
    - [ ] meta_description: min 120, max 160
    - [ ] og_tags: min 6
    - [ ] twitter_tags: min 4
  - [ ] Check: meta description length
  - [ ] Check: Open Graph tags (count >= 6)
  - [ ] Check: Twitter Card tags (count >= 4)
  - [ ] Check: H1 count (exactly 1)
  - [ ] Check: Analytics tracking code
  - [ ] Check: Image alt text completion
  - [ ] Inherit from BaseValidator
  - [ ] Unit tests (80 lines)

**Status Check:** Output matches validate-seo.sh exactly

---

### Task 2.4: Create W3C Validator (8 hours)

- [ ] Create `/scripts/validators/w3c_validator.py` (200 lines)
  - [ ] Convert validate-w3c.sh logic to Python
  - [ ] Check: DOCTYPE
  - [ ] Check: HTML lang attribute
  - [ ] Check: Head/Title/Meta tags
  - [ ] Check: Charset (UTF-8)
  - [ ] Check: Viewport meta tag
  - [ ] Check: Tag closure (p, div, form)
  - [ ] Check: Empty href attributes
  - [ ] Check: Inline styles (count)
  - [ ] Check: Deprecated tags (font, center, basefont)
  - [ ] Check: Heading hierarchy
  - [ ] Check: Language spans
  - [ ] Inherit from BaseValidator
  - [ ] Unit tests (120 lines)

**Status Check:** Output matches validate-w3c.sh exactly

---

### Task 2.5: Create Accessibility Validator (NEW) (10 hours)

- [ ] Create `/scripts/validators/accessibility_validator.py` (200 lines)
  - [ ] WCAG 2.1 AA compliance checks
  - [ ] Check: Form labels (associated with inputs)
  - [ ] Check: ARIA landmarks (main, nav, etc.)
  - [ ] Check: Color contrast (4.5:1 for text)
  - [ ] Check: Keyboard navigation (tabindex)
  - [ ] Check: Focus indicators
  - [ ] Check: Skip links
  - [ ] Check: Image descriptions
  - [ ] Check: Video captions (reference)
  - [ ] Check: Link descriptiveness
  - [ ] Check: List structure (ul/ol > li)
  - [ ] Inherit from BaseValidator
  - [ ] Unit tests (150 lines)

**Status Check:** All accessibility checks working

---

### Task 2.6: Refactor Preflight Validator (9 hours)

- [ ] Create `/scripts/validators/preflight_validator.py` (300 lines)
  - [ ] Copy checks from validate_before_update.py:
    - [ ] check_environment_variables()
    - [ ] check_python_packages()
    - [ ] check_directory_structure()
    - [ ] check_templates()
    - [ ] check_template_integrity()
    - [ ] check_api_connectivity()
    - [ ] check_git_status()
    - [ ] check_disk_space()
  - [ ] Load required checks from config
  - [ ] Inherit from BaseValidator
  - [ ] Update exit codes to match (0, 1, 2, 3)
  - [ ] Unit tests (200 lines)

**Status Check:** Output matches validate_before_update.py exactly

---

### Task 2.7: Create Unified validate.py (5 hours)

- [ ] Create `/scripts/validate.py` (200 lines)
  - [ ] Argument parsing:
    - [ ] --type (structure, seo, brand, w3c, accessibility, preflight, all)
    - [ ] --severity (critical, major, minor, all)
    - [ ] --file or --dir
    - [ ] --output (text, json, summary)
    - [ ] --config (alternative config file)
    - [ ] --show-config (display current config)
  - [ ] Router to correct validator based on --type
  - [ ] Load config
  - [ ] Handle all validators
  - [ ] Unified error handling
  - [ ] Exit codes (0, 1, 2, 3)

**Deliverable:** `/scripts/validate.py` working
**Status Check:** All validator types callable and working

---

### Task 2.8: Testing & Comparison (8 hours)

- [ ] Create test suite
  - [ ] `/tests/test_validators.py` (300 lines)
  - [ ] `/tests/test_unified_validate.py` (200 lines)

- [ ] Run side-by-side comparison:
  - [ ] Old validate_structure.py vs new
  - [ ] Old validate-brand.sh vs new
  - [ ] Old validate-seo.sh vs new
  - [ ] Old validate-w3c.sh vs new
  - [ ] Old validate_before_update.py vs new

- [ ] Verify identical output
  - [ ] Exit codes match
  - [ ] Error counts match
  - [ ] Error messages match

- [ ] Test all severity levels
- [ ] Test all output formats
- [ ] Test edge cases
- [ ] Test rollback capability

**Status Check:** 100% test coverage, outputs identical

---

**WEEK 2 GOALS:**
- ✓ All 6 validators implemented as modules
- ✓ Unified validate.py working
- ✓ 100% output compatibility with old validators
- ✓ Exit codes consistent (0, 1, 2, 3)
- ✓ 100+ lines of duplicate code eliminated

**WEEK 2 SUCCESS CRITERIA:**
- [ ] `/scripts/validate.py --type structure` works identically to `validate_structure.py`
- [ ] `/scripts/validate.py --type brand` works identically to `validate-brand.sh`
- [ ] `/scripts/validate.py --type seo` works identically to `validate-seo.sh`
- [ ] `/scripts/validate.py --type w3c` works identically to `validate-w3c.sh`
- [ ] `/scripts/validate.py --type preflight` works identically to `validate_before_update.py`
- [ ] `/scripts/validate.py --type accessibility` works (NEW validator)
- [ ] All unit tests: 100% pass
- [ ] Exit codes: 0=pass, 1=critical, 2=major, 3=minor
- [ ] Test coverage: 95%+ of validator code

---

## WEEK 3: Generator Consolidation (50 hours)

### Task 3.1: Extract Page Generator (8 hours)

- [ ] Create `/scripts/generators/page_generator.py` (200 lines)
  - [ ] Copy PageGenerator class from generate_pages.py
  - [ ] Inherit from BaseGenerator
  - [ ] Use DataLoader for data
  - [ ] Use base Jinja2 setup
  - [ ] Keep wiki auto-linking
  - [ ] Keep layout metadata support
  - [ ] Unit tests (100 lines)

**Status Check:** Output matches generate_pages.py exactly

---

### Task 3.2: Extract Archive Generator (8 hours)

- [ ] Create `/scripts/generators/archive_generator.py` (200 lines)
  - [ ] Copy ArchiveGenerator class from generate_archive.py
  - [ ] Inherit from BaseGenerator
  - [ ] Use DataLoader for data
  - [ ] save_current_week()
  - [ ] generate_week_page()
  - [ ] generate_archive_index()
  - [ ] Unit tests (100 lines)

**Status Check:** Output matches generate_archive.py exactly

---

### Task 3.3: Extract Newsletter Generator (15 hours)

- [ ] Create `/scripts/generators/newsletter_generator.py` (400 lines)
  - [ ] Copy NewsletterGenerator class from generate_newsletter.py
  - [ ] Inherit from BaseGenerator
  - [ ] Use DataLoader for data (current + last week)
  - [ ] calculate_stats_comparison()
  - [ ] generate_newsletter_content() with Claude API
  - [ ] format_newsletter() - plain text
  - [ ] generate_html_newsletter() - HTML
  - [ ] parse_newsletter_sections()
  - [ ] Save to Google Drive
  - [ ] Keep persona management
  - [ ] Keep AI integration
  - [ ] Unit tests (150 lines)

**Status Check:** Output matches generate_newsletter.py exactly

---

### Task 3.4: Extract Channels Generator (8 hours)

- [ ] Create `/scripts/generators/channels_generator.py` (200 lines)
  - [ ] Copy ChannelsGenerator class from generate_channels.py
  - [ ] Inherit from BaseGenerator
  - [ ] Use DataLoader for data
  - [ ] analyze_channel_appearances()
  - [ ] get_channel_thumbnail() with caching
  - [ ] generate_channels_page()
  - [ ] Implement API result caching
  - [ ] Unit tests (100 lines)

**Status Check:** Output matches generate_channels.py exactly, API calls cached

---

### Task 3.5: Extract Wiki Generator (6 hours)

- [ ] Create `/scripts/generators/wiki_generator.py` (150 lines)
  - [ ] Extract from update_wiki_videos.py
  - [ ] Inherit from BaseGenerator
  - [ ] Use DataLoader for data
  - [ ] extract_keywords()
  - [ ] auto_link_content()
  - [ ] Unit tests (75 lines)

**Status Check:** Output matches update_wiki_videos.py exactly

---

### Task 3.6: Create Unified generate.py (10 hours)

- [ ] Create `/scripts/generate.py` (150 lines)
  - [ ] Argument parsing:
    - [ ] --type (pages, archive, newsletter, channels, wiki, all)
    - [ ] --types (comma-separated, e.g., pages,archive)
    - [ ] --config (alternative config)
    - [ ] --force-refresh-api (bypass caching)
    - [ ] --output-format (text, json)
    - [ ] --debug (verbose output)
  - [ ] Load config
  - [ ] Load data once (DataLoader singleton)
  - [ ] Route to correct generator(s) based on --type
  - [ ] Follow generation_order from config
  - [ ] Unified error handling
  - [ ] Summary output

**Deliverable:** `/scripts/generate.py` working
**Status Check:** All generator types callable and working

---

### Task 3.7: Implement Caching (5 hours)

- [ ] DataLoader caching
  - [ ] In-memory cache for analyzed_content.json
  - [ ] In-memory cache for archive/*.json
  - [ ] Cache invalidation option (--force-refresh-api)
  - [ ] API result caching (YouTube thumbnails)
  - [ ] Cache expiration (config-driven)
  - [ ] Cache statistics (debug output)

**Status Check:** Caching reduces API calls by 80%+

---

### Task 3.8: Testing & Comparison (10 hours)

- [ ] Create test suite
  - [ ] `/tests/test_generators.py` (300 lines)
  - [ ] `/tests/test_unified_generate.py` (200 lines)

- [ ] Run side-by-side comparison:
  - [ ] Old generate_pages.py vs new
  - [ ] Old generate_archive.py vs new
  - [ ] Old generate_newsletter.py vs new
  - [ ] Old generate_channels.py vs new
  - [ ] Old update_wiki_videos.py vs new

- [ ] Verify identical output
  - [ ] File checksums match
  - [ ] HTML structure identical
  - [ ] JSON content identical

- [ ] Performance testing
  - [ ] Measure data loading time (before/after caching)
  - [ ] Measure API call reduction
  - [ ] Measure generation speed

**Status Check:** 100% test coverage, outputs identical, 20%+ faster

---

**WEEK 3 GOALS:**
- ✓ All 5 generators implemented as modules
- ✓ Unified generate.py working with smart routing
- ✓ 100% output compatibility with old generators
- ✓ Data caching implemented and working
- ✓ 150+ lines of duplicate code eliminated
- ✓ 20%+ performance improvement from caching

**WEEK 3 SUCCESS CRITERIA:**
- [ ] `/scripts/generate.py --type pages` works identically to `generate_pages.py`
- [ ] `/scripts/generate.py --type archive` works identically to `generate_archive.py`
- [ ] `/scripts/generate.py --type newsletter` works identically to `generate_newsletter.py`
- [ ] `/scripts/generate.py --type channels` works identically to `generate_channels.py`
- [ ] `/scripts/generate.py --type wiki` works identically to `update_wiki_videos.py`
- [ ] `/scripts/generate.py --type all` generates everything correctly
- [ ] Data caching working (single load, reused across generators)
- [ ] API call reduction: 90%+ fewer calls
- [ ] Performance: 20%+ faster than separate generators
- [ ] File checksums: Match original output exactly
- [ ] Test coverage: 95%+ of generator code

---

## WEEK 4: Workflow Integration (20 hours)

### Task 4.1: Update run_weekly_update.sh (5 hours)

- [ ] Review current run_weekly_update.sh (220 lines)

- [ ] Replace validator calls:
  - [ ] Replace: `python3 scripts/validate_structure.py templates/...`
  - [ ] With: `python3 scripts/validate.py templates/ --type structure`
  - [ ] Replace all validate-*.sh calls with unified command

- [ ] Replace generator calls:
  - [ ] Replace 5+ separate generator calls
  - [ ] With: `python3 scripts/generate.py --type all`

- [ ] Optimize validation:
  - [ ] Move pre-flight check to top
  - [ ] Consolidate template validation
  - [ ] Consolidate generated page validation

- [ ] Result: 220 lines → 150 lines (30% reduction)

- [ ] Test script
  - [ ] Run through without errors
  - [ ] Verify output identical to original
  - [ ] Measure execution time

**Deliverable:** Updated run_weekly_update.sh (150 lines)
**Status Check:** Script works identically to original, 30% shorter

---

### Task 4.2: Create Backwards Compatibility (8 hours)

- [ ] Create wrapper scripts (for team transitioning)
  - [ ] `scripts/validate_structure.py` → calls new validate.py
  - [ ] `scripts/validate_before_update.py` → calls new validate.py
  - [ ] `scripts/validate-brand.sh` → calls new validate.py
  - [ ] `scripts/validate-seo.sh` → calls new validate.py
  - [ ] `scripts/validate-w3c.sh` → calls new validate.py
  - [ ] `scripts/generate_pages.py` → calls new generate.py
  - [ ] `scripts/generate_archive.py` → calls new generate.py
  - [ ] `scripts/generate_newsletter.py` → calls new generate.py
  - [ ] `scripts/generate_channels.py` → calls new generate.py

- [ ] Rename originals to .bak
  - [ ] `validate_structure.py` → `validate_structure.py.bak`
  - [ ] (etc for all old scripts)

- [ ] Keep .bak files in repo (fallback for 6+ months)

**Deliverable:** Compatibility wrappers + .bak files
**Status Check:** Old scripts still callable, work identically

---

### Task 4.3: Update Documentation (7 hours)

- [ ] Create MIGRATION.md (250 lines)
  - [ ] Timeline for transitioning to new commands
  - [ ] Old commands → new commands mapping
  - [ ] Breaking changes (none)
  - [ ] New features (accessibility validator)
  - [ ] Configuration customization examples

- [ ] Create UNIFIED_COMMANDS.md (200 lines)
  - [ ] Quick reference for all new commands
  - [ ] Examples for each validator type
  - [ ] Examples for each generator type
  - [ ] Config overrides
  - [ ] Troubleshooting

- [ ] Update README.md
  - [ ] Link to new command reference
  - [ ] Highlight config-driven approach
  - [ ] Note about fallback scripts

- [ ] Update CI/CD documentation (if applicable)

**Deliverable:** Complete transition documentation
**Status Check:** Docs accurate, examples work

---

**WEEK 4 GOALS:**
- ✓ run_weekly_update.sh uses new unified commands
- ✓ Backwards compatibility maintained
- ✓ Complete documentation for team transition
- ✓ Zero breaking changes

**WEEK 4 SUCCESS CRITERIA:**
- [ ] `./run_weekly_update.sh` runs without errors
- [ ] Generated output identical to original
- [ ] Old commands still work (via wrappers)
- [ ] MIGRATION.md complete and accurate
- [ ] UNIFIED_COMMANDS.md complete with examples
- [ ] Team understands transition plan

---

## WEEK 5: Testing & Verification (40 hours)

### Task 5.1: Comprehensive Testing (20 hours)

- [ ] Unit tests (already in place from Weeks 1-3)
  - [ ] Config system: 100 lines
  - [ ] Validators: 300 lines
  - [ ] Generators: 300 lines
  - [ ] Total: 700 lines of unit tests
  - [ ] Target: 95%+ coverage

- [ ] Integration tests
  - [ ] `/tests/integration_tests.py` (300 lines)
  - [ ] Full validation sequence
  - [ ] Full generation sequence
  - [ ] Config loading with overrides
  - [ ] Error handling and recovery
  - [ ] Edge cases

- [ ] End-to-end tests
  - [ ] `/tests/e2e_tests.py` (100 lines)
  - [ ] Run complete run_weekly_update.sh
  - [ ] Verify file output
  - [ ] Check file sizes/counts
  - [ ] Verify exit codes

- [ ] Performance tests
  - [ ] `/tests/performance_tests.py` (100 lines)
  - [ ] Measure data loading time
  - [ ] Measure API call count
  - [ ] Measure generation speed
  - [ ] Compare before/after

**Deliverable:** Complete test suite (1,200+ lines)
**Status Check:** 100% test pass rate, coverage >95%

---

### Task 5.2: Output Verification (10 hours)

- [ ] Checksum validation
  - [ ] Generate public/index.html
  - [ ] Compare checksum with original generate_pages.py
  - [ ] Generate public/archive.html
  - [ ] Compare with original generate_archive.py
  - [ ] Generate public/channels.html
  - [ ] Compare with original generate_channels.py
  - [ ] Generate newsletters
  - [ ] Compare with original generate_newsletter.py

- [ ] Manual review
  - [ ] Inspect generated HTML structure
  - [ ] Verify all links work
  - [ ] Check layout/styling
  - [ ] Verify metadata present
  - [ ] Check newsletter formatting

- [ ] Validation report
  - [ ] Run new validate.py on generated files
  - [ ] Run old validators (fallback) on same files
  - [ ] Compare reports (should be identical)

**Deliverable:** Verification report
**Status Check:** 100% output match with original

---

### Task 5.3: Performance Analysis (5 hours)

- [ ] Before metrics (establish baseline with old code):
  - [ ] Data loading time: 15.2 seconds (5 loads)
  - [ ] API calls: 12 calls
  - [ ] Generation time: 30 seconds
  - [ ] Total validation time: 2 seconds
  - [ ] Total run time: 32 seconds

- [ ] After metrics (measure with new code):
  - [ ] Data loading time: 4.5 seconds (1 load + caching)
  - [ ] API calls: 2 calls
  - [ ] Generation time: 24 seconds
  - [ ] Total validation time: 0.8 seconds
  - [ ] Total run time: 24.8 seconds

- [ ] Calculate improvements:
  - [ ] Data loading: 70% faster
  - [ ] API calls: 83% reduction
  - [ ] Generation: 20% faster
  - [ ] Validation: 60% faster
  - [ ] Overall: 23% faster

**Deliverable:** Performance comparison report
**Status Check:** Improvements match projections

---

### Task 5.4: Documentation Completion (5 hours)

- [ ] Create final documentation
  - [ ] CONSOLIDATION_COMPLETE.md (100 lines)
  - [ ] Post-consolidation checklist
  - [ ] Performance summary
  - [ ] Cost savings (API calls, time)
  - [ ] Next steps for team

- [ ] Update architecture docs
  - [ ] Verify all diagrams accurate
  - [ ] Update with actual metrics
  - [ ] Add code statistics

- [ ] Team knowledge transfer
  - [ ] Prepare training materials
  - [ ] Document new developer workflow
  - [ ] Prepare FAQ

**Deliverable:** Complete project documentation
**Status Check:** Docs accurate and comprehensive

---

### Task 5.5: Final Verification & Approval (5 hours)

- [ ] Final checklist
  - [ ] All tests passing: 100%
  - [ ] No regressions detected
  - [ ] Performance verified
  - [ ] Documentation complete
  - [ ] Team ready
  - [ ] Rollback procedure tested
  - [ ] Fallback scripts verified

- [ ] Stakeholder approval
  - [ ] Tech lead review
  - [ ] Project manager sign-off
  - [ ] Team sign-off

- [ ] Final sign-off
  - [ ] Merge to main branch
  - [ ] Deploy to production
  - [ ] Monitor for issues

**Deliverable:** Approved consolidation ready for production
**Status Check:** All criteria met, ready to deploy

---

**WEEK 5 GOALS:**
- ✓ Complete test suite (1,200+ lines)
- ✓ Output verified identical to original
- ✓ Performance improvements verified
- ✓ Documentation complete
- ✓ Team approval obtained
- ✓ Ready for production deployment

**WEEK 5 SUCCESS CRITERIA:**
- [ ] Unit tests: 100% pass
- [ ] Integration tests: 100% pass
- [ ] E2E tests: 100% pass
- [ ] Output checksums match original: 100%
- [ ] Performance improvements: 20%+ faster
- [ ] API call reduction: 80%+
- [ ] Code coverage: 95%+
- [ ] Documentation: Complete and accurate
- [ ] Team trained and ready
- [ ] Rollback tested and working
- [ ] Stakeholder approval: Obtained

---

## POST-CONSOLIDATION CHECKLIST

### Deployment (Day of Launch)
- [ ] Final backup of current code
- [ ] Merge feature branch to main
- [ ] Deploy to production
- [ ] Monitor for errors
- [ ] Verify generated files

### Week After Launch
- [ ] Team running workflow without issues
- [ ] No error reports
- [ ] Performance monitoring (confirm 20% improvement)
- [ ] User feedback collected

### Month After Launch
- [ ] Deprecation notice on old scripts
- [ ] Team fully transitioned to new commands
- [ ] Plan for removing fallback scripts (Q2 2026)
- [ ] Document lessons learned

---

## TIMELINE SUMMARY

| Week | Phase | Tasks | Hours | Status |
|------|-------|-------|-------|--------|
| 1 | Foundation | Config, Base Classes | 40 | Planning |
| 2 | Validators | 6 Validators, Unified | 60 | Planning |
| 3 | Generators | 5 Generators, Unified | 50 | Planning |
| 4 | Integration | Workflow, Docs | 20 | Planning |
| 5 | Testing | Tests, Verification | 40 | Planning |
| **Total** | | | **260** | **Ready** |

---

## TEAM ASSIGNMENTS

### Senior Developer (Alex) - 130 hours
- [ ] Week 1: Leadership, code review (architecture)
- [ ] Week 2: Code review, validator testing
- [ ] Week 3: Code review, generator testing
- [ ] Week 4: Workflow integration, documentation
- [ ] Week 5: Final review, approval sign-off

### Mid-level Developer - 100 hours
- [ ] Week 1: Config system, base classes
- [ ] Week 2: Implement validators
- [ ] Week 3: Implement generators
- [ ] Week 4: Create compatibility wrappers
- [ ] Week 5: Performance testing, optimization

### Junior Developer - 30 hours
- [ ] Week 1: Unit test setup
- [ ] Weeks 2-3: Write unit and integration tests
- [ ] Week 4: Documentation
- [ ] Week 5: Testing support, data collection

---

## Risk Mitigation

### Risk Level: VERY LOW

Each phase has rollback capability:
- **Phase 1 Failure:** Delete /config directory (5 min)
- **Phase 2 Failure:** Restore from .bak files (10 min)
- **Phase 3 Failure:** Restore from .bak files (10 min)
- **Phase 4 Failure:** Git revert run_weekly_update.sh (5 min)
- **Phase 5 Failure:** Use fallback scripts indefinitely

### Mitigation Strategies
- [ ] Keep all .bak files in repo (6+ months minimum)
- [ ] Create compatibility wrappers (call new code)
- [ ] Run parallel validation during transition
- [ ] Weekly review meetings (catch issues early)
- [ ] Comprehensive test coverage (95%+)
- [ ] Staged rollout (Phase 1-2, then 3-4, then 5)

---

## Success Definition

**Phase 2 is complete when:**

1. **Code Quality:**
   - [ ] 6,450 lines of new, tested code
   - [ ] 95%+ test coverage
   - [ ] Zero breaking changes
   - [ ] 150+ duplicate lines eliminated

2. **Functionality:**
   - [ ] All validators working identically
   - [ ] All generators working identically
   - [ ] Configuration system functional
   - [ ] Output formats consistent

3. **Performance:**
   - [ ] 20%+ faster generation
   - [ ] 80%+ API call reduction
   - [ ] Data loaded once, reused via caching
   - [ ] Startup time 60% faster

4. **Operations:**
   - [ ] 10+ tools consolidated to 2
   - [ ] run_weekly_update.sh 30% shorter
   - [ ] Configuration centralized (1 location)
   - [ ] Error handling unified

5. **Team:**
   - [ ] Team trained on new commands
   - [ ] Transition documentation complete
   - [ ] Fallback mechanism verified
   - [ ] Stakeholders approved

6. **Production:**
   - [ ] Deployed without issues
   - [ ] No regressions detected
   - [ ] Performance verified
   - [ ] Team running workflow smoothly

---

## Start Here

1. **Review Documents:**
   - Read PHASE_2_SUMMARY.md (5 min)
   - Read PHASE_2_CONSOLIDATION_REPORT.md (30 min)
   - Review PHASE_2_ARCHITECTURE.md (15 min)

2. **Prepare Team:**
   - Distribute this checklist
   - Schedule kickoff meeting
   - Assign tasks by role

3. **Create Branch:**
   ```bash
   git checkout -b feature/phase-2-consolidation
   ```

4. **Begin Phase 1:**
   - Start creating config system
   - Track progress with checklist
   - Weekly review meetings

---

**Prepared By:** Alex (Senior Developer)
**Date:** 2026-01-01
**Status:** Ready for Implementation
**Approval:** Pending

**NEXT STEP:** Schedule kickoff meeting for Monday, 2026-01-06
