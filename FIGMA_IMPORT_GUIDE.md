# Figma Import Guide
## Using design-tokens.json with Figma Design System

**Version:** 1.0
**Updated:** December 31, 2025
**Status:** Ready for Production Implementation

---

## OVERVIEW

The `design-tokens.json` file contains complete design system specifications that can be directly imported into Figma using the Figma Tokens plugin. This guide provides step-by-step instructions for setting up the complete design system in Figma.

**What You'll Get:**
- All 6 primary colors with semantic naming
- Complete typography scales (H1-H4 + body variants)
- Spacing tokens (5px through 60px scale)
- Shadow and border radius tokens
- Responsive breakpoint specifications
- Component specifications with state variants

---

## STEP 1: INSTALL FIGMA TOKENS PLUGIN

1. Open Figma desktop app or go to figma.com
2. Go to **Plugins** → **Browse plugins**
3. Search for **"Figma Tokens"** (by 4STAR)
4. Click **"Install"**
5. Once installed, you'll see it in **Plugins** menu

---

## STEP 2: PREPARE THE TOKENS FILE

The `design-tokens.json` file is already formatted for Figma Tokens plugin import. You have two options:

### Option A: Direct File Import (Easiest)

1. Locate `design-tokens.json` in your project root
2. Keep it accessible for import into Figma
3. You can also store it in a GitHub repository for version control

### Option B: Manual Token Setup

If direct import doesn't work, manually create tokens:

1. Create a new JSON file in Figma Tokens plugin
2. Copy token groups from `design-tokens.json`
3. Map each token to Figma color/typography styles

---

## STEP 3: IMPORT TOKENS INTO FIGMA

### Via Figma Tokens Plugin:

1. Open **Plugins** → **Figma Tokens**
2. Click the **Settings icon** (gear) in the top right
3. Select **"Sync with GitHub"** or **"Paste JSON"**
4. If using GitHub:
   - Connect your GitHub account
   - Select the repository containing `design-tokens.json`
   - Choose the file path
5. If pasting JSON:
   - Copy entire contents of `design-tokens.json`
   - Paste into the plugin
6. Click **"Confirm"** or **"Sync"**

The plugin will create token groups corresponding to the JSON structure.

---

## STEP 4: CREATE COLOR STYLES IN FIGMA

After importing tokens, create Figma color styles:

### Create Primary Colors:

1. In Figma, select any object
2. In the **Design** panel, find **Fill** section
3. Click **→** icon next to color to create a style
4. Name it exactly: **Colors/Dark Brown** (use the token name structure)
5. Set value to: **#1a120b**
6. Repeat for all 6 primary colors:

| Token Name | Hex Value | Figma Style Name |
|-----------|-----------|-------------------|
| Dark Brown | #1a120b | Colors/Dark Brown |
| Text Brown | #2c1810 | Colors/Text Brown |
| Accent Tan | #d4a574 | Colors/Accent Tan |
| Gold Accent | #ffd700 | Colors/Gold Accent |
| Light Text | #f4e4d4 | Colors/Light Text |
| Border/Divider | #8b4513 | Colors/Border |

### Create Semantic Color Groups:

**Background Colors:**
- Colors/Background/Primary → #1a120b
- Colors/Background/Secondary → #2c1810
- Colors/Background/Surface → #8b4513

**Text Colors:**
- Colors/Text/Primary → #f4e4d4
- Colors/Text/Secondary → #2c1810
- Colors/Text/Accent → #d4a574

**Accent Colors:**
- Colors/Accent/Gold → #ffd700
- Colors/Accent/Tan → #d4a574
- Colors/Accent/Brown → #8b4513

---

## STEP 5: CREATE TYPOGRAPHY STYLES IN FIGMA

### H1 Heading Style:

1. Create a new text in Figma
2. Apply these properties:
   - Font: **Playfair Display**
   - Weight: **900**
   - Size: **48px** (desktop)
   - Line Height: **1.3** (52px)
   - Letter Spacing: **-1px**
   - Color: **Colors/Gold Accent**
