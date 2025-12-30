# Carnivore Weekly - Affiliate Links & Sponsors

Master list of all affiliate and sponsor links used across the site. Update this file whenever adding or modifying affiliate links.

## Active Affiliate Links

### ButcherBox
- **Base Link:** `https://butcherbox.pxf.io/Z6oVMR`
- **Current Offer:** FREE Steaks and Bacon For A Year ($1,135+ value)
  - 2 x premium steaks (Ribeyes, Filet Mignons, or NY Strips) + 10 oz Bacon FREE in every order for 1 year
  - "Last and Best Sale of the Year" - Ends 1/1/26
- **Locations & UTM Parameters:**
  - **Homepage (seasonal):** `?utm_source=carnivore_weekly&utm_medium=affiliate&utm_campaign=seasonal_offer`
  - **About page (evergreen):** `?utm_source=carnivore_weekly&utm_medium=affiliate&utm_campaign=evergreen_ad`
  - **Calculator results (seasonal):** `?utm_source=carnivore_weekly&utm_medium=affiliate&utm_campaign=calculator_results`
  - **Channels page (between top 6):** `?utm_source=carnivore_weekly&utm_medium=affiliate&utm_campaign=channels_top6`
- **Type:** Image ads with GA4 tracking
- **Status:** ✅ Active (expires 1/1/26)
- **GA4 Events:** Tracked as "click" event with category "Affiliate" and label "ButcherBox"

### LMNT (Elemental Labs)
- **Link:** `http://elementallabs.refr.cc`
- **Offer:** Electrolyte supplement
- **Locations:**
  - Wiki - Electrolytes & Cramps section (`public/wiki.html`)
  - Wiki - Salt & Sodium section (`public/wiki.html`, line ~1378) - NEW
- **Type:** In-content promotional boxes
- **Status:** ✅ Active

## Link Usage by Page

### `public/index.html`
- ButcherBox: Homepage banner (top of main content)

### `public/wiki.html`
- LMNT: Electrolytes & Leg Cramps section
- LMNT: Salt & Sodium section (Dosing Recommendation)

### `public/calculator.html`
- (No affiliate links currently)

### `public/questionnaire.html`
- (No affiliate links currently)

## Tracking Setup

Google Analytics affiliate click tracking is configured:
```javascript
// Tracked via:
trackAffiliateClick('ProductName', 'https://affiliate.link')

// View in GA4 under:
// Events > Affiliate > Product Name
```

## Adding New Affiliate Links

When adding a new sponsor:

1. **Update this file** with link, offer, and location
2. **Add to HTML** with proper tracking:
   ```html
   <a href="AFFILIATE_LINK"
      target="_blank"
      rel="noopener"
      onclick="trackAffiliateClick('ProductName', 'AFFILIATE_LINK')">
      CTA Text
   </a>
   ```
3. **Use consistent styling:**
   - Sponsor banners: `.sponsor-banner` + `.sponsor-cta`
   - In-content boxes: Gold/tan gradient (same as LMNT ads)
4. **Commit with message:** "Add [ProductName] affiliate link"
5. **Update this file**

## Archive

| Product | Link | Status | Removed Date |
|---------|------|--------|--------------|
| (None yet) | - | - | - |

---

**Last Updated:** 2025-12-29
**Maintained By:** Carnivore Weekly Team