3. In **Text** panel, click the **+** icon to create style
4. Name: **Typography/Headings/H1**
5. Repeat for H2, H3, H4

### H2 Heading Style:

- Font: **Playfair Display**
- Weight: **700**
- Size: **32px**
- Line Height: **1.4**
- Letter Spacing: **-1px**
- Color: **Colors/Gold Accent**
- Style Name: **Typography/Headings/H2**

### H3 Heading Style:

- Font: **Playfair Display**
- Weight: **700**
- Size: **24px**
- Line Height: **1.5**
- Letter Spacing: **0.5px**
- Color: **Colors/Accent Tan**
- Style Name: **Typography/Headings/H3**

### H4 Heading Style:

- Font: **Playfair Display**
- Weight: **700**
- Size: **18px**
- Line Height: **1.6**
- Letter Spacing: **0.5px**
- Color: **Colors/Accent Tan**
- Style Name: **Typography/Headings/H4**

### Body Text Styles:

**Body Default:**
- Font: **Merriweather**
- Weight: **400**
- Size: **16px**
- Line Height: **1.8**
- Color: **Colors/Text Primary**
- Style Name: **Typography/Body/Default**

**Body Bold:**
- Font: **Merriweather**
- Weight: **700**
- Size: **16px**
- Line Height: **1.8**
- Color: **Colors/Text Primary**
- Style Name: **Typography/Body/Bold**

**Body Small:**
- Font: **Merriweather**
- Weight: **400**
- Size: **14px**
- Line Height: **1.8**
- Color: **Colors/Text Accent**
- Style Name: **Typography/Body/Small**

**Body Extra Small:**
- Font: **Merriweather**
- Weight: **400**
- Size: **12px**
- Line Height: **1.6**
- Color: **Colors/Text Accent** (with 80% opacity)
- Style Name: **Typography/Body/Extra Small**

---

## STEP 6: CREATE COMPONENT LIBRARY

### Hero Card Component:

1. Create a new frame: **1400px wide × 400px tall**
2. Name it: **Hero Card**
3. Apply styles:
   - Background: **Colors/Accent Tan** (apply as fill)
   - Border: **3px solid Colors/Border**
   - Border radius: **15px**
   - Shadow: **0 8px 25px rgba(0,0,0,0.5)**
4. Add nested components:
   - Text frame for heading (H1 style)
   - Text frame for description (body style)
   - Button component (primary style)
5. Create variants for responsive sizes:
   - Desktop (1400px container)
   - Tablet (1099px container)
   - Mobile (375px container)

### Featured Card Component:

1. Create frame: **700px wide × 240px tall** (2-column span on 3-column grid)
2. Name: **Featured Card**
3. Apply styles:
   - Background: Dark brown gradient
   - Left border: **6px solid Colors/Accent Tan**
   - Border radius: **10px**
   - Shadow: **0 5px 15px rgba(0,0,0,0.4)**
4. Add nested components:
   - Badge component (optional)
   - H2 heading
   - Description text
5. Create variants:
   - Default state
   - Hover state (small transform in documentation)
   - Active state

### Standard Card Component:

1. Create frame: **426px × 220px**
2. Name: **Standard Card**
3. Apply styles:
   - Background: Dark gradient
   - Border: **1px solid Colors/Border**
   - Border radius: **8px**
4. Add nested components:
   - H3 heading
   - Description
   - "Read More" link
5. Create state variants

### Button Components:

**Primary Button:**
1. Create component: **150px × 44px minimum**
2. Name: **Button/Primary**
3. Apply styles:
   - Background: Tan gradient
   - Border: **2px solid Colors/Border**
   - Border radius: **8px**
   - Text: Colors/Text Brown
4. Create variants:
   - Default
   - Hover (darker tan)
   - Active (no lift)
   - Focus (gold outline)
   - Disabled

**Secondary Button:**
1. Create component: **100px+ × 44px**
2. Name: **Button/Secondary**
3. Apply styles:
   - Background: Transparent
   - Border: **2px solid Colors/Accent Tan**
   - Text: Colors/Accent Tan
4. Create variants:
   - Default
   - Hover (gold color)
   - Active (tan background)

**Small Button:**
1. Create component: **80px+ × 32px**
2. Name: **Button/Small**
3. Apply styles:
   - Background: Colors/Border
   - Text: Colors/Light Text
   - Border radius: **4px**

---

## STEP 7: CREATE COMPONENT SET (VARIANTS)

### For Each Card Type:

1. Select all card variants
2. Right-click → **Combine as variants**
3. Set up variant properties:
   - Type: "State" (default, hover, active, focus, disabled)
   - Size: "Responsive" (mobile, tablet, desktop)
4. Test variant switching in Figma

### Button Component Set:

1. Create variants for each state
2. Set up properties:
   - "Style" property (primary, secondary, small)
   - "State" property (default, hover, active, focus, disabled)
3. Name variants: `Button=primary, State=default`

---

## STEP 8: RESPONSIVE DESIGN IN FIGMA

### Create Responsive Frames:

1. Create frames for each breakpoint:
   - Mobile: **375px wide**
   - Tablet: **768px wide**
   - Desktop: **1400px wide**
   - Large Desktop: **1400px+ wide**

2. Set up grid layouts for each:
   ```
   Desktop (1400px):
   - 3-column grid
   - 40px gap
   - 20px padding

   Tablet (768px):
   - 2-column grid
   - 30px gap
   - 15px padding

   Mobile (375px):
   - 1-column grid
   - 20px gap
   - 12px padding
   ```

3. Use Figma's **Constraints** or **Auto Layout** to make components responsive

### Set Up Auto Layout for Cards:

1. Select card component
2. Enable **Auto Layout** (Cmd+A on Mac, Ctrl+A on Windows)
3. Set direction: **Vertical** (for card content stacking)
4. Set spacing: **12px** (between elements inside card)
5. Set padding: **20px** (inside card)

---

## STEP 9: TOKEN NAMING CONVENTIONS

Use consistent naming structure throughout Figma:

```
Colors/
├── Background/
│   ├── Primary      (#1a120b)
│   ├── Secondary    (#2c1810)
│   └── Surface      (#8b4513)
├── Text/
│   ├── Primary      (#f4e4d4)
│   ├── Secondary    (#2c1810)
│   └── Accent       (#d4a574)
└── Accent/
    ├── Gold         (#ffd700)
    ├── Tan          (#d4a574)
    └── Brown        (#8b4513)

Typography/
├── Headings/
│   ├── H1
│   ├── H2
│   ├── H3
│   └── H4
└── Body/
    ├── Default
    ├── Bold
    ├── Small
    └── Extra Small

Components/
├── Cards/
│   ├── Hero
│   ├── Featured
│   ├── Standard
│   └── Tall
├── Buttons/
│   ├── Primary
│   ├── Secondary
│   └── Small
└── Forms/
    ├── Input
    ├── Select
    └── Checkbox
```

---

## STEP 10: VALIDATE & TEST

### Color Validation:

- [ ] All colors match design-tokens.json exactly
- [ ] Verify hex values in DevTools (color picker)
- [ ] Test contrast ratios (aim for 4.5:1 minimum)
- [ ] Verify gradient angles and colors

### Typography Validation:

- [ ] All fonts are Playfair Display (headings) or Merriweather (body)
- [ ] Font sizes match specifications at each breakpoint
- [ ] Line heights maintain readability (1.3-1.8 range)
- [ ] Colors follow contrast requirements

### Component Validation:

- [ ] All 4 card types created with full state variants
- [ ] All 3 button types created with all states
- [ ] Responsive variants work correctly
- [ ] Focus states are clearly visible (gold outline)
- [ ] Disabled states are visually distinct

### Figma Library Checklist:

- [ ] Publish library (File → Save as library)
- [ ] Share with team (share link in workspace)
- [ ] Document component usage in Figma
- [ ] Create design guidelines page in Figma
- [ ] Set up versioning system

---

## SHARING FIGMA LIBRARY WITH TEAM

### Publish as Team Library:

1. In Figma file, go to **Assets** tab (left panel)
2. Click the Figma logo icon on any component
3. Select **Publish library**
4. Add description and guidelines
5. Share link with team members
6. Team members can enable library in their files

### Create Design Documentation in Figma:

1. Create new page: **"Design System Documentation"**
2. Add sections for:
   - Color palette (with swatches and hex values)
   - Typography scale (with examples)
   - Component specifications (each card type)
   - Button states (all variations)
   - Spacing grid visualization
   - Responsive breakpoints
3. Update documentation as system evolves

---

## EXPORTING FROM FIGMA

### Export Component Specifications:

1. Select any component
2. Right-click → **Copy as CSS** (if using Figma plugins)
3. Or manually export measurements:
   - Width/Height
   - Padding/Margin
   - Border radius
   - Shadow values
   - Font properties

### Export as PNG/SVG:

1. Select component
2. Right-click → **Export**
3. Choose format (PNG at 2x for retina)
4. Use for documentation or hand-off

### Generate CSS from Figma:

1. Use plugin: **CSS Export** or **Code**
2. Automatically generates CSS variables from styles
3. Copy and paste into project stylesheet

---

## TROUBLESHOOTING

### Q: Tokens won't import
**A:** Ensure JSON file is valid:
- Check for proper comma placement
- Verify all brackets and braces match
- Use JSON validator online
- Try copy/pasting content directly into Figma Tokens plugin

### Q: Colors don't match design specifications
**A:**
- Verify hex values in color picker (must be exact)
- Check that Figma color mode is RGB (not CMYK)
- Ensure no color management/profiles interfering
- Compare side-by-side with design-tokens.json

### Q: Typography styles look different than specs
**A:**
- Check font is loaded from Google Fonts
- Verify font weight matches exactly (700 vs 700, not 600)
- Check line height is calculated correctly (1.3 = 1.3x font size)
- Ensure letter spacing is applied correctly

### Q: Components won't create variants
**A:**
- Make sure you're using Figma's native component system
- Try selecting main component, then right-click → "Create component set"
- Ensure all variants have consistent naming convention
- Check that property names match variant structure

### Q: Library won't share with team
**A:**
- Make sure file is in a Team workspace (not personal)
- Right-click on library component → "Publish"
- Share file link in Slack or team communication
- Team members should have edit access to see library

---

## NEXT STEPS

1. **Design System Manager** should oversee Figma library
2. **Designers** use library components in their designs
3. **Developers** reference Figma specifications when implementing
4. **Product Team** uses Figma for design reviews and feedback
5. **Regular Updates** as design system evolves

---

## DESIGNER WORKFLOW

### Creating a New Design:

1. Open Figma
2. Create new file
3. Enable library (Assets → Find design system library)
4. Drag components from library
5. Customize content while maintaining component styles
6. Use variants for different states/sizes
7. Document design decisions in comments
8. Share with team for feedback

### Maintaining Component Library:

1. Monthly reviews of component usage
2. Update components based on designer feedback
3. Document new patterns/components
4. Version control in Figma (File → Version history)
5. Communicate changes to design and dev teams

---

## INTEGRATION WITH DEVELOPMENT

### Designers → Developers Handoff:

1. Create **"Development Specs"** page in Figma
2. Include:
   - Exact measurements (width, height, padding, etc.)
   - CSS color values and variable names
   - Font specifications (family, weight, size, line height)
   - Animation/transition specifications
   - Responsive behavior at each breakpoint
3. Use Figma comments for additional notes
4. Developers implement based on specifications

### Dev Verification:

1. Developers compare implemented components to Figma
2. Use browser DevTools to measure elements
3. Verify colors match exactly (use color picker)
4. Check typography scales at each breakpoint
5. Test hover/active/focus states match Figma documentation

---

## VERSION HISTORY

| Date | Version | Changes |
|------|---------|---------|
| Dec 31, 2025 | 1.0 | Initial Figma import guide with complete instructions |

---

## SUPPORT & CONTACT

- **Design System Owner:** CEO/Founder
- **Figma Library Manager:** Lead Designer
- **Questions:** Post in design system Slack channel

---

**Figma Import Guide v1.0**
**Ready for Production Implementation**
**Last Updated: December 31, 2025**

